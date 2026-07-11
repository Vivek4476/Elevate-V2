"""
Per-month plan resolution.

The incentive design changes monthly — usually only some components. So each month's plan is
its own file that may `inherit` a prior month and override ONLY the components that changed.
`resolve_plan` walks the inheritance chain and deep-merges, so `plan.2026-05.json` can say
"same as April but the NOP bands moved" without re-specifying the whole plan.

Merge rule: dict keys merge recursively; a list or scalar in the child replaces the parent's
wholesale (you can't half-change a grid — if a grid changes, you supply the new grid).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional


def _deep_merge(base: dict, override: dict) -> dict:
    out = dict(base)
    for k, v in override.items():
        if k in out and isinstance(out[k], dict) and isinstance(v, dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v          # lists + scalars replace wholesale
    return out


def plan_path(root: str | Path, tenant: str, month: str) -> Path:
    return Path(root) / "config" / "tenants" / tenant / f"plan.{month}.json"


def resolve_plan(tenant: str, month: str, root: str | Path,
                 _chain: Optional[list[str]] = None) -> dict:
    """Return the fully-resolved plan for a tenant+month, following `inherits`."""
    chain = _chain or []
    if month in chain:
        raise ValueError("Circular plan inheritance: " + " -> ".join(chain + [month]))
    path = plan_path(root, tenant, month)
    if not path.exists():
        raise FileNotFoundError(f"No plan for {tenant} {month}: {path}")

    doc = json.loads(path.read_text())
    parent = doc.pop("inherits", None)
    if parent:
        base = resolve_plan(tenant, parent, root, chain + [month])
        merged = _deep_merge(base, doc)
        merged["_lineage"] = base.get("_lineage", []) + [parent]
        return merged
    doc["_lineage"] = []
    return doc


def diff_plans(a: dict, b: dict, path: str = "") -> list[tuple[str, object, object]]:
    """Component-level differences between two resolved plans (ignores private `_` keys)."""
    changes: list[tuple] = []
    for k in sorted(set(a) | set(b)):
        if k.startswith("_"):
            continue
        pa, pb = a.get(k, "∅"), b.get(k, "∅")
        here = f"{path}.{k}" if path else k
        if isinstance(pa, dict) and isinstance(pb, dict):
            changes += diff_plans(pa, pb, here)
        elif pa != pb:
            changes.append((here, pa, pb))
    return changes
