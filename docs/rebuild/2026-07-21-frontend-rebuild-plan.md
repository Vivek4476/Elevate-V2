# Elevate Frontend Rebuild — Architecture & Migration Plan

**Date:** 2026-07-21
**Status:** Study complete → plan for decision (no code yet)
**Decision on the table:** rebuild Elevate's *frontend* on the modern stack (Next.js + shadcn/ui + Magic UI), reusing the entire backend/engine, to reach Linear/Stripe/Mercury quality.
**Method:** 4 parallel sourced reference studies — OpenStatus (real Next.js SaaS), shadcn+Magic UI (component foundation), Linear/Stripe/Mercury (design philosophy), Next.js migration architecture.

---

## 1. The recommendation (one paragraph)

Rebuild **only the view layer** on **Next.js (App Router) + Tailwind + shadcn/ui + Magic UI**, keep **100% of the backend** (Python pipeline, JS engine, Vercel serverless API, Supabase, the reconciled ₹ contract) untouched, and run the new app **alongside the live vanilla app** using Next.js `rewrites` fallback so unbuilt screens transparently fall through to today's `index.html` until parity. **Spike one screen first — `Today` — to validate the whole pipe, then port screen-by-screen.** This is a **days-not-hours** effort but it's the only path to the Mercury/Stripe bar; the single-file vanilla approach is the ceiling we keep hitting.

---

## 2. What we KEEP (the crown jewels are stack-agnostic)

- **Python pipeline + reconcile gates + the ₹5,356.34 contract** — untouched.
- **The incentive/SP engine** (`engine/*.js`: `evaluateDSE`, `evaluateSalesProgression`, `simulate.js` solvers) — **copied verbatim** into `lib/engine/`. Already ES modules → import into React directly, no rewrite, no `window.Sim` global needed inside React.
- **The Vercel serverless API** (`api/dse/[code].js`) + **Supabase** — **left exactly as-is** on the existing project (see §4).
- **Every earned decision**: the SP-vs-incentive hard rule, gold=opportunity/green=banked, the copy, the research (`docs/research/*`), the brand.

The rebuild is the view layer only. Nothing about *how the numbers are computed* changes.

---

## 3. Target stack & repo structure

Next.js App Router · TypeScript · Tailwind (v4, CSS-first theming) · shadcn/ui (owned primitives) · Magic UI (motion) · `next-themes` · deployed on Vercel.

```
elevate-next/
  app/
    layout.tsx                 # fonts, ThemeProvider, viewport (viewportFit:cover)
    globals.css                # @theme inline + :root/.dark brand tokens (OKLCH)
    manifest.ts                # PWA standalone, brand theme_color
    (auth)/login/page.tsx      # Employee ID → phone → OTP
    (tabs)/
      layout.tsx               # shared bottom-nav shell (safe-area)
      today/  earnings/  perform/  career/  plan/   # the 5 tabs
    api/                       # OPTIONAL later: passthrough proxy to legacy API
  components/
    ui/                        # shadcn primitives — NEVER edited directly
    blocks/                    # engine-facing compositions: SlabCard, EarningsSummary,
                               #   IncentiveMeter, PromotionRing, WhatIfLever…
    content/                   # Section / SectionGroup layout primitives (OpenStatus pattern)
  lib/
    engine/                    # ← verbatim copy of engine/*.js (zero rewrite) + .d.ts shim
    format.ts                  # ₹/% formatters + the "never fuse" guardrails
  public/fonts, public/icons
  next.config.ts               # rewrites() fallback → legacy app
```
*Refs: [OpenStatus repo](https://github.com/openstatusHQ/openstatus), [shadcn install](https://ui.shadcn.com/docs/installation).*

---

## 4. Backend reuse — change nothing (lower-risk path)

**Leave `api/dse/[code].js` and Supabase exactly where they are, on the existing Vercel project.** The new Next app calls that same API over HTTPS (from Server Components, or via a same-origin rewrite proxy for `/api/*`).

Why not port the API into Next route handlers now:
- It's **parity-locked to the frozen ₹ contract** — any mechanical move risks subtly changing request/response/cold-start/Supabase-init behavior and forces re-testing the contract.
- Two Vercel projects can safely read one Supabase project (it's just Postgres+REST).
- Port the API into Next **later, as a separate isolated step**, never bundled with the frontend migration.

*Refs: [Incremental Migration to Vercel](https://vercel.com/docs/incremental-migration).*

---

## 5. Keep the vanilla app LIVE during the port (the exact mechanism)

**Next.js `rewrites()` `fallback`** — the strangler-fig pattern, with Vercel's edge as the facade:

1. New Vercel project for the Next app; point the **production domain** at it.
2. `next.config.ts`:
```ts
async rewrites() {
  return { fallback: [ { source: '/:path*', destination: 'https://elevate-legacy.vercel.app/:path*' } ] };
}
```
3. Any route the Next app defines (e.g. `app/today/page.tsx`) is served by Next and takes precedence; **anything not yet built falls through to the legacy static app automatically** — no config redeploy as we add pages.
4. Per-route kill-switch via **Edge Config + Middleware** to flip a screen back to legacy without a redeploy.

Rejected: a `/next` subpath (visible URL change, bad for a bookmarked/installed mobile app) and one-codebase feature flags (forces merging vanilla JS + React into one deploy immediately).

*Refs: [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites), [Vercel multi-app routing](https://vercel.com/academy/nextjs-foundations/multi-app-routing), [Strangler Fig](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig).*

---

## 6. Design system

### 6.1 Tokens — encode the hard rule into the type system
Map the brand into shadcn's CSS-variable tokens (OKLCH, light+dark, one file), and add **first-class semantic tokens** so "never fuse ₹ and %" is *structural*, not disciplinary:
- `--primary` → maroon `#96172E`; `--brand-gold` → sun gradient `#F58220→#FDB913` (don't overload `--primary`); `--background` → paper `#FAF6F2`.
- `--success` → banked green `#0E9A66`; `--warning` → opportunity gold. **Incentive-₹ vs promotion-% live in different color lanes by token, not by convention.**
- Wire `next-themes` even if we ship light-only first (dark mode = free later; likely low priority for a single-brand paper app).

*This is exactly how OpenStatus does it — `packages/theme-store` defines `--success/--warning/--info/--destructive` beyond the shadcn base.* Refs: [shadcn theming](https://ui.shadcn.com/docs/theming), [OpenStatus theme-store](https://github.com/openstatusHQ/openstatus/blob/main/packages/theme-store/src/types.ts).

### 6.2 The Elevate rulebook (codified — hold every screen to these)
1. **Money = tabular/mono figures** (`tnum`), right-aligned in lists; currency never wobbles column width.
2. **Never fuse rolling-% and this-month-₹** — different type track + different color lane (gold vs green), never same card without a divider.
3. **3 easing curves only**: `ease-out` (≤200ms) for appear/confirm · `ease-in-out` (200–300ms) for morph/reorder · `linear` for literal progress. No fourth.
4. **300ms hard ceiling** on UI animation; celebratory exceptions (slab-hit) explicitly flagged.
5. **Frequency-gate every animation**: 20+ triggers/day (tab switch, scroll, filter) → zero animation / instant state.
6. **Keyboard/single-tap triggers never animate themselves** — only the result surface transitions.
7. **Chrome neutral; color = meaning only.** maroon=brand/CTA, gold=opportunity, green=banked. No fourth "for hierarchy" color.
8. **4px spacing grid** `[4,8,12,16,24,32,48,64]`; no arbitrary values.
9. **3 type weights max/surface**; serif=identity/headline, mono=money/codes, sans=operational.
10. **Progressive disclosure over feature-cutting** — money-literate users can hold density if secondary info is one tap away.
11. **`prefers-reduced-motion` handled globally once** at the utility level.
12. **Whitespace is a trust budget** — nothing gets cramped "to fit more in"; if it doesn't fit, it goes behind disclosure.

*Refs: [Emil Kowalski animation rules](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md), [Stripe design](https://www.shadcn.io/design/stripe), [Linear redesign](https://linear.app/now/how-we-redesigned-the-linear-ui), [Vercel Geist](https://github.com/ItamarZand88/design-skills/blob/main/design-md/vercel/DESIGN.md).*

### 6.3 Components & motion
- **Split**: `components/ui/` = shadcn primitives (never edited) · `components/blocks/` = engine-facing compositions.
- **Layout primitive**: `Section`/`SectionGroup` (capped max-width column, `space-y-8` / `space-y-4` / `gap-1.5`) — one vertical rhythm across all screens (OpenStatus pattern; "fixes reads-cleanly more than any color choice").
- **Status cards** = one `cva` component with a `data-variant` (on-track/at-risk/achieved/banked), not N near-duplicates.
- **shadcn shopping list**: Card, Tabs, **Drawer (Vaul)** as the default mobile modal, Sheet, Slider (What-If), Progress (slab bar), Badge (Banked/Opportunity), Chart (recharts → `--chart-*`).
- **Magic UI motion → direct replacements for things we hand-rolled**: **NumberTicker** → the odometer · **Marquee** → the ticker tape · **BlurFade** → staggered card reveal · **ShimmerButton** → primary CTA · **Confetti** → gated to genuine slab-unlock milestones only · **BorderBeam** → active slab card.
- **Origin UI / 21st.dev** → inspiration/snippet layer during design, re-skinned to our tokens; never a live dependency.

*Refs: [Magic UI NumberTicker](https://magicui.design/docs/components/number-ticker), [Marquee](https://magicui.design/docs/components/marquee), [shadcn Drawer](https://ui.shadcn.com/docs/components/radix/drawer), [OpenStatus Section](https://github.com/openstatusHQ/openstatus/blob/main/apps/dashboard/src/components/content/section.tsx).*

### 6.4 Fonts & mobile-feel
- **Fonts**: `next/font/local` for serif+sans+mono (zero CDN request), exposed as `--font-*` and referenced in `@theme`.
- **PWA/native feel**: `app/manifest.ts` `display:standalone`; export `viewport` with `viewportFit:'cover'`; bottom nav `fixed bottom-0` + `pb-[env(safe-area-inset-bottom)]`.

*Refs: [Next fonts](https://nextjs.org/docs/pages/getting-started/fonts), [Next PWA](https://nextjs.org/docs/app/guides/progressive-web-apps), [generateViewport](https://nextjs.org/docs/app/api-reference/functions/generate-viewport).*

---

## 7. Port order & the first spike

**Order:** Login/OTP shell → **Today** → Earnings → Perform → Career → Plan (What-If) → Admin (last, separate).

**Spike FIRST: `Today` (not Plan).** Reasoning (this updates my earlier lean toward Plan):
- Today is **read-mostly** against the existing view-model — it validates the *entire pipe* (engine import untouched · API contract holds · brand tokens · fonts · bottom nav · PWA shell · rewrite fallback routing) with the **least risk** of touching solver logic or ₹-precision.
- Plan is the **highest-complexity** screen (interactive solvers, most state, the hard rule easiest to violate). Spiking it first means debugging React-integration *and* business-logic/precision issues simultaneously — impossible to isolate.
- Once Today proves the architecture, Plan becomes a controlled, isolated risk later — not conflated with foundational unknowns.

**"Spike done" =** Today, on the new stack, rendering the real AAA634 view-model from the live API, with brand tokens + fonts + bottom nav + PWA shell, deployed to a preview URL, and a **parity check** confirming the numbers match the vanilla app exactly.

---

## 8. Effort, risks, mitigations

**Effort** (rough): shell/infra spike (tokens, fonts, PWA, rewrite, shadcn init) ~1–2 days · Login ~1–1.5d · Today ~1d · Earnings ~1d · Perform ~1–1.5d (charts) · Career ~1d · Plan ~2–3d (solver UI + precision guardrails). *These are agent estimates; treat as order-of-magnitude.*

**Risks & mitigations:**
1. **Precision drift** — React formatting could round/format differently than vanilla DOM string interpolation. → **Parity snapshot test**: compare old vs new rendered numbers for a fixed DSE (AAA634) as a merge gate. Non-negotiable.
2. **Shared storage collisions** during parallel run (old app assumes it owns the origin) → namespace `localStorage`/cookie keys.
3. **Two Vercel projects on one Supabase** — safe, but duplicate env/service keys correctly; confirm RLS doesn't assume a single origin.
4. **Momentum cost** — we just shipped V3; this trades "polish the vanilla app" for "build the thing that can be premium." Deliberate.

---

## 9. Open decisions for us

1. **Go / no-go on the Today spike** (1–2 days incl. shell). Recommended: go.
2. **New repo vs. a `elevate-next/` folder in this repo** — I lean a separate repo/project (clean Vercel project for the domain swap), but open.
3. **Dark mode now or later** — recommend wire `next-themes`, ship light-only first.
4. **Admin** — leave the standalone `/admin` legacy for now; port last (or never).
5. **The stalled Vercel auto-deploy webhook** (repo rename) should be fixed before we juggle two projects.

---

*Sources cited inline. Research: 4 parallel sourced agents, 2026-07-21. This is a plan for decision — no code has been written.*
