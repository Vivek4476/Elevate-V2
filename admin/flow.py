"""
Admin & Publishing flow (migration Step 8) — reuses the trusted Python pipeline.

The rule: a month's sheets go live only if the engine reproduces the sheet's OWN Final Amount (±₹1)
and WAS (±0.001) for every DSE — reconcile-before-publish. Every publish is versioned; rollback
restores a prior one. Pure functions here; server.py wraps them in FastAPI.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

PIPE = Path(__file__).resolve().parents[1] / "pipeline"     # repo/pipeline
sys.path.insert(0, str(PIPE))

import pandas as pd                                          # noqa: E402
import pandera.pandas as pa                                 # noqa: E402

from pipeline.ingest.incentive import load_incentive        # noqa: E402
from pipeline.ingest.sp import load_sp                      # noqa: E402
from pipeline.schemas.incentive_schema import IncentiveInput  # noqa: E402
from pipeline.schemas.sp_schema import SPInput              # noqa: E402
from pipeline.engines.incentive_calc import compute_incentive  # noqa: E402
from pipeline.engines.sp_calc import compute_sp            # noqa: E402
from pipeline.contract.build import build_contracts         # noqa: E402
from pipeline.plan.loader import resolve_plan               # noqa: E402

DATA = PIPE / "data"
LIVE = DATA / "out"                       # what the app reads: dse/*.json + manifest.json
WS = DATA / "admin"
UP, STG, PUB = WS / "uploads", WS / "staging", WS / "publishes"
STATE = WS / "current.json"


class FlowError(Exception):
    pass


def _dirs():
    for d in (UP, STG, PUB):
        d.mkdir(parents=True, exist_ok=True)


def _now():
    return datetime.now(timezone.utc)


def _ts():
    return _now().strftime("%Y%m%dT%H%M%S%f")


def _sha256(p) -> str:
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def _plan(month="2026-04"):
    return resolve_plan("absli", month, PIPE)


def _current() -> dict:
    if not STATE.exists():
        raise FlowError("No upload yet — upload the month's sheets first.")
    return json.loads(STATE.read_text())


# ── 1. upload ──────────────────────────────────────────────────────────
def save_upload(inc_src, sp_src, user="ops") -> dict:
    _dirs()
    ts = _ts()
    dest = UP / ts
    dest.mkdir(parents=True, exist_ok=True)
    inc, sp = dest / "incentive.xlsx", dest / "sp.xlsb"
    shutil.copy(inc_src, inc)
    shutil.copy(sp_src, sp)
    rec = {"ts": ts, "user": user, "incentive": str(inc), "sp": str(sp),
           "hashes": {"incentive": _sha256(inc), "sp": _sha256(sp)}}
    STATE.write_text(json.dumps(rec))
    return {"ts": ts, "hashes": rec["hashes"]}


# ── 2. validate (pandera, grouped) ─────────────────────────────────────
def _group(df, model) -> dict:
    try:
        model.validate(df, lazy=True)
        return {"ok": True, "rows": len(df), "missing_columns": [], "dtype_errors": [], "range_errors": [], "other": []}
    except pa.errors.SchemaErrors as e:
        fc = e.failure_cases
        missing, dtype_e, range_e, other = [], [], [], []
        for _, r in fc.iterrows():
            chk, col = str(r.get("check")), r.get("column")
            item = {"column": col, "check": chk, "value": str(r.get("failure_case"))[:40], "row": r.get("index")}
            if "column_in_dataframe" in chk:
                missing.append(col)
            elif "dtype" in chk or "coerce" in chk:
                dtype_e.append(item)
            elif any(k in chk for k in ("greater", "less", "range", "isin", "not_nullable", "ge", "le")):
                range_e.append(item)
            else:
                other.append(item)
        return {"ok": False, "rows": len(df),
                "missing_columns": sorted(set(m for m in missing if m)),
                "dtype_errors": dtype_e[:50], "range_errors": range_e[:50], "other": other[:50]}


def validate() -> dict:
    cur = _current()
    rep = {"incentive": None, "sp": None, "coverage": None, "ok": False, "blocking": []}
    inc = sp = None
    try:
        inc = load_incentive(cur["incentive"])
        rep["incentive"] = _group(inc, IncentiveInput)
        if not rep["incentive"]["ok"]:
            rep["blocking"].append("Incentive sheet has schema errors")
    except Exception as ex:
        rep["incentive"] = {"ok": False, "structural_error": f"Could not read the Incentive sheet: {ex}"}
        rep["blocking"].append("Incentive sheet unreadable")
    try:
        sp = load_sp(cur["sp"])
        rep["sp"] = _group(sp, SPInput)
        if not rep["sp"]["ok"]:
            rep["blocking"].append("SP sheet has schema errors")
    except Exception as ex:
        rep["sp"] = {"ok": False, "structural_error": f"Could not read the SP sheet: {ex}"}
        rep["blocking"].append("SP sheet unreadable")
    if inc is not None and sp is not None:
        a, b = set(inc["employee_code"].dropna()), set(sp["dse_id"].dropna())
        rep["coverage"] = {"both": len(a & b), "incentive_only": len(a - b), "sp_only": len(b - a)}
    rep["ok"] = not rep["blocking"]
    return rep


# ── 3. preview (build to staging + reconcile) ──────────────────────────
def _sample(contract) -> dict:
    if not contract:
        return None
    i, s = contract.get("incentive") or {}, contract.get("sp") or {}
    return {"dse_id": contract.get("dse_id"), "name": contract.get("name"), "grade": contract.get("grade"),
            "incentive_final": i.get("final"), "sp_eligible": s.get("eligible"), "sp_tier": s.get("tier"),
            "sp_overall_was": s.get("overall_was")}


def preview(month="2026-04") -> dict:
    _dirs()
    cur = _current()
    plan = _plan(month)
    inc, sp = load_incentive(cur["incentive"]), load_sp(cur["sp"])

    inc_mm, inc_ck = [], 0
    for _, r in inc.iterrows():
        d = r.to_dict()
        s = d.get("sheet_final_amount")
        if s is None or (isinstance(s, float) and pd.isna(s)):
            continue
        inc_ck += 1
        got = compute_incentive(d, plan)["final"]
        if abs(got - float(s)) > 1.0:
            inc_mm.append({"code": d.get("agent_code"), "engine": round(got, 2), "sheet": round(float(s), 2)})

    sp_mm, sp_ck = [], 0
    for _, r in sp.iterrows():
        d = r.to_dict()
        s = d.get("sheet_overall_was")
        if s is None or (isinstance(s, float) and pd.isna(s)):
            continue
        sp_ck += 1
        got = compute_sp(d, plan)["overall_was"]
        if abs(got - float(s)) > 0.001:
            sp_mm.append({"code": d.get("dse_bo_code"), "engine": round(got, 4), "sheet": round(float(s), 4)})

    reconcile = {
        "incentive": {"checked": inc_ck, "mismatches": len(inc_mm), "sample": inc_mm[:10], "ok": not inc_mm},
        "sp": {"checked": sp_ck, "mismatches": len(sp_mm), "sample": sp_mm[:10], "ok": not sp_mm},
        "ok": (not inc_mm) and (not sp_mm),
    }

    manifest = build_contracts(cur["incentive"], cur["sp"], plan, STG, month)
    sp_path = STG / "dse" / "AAA634.json"
    sample = json.loads(sp_path.read_text()) if sp_path.exists() else None
    return {"month": month, "dse_count": manifest["totals"]["contracts"],
            "coverage": manifest["coverage"], "reconcile": reconcile, "sample": _sample(sample)}


# ── 4. publish (reconcile-gated, versioned) + promote ──────────────────
def _promote(snapshot: Path):
    LIVE.mkdir(parents=True, exist_ok=True)
    live_dse = LIVE / "dse"
    if live_dse.exists():
        shutil.rmtree(live_dse)
    shutil.copytree(snapshot / "dse", live_dse)
    shutil.copy(snapshot / "manifest.json", LIVE / "manifest.json")
    (LIVE / "live_pointer.json").write_text(json.dumps({"publish_id": snapshot.name}))


def publish(month="2026-04", user="ops") -> dict:
    cur = _current()
    val = validate()
    if not val["ok"]:
        raise FlowError("Refusing to publish — validation failed: " + "; ".join(val["blocking"]))
    pv = preview(month)
    if not pv["reconcile"]["ok"]:
        raise FlowError("Refusing to publish — reconcile is not green.")
    ts = _ts()
    snap = PUB / ts
    snap.mkdir(parents=True, exist_ok=True)
    shutil.copytree(STG / "dse", snap / "dse")
    shutil.copy(STG / "manifest.json", snap / "manifest.json")
    record = {"id": ts, "published_at": _now().isoformat(), "user": user, "month": month,
              "row_count": pv["dse_count"], "coverage": pv["coverage"], "file_hashes": cur["hashes"],
              "reconcile": {"incentive_ok": pv["reconcile"]["incentive"]["ok"], "sp_ok": pv["reconcile"]["sp"]["ok"]}}
    (snap / "publish.json").write_text(json.dumps(record, indent=2))
    _promote(snap)
    return record


# ── 5. audit + rollback ────────────────────────────────────────────────
def audit() -> list:
    _dirs()
    out = []
    for d in sorted(PUB.glob("*/"), reverse=True):
        pj = d / "publish.json"
        if pj.exists():
            out.append(json.loads(pj.read_text()))
    live = LIVE / "live_pointer.json"
    live_id = json.loads(live.read_text()).get("publish_id") if live.exists() else None
    for r in out:
        r["is_live"] = (r["id"] == live_id)
    return out


def rollback(publish_id: str, user="ops") -> dict:
    snap = PUB / publish_id
    if not (snap / "publish.json").exists():
        raise FlowError(f"No publish {publish_id}")
    _promote(snap)
    rec = json.loads((snap / "publish.json").read_text())
    rec["rolled_back_at"] = _now().isoformat()
    rec["rolled_back_by"] = user
    return rec


def health() -> dict:
    _dirs()
    man = LIVE / "manifest.json"
    lp = LIVE / "live_pointer.json"
    return {"source": "pipeline", "live_publish": json.loads(lp.read_text()).get("publish_id") if lp.exists() else None,
            "manifest": json.loads(man.read_text()) if man.exists() else None,
            "publishes": len(list(PUB.glob("*/")))}
