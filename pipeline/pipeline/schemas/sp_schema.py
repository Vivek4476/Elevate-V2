"""Pandera schema for the normalized rolling-12-month SP input frame + a shared validator."""
from __future__ import annotations

import pandera.pandas as pa
from pandera.typing import Series


class SPInput(pa.DataFrameModel):
    dse_id: Series[str] = pa.Field(nullable=False, coerce=True)
    dse_bo_code: Series[str] = pa.Field(nullable=True, coerce=True)
    name: Series[str] = pa.Field(nullable=True, coerce=True)
    grade: Series[str] = pa.Field(nullable=True, coerce=True)
    zone: Series[str] = pa.Field(nullable=True, coerce=True)
    vintage: Series[str] = pa.Field(nullable=True, coerce=True)
    wfyp_ytd_target: Series[float] = pa.Field(ge=0, nullable=True, coerce=True)
    # Rolling achievement nets surrenders/clawbacks and can be negative — no lower bound.
    wfyp_ytd_ach: Series[float] = pa.Field(nullable=True, coerce=True)
    nop_ytd_target: Series[float] = pa.Field(ge=0, nullable=True, coerce=True)
    nop_ytd_ach: Series[float] = pa.Field(nullable=True, coerce=True)
    persistency_overall: Series[float] = pa.Field(ge=0, le=3, nullable=True, coerce=True)
    reason_for_promotion: Series[str] = pa.Field(nullable=True, coerce=True)

    class Config:
        strict = False
        coerce = True


COLUMN_META = [
    ("dse_id",               "HR employee code (join key to Incentive)", "text",   "603310",            True),
    ("dse_bo_code",          "DSE back-office / agent code",             "text",   "AAA634",            False),
    ("name",                 "DSE full name",                            "text",   "Lakshya J Hingorani", False),
    ("grade",                "Business designation code",                "text",   "SPMG",              False),
    ("zone",                 "Zone",                                     "text",   "West",              False),
    ("vintage",              "Tenure bucket",                            "text",   "> 12 Months",       False),
    ("wfyp_ytd_target",      "Rolling-12m WFYP target (₹)",              "number", "10000000",          True),
    ("wfyp_ytd_ach",         "Rolling-12m WFYP achieved (₹)",            "number", "5495002.23",        True),
    ("nop_ytd_target",       "Rolling-12m NOP target",                   "number", "50",                True),
    ("nop_ytd_ach",          "Rolling-12m NOP achieved",                 "number", "43",                True),
    ("persistency_overall",  "Overall persistency (0-1)",                "number", "0.9542",            True),
    ("reason_for_promotion", "Binding promotion criterion label",        "text",   "Final WAS Score",   False),
]


def validate(df, model) -> dict:
    """Run a pandera model lazily and return a structured, human-readable report."""
    try:
        model.validate(df, lazy=True)
        return {"ok": True, "n_rows": int(len(df)), "n_errors": 0, "errors": []}
    except pa.errors.SchemaErrors as exc:
        fc = exc.failure_cases
        # compact per-(column, check) summary
        summary = (
            fc.groupby(["column", "check"], dropna=False)
            .size()
            .reset_index(name="count")
            .to_dict("records")
        )
        return {
            "ok": False,
            "n_rows": int(len(df)),
            "n_errors": int(len(fc)),
            "errors": summary,
        }
