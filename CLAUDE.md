# CLAUDE.md — Driftlatch Technical Reference

> Complete system reference for engineers and Claude Code sessions. Read this before touching any file.

---

## 1. PROJECT OVERVIEW

**Driftlatch** is a privacy-first, subscription web app for founders and high-drive professionals. The core problem: work stress spills into home life and home tension bleeds into work. Driftlatch intervenes at the boundary.

**Value prop:** A 2-minute Pressure Profile → a short daily check-in → one clear tool recommendation → weekly reflection. Under 10 minutes a day. No message reading, no tracking, no AI summarisation of your data.

**Target users:** Founders, senior professionals, dual-career couples. People who have tried meditation apps and found them too slow or too generic.

**Key differentiators:**
- Privacy-first: only works from what you choose to enter
- Attachment-style-aware tool selection (Anxious / Avoidant / Mixed / Unknown)
- State-gated recommendations: 6 DriftStates × 4 needs × 4 situations × 4 time budgets
- Tool library is static JSON, not AI — deterministic and explainable
- Stripe/Paddle billing: annual ($59/yr) and monthly ($9.99/mo)

---

## 2. TECH STACK

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.1.6 | App Router, server/edge API routes |
| `react` / `react-dom` | 19.2.3 | UI framework |
| `framer-motion` | ^12.34.3 | All animations: `AnimatePresence`, `motion`, `useSpring`, `layoutId`, `pathLength` |
| `@supabase/supabase-js` | ^2.98.0 | Auth (OTP), database, RLS |
| `next-pwa` | ^5.6.0 | PWA/service worker, offline caching |
| `tailwindcss` | ^4 | Installed as dev dep, NOT used in practice — all styles are CSS custom properties + inline `CSSProperties` |

**Build flags:**
- `next dev --webpack` and `next build --webpack` — explicitly uses webpack (not Turbopack)
- PWA disabled in development (`disable: process.env.NODE_ENV === "development"`)

**Fonts (local, no Google):**
- `Inter-VariableFont_opsz,wght.ttf` → `--font-sans`, CSS var `var(--font-sans)`
- `Zodiak-Variable.woff2` → `--font-serif`, CSS var `var(--font-serif)`
- Both loaded via `next/font/local` in [src/app/layout.tsx](src/app/layout.tsx), applied as HTML class variables

**No Tailwind in use.** Even though tailwindcss is installed, zero Tailwind utility classes appear in the codebase. Ignore it.

---

## 3. DESIGN SYSTEM

### CSS Custom Properties (globals.css :root)

```css
--bg: #18181B;            /* page background */
--surface: #27272A;       /* legacy card bg (public pages) */
--text: #F4F4F5;
--muted: #A1A1AA;
--accent: #C27A5C;        /* clay / primary CTA */
--success: #4F7365;
--border: #3F3F46;
--border-2: #52525B;
--shadow: 0px 4px 24px rgba(0,0,0,0.25);
--radius-card: 16px;
--radius-btn: 8px;
--container: 1120px;
--font-sans: (Inter variable)
--font-serif: (Zodiak variable)
```

### In-app Glass Card Spec (all `/app/**` pages)

```
background: rgba(18,18,22,0.9)
border: 1px solid rgba(255,255,255,0.07)
borderRadius: 22px
backdropFilter: blur(24px)
WebkitBackdropFilter: blur(24px)
boxShadow: 0 24px 70px rgba(0,0,0,0.45)
```

Top rim light (every glass card):
```tsx
<div aria-hidden style={{
  position: "absolute", top: 0, left: 16, right: 16, height: 1,
  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
  pointerEvents: "none",
}} />
```

### Colour Palette

| Name | Value | Usage |
|---|---|---|
| Clay / accent | `rgba(194,122,92,1)` | Primary CTAs, active nav, clay state |
| Amber / work | `rgba(208,164,92,1)` or `rgba(220,170,90,1)` | `carrying_work`, `wired` states |
| Blue / recovery | `rgba(100,160,200,1)` | `steady` state |
| Sage / home | `rgba(120,190,150,1)` | `clear_light` state |
| Clay dim / repair | `rgba(194,122,92,0.9)` | active nav item, `come_back` need |
| Overloaded | `rgba(180,80,80,0.16)` | atmosphere |
| Drained | `rgba(90,140,120,0.14)` | atmosphere |

### State Accent Colors (`STATE_ACCENT` in weeklyReflection.ts)

```
clear_light:    "#78C896"
steady:         "#7E9AC6"
carrying_work:  "#C27A5C"
wired:          "#DCAA5A"
drained:        "#6EA290"
overloaded:     "#B66660"
```

### Animation Constants

```tsx
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
// Used in every file as the default cubic-bezier
```

Standard spring: `{ stiffness: 340, damping: 28, mass: 0.9 }` (home page)
NavBar spring on mount: `{ duration: 0.5, ease: EASE }`
Splash fade: `{ duration: 0.6, ease: EASE }`

### Typography Rules

- **Display headings** (in-app): `fontFamily: "Zodiak, Georgia, serif"`, `fontWeight: 700`
- **Body text**: `var(--font-sans)`, system-ui fallback
- **Page h1 in-app**: `clamp(1.8rem, 5vw, 2.4rem)` or similar; `letterSpacing: "-0.05em"`
- **Public landing h1**: `clamp(3.55rem, 5.8vw, 5.25rem)`, `lineHeight: 0.98`
- **Kicker labels**: `fontSize: 12px`, `fontWeight: 600`, `letterSpacing: "0.06em"`, `textTransform: "uppercase"`, `color: var(--muted)`

### Spacing Rules

- Main content column max-width: `640px` (all in-app pages)
- Checkin column width: `min(560px, calc(100vw - 40px))`
- Page padding: `48px 0 100px` or `44px 18px 100px` (all in-app pages)
- Bottom padding always `100px` to clear the fixed NavBar
- NavBar height: `64px`, positioned `bottom: 16px`
- AppLayout bottom padding: `calc(96px + env(safe-area-inset-bottom))` when NavBar shown

### Component Patterns

**NavBar item active state:**
```
color: rgba(194,122,92,0.9)
background: rgba(194,122,92,0.12)
borderRadius: 14
```

**NavBar item inactive:**
```
color: rgba(161,161,170,0.45)
background: transparent
```

**Button primary:** `background: var(--accent)`, white text, `border-radius: var(--radius-btn)` (8px)
**Button ghost:** `border: 1px solid var(--border-2)`, transparent bg

### globals.css Additions (appended at bottom)

```css
@keyframes drawStroke {
  from { stroke-dashoffset: var(--path-length, 200); }
  to   { stroke-dashoffset: 0; }
}

::-webkit-scrollbar { width: 0; height: 0; }

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: rgba(194,122,92,0.4);
  box-shadow: 0 0 0 3px rgba(194,122,92,0.08);
}

/* Hero cinematic scene animations */
@keyframes floatParticle {
  0%   { transform: translateY(0px);    opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.6; }
  100% { transform: translateY(-220px); opacity: 0; }
}

@keyframes steamRise {
  0%   { transform: translateY(0) scaleX(1);       opacity: 0.4; }
  50%  { transform: translateY(-12px) scaleX(1.3); opacity: 0.2; }
  100% { transform: translateY(-24px) scaleX(0.8); opacity: 0; }
}

/* Landing navbar "Log in" link */
.nav-login {
  font-size: 14px; font-weight: 500;
  color: rgba(161,161,170,0.65);
  text-decoration: none; margin-right: 20px;
  letter-spacing: -0.01em; transition: color 0.2s ease;
  display: inline;
}
.nav-login:hover { color: rgba(244,244,245,0.88); }
/* Hidden at ≤768px alongside other nav links */

/* Step flow pulse — used by thanks page flow + home tutorial */
@keyframes dlStepPulse {
  0%   { box-shadow: 0 0 0 0 rgba(194,122,92,0.4); }
  70%  { box-shadow: 0 0 0 12px rgba(194,122,92,0); }
  100% { box-shadow: 0 0 0 0 rgba(194,122,92,0); }
}

/* Native app feel */
html, body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}
button, a, [role="button"],
.kicker, .navLink, .navLogo, .navWordmark, .nav-login,
.mobileMenuLink, .bottomNavItem, .bottomNavLabel, .bottomNavIcon,
.faqTrigger, h1, h2, h3 {
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
p, input, textarea, .selectable, .selectable * {
  -webkit-user-select: text;
  user-select: text;
}
@media (display-mode: standalone) {
  body { padding-top: env(safe-area-inset-top); }
}
```

**Smart-quote bug (fixed):** the `details summary::after` and `.faqSummary::after` rules previously used curly quotes (U+201C/U+201D) around `+` and `-`, which CSS silently rejects. Always use straight ASCII `"..."` in `content:` values.

---

## 4. ROUTE MAP

### Public Routes

| Route | File | Purpose |
|---|---|---|
| `/` | [src/app/page.tsx](src/app/page.tsx) | Marketing landing — hero, how it works, pricing, FAQ |
| `/login` | [src/app/login/page.tsx](src/app/login/page.tsx) | OTP email login (2-phase: email → 6-digit code) |
| `/buy` | [src/app/buy/page.tsx](src/app/buy/page.tsx) | Paddle checkout page (annual/monthly) |
| `/thanks` | [src/app/thanks/page.tsx](src/app/thanks/page.tsx) | Post-purchase thank you |
| `/pricing` | [src/app/pricing/page.tsx](src/app/pricing/page.tsx) | Detailed pricing page |
| `/pressure-profile` | [src/app/pressure-profile/page.tsx](src/app/pressure-profile/page.tsx) | Public Pressure Profile quiz (20 Qs) — no auth needed |
| `/pressure-eq` | [src/app/pressure-eq/page.tsx](src/app/pressure-eq/page.tsx) | Pressure EQ snapshot — 8 scenario-based questions producing a 6-domain fingerprint. No auth gate; accessible for first-time takers and retakes alike |
| `/pressure-eq/result` | [src/app/pressure-eq/result/page.tsx](src/app/pressure-eq/result/page.tsx) | Post-quiz result: archetype, opening paragraph, hexagon, domain bars |
| `/privacy` | [src/app/privacy/page.tsx](src/app/privacy/page.tsx) | Privacy policy |
| `/terms` | [src/app/terms/page.tsx](src/app/terms/page.tsx) | Terms of service |
| `/refunds` | [src/app/refunds/page.tsx](src/app/refunds/page.tsx) | Refund policy |
| `/robots.ts` | [src/app/robots.ts](src/app/robots.ts) | Robots.txt |

### Protected Routes (behind AppLayout auth guard)

| Route | File | Purpose |
|---|---|---|
| `/app` | [src/app/app/page.tsx](src/app/app/page.tsx) | Home — state dot, today's recommendation, quick-action cards, weekly mini-movement |
| `/app/checkin` | [src/app/app/checkin/page.tsx](src/app/app/checkin/page.tsx) | Check-in flow — state picker → need/time/situation → tool recommendation |
| `/app/tool/[id]` | [src/app/app/tool/[id]/ToolClient.tsx](src/app/app/tool/%5Bid%5D/ToolClient.tsx) | Tool detail — instructions, feedback form, save/pin |
| `/app/packs` | [src/app/app/packs/page.tsx](src/app/app/packs/page.tsx) | Tool library — browse all packs, search |
| `/app/packs/[id]` | [src/app/app/packs/[id]/page.tsx](src/app/app/packs/%5Bid%5D/page.tsx) | Individual pack — tools filtered by pack |
| `/app/weekly` | [src/app/app/weekly/page.tsx](src/app/app/weekly/page.tsx) | Weekly reflection — 7-day summary, insights, worked tools |
| `/app/eq` | [src/app/app/eq/page.tsx](src/app/app/eq/page.tsx) | Pressure EQ dashboard — archetype, hexagon fingerprint, 6 domain bars, weekly EQ arc, focus area, recent moment reviews, persistent retake link |
| `/app/eq/moment` | [src/app/app/eq/moment/page.tsx](src/app/app/eq/moment/page.tsx) | Moment review — logs a single interaction to `user_moment_reviews` for EQ sharpening |
| `/app/account` | [src/app/app/account/page.tsx](src/app/app/account/page.tsx) | Account — profile, defaults, billing, data export, delete |
| `/app/onboarding` | [src/app/app/onboarding/page.tsx](src/app/app/onboarding/page.tsx) | Onboarding quiz (same 20 Qs as pressure-profile but in-app, syncs to profile) |
| `/app/setup` | [src/app/app/setup/page.tsx](src/app/app/setup/page.tsx) | Post-auth setup (username/display name, runs once) |
| `/app/action` | [src/app/app/action/page.tsx](src/app/app/action/page.tsx) | Quick-action shortcut page |
| `/app/tools` | [src/app/app/tools/page.tsx](src/app/app/tools/page.tsx) | Tools listing (secondary, not in primary nav) |
| `/app/dev-test` | [src/app/app/dev-test/page.tsx](src/app/app/dev-test/page.tsx) | Dev testing page |

### API Routes

| Route | File | Purpose |
|---|---|---|
| `POST /api/paddle/webhook` | [src/app/api/paddle/webhook/route.ts](src/app/api/paddle/webhook/route.ts) | Paddle webhook handler (edge runtime) |
| `POST /api/user/delete` | [src/app/api/user/delete/route.ts](src/app/api/user/delete/route.ts) | GDPR account deletion (edge runtime) |

---

## 5. DATA MODEL

All tables are in the `public` schema. RLS is configured on Supabase dashboard (not in migration files shown).

### `user_profile`
Primary record created at first login.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK | References `auth.users(id)`, unique index enforced |
| `username` | `text` | Lowercase email address (set at login) |
| `display_name` | `text` | Human-readable name from onboarding |
| `attachment_style` | `text` | `"Anxious"`, `"Avoidant"`, `"Mixed"`, or `"Unknown"` |
| `defaults` | `jsonb` | `{ default_need, default_time, default_situation, primary_pack_ids, top_patterns }` |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | Ordered by this descending when multiple rows exist (dedup handled by migration) |

Upserted on `user_id` conflict. If multiple rows exist, the most recently updated is used (migration `20260322000100` deduped them).

### `user_entitlements`
One row per user. Upserted on `user_id` conflict.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK | References `auth.users(id)` on delete cascade |
| `plan` | `text` | `"annual"` or `"monthly"` |
| `status` | `text` | `"active"`, `"inactive"`, `"canceled"`, `"expired"`, `"past_due"`, `"trialing"` |
| `paddle_customer_id` | `text` | Unique index (nullable) |
| `paddle_subscription_id` | `text` | Unique index (nullable) |
| `paddle_transaction_id` | `text` | Last transaction |
| `current_period_end` | `timestamptz` | When the subscription period ends |
| `cancel_at_period_end` | `boolean` | True if cancellation is scheduled |
| `last_event_id` | `text` | Idempotency: last Paddle event ID processed |
| `last_event_type` | `text` | e.g. `"subscription.updated"` |
| `last_event_at` | `timestamptz` | Used to reject stale webhook replays |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Access gate:** `hasAppAccess(status)` → `status === "active"` only.

### `user_checkins`
One row per check-in. Append-only.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Auto-generated |
| `user_id` | `uuid` | FK (nullable per type) |
| `created_at` | `timestamptz` | |
| `state` | `text` | `DriftState` value |
| `need` | `text` | `DriftNeed` value |
| `tool_id` | `text` | Tool ID from toolLibrary.json |
| `did_complete` | `boolean` | Did the user complete the tool |
| `time_minutes` | `integer` | 1 / 3 / 5 / 10 |
| `situation` | `text` | `DriftSituation` value |
| `room_tone` | `text` | `RoomTone` value (added migration `20260325`) |
| `source` | `text` | `"checkin"` or `"home"` (added migration `20260326`) |

### `user_tool_feedback`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | Nullable |
| `tool_id` | `text` | |
| `helpful_score` | `integer` | 1–5 |
| `shift` | `text` | Qualitative shift description |
| `notes` | `text` | Optional free-text |
| `next_day_helped` | `boolean` | Optional follow-up |
| `created_at` | `timestamptz` | |

### `user_saved_tools`

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK part | |
| `tool_id` | `text` PK part | Conflict: `user_id,tool_id` |
| `created_at` | `timestamptz` | |

### `user_recent_tools`

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK part | |
| `tool_id` | `text` PK part | |
| `used_at` | `timestamptz` | Updated on each visit via `touchRecent()` |

### `user_pins`

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK part | |
| `context_key` | `text` PK part | String key identifying the check-in context |
| `tool_id` | `text` | Pinned tool for that context |
| `created_at` | `timestamptz` | |

Context key format: `"need={need}|state={state}|situation={situation}|roomTone={roomTone}|time={time}"`

### `user_eq_profile`
One row per user (unique on `user_id`). Written by `/pressure-eq` on quiz completion via `upsert({ onConflict: "user_id" })`.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` PK | Unique — the upsert conflict target |
| `pressure_reading` | `integer` | 0–100 score |
| `repair_instinct` | `integer` | 0–100 score |
| `presence_quality` | `integer` | 0–100 score |
| `boundary_intel` | `integer` | 0–100 score |
| `recovery_aware` | `integer` | 0–100 score |
| `signal_accuracy` | `integer` | 0–100 score |
| `weakest_domain` | `text` | One of the six domain keys |
| `archetype` | `text` | `"The Carrier"`, `"The Avoider"`, `"The Ghost"`, `"The Open Loop"`, `"The Runner"`, `"The Reactor"` |
| `has_kids_context` | `boolean` | |
| `has_partner_context` | `boolean` | |
| `opening_paragraph` | `text` | Generated narrative copy |
| `completed_at` | `timestamptz` | **Must be explicitly written on every upsert** — the `/app/eq` query orders by `completed_at desc limit 1` so if this field is not bumped on retake, new scores never surface |
| `version` | `integer` | Snapshot version. The `/app/eq` reassessment prompt triggers only when `version === 1 && daysSinceCompleted > 30` |

### `user_moment_reviews`
Append-only log of interactions the user reviewed. Feeds the "Recent reviews" section on `/app/eq`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | |
| `who_involved` | `text` | **NOT `who`** — full column name is `who_involved`. Values: `"partner"`, `"child"`, `"colleague"`, `"friend"`, `"parent"`, `"other"` |
| `moment_type` | `text` | **NOT `moment`** — full column name is `moment_type`. Values: `"arrived_home"`, `"dinner"`, `"bedtime"`, `"morning"`, `"weekend"`, `"conversation"`, `"argument"`, `"other"` |
| `created_at` | `timestamptz` | |

---

## 6. KEY FILES

| File | Role |
|---|---|
| [src/app/app/layout.tsx](src/app/app/layout.tsx) | Auth guard — session → entitlement → setup → ready. Renders AppSplash + NavBar |
| [src/app/app/NavBar.tsx](src/app/app/NavBar.tsx) | 5-item bottom pill nav — centering uses `x: "-50%"` (Framer Motion style), NOT CSS `transform` |
| [src/app/app/AppSplash.tsx](src/app/app/AppSplash.tsx) | One-per-session SVG chevron splash screen |
| [src/app/app/page.tsx](src/app/app/page.tsx) | Home screen — 1600+ lines, most complex page |
| [src/app/app/checkin/page.tsx](src/app/app/checkin/page.tsx) | Step-by-step check-in flow |
| [src/app/app/tool/[id]/ToolClient.tsx](src/app/app/tool/%5Bid%5D/ToolClient.tsx) | Tool detail & feedback |
| [src/lib/auth.ts](src/lib/auth.ts) | All auth functions: `loadAuthState`, `loadUserEntitlement`, `hasAppAccess`, `hasCompletedSetup`, `syncUserProfileIdentity`, `signOut` |
| [src/lib/selectTool.ts](src/lib/selectTool.ts) | Scoring engine — returns `{ primary, alternates, reason, debug }` |
| [src/lib/toolLibrary.ts](src/lib/toolLibrary.ts) | Type definitions, LIBRARY constant, energy/social demand normalisation |
| [src/lib/toolLibrary.json](src/lib/toolLibrary.json) | Static tool data — all packs and tools |
| [src/lib/quickFlow.ts](src/lib/quickFlow.ts) | Builds `QuickRecommendation` from state + defaults |
| [src/lib/weeklyReflection.ts](src/lib/weeklyReflection.ts) | All weekly reflection logic — `buildWeeklyReflection`, `WeeklyDaySummary`, state ladder |
| [src/app/app/eq/page.tsx](src/app/app/eq/page.tsx) | EQ dashboard — hexagon + domain bars + weekly arc + moment reviews + persistent retake strip |
| [src/app/pressure-eq/page.tsx](src/app/pressure-eq/page.tsx) | Pressure EQ quiz page — intro → 8 scenarios → computes scores → upserts `user_eq_profile` → redirects to `/pressure-eq/result`. Stores `optionIndex` (0–3) per scenario, NOT the raw score value |
| [src/lib/eqQuestions.ts](src/lib/eqQuestions.ts) | Scenario bank (~48 scenarios, 8 per domain), `drawEQScenarios`, `calculateEQScores` (expects `{ scenarioId: optionIndex (0–3) }`), `getWeakestDomain`, `getArchetype`, `generateOpeningParagraph` |
| [src/components/EQHexagon.tsx](src/components/EQHexagon.tsx) | Radial 6-spoke hexagon visualisation for fingerprint |
| [src/lib/roomTone.ts](src/lib/roomTone.ts) | `RoomTone` types and options per situation |
| [src/lib/supportLabels.ts](src/lib/supportLabels.ts) | `NEED_DISPLAY`, `PACK_DISPLAY`, label helpers |
| [src/lib/publicProfile.ts](src/lib/publicProfile.ts) | localStorage keys + sync for public Pressure Profile results |
| [src/lib/personalizedCopy.ts](src/lib/personalizedCopy.ts) | Copy generation for "Why this now" and home picker lines |
| [src/lib/store.ts](src/lib/store.ts) | CRUD for saved tools, recent tools, pins, profile |
| [src/lib/supabaseBrowser.ts](src/lib/supabaseBrowser.ts) | Singleton Supabase client (browser) |
| [src/lib/supabaseAdmin.ts](src/lib/supabaseAdmin.ts) | Admin Supabase client (server-only, uses SERVICE_ROLE_KEY) |
| [src/lib/paddle.ts](src/lib/paddle.ts) | Paddle webhook types, `verifyPaddleSignature`, `normalizeEntitlementStatus`, plan resolution |
| [src/lib/types/supabase.ts](src/lib/types/supabase.ts) | Generated Supabase types (`Tables`, `TablesInsert`, `TablesUpdate`) |
| [src/app/api/paddle/webhook/route.ts](src/app/api/paddle/webhook/route.ts) | Paddle webhook handler (edge runtime) |
| [src/app/api/user/delete/route.ts](src/app/api/user/delete/route.ts) | GDPR account deletion (edge runtime, deletes all user data then auth record) |
| [src/app/globals.css](src/app/globals.css) | Global CSS — custom properties, public page styles, in-app additions appended at bottom |
| [src/app/layout.tsx](src/app/layout.tsx) | Root layout — font loading, metadata, PWA meta tags |
| [next.config.ts](next.config.ts) | next-pwa config with runtime caching strategies |
| [public/manifest.json](public/manifest.json) | PWA manifest |

---

## 7. BUSINESS LOGIC

### Tool Selection Algorithm (`selectTool` in src/lib/selectTool.ts)

**Input (`SelectInput`):**
- `state: DriftState` — user's current cognitive/emotional state
- `need: DriftNeed` — what they want (clarity / wind-down / be present / repair)
- `situation: DriftSituation` — who's around
- `timeMinutes: 1 | 3 | 5 | 10` — available time
- `attachmentStyle?: AttachmentStyle` — from profile
- `roomTone?: RoomTone` — emotional tone of the room
- `mode?: "quick" | "standard"` — affects depth/priority weighting
- `excludeToolIds?: string[]` — tools already shown ("Another option")
- `preferredPackIds?: string[]` — attachment-style-based pack preferences

**Filtering:**
1. Must match `need` (base filter)
2. Must be completable within `timeMinutes` (`time_min_minutes ≤ minutes ≤ time_max_minutes`)
3. Must pass situation filter — relational tools require explicit situation match; solo tools need no partner/kids

**Scoring (additive):**
- State tag boost (`STATE_TAG_BOOST`): +4 per matching tag
- Situation tag boost (`SITUATION_TAG_BOOST`): +3 per matching tag
- State pack weight (`STATE_PACK_WEIGHT`): favored pack +12, suppressed pack −20
- Attachment pack preference (`ATTACH_PACK`): +14 per pack match
- `selector_priority` high: +8, low: −25
- Room tone match: +10 if tool responds to room tone situation
- Energy demand match (within 1 rank of state): +8 / −6 if mismatched
- Depth weight: `wired`/`overloaded` + `micro` depth: +10; `deep` in quick mode: −20
- Friction weight: high friction (`social_friction=3`) in high-pressure states: −8
- Relational tool with solo situation: −30 (hard penalty)
- Family repeat penalty: most recent family −18, second most recent family −12
- `excludeToolIds` removes exact tools from pool; if pool empty after exclusion, falls back to full pool

**Output:** `{ primary: Tool, alternates: Tool[], reason: string, debug? }`

### Check-in Flow (`src/app/app/checkin/page.tsx`)

Steps in order:
1. **State** — user picks one of 6 `DriftState` options
2. **Room Tone** (conditional) — shown when situation is `partner_nearby`, `kids_around`, or `long_distance`
3. **Need** — 4 options (Clear Head / Wind Down / Be Present / Repair)
4. **Time** — 1 / 3 / 5 / 10 minutes
5. **Situation** — 4 options
6. **Recommendation** — calls `buildQuickRecommendation()`, shows primary tool

After completing, navigates to `/app/tool/[id]?from=checkin&need=...&state=...&situation=...&time=...&roomTone=...&mode=quick`

Check-in mode (`driftlatch_checkin_mode`) toggles between `"quick"` (default) and `"standard"`.

### Weekly Reflection Engine (`src/lib/weeklyReflection.ts`)

`buildWeeklyReflection(checkins, recentTools, feedbackRows, options)` returns `WeeklyReflection`.

Key exports:
- `STATE_LADDER: DriftState[]` — ordered from best to worst: `["clear_light", "steady", "carrying_work", "wired", "drained", "overloaded"]`
- `RANGE_DAYS = 7`
- `HEAVY_ENDING_THRESHOLD = 3` — state rank ≥ 3 counts as heavy
- `WeeklyMode: "full" | "partial" | "empty"` — based on data availability
- `WeeklySignalMode: "explicit" | "implicit" | "recent" | "none"` — how signal was derived
- `WeeklyDaySummary` per day: first state, highest state, latest room tone, completion rate, etc.
- `FULL_SELECT` / `SAFE_SELECT` — column lists for fetching from `user_checkins`
- `STATE_ACCENT` — hex colour per DriftState for visualisation

Room tone adds weight to the day's signal (e.g. `"distant"` = 4, `"tense"` = 3, `"easy"` = 0).

### Entitlement System

Flow on every `/app/**` route load:
1. `loadAuthState()` → gets Supabase session + profile
2. `loadUserEntitlement(userId)` → reads `user_entitlements` table
3. `hasAppAccess(status)` → returns `status === "active"` (trialing is NOT active)
4. `hasCompletedSetup(profile, session)` → true if `profile.username` is non-empty OR session email exists

Status values: `"active"`, `"inactive"`, `"canceled"`, `"expired"`, `"past_due"`, `"trialing"`

### Paddle Webhook Handling (`src/app/api/paddle/webhook/route.ts`)

**Signature verification:** HMAC-SHA256 with 5-minute tolerance window. Verified via `verifyPaddleSignature()` in `src/lib/paddle.ts`.

**Handled events:**
- `subscription.created/activated/updated/trialing` → `buildSubscriptionPayload`
- `subscription.canceled` → status `"canceled"`, `cancel_at_period_end: true`
- `subscription.past_due` → status `"past_due"`
- `subscription.paused` → status `"inactive"`
- `subscription.resumed` → status `"active"`
- `transaction.completed` → `buildTransactionPayload`, status `"active"`
- `transaction.payment_failed` → status `"past_due"`

**User linking:** First checks `custom_data.driftlatch_user_id`. Falls back to matching by `paddle_subscription_id` or `paddle_customer_id`. If no match, logs and returns `{ ok: true, linked: false }`.

**Stale event rejection:** Compares `event.occurred_at` vs `existing.last_event_at`. Ignores if older.

**Plan inference:** From `custom_data.driftlatch_plan`, then from items price/product name containing "annual"/"year"/"month".

### Packs and Tool Library

All content is in `src/lib/toolLibrary.json` (static, bundled at build time). Currently ~220 entries across 10 packs.

**Terminology:** the code/schema calls these `tool`/`tool_id`/`toolLibrary` for historical reasons. User-facing copy calls them **supports**. Do not rename the code identifiers, but do not write "tools" in product copy either — use "supports", "steps", or "moves" depending on context.

Pack IDs and display names:
- `clear_head_pack` → "Clear Head"
- `wind_down_pack` → "Wind Down"
- `be_here_pack` → "Be Present"
- `come_back_pack` → "Repair"
- `settle_the_spiral_pack` → "Overthinking"
- `space_not_distance_pack` → "Take Space"
- `sharp_pack` → "Use the Window"
- `warm_pack` → "Stay Close"
- `expansive_pack` → "Make It Count"
- `maintain_light_pack` → "Stay Steady"

Needs (`DriftNeed`): `"regain_clarity"`, `"wind_down"`, `"be_here"`, `"come_back"`

States (`DriftState`): `"carrying_work"`, `"wired"`, `"drained"`, `"overloaded"`, `"steady"`, `"clear_light"`

Situations (`DriftSituation`): `"partner_nearby"`, `"kids_around"`, `"alone"`, `"long_distance"`

Attachment styles: `"Anxious"`, `"Avoidant"`, `"Mixed"`, `"Unknown"`

### Home Page Tutorial (v2)

5-step onboarding tour rendered on `/app` for first-time users or anyone whose stored version is below current. Lives inline in [src/app/app/page.tsx](src/app/app/page.tsx).

- FSM: `tutorialStep: 0 | 1 | 2 | 3 | 4 | 5 | 6` — 0 = not started, 1–5 = active, 6 = done.
- Version gate: `TUTORIAL_VERSION = 2` constant + localStorage key `driftlatch_tutorial_version` (number). Tutorial starts if stored value < current. The old key `driftlatch_tutorial_done` is no longer written but remains on the `account/page.tsx` data-wipe list for backwards compat.
- Step targets (via refs): state chips row, time chips row, hero recommendation card, moment review strip, weekly section.
- Step 2 auto-skips to step 3 if the selected state is non-hard (`clear_light` / `steady`), since the time chips row does not render in that case.
- `handleQuickStateTap` auto-advances step 1 → step 2 (hard state) or step 1 → step 3 (non-hard).
- Spotlight: inline `outline` + `outlineOffset` + `boxShadow` at `zIndex: 52` on the active target; backdrop sits at `zIndex: 50`.
- Every step change triggers `scrollIntoView({ behavior: "smooth", block: "center" })` on the active ref after an 80 ms settle delay so the tooltip can reposition.
- `TutorialTooltip` is an inline component (not exported). Progress reads `{step} of {totalSteps}` with an animated fill bar.

### Onboarding / Pressure Profile

20 questions scored 0–4 (Never → Almost always). 4 domains: `work`, `recovery`, `home`, `attach`. Result scored into `attachment_style` + `defaults` (preferred need/time/situation/packs). Stored in localStorage during the quiz, synced to `user_profile` on login.

**Result page structure** (shared by `/pressure-profile` and `/app/onboarding`, rendered from [src/app/app/onboarding/page.tsx](src/app/app/onboarding/page.tsx)):

- **Section intro cards:** 1.8 s full-screen transition when crossing a domain boundary (Q5→6, 10→11, 15→16). Tap anywhere to skip. Copy lives in the `SECTION_INTRO_COPY` constant.
- **Segmented domain progress row:** driven by the `groupedProgress` memo — one bar segment per domain, active segment highlighted in clay.
- **Reveal overlay:** on submitting Q20, a 2.4 s "Reading your pattern" overlay (three-dot breathing loop) plays before `setPage("results")`.
- **Name-aware h1:** `"Here's your profile, {name}."` when `displayNameInput` is non-empty, else `"Your Pressure Profile"`.
- **Hero highlight pill:** animated clay-glow pill with pulsing dot and delayed opacity reveal on the primary domain. Text: `"Pressure lands hardest in {primaryDomain}. Driftlatch starts there."`
- **Staggered reveal:** hero, pressure meters, domain cards, and primary-pack card each wrapped in `motion.div` with sequential delays (0, 0.18, 0.36, 0.54 s).
- **Trimmed domain card bodies:** `getWorkCardCopy`, `getRecoveryCardCopy`, `getHomeCardCopy` each kept to ≤ 2 sentences. `getConnectionCardCopy` is intentionally left verbatim because it carries `homeSetup`/style personalization nuance.
- **Detail paragraph:** `buildPersonalizedResultCopy.detail` now only names the patterns (`"The clearest patterns: X and Y."`). The goal line is rendered as its own paragraph via a direct `getGoalLine(priority, homeSetup)` call.

### Pressure EQ

Separate, shorter assessment from the Pressure Profile. 8 scenario-based questions drawn from a bank of ~48 (1 guaranteed per domain + 2 filler). Each option carries a score (1–4) for the scenario's `primaryDomain`.

**Scoring flow (do not break):**
1. User picks an option → `handleOptionSelect(optionIndex)` stores `{ [scenario.id]: optionIndex }` — MUST store the 0–3 index, NOT the score value. Earlier bug stored `score` (1–4), causing `options[4]` lookups and 0-scored domains.
2. On final answer, `calculateEQScores(answers)` reads `scenario.options[optionIndex]` and tallies all 6 domain scores per option (each option scores all 6 domains, not just the primary).
3. Returns `Record<EQDomain, number>` with values 0–100 (domains with no answers default to 50).
4. `getWeakestDomain(scores)` picks lowest. `getArchetype(scores)` maps the weakest domain to one of 6 archetypes.
5. Upserts into `user_eq_profile` with `{ onConflict: "user_id", completed_at: new Date().toISOString() }`. **`completed_at` must be written on every save** — the dashboard orders by it desc limit 1.

**Retake path:** no gate on `/pressure-eq`. Persistent retake strip on `/app/eq` (below the fingerprint card) and small `Retake →` link in the EQ card on `/app/account` (uses `stopPropagation` because the parent card click routes to `/app/eq`).

**Domains (`EQDomain`):** `pressure_reading`, `repair_instinct`, `presence_quality`, `boundary_intel`, `recovery_aware`, `signal_accuracy`.

**Scenario copy style:** plain-language, ≤ 3 sentences, no em dashes. Scenarios `PR-04`, `RI-04`, `RA-02`, `RA-05`, `SA-06` were rewritten for readability — keep scenario prompts concise if expanding the bank.

### Landing Page Copy Reference

Canonical landing copy lives in [src/app/page.tsx](src/app/page.tsx). Update this section whenever the wording ships.

- **Hero kicker:** `FOUNDERS AND PROFESSIONALS`
- **Hero h1:** `Closeness at home. Clarity at work.`
- **Hero subtext:** `You had a good day. Still lost the evening.` + `Work follows you home. Home tension takes your focus at work. Driftlatch helps you break the loop in under ten minutes a day.`
- **Meta line under CTAs:** `2-minute profile. One clear step. Under 10 minutes a day. Private by default.`
- **FAQ order** (in `FAQ_ITEMS`): therapy, pricing, messages/tracking, relationship app, partner doesn't use it, install (`Do I need to install anything?`), refund.
- **Mobile hero composition** lives in [src/app/globals.css](src/app/globals.css) under `@media (max-width: 640px)`. Key overrides: `.hero-text-wrapper` `padding-top: 44px` + `max-width: 100%`, tightened h1 clamp (`1.95rem`–`2.55rem`), CTA row `margin-top: 18px`, `gap: 12px`, `flex-wrap: wrap`, `justify-content: center`. The SVG scene is swapped (not resized) on mobile via a separate viewBox inside the TSX.

---

## 8. STATE & STORAGE

### localStorage Keys

| Key | Stored in | Content |
|---|---|---|
| `driftlatch_splash_shown` | AppSplash.tsx | `"1"` — prevents re-showing splash |
| `driftlatch_saved_tools` | store.ts | `string[]` — tool IDs (unauthenticated fallback) |
| `driftlatch_recent_tools` | selectTool.ts | `string[]` — recent tool IDs for family repeat penalty |
| `driftlatch_checkin_mode` | checkin/page.tsx | `"quick"` or `"standard"` |
| `driftlatch_checkin_preferences` | checkin/page.tsx | `{ need, time, situation }` |
| `driftlatch_public_profile_answers` | publicProfile.ts | `number[]` — quiz answers before account creation |
| `driftlatch_public_profile_context` | publicProfile.ts | `PublicProfileContext` — display name, home setup, priority, etc. |
| `driftlatch_public_profile_result` | publicProfile.ts | `PublicProfileResult` — full scored result with attachment style and defaults |
| `driftlatch_public_profile_completed_at` | publicProfile.ts | ISO timestamp |
| `driftlatch_account_orientation_open` | account/page.tsx | Session storage key — whether orientation section is open |

### Constants from publicProfile.ts

```ts
PUBLIC_PROFILE_ANSWERS_KEY = "driftlatch_public_profile_answers"
PUBLIC_PROFILE_CONTEXT_KEY = "driftlatch_public_profile_context"
PUBLIC_PROFILE_RESULT_KEY = "driftlatch_public_profile_result"
PUBLIC_PROFILE_COMPLETED_AT_KEY = "driftlatch_public_profile_completed_at"
```

---

## 9. AUTH FLOW

### Login (OTP, no password)

1. User enters email → `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`
2. Supabase emails a 6-digit OTP
3. User enters digits → `supabase.auth.verifyOtp({ email, token, type: "email" })`
4. On success: `loadAuthState(session)` syncs profile identity, then `router.replace(redirectPath)`
5. `?next=` param in URL controls post-login redirect (validated by `isSafeAppPath`)

### AppLayout Guard (runs on every `/app/**` page load)

```
loadAuthState()
  → no session → redirect /login?next={pathname}
  → session
    → loadUserEntitlement(userId)
      → !hasAppAccess(status) → redirect /buy
      → hasAppAccess
        → !hasCompletedSetup(profile, session) → redirect /app/setup
        → hasCompletedSetup
          → if on /app/setup → redirect /app
          → else → setReady(true) → render children
```

Also subscribes to `supabase.auth.onAuthStateChange`:
- `SIGNED_OUT` → redirect `/login`
- `SIGNED_IN` / `TOKEN_REFRESHED` / `USER_UPDATED` → re-run guard

### `loadAuthState(sessionOverride?)` in auth.ts

1. Gets session from Supabase (or uses override)
2. Calls `syncUserProfileIdentity(session)` — upserts profile with email as username
3. Calls `syncStoredPublicProfileToAccount(session)` — syncs localStorage quiz result to DB (then clears local storage)
4. Calls `loadUserProfileResult(userId)` — reads `user_profile` table
5. Returns `{ session, profile, diagnostics }`

### `hasCompletedSetup(profile, session)`

Returns true if:
- `profile.username` is a non-empty string, OR
- `session.user.email` is a non-empty string

This means setup is considered complete as soon as email login succeeds, since email becomes the username.

### Supabase Client Singleton

`supabaseBrowser()` in `src/lib/supabaseBrowser.ts` — module-level singleton, anon key, `persistSession: true`, `detectSessionInUrl: false`.

`getSupabaseAdmin()` in `src/lib/supabaseAdmin.ts` — service role key, never auto-refreshes, never persists session. Only used in edge API routes.

`getSupabase()` in `src/lib/supabase.ts` — thin wrapper over `supabaseBrowser()`.

---

## 10. DEPLOYMENT

### Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL            # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY       # Supabase anon key (public, client-side)
SUPABASE_SERVICE_ROLE_KEY           # Supabase service role key (server-only, never expose to client)

PADDLE_WEBHOOK_SECRET               # Paddle webhook signing secret
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN     # Paddle.js client token (public)
NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID  # Paddle price ID for annual plan
NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID # Paddle price ID for monthly plan
NEXT_PUBLIC_PADDLE_ENVIRONMENT      # "sandbox" for test, empty/unset for production
```

### Commands

```bash
npm run dev      # next dev --webpack (webpack enforced, not Turbopack)
npm run build    # next build --webpack
npm run start    # next start
npm run lint     # eslint
npx tsc --noEmit # TypeScript check (zero errors is the baseline)
```

### Build Notes

- PWA (next-pwa) is **disabled in development** — service worker only runs in production builds
- The `--webpack` flag is required; do not remove it; Turbopack has compatibility issues with next-pwa
- Fonts are served from `public/fonts/` — both `Inter-VariableFont_opsz,wght.ttf` and `Zodiak-Variable.woff2` must be present
- `public/icon.png` (1024×1024) and `public/apple-touch-icon.png` (512×512) must exist for PWA

### Paddle Checkout Integration

`/buy` page loads Paddle.js via `<Script>` tag, calls `window.Paddle.Initialize({ token })` then `window.Paddle.Checkout.open({ items, customer, customData, settings })`.

`customData` passed to Paddle: `{ driftlatch_user_id, driftlatch_user_email, driftlatch_plan }` — this is how the webhook links transactions back to Driftlatch users.

### Known Issues / Gotchas

- `next-pwa` and Turbopack are incompatible — always use `--webpack` flag
- Supabase browser client is a module singleton; if hot-reload creates a second client instance it can cause session confusion in dev
- The `user_profile` table historically had duplicate rows per user; migration `20260322000100` deduped them. The query in `auth.ts` always orders by `updated_at desc` and uses the first result as a safeguard
- `hasCompletedSetup` does NOT require a profile row — it returns true just from session email, so new users skip `/app/setup` immediately. The setup page exists for potential future name-entry flow
- **Framer Motion + CSS `transform` conflict:** When a `motion.*` element animates `y` (or any transform), Framer Motion owns the entire `transform` property and overwrites CSS `transform: translateX(-50%)`. Always use `x: "-50%"` as a Framer Motion style prop instead of CSS `transform` for centering animated elements. This affects `NavBar.tsx` and any future fixed/floating animated elements.
- **`isMobile` initial-render flash:** For `"use client"` pages that need a responsive mobile/desktop branch at first paint (landing hero, thanks page flow steps), use a lazy initializer — `useState(() => typeof window !== "undefined" ? window.innerWidth < 640 : false)` — instead of `useState(false)`. Without it, the desktop branch renders for one frame on mobile before the `useEffect` fires, causing a visible flash.
- **`user_moment_reviews` column names:** the real DB columns are `who_involved` and `moment_type` — NOT `who` or `moment`. A query selecting `who` or `moment` will 400 with a column-not-found error. Same for `response`/`reflection` — those columns don't exist at all.
- **`user_eq_profile.completed_at` on retake:** the `/app/eq` query reads `.order("completed_at", { ascending: false }).limit(1)`. If the upsert payload does not include `completed_at: new Date().toISOString()`, the old snapshot keeps winning the query and the user will think the retake "didn't save." Always set `completed_at` explicitly in the upsert — DB default only fires on INSERT, not on UPDATE via upsert.
- **SVG `motion.circle` attribute race:** when a `motion.circle` (or similar motion SVG element) animates `r`, `cx`, or `cy`, do NOT also set a static same-name JSX prop. React commits the static attribute on first render before Framer Motion takes over, producing a visible flash and a console warning like `<circle> attribute r: Expected length, "undefined"`. Fix: remove the static prop and give the motion element an explicit `initial={{ r: 9, opacity: 0.3 }}` instead.

### Scale Checklist

Verify before or shortly after launch. Most items are Supabase dashboard checks, not code.

- **Indexes:** every user-scoped table (`user_checkins`, `user_moment_reviews`, `user_eq_profile`, `user_pins`, `user_tool_feedback`, `user_recent_tools`, `user_saved_tools`) should have a composite index on `(user_id, created_at)` or equivalent. Verify in the Supabase dashboard.
- **RLS:** every user-scoped table must have Row-Level Security enabled with policy `auth.uid() = user_id`. Managed in the dashboard, not in migration files in this repo.
- **Latency monitoring:** watch query p95 in the Supabase dashboard once ~100 active users are on.
- **Tier upgrade:** Free tier caps at 500 MB. Upgrade Supabase to Pro when the database reaches ~400 MB.
- **Ceiling expectation:** at ~10k DAU, expect 50–100 GB/year of storage growth and ~$40–60/month infra cost. Known ceiling, not a code problem.

---

## 11. WHAT NOT TO DO

1. **Do not install new packages** without explicit instruction. The bundle is intentionally lean.

2. **Do not use Tailwind utility classes.** It's installed but unused. All styles are CSS custom properties, inline `CSSProperties` objects, or JSX `<style>` blocks. Adding Tailwind classes will create inconsistency.

3. **Do not use Turbopack.** `next dev` (without `--webpack`) or `next build` (without `--webpack`) will break PWA generation. Always append `--webpack`.

4. **Do not add `"use server"` or server components inside `/app/app/**`.** Every page under `/app/app/` is `"use client"`. The guard in `AppLayout` uses `useEffect` + browser APIs.

5. **Do not change `hasAppAccess` logic.** `status === "active"` is intentional. `"trialing"` does NOT grant access (future-proofing for a trial tier that doesn't exist yet).

6. **Do not add RLS policies in migration files.** RLS is managed on the Supabase dashboard, not in the migrations in this repo. Do not attempt to ADD or DROP RLS policies via migration.

7. **Do not modify `src/lib/types/supabase.ts` manually.** It is a generated file from Supabase CLI (`supabase gen types typescript`). Re-generate it if the schema changes.

8. **Do not remove the `position: relative; overflow: hidden` from glass cards** when adding the top rim light — the rim light uses `position: absolute` and needs a positioned parent.

9. **Do not use `rgba(39,39,42,...)` for in-app glass cards.** The correct value is `rgba(18,18,22,0.9)`. The old value `rgba(39,39,42,0.62)` is the legacy surface colour and still exists on public pages but must not appear in `/app/**` glass components.

10. **Do not add bottom padding less than `100px`** to any in-app page. The NavBar is 64px tall, positioned 16px from the bottom — content needs 100px clearance.

11. **Do not expose `SUPABASE_SERVICE_ROLE_KEY` to client code.** It has no `NEXT_PUBLIC_` prefix for a reason. Only `route.ts` edge functions may import `getSupabaseAdmin()`.

12. **Do not add `inset` shadows to in-app glass cards.** The design spec explicitly removed all `inset` shadows from the glass card spec. Only NavBar retains `inset 0 0 0 1px rgba(255,255,255,0.04)`.

13. **Do not skip `verifyPaddleSignature`** in the webhook route. It protects against forged webhook calls.

14. **Do not hardcode Paddle price IDs.** Always read from `process.env.NEXT_PUBLIC_PADDLE_ANNUAL_PRICE_ID` / `NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID`.

15. **Do not use CSS `transform: translateX(-50%)` on animated `motion.*` elements.** Framer Motion takes ownership of `transform` the moment any motion value (`y`, `x`, `scale`, etc.) is active — your CSS centring will be silently dropped. Use `x: "-50%"` as a Framer Motion style prop instead.

16. **Do not import or render `HeroVisual` from `src/components/HeroVisual.tsx`.** That component (floating product screenshot cards) has been replaced by the cinematic SVG scene built directly in `src/app/page.tsx`. The file still exists but is no longer used.

17. **Do not use em dashes (`—`) in any user-facing copy.** Replace with period, comma, colon, or parentheses depending on what the dash was doing. Code comments can use them; copy strings cannot.

18. **Do not use "system" as a product buzzword in copy.** In marketing and in-app text, prefer concrete language: "one step", "what actually helps", "the move for right now". `system` is fine in engineering comments and this doc.

19. **Write plain language a tired founder would recognize.** Short sentences. Concrete verbs. Avoid therapy-speak, no "journey" / "unlock potential" / "transformation". If a line would not survive being read out loud at 11pm after a hard day, rewrite it.

---

## 12. CURRENT STATUS (as of 2026-04-21)

### Done
- Full marketing landing page (`/`) with hero, pricing, FAQ
- OTP login with 6-digit code entry (`/login`)
- Paddle checkout buy page (`/buy`) and thanks page (`/thanks`)
- Pressure Profile quiz (`/pressure-profile`) — 20 questions, scored, saves to localStorage
- In-app auth guard (AppLayout) — session → entitlement → setup → ready
- AppSplash — one-per-session animated SVG logo reveal
- NavBar — 5-item floating pill (Home / Check-in / Packs / Weekly / Account)
- Home page (`/app`) — state dot, daily recommendation, quick-action cards, compact weekly movement, tutorial tooltip
- Check-in flow (`/app/checkin`) — state → room tone → need → time → situation → recommendation
- Tool detail page (`/app/tool/[id]`) — instructions, timer, feedback form, save, pin
- Packs library (`/app/packs`, `/app/packs/[id]`) — searchable, filterable
- Weekly reflection (`/app/weekly`) — 7-day summary, state ladder, insights, worked tools section
- Account page (`/app/account`) — profile details, defaults, billing status, export, delete
- Paddle webhook handler — all subscription and transaction events
- GDPR account deletion API route
- PWA manifest + service worker (production only)
- Full redesign: glass card spec, Zodiak serif headings, 640px max-width, clay active nav
- **Landing hero — cinematic SVG scene** (`src/app/page.tsx`): full-bleed `100dvh` hero with 6 layers (noise grain, ground gradient, animated warm glow, SVG silhouette scene, edge vignette, gradient shelf). Laptop silhouette on left (x≈60–490), couple+sofa on right (x≈962–1430), 25 floating particles in center zone (x=420–1020). Scroll-driven: text fades at `[0, 0.2]`, laptop drifts left, couple drifts right + scales down. `HeroVisual.tsx` is no longer imported.
- **Landing navbar** — "Log in" link (`/login`) added before CTA button on desktop (hidden ≤768px via `.nav-login`); also first item in mobile hamburger menu
- **Pain section** — "If this feels familiar" glass card redesigned with two-column layout; 7 pain lines including home→work direction; left column states "it goes both ways"
- **"A system that protects both" tagline** — updated to "Work pressure and home tension feed each other. Driftlatch helps you interrupt that loop — before it costs you both."
- **In-app NavBar centering fixed** — was broken by Framer Motion overwriting CSS `transform`; fixed by using `x: "-50%"` as motion style prop
- **Pressure EQ full loop** — quiz at `/pressure-eq`, dashboard at `/app/eq` (archetype + hexagon + domain bars + weekly arc + moment reviews + persistent retake strip), account page shortcut with small `Retake →`. Quiz scoring bug fixed (stores `optionIndex` 0–3, not score 1–4). Upsert now writes `completed_at` explicitly so retakes surface.
- **Hero (mobile)** — separate mobile SVG scene with its own viewBox `"0 0 400 500"` and `<g id="mobile-scene">`. Desktop scene moved into `<g id="desktop-scene">`. `isMobile` uses lazy initializer to avoid first-frame flash. `willChange: "opacity"` / `"transform"` on warm glow and motion groups for GPU compositing.
- **Hero copy** — subtext rewritten to lead with the moment ("You had a good day. Still lost the evening.")
- **Page title** — em dash removed from metadata title, openGraph, and twitter cards (now "Driftlatch. Closeness at home. Clarity at work.")
- **Thanks page upgrade** — glass status card with warm ambient glow, animated flow steps (horizontal desktop / vertical mobile) with pulse animation on active step and animated green fill on completed connectors, success state with checkmark circle before redirect (1.2s delay on `state === "ready"`), PWA section glass card with phone SVG icon, `dlStepPulse` keyframe in `globals.css`
- **`.chrome-headless/` removed** from repo and added to `.gitignore` (1176 files dropped from tracking)

### In Progress / Pending
- No known in-progress items as of this session
- `npx tsc --noEmit` passes clean

### Migration History
- `20260318000100` — added `username`, `display_name` to `user_profile`
- `20260318000200` — backfilled `username` from `auth.users.email`, dropped format constraint
- `20260319000100` — created `user_entitlements`, added all Paddle columns
- `20260322000100` — deduped `user_profile` rows, added unique index on `user_id`
- `20260325000100` — added `room_tone` column to `user_checkins`
- `20260326000100` — added `source` column to `user_checkins`
