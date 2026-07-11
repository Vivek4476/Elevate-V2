"""Pandera schema for the normalized monthly-incentive input frame."""
from __future__ import annotations

import pandera.pandas as pa
from pandera.typing import Series


class IncentiveInput(pa.DataFrameModel):
    agent_code: Series[str] = pa.Field(nullable=False, coerce=True)
    employee_code: Series[str] = pa.Field(nullable=True, coerce=True)
    name: Series[str] = pa.Field(nullable=True, coerce=True)
    grade: Series[str] = pa.Field(nullable=True, coerce=True)
    branch_code: Series[str] = pa.Field(nullable=True, coerce=True)
    status: Series[str] = pa.Field(nullable=True, coerce=True)
    target_monthly: Series[float] = pa.Field(ge=0, nullable=True, coerce=True)
    # WFYP/FYP can be NEGATIVE (net of surrenders, clawbacks, policy adjustments) — no lower bound.
    wfyp_others: Series[float] = pa.Field(nullable=True, coerce=True)
    wfyp_ulip_gap: Series[float] = pa.Field(nullable=True, coerce=True)
    ulip_fyp: Series[float] = pa.Field(nullable=True, coerce=True)
    persistency_cm: Series[float] = pa.Field(ge=0, le=3, nullable=True, coerce=True)
    persistency_lm: Series[float] = pa.Field(ge=0, le=3, nullable=True, coerce=True)
    nop_count: Series[float] = pa.Field(ge=0, nullable=True, coerce=True)
    pifa_ytd_met: Series[bool] = pa.Field(nullable=True, coerce=True)

    class Config:
        strict = False   # extra columns allowed (e.g. sheet_final_amount for reconciliation)
        coerce = True


# Human metadata used to generate the reference template (meaning / example / required).
COLUMN_META = [
    ("agent_code",     "Unique DSE agent code",                       "text",   "AAA634",       True),
    ("employee_code",  "HR employee code (join key to SP)",           "text",   "603310",       True),
    ("name",           "DSE full name",                               "text",   "Lakshya Hingorani", False),
    ("grade",          "Business designation code",                   "text",   "SPMG",         False),
    ("branch_code",    "Branch code",                                 "text",   "701",          False),
    ("status",         "ACTIVE / INACTIVE",                           "text",   "ACTIVE",       False),
    ("target_monthly", "Monthly WFYP target (₹)",                     "number", "300000",       True),
    ("wfyp_others",    "Non-ULIP WFYP for the month (₹)",             "number", "6303.03",      True),
    ("wfyp_ulip_gap",  "ULIP+GAP WFYP for the month (₹)",             "number", "550000",       True),
    ("ulip_fyp",       "ULIP+GAP FYP for the month (₹)",              "number", "550000",       True),
    ("persistency_cm", "13-month persistency, current month (0-1)",   "number", "0.9542",       True),
    ("persistency_lm", "13-month persistency, last month (0-1)",      "number", "0.9487",       True),
    ("nop_count",      "Number of policies (NOP) for the month",      "number", "1",            True),
    ("pifa_ytd_met",   "YTD PIFA criteria met? TRUE/FALSE",           "boolean","FALSE",        True),
]
