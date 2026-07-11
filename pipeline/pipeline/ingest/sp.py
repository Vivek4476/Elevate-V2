"""
Ingest the rolling-12-month SP workbook (.xlsb dashboard) into the canonical input frame.

Read positionally (the sheet has duplicate header names). `sheet_overall_was` / gate flags are
carried through only for the Phase-2 reconciliation test.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

import pandas as pd

# 0-based column positions in the SP dashboard (title row 0, header row 1, data from row 2).
POS = {
    "dse_id": 0, "dse_bo_code": 1, "name": 2, "grade": 4, "zone": 5, "vintage": 17,
    "wfyp_ytd_target": 19, "wfyp_ytd_ach": 20, "nop_ytd_target": 24, "nop_ytd_ach": 25,
    "persistency_overall": 30, "reason_for_promotion": 31,
    "pip_wfyp_target": 32, "pip_ach": 33, "pip_remarks": 35,
    "termination_target": 37, "actual_wfyp": 38,
    # carried for reconciliation only:
    "sheet_overall_was": 29, "sheet_wfyp_gate": 22, "sheet_nop_gate": 27,
}
_TEXT_COLS = ["dse_id", "dse_bo_code", "name", "grade", "zone", "vintage",
              "reason_for_promotion", "pip_remarks", "sheet_wfyp_gate", "sheet_nop_gate"]


def _code(v: Any) -> Optional[str]:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    s = str(v).strip()
    return s or None


def load_sp(path: str | Path) -> pd.DataFrame:
    raw = pd.read_excel(path, engine="pyxlsb", header=None, skiprows=2)
    df = pd.DataFrame({name: raw.iloc[:, idx] for name, idx in POS.items()})
    df = df[df["dse_id"].notna()].reset_index(drop=True)
    for c in _TEXT_COLS:
        df[c] = df[c].map(_code)
    return df
