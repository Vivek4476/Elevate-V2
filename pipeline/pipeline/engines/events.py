"""
Real-event stream (migration Step 10 / Phase 6) — feeds the Pulse / celebrate() / Streak.

Events are derived by diffing the current contract against the PRIOR published contract (a real
change), never fabricated. `emit` returns newest-most-relevant events for one DSE.
"""
from __future__ import annotations

GATE_NAMES = {"wfyp_75": "WFYP", "nop_50": "NOP", "was_100": "WAS", "persistency_87": "Persistency"}


def emit(current: dict, prior: dict | None = None) -> list:
    """Diff current vs prior contract → real events. With no prior, surface current standing."""
    out = []
    sp = (current or {}).get("sp") or {}
    inc = (current or {}).get("incentive") or {}
    psp = (prior or {}).get("sp") or {} if prior else {}

    # gate cleared vs last publish (false → true)
    cur_gates, prev_gates = sp.get("gates") or {}, psp.get("gates") or {}
    for k, name in GATE_NAMES.items():
        if cur_gates.get(k) and prior is not None and not prev_gates.get(k):
            out.append({"kind": "gate_cleared", "good": True, "text": f"{name} gate cleared", "tag": "new"})

    # newly eligible
    if sp.get("eligible") and prior is not None and not psp.get("eligible"):
        out.append({"kind": "milestone", "good": True, "text": "You're now promotion-eligible", "tag": "eligible"})

    # standing (always useful; not a diff)
    if sp.get("gates"):
        for k, name in GATE_NAMES.items():
            if sp["gates"].get(k):
                out.append({"kind": "gate_cleared", "good": True, "text": f"{name} gate cleared", "tag": "done"})
    rec = inc.get("recoverable") or []
    total = sum(r.get("amount", 0) for r in rec)
    if total > 0:
        out.append({"kind": "recoverable", "good": False, "text": f"₹{round(total):,} recoverable this month", "tag": "claim"})

    # de-dup by text, keep first (diff events rank above standing)
    seen, uniq = set(), []
    for e in out:
        if e["text"] not in seen:
            seen.add(e["text"])
            uniq.append(e)
    return uniq[:6]
