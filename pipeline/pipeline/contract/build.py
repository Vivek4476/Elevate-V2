"""
Contract builder — assemble the per-DSE contract from both engines + emit the coverage manifest.

Join: incentive `employee_code` == SP `dse_id` (both hold the numeric employee id; the agent code
lives in incentive `agent_code` / SP `dse_bo_code`). The contract's top-level `dse_id` is the agent
code (e.g. AAA634). A DSE present in only one workbook gets `null` for the other block — never
fabricated. No value here mixes a monthly incentive figure with a rolling SP figure.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pipeline.ingest.incentive import load_incentive
from pipeline.ingest.sp import load_sp
from pipeline.engines.incentive_calc import compute_incentive
from pipeline.engines.addons import apply_addons
from pipeline.engines.sp_calc import compute_sp
from pipeline.contract.schema import assemble, incentive_block, sp_block, SCHEMA_VERSION


def _clean(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    return v


def _json_default(o):
    if hasattr(o, "item"):        # numpy scalar → native python
        v = o.item()
        return None if (isinstance(v, float) and pd.isna(v)) else v
    if isinstance(o, float) and pd.isna(o):
        return None
    return str(o)


def build_contracts(inc_wb, sp_wb, plan: dict, out_dir: Path, month: str) -> dict:
    inc = load_incentive(inc_wb)
    sp = load_sp(sp_wb)

    inc_by_code = {r["employee_code"]: r for _, r in inc.iterrows() if r["employee_code"]}
    sp_by_id = {r["dse_id"]: r for _, r in sp.iterrows() if r["dse_id"]}
    inc_codes, sp_codes = set(inc_by_code), set(sp_by_id)

    dse_dir = out_dir / "dse"
    dse_dir.mkdir(parents=True, exist_ok=True)
    for f in dse_dir.glob("*.json"):          # clear stale contracts from a prior build
        f.unlink()

    written = 0
    for code in inc_codes | sp_codes:
        idict = inc_by_code[code].to_dict() if code in inc_by_code else None
        sdict = sp_by_id[code].to_dict() if code in sp_by_id else None

        agent = _clean((idict or {}).get("agent_code")) or _clean((sdict or {}).get("dse_bo_code")) or code
        top = {
            "dse_id": agent,
            "employee_code": code,
            "name": _clean((idict or {}).get("name")) or _clean((sdict or {}).get("name")),
            "grade": _clean((idict or {}).get("grade")) or _clean((sdict or {}).get("grade")),
            "grade_full": None,
            "zone": _clean((sdict or {}).get("zone")),
            "hierarchy": {
                "sm": _clean((idict or {}).get("sm_code")),
                "rsm": _clean((idict or {}).get("rsm_code")),
                "zsm": _clean((idict or {}).get("zsm_code")),
            },
        }

        inc_blk = incentive_block(apply_addons(compute_incentive(idict, plan)), month) if idict else None
        sp_blk = sp_block(compute_sp(sdict, plan), month) if sdict else None

        contract = assemble(top, inc_blk, sp_blk)
        (dse_dir / f"{agent}.json").write_text(
            json.dumps(contract, indent=2, ensure_ascii=False, default=_json_default)
        )
        written += 1

    manifest = {
        "month": month,
        "schema_version": SCHEMA_VERSION,
        "totals": {"contracts": written},
        "coverage": {
            "both": len(inc_codes & sp_codes),
            "incentive_only": len(inc_codes - sp_codes),
            "sp_only": len(sp_codes - inc_codes),
        },
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    return manifest
