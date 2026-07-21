# Making the "Plan" What-If Surface Feel Lucrative — Research Synthesis

**Date:** 2026-07-17
**Question:** How should a goal-seek earnings/promotion simulator in a sales-incentive app feel *lucrative, aspirational and trustworthy* — not like a form — for money-literate insurance DSEs, honoring the hard rule (this-month ₹ incentive and rolling-12-mo promotion % are never fused)?
**Method:** 5 parallel sourced research agents (commission tools · consumer finance goal-seek · gig earnings-goals · interaction/motion craft · behavioral psychology & ethics), each with named references and adopt/adapt/avoid.

---

## The convergent findings (what 3+ angles independently agreed on)

These are the high-confidence levers — different domains arrived at the same moves.

1. **Gap-to-goal in the native unit is the hero number — not a percentage bar.**
   YNAB shows "$X more this month," DoorDash "3 more deliveries to earn $50," Qobra "next slab in ₹X," and goal-gradient research says motivation rises as that gap visibly shrinks. → *The single most important change: lead with "₹1,647 to your next slab" / "2 policies to promotion-eligible," rendered as the biggest thing on screen.*

2. **Marginal value beats cumulative total.** Qobra's "what your next ₹1,000 closed earns *right now*" is called "the single most actionable number for any rep mid-period." → *Add a callout: "Your next policy this month is worth ₹X."*

3. **Show the cliff on the track — a bending curve, not a bar.** Qobra plots earnings vs attainment as a line that visibly *kinks* at each accelerator; motion research says put a threshold tick on the slider itself ("₹50 more unlocks the 8% slab"). The discontinuity is the lucrative feeling. → *Render the slab ladder with visible cliffs and the ₹ jump at each.*

4. **Contribution attribution / drill-to-receipt builds trust with numerate users.** Uber's per-trip "Quest contribution" line, Xactly's click-a-payout-→-see-the-deal, and the *labor illusion* (Buell & Norton: showing the work increases perceived value) all say the same thing. → *Tap any figure → "how this is built" (which policies/premiums moved it).* Our numerate DSEs will trust a number they can open.

5. **On Track / Off Track + a lever in the same breath.** Betterment never leaves you at a bare status — off-track always ships with 2–3 concrete fixes. YNAB shows the exact gap each period. → *The promotion projection must always land "at this pace ~9 months — add 2 policies/month to pull it to ~6."*

6. **One lever at a time.** Credit Karma changes a single scenario; Empower's live single slider; motion craft's "delta is the hero." Isolating one input builds correct causal intuition — *and it structurally protects the hard rule* (a slider that only touches ₹ can never fuse in a %).

7. **Premium number motion = digit-settle odometer, not a count-up.** A linear tween ₹5,356→₹7,652 reads as a slot machine. NumberFlow / the CSS odometer pattern settle each *changed* digit independently. `tabular-nums` + per-digit `translateY` + our signature easing gets ~80% of the quality with **zero dependencies** — fits our build-less app.

8. **Anchor the default target to the DSE's own trailing performance,** not a company stretch (anchoring principle; Uber shows last week's actuals before you set a goal). Their own "next achievable slab" reads as guidance; a top-performer number reads as pressure.

9. **Honest projection, no fake precision.** Every credit/retirement tool disclaims precision rather than hiding it (Betterment's band, FICO's "estimate, not a prediction," the weather-forecast model). Our existing "at this pace, ~N months · assumes renewals ≥87%" is exactly right — validated by the research, keep it.

10. **Loss framing works (2×) but only for real, time-bound, in-reach amounts — and in gold, never red.** Prospect theory says losses loom ~2× larger, but for a numerate audience a *manufactured* loss destroys trust. → *"₹4,846 recoverable before month-end" (gold = opportunity, with the math shown), not a red deficit, and never for hypothetical upside.*

---

## Angle-by-angle references

### 1 · Sales commission / quota what-if simulators
- **Qobra Commission Calculator** — a **bending earnings-vs-attainment curve** with visible kinks at each accelerator; outputs **marginal rate** ("your next ₹X earns ₹Y"), effective rate, and a per-band attribution table. The clearest public example of the mechanic. [qobra.co/tool/commission-calculator](https://www.qobra.co/tool/commission-calculator)
- **Forma.ai "Go-Get Cards"** — personalized cards naming the *specific accelerators/spiffs the rep is close to* and the deals to pursue — reframes calculator → coach. [forma.ai](https://www.forma.ai/resources/article/3-tips-for-a-great-sales-commission-dashboard)
- **Everstage "Crystal"** — simulate by toggling *real pipeline deals* on/off, not abstract sliders. [everstage.com](https://www.everstage.com/products/incentives/crystal-commission-forecasting)
- **QuotaPath** — "component cards" that make each tier transition (8%→10%) a first-class UI object. [quotapath.com](https://www.quotapath.com/blog/real-time-commission-tracking-accelerators-quota/)
- **Xactly Incent** — click any payout → drill to the originating deal/tier ("receipt"). [xactlycorp.com](https://www.xactlycorp.com/products/xactly-incent)
- **Spiff** — commission estimate inline on the deal record, zero context-switch. [spiff.com](https://spiff.com/)

### 2 · Consumer financial goal-seek & projection
- **Credit Karma Score Simulator** — one scenario at a time; explicit "estimate, not a prediction." [creditkarma.com](https://www.creditkarma.com/tools/credit-score-simulator)
- **Betterment Goal Forecaster** — median line + 80% band; **On Track / Off Track** binary always paired with levers (raise contribution / extend timeline / add lump sum). [betterment.com](https://www.betterment.com/legal/goal-projection)
- **Empower Retirement Planner** — live single-slider (drag retirement age, everything updates); **Recession Simulator** narrativizes risk with a *named historical event* instead of an abstract cone. [empower.com](https://www.empower.com/tools/retirement-planner)
- **YNAB Targets** — back-solves required contribution; "$X more this period" gap; a "snooze" that avoids the broken-streak shame spiral. [ynab.com](https://www.ynab.com/features/goal-tracking)
- **Wealthfront Path** — open-ended scenario exploration *is* the product. [wealthfront.com](https://www.wealthfront.com/planning)

### 3 · Gig earnings-goal & quest UIs
- **Uber Quests** — per-trip "Quest contribution" line (attribution); shows last week's actuals to calibrate the goal; **Privacy Mode** to hide the live ticker (the single most trust-building detail). [uber.com/blog](https://www.uber.com/us/en/blog/quest-goals/)
- **DoorDash Challenges** — persistent "3 more deliveries to earn $50" bar; stacked meters from one action. [help.doordash.com](https://help.doordash.com/en-us/dashers/article/dasher-challenges)
- **Lyft Ride Challenges** — 5-level tiered ladder reframes one big goal as a sequence of small wins. [ridesharingdriver.com](https://www.ridesharingdriver.com/lyft-driver-bonus-guide/)
- **The dark-pattern line (AVOID):** "you're so close" off-hours pings, moving goalposts/dispatch manipulation, streak-zeroing, social-proof shaming, forward-dispatch autoplay. [pomegranate.co.uk](https://pomegranate.co.uk/our-blog/uberpsychology)

### 4 · Interaction & motion craft
- **NumberFlow** (Barvian) — per-digit spin/settle, `Intl.NumberFormat`, framework-agnostic web component; the *pattern* is portable to vanilla JS. [number-flow.barvian.me](https://number-flow.barvian.me/)
- **CSS odometer** (HubSpot Odometer / CSS-Tricks) — digit strips + `translateY` in an `overflow:hidden` mask; zero-dependency version of the premium feel. [css-tricks.com](https://css-tricks.com/animating-number-counters/)
- **`font-variant-numeric: tabular-nums`** — the highest-leverage single CSS line; stops layout jitter.
- **Emil Kowalski** — animations <300ms; one signature easing everywhere; never animate high-frequency (slider-drag) actions. [emilkowal.ski](https://emilkowal.ski/ui/great-animations)
- **NN/g sliders vs steppers** — "for precise input a slider can never beat a text field"; use **coarse slider + fine editable field** for money. [nngroup.com](https://www.nngroup.com/articles/gui-slider-controls/)
- **Waterfall/bridge chart** for "how this number is built"; **tornado** idea (which lever matters most) as a one-line hint, not a chart.
- **Robinhood confetti** — removed after regulatory blowback for gamifying financial risk → precedent for "restrained, not slot-machine." [cnbc.com](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html)

### 5 · Behavioral psychology & the ethical line
- **Goal-gradient effect** (Hull; coffee-card field study) — effort rises near the finish; compress/emphasize the last segment. [cursorup.com](https://www.cursorup.com/blog/goal-gradient-effect)
- **Endowed progress** (Nunes & Drèze 2006) — a real head-start increases completion; frame partial-month progress as "already X% there" (only if real). [coglode.com](https://www.coglode.com/nuggets/endowed-progress-effect)
- **Loss aversion** (Kahneman & Tversky) — losses ~2× gains; up to 150% more behavior change under loss framing — use sparingly and honestly. [behavioraleconomics.com](https://www.behavioraleconomics.com/resources/mini-encyclopedia-of-be/loss-aversion/)
- **Anchoring** (NN/g) — the default target sets the scale of "big"; anchor to their own history. [nngroup.com](https://www.nngroup.com/articles/anchoring-principle/)
- **Labor illusion** (Buell & Norton, *Management Science*) — showing the work increases trust; our "show the math" is this. [pubsonline.informs.org](https://pubsonline.informs.org/doi/10.1287/mnsc.1110.1376)
- **FTC "Bringing Dark Patterns to Light" (2022)** + **deceptive.design** — dark patterns = design that tricks users into choices they wouldn't make; FTC explicitly names financial gamification that "gives rise to impulsive decisions." [ftc.gov](https://www.ftc.gov/reports/bringing-dark-patterns-light) · [deceptive.design/types](https://www.deceptive.design/types)

---

## The AVOID list (converged across angles)
- ❌ Linear count-up tween (slot-machine feel) — use digit-settle odometer.
- ❌ Confetti / sound / haptic on hypothetical what-if numbers (Robinhood precedent). Reserve one subtle haptic for a *real* milestone only.
- ❌ Monte Carlo cones / probability bands / "67.4% likely" — reads as doubt, not gold-standard, for this audience.
- ❌ Countdown timers, fake urgency/scarcity, "X DSEs closing this slab now."
- ❌ Leaderboards / social-proof shaming / streak-zeroing.
- ❌ Moving goalposts (target creeps up as they approach) — instant trust death with numerate users.
- ❌ Confirmshaming ("Sure you want to leave ₹4,846 unearned?").
- ❌ Any fused ₹+% widget, or one slider that re-labels both — protects the hard rule.
- ❌ Red for the gap — gold = opportunity, always.

---

## Concrete redesign for the Plan surface (mapped to the current build)

Current Plan surface = goal picker → verdict line + path cards (action + ₹ primary + % secondary) → gates list → ETA with pace toggle. Functional but flat. Proposed moves, in priority order:

1. **Hero the gap, as an odometer.** Replace the plain verdict line with a large **"₹1,647 to your next slab"** (or "2 policies to promotion-eligible"), rendered with the vanilla digit-settle odometer + a **goal-gradient progress bar** whose final stretch is visually emphasized. This is the #1 lever.
2. **Slab ladder with visible cliffs.** For the ₹ goals, show the incentive slab ladder as a track where the DSE's position sits below the next **cliff**, labeled with the ₹ jump it unlocks ("cross ₹1,647 → 8% slab → +₹2,296"). The kink *is* the motivation.
3. **Marginal-value line.** "Your next policy this month is worth **₹X** right now." One line, high impact.
4. **Interactive goal-seek, done right.** A **coarse scrubber + fine editable field** for the target; on change, the ₹ figure settles on the odometer and a **gold `+₹X` delta badge staggers in** after (~120ms). Slider track carries the slab-cliff ticks. One lever, one output.
5. **Opportunity-on-the-table card (gold).** The recoverable amount framed as opportunity with the math one tap away — loss-framed only for real, month-bound amounts, in gold.
6. **Attribution / "how this is built."** Upgrade "Show the math" to a 3–4 segment **waterfall** (base → slab → persistency → NOP → final); tapping the hero number opens it. Labor-illusion trust for numerate DSEs.
7. **Promotion side.** Goal-gradient ring (last segment emphasized) + **On-Track/Off-Track + lever in the same breath**; keep the honest "at this pace ~N months · assumptions shown" (validated — don't change).
8. **Hold the wall.** ₹ odometer and % ring stay in separate, window-tagged modules. Never fused. (The one-lever-at-a-time model enforces this for free.)

**Business framing (for the exec layer):** the change turns Plan from a *reference calculator* into a *coach that quantifies the next move* — the mechanism that drives DSE activation is (a) a single, native-unit gap number they can act on today, and (b) a marginal-value nudge that makes the next policy feel worth writing — both grounded in the real reconciled contract, so it motivates without a single manufactured number.

---

*Sources are linked inline per finding. Research method: 5 parallel sourced agents, 2026-07-17.*
