# 17 — Frontend Specification (React SPA)

> **Status:** Describes the **target** frontend (R1–R3) and how to get there from the current prototype.
> Stack and coding rules: [AGENTS.md](../AGENTS.md) (React 19 + Compiler, Tailwind v4, React Router v7
> from `react-router`, Zustand, RHF + Zod, lucide, framer-motion, sonner, Recharts, jsPDF).
> Current-state facts and defects: [02](./02-tech-architecture.md), [06](./06-open-issues-doc-gaps.md).

---

## 1. Global rules

1. **React Compiler is on.** Never write `useMemo`, `useCallback` or `React.memo`.
2. Import routing from `react-router` (never `react-router-dom`).
3. Every interactive element has a unique, stable `id` in kebab-case: `<page>-<element>[-<qualifier>]`.
   Examples: `login-email`, `login-submit`, `test-option-b`, `test-nav-q-12`, `admin-q-filter-section`.
4. Every user-facing string goes through `t('key')` (after P7; new code should already use keys).
5. Every async view handles **loading** (Spinner/skeleton), **empty**, and **error** (message + retry) states.
6. Mobile-first. Check at 360 / 768 / 1280 px. No horizontal scroll.
7. Accessibility: semantic elements, `<label>` for every input, visible focus ring (`focus-visible:ring-2 ring-primary-light`),
   `aria-live="polite"` for toasts and timer warnings, dialogs trap focus and restore it on close.
8. Lazy-load admin routes and heavy libraries: `React.lazy(() => import('./pages/admin/AnalyticsPage.jsx'))`,
   and `jspdf` via dynamic `import()` inside the download handler (NFR-01).

## 2. Routes & pages

| Route | Page | Guard | Data (R2) | Key states / behavior |
|:--|:--|:--|:--|:--|
| `/` | `LandingPage` | public | `GET /cycles/current`, `GET /programs` | Hero, 5 sections, window dates, programs, CTA |
| `/login` | `LoginPage` | public | `POST /auth/login` | Redirect back to `location.state.from` when the role allows it (D-14). Demo fill buttons only when `import.meta.env.DEV` |
| `/register` | `RegisterPage` | public | `GET /programs`, `POST /auth/register` | Fields per FR-AUTH-01 (adds GPA + group). Then goes to `/verify-email` |
| `/verify-email` **(new)** | `VerifyEmailPage` | any authed | `POST /auth/otp/send`, `/verify` | 6-digit input, resend cooldown |
| `/forgot-password` **(new)** | `ForgotPasswordPage` | public | `/auth/password/*` | S priority |
| `/candidate/dashboard` | `DashboardPage` | candidate | `GET /auth/me`, `/cycles/current`, `/sessions/current`, `/results/me` | Status card: Not verified → Verify · Not started → Instructions · **Active → Resume (shows time left)** · Done → View result. All numbers from the cycle config (D-17) |
| `/candidate/instructions` | `InstructionsPage` | candidate | `/cycles/current` | Rules from `cycle.instructions[Bn]`. Integrity checkbox. **Start button** calls `requestFullscreen()` then `POST /sessions` in the same click handler (D-04) |
| `/candidate/test` | `TestPage` | candidate | `/sessions/current`, `PATCH …/state`, `POST …/submit` | Fullscreen overlay layout (no header). See §5 |
| `/candidate/result` | `ResultPage` | candidate | `GET /results/me` | "Recommendation:" badge, section cards, PDF. "Not released yet" state |
| `/admin/dashboard` | `DashboardPage` | admin, reviewer | `analytics/summary`, `results/recent` | Show candidate **names**, not ids (D-26) |
| `/admin/questions` | `QuestionBankPage` | admin | `GET /admin/questions` | Server pagination, filters (section/difficulty/status/tag), search with 300 ms debounce, status chips, import/export |
| `/admin/questions/new`, `/:id/edit` | `QuestionFormPage` | admin | `POST`/`PATCH /admin/questions` | Live preview, **tags input** (D-19), optional Bangla fields, status select |
| `/admin/exam-config` | `ExamConfigPage` | admin (reviewer read-only) | `/admin/cycles*` | Cycle selector, create/publish/close. Program overrides table. Structural fields disabled when locked. Pool size beside each section count |
| `/admin/candidates` | `CandidatesPage` | admin, reviewer | `GET /admin/candidates` | Filters program/status/eligibility/risk, pagination (D-10) |
| `/admin/candidates/:id` | `CandidateDetailPage` | admin, reviewer | `GET /admin/candidates/:id`, `/security` | Profile, result, section chart, security report + timeline + time-per-question table, review form (admin), PDF (D-16) |
| `/admin/merit-list` | `MeritListPage` | admin, reviewer | `GET /admin/merit-list`, `.csv` | **Program selector (required)**, eligibility filter, competition rank, medals for top 3, CSV + PDF export (D-11, D-25) |
| `/admin/security` **(new)** | `SecurityReviewPage` | admin, reviewer (read) | `GET /admin/security/sessions` | Risk-sorted list, decision filter, links to the candidate detail page |
| `/admin/users` **(new)** | `UsersPage` | admin | `/admin/users` | Create reviewers, assign programs |
| `/admin/analytics` | `AnalyticsPage` | admin, reviewer | `analytics/summary` | Cycle + program filters. Bar (sections), pie (eligibility), line (**real** perDay, D-20), table by program |
| `*` | `NotFoundPage` | — | — | — |

Sidebar order: Dashboard, Question Bank*, Exam Config, Candidates, Merit List, Security Review,
Analytics, Users*. Items marked * are hidden from reviewers.

## 3. State management (target)

| Store / source | Holds | Persisted? |
|:--|:--|:--|
| `authStore` | `user`, `accessToken` (memory), `status: 'unknown'\|'authed'\|'guest'` | **Only** `user` for faster first paint (key `diu-auth`). The token is never persisted |
| `testStore` | Session payload from the server, local answers/flags/visited, `dirty` set, `seq`, `clockOffsetMs`, pending event queue | `diu-test-session` (offline safety net only; the server copy wins on resume) |
| `antiCheatStore` | Local counters for the warning UI, event queue (flushed with autosave), per-question timing | `diu-anti-cheat` |
| `uiStore` **(new)** | `lang` (`diu-lang`), `theme` (`diu-theme`) | yes |
| TanStack Query | All server reads (cycles, programs, results, admin lists, analytics) | in-memory cache |
| `questionStore`, `examConfigStore` | **Removed in R2** (replaced by queries). In R1 they persist and feed the test (D-08, D-21) | — |

Rename every `itm-*` storage key to `diu-*` (D-28). On logout call `resetAll()`, which clears
auth, test, anti-cheat and the query cache (D-15).

## 4. Data layer

### `src/services/api.js` (new)
```js
// fetch wrapper: base URL, JSON, bearer token, one refresh-retry on 401, error normalization
export class ApiError extends Error { constructor(status, code, message, details) { super(message); Object.assign(this, { status, code, details }); } }

export async function api(path, { method = 'GET', body, query, signal, raw = false } = {}) {
  const res = await doFetch(path, { method, body, query, signal });
  if (res.status === 401 && path !== '/auth/refresh' && await tryRefresh()) return api(path, { method, body, query, signal, raw });
  syncClock(res.headers.get('X-Server-Time'));
  if (!res.ok) { const { error } = await res.json().catch(() => ({ error: {} })); throw new ApiError(res.status, error.code ?? 'INTERNAL', error.message ?? res.statusText, error.details); }
  if (raw) return res;               // CSV downloads
  return res.status === 204 ? null : res.json();
}
```
- Base URL `import.meta.env.VITE_API_URL ?? '/api/v1'`. `credentials: 'include'` only for `/auth/*`.
- Services keep their current function names (see [15 §6](./15-api-spec.md#6-frontend-service--endpoint-map)) and
  return the same shapes the pages already use, so page changes stay small.
- Adopt `@tanstack/react-query` (already a dependency, unused today). Wrap `<App>` in `QueryClientProvider`
  in `src/main.jsx`. Query keys: `['cycle','current']`, `['programs']`, `['session','current']`, `['admin','questions',filters]`, …
- Map `ApiError.code` to translated messages (`errors.<CODE>` keys).

### Mock mode
Keep the prototype runnable without a backend: `VITE_USE_MOCKS=true` routes services to the current
mock implementations (move them to `src/services/mock/*`). This lets the demo work offline.

## 5. Test page specification

```
┌───────────────────────────────────────────────────────────────┐
│ DIU Admission · Section tabs [Math 7/10][Logic 3/10]…  ⏱ 41:12 │  ← sticky; timer mono, pulses < 5 min
├───────────────────────────────────────────┬───────────────────┤
│ Q 12 of 50 · Logical Thinking   [⚑ Flag]  │ Question grid      │  ← grid becomes a bottom sheet < 768 px
│ <question text>                           │ ● answered ○ not   │
│ (A) …  (B) …  (C) …  (D) …                │ ◐ skipped ⚑ flagged│
│ [Clear]                 [◀ Prev] [Next ▶] │ [Submit test]      │
└───────────────────────────────────────────┴───────────────────┘
```

| Behavior | Rule |
|:--|:--|
| Timer | `remaining = deadline − (Date.now() + clockOffsetMs)`. Re-render every 1 s. At 0 → call submit (`reason: 'timeout'`); the server also expires. Show an `aria-live` warning at 5 min and 1 min only |
| Navigation | Prev/Next cross section boundaries (D-07). Section tabs jump to the first unanswered question in the section. Every displayed question is marked visited. Keyboard: `1–4`/`A–D` select, `N`/`P` navigate, `F` flags (these keys are **not** blocked) |
| Autosave | `useAutoSave`: every 5 s if `dirty`, plus on section change, `visibilitychange`, and `pagehide` (`navigator.sendBeacon` fallback). On failure: exponential backoff (2 → 30 s), a "Saving… / Saved / Offline — answers kept on this device" indicator, and the queue persists in `diu-test-session` |
| Resume | On mount: `GET /sessions/current?resume=1`, merge any un-acked local changes with `seq > lastSeq`, then continue |
| Submit | `TestSubmitDialog` shows counts. Submit flushes everything in one call. Navigate to `/candidate/result` with `replace` |
| Anti-cheat | `useAntiCheat` reads thresholds from `session.antiCheat`. Counters come from `useAntiCheatStore.getState()` **inside** handlers (fixes D-02). `onAutoSubmit` goes through a ref to the latest submit (fixes D-03). Events are queued and sent with autosave. The server's `autoSubmitted: true` response ends the test |
| Leaving | `beforeunload` prompt while active. Back-navigation is blocked with a `useBlocker` confirm |
| Low bandwidth | Respect `prefers-reduced-motion`. No framer-motion on the test page (CSS transitions only) |

## 6. Internationalization (FR-I18N, ADR-017)

```
src/i18n/
├── en.json        # { "common": {...}, "landing": {...}, "auth": {...}, "test": {...}, "result": {...}, "admin": {...}, "errors": {...} }
├── bn.json        # same keys; missing keys fall back to en
└── index.js       # useT(): (key, vars) => string; formatNumber, formatDate (Asia/Dhaka), useLang()
```
- No library needed: a ~40-line `useT` that reads `uiStore.lang`. `{{var}}` interpolation. Pluralization via `key_one`/`key_other`.
- `LanguageToggle.jsx` exists (`src/components/ui/LanguageToggle.jsx`) but isn't rendered. Mount it in `Header.jsx`, and switch its key from `itm-lang` to `uiStore`.
- Set `document.documentElement.lang`. Load a Bangla font: add `Hind Siliguri` (or `Noto Sans Bengali`) to the Google Fonts link in `index.html` and to `--font-sans` as a fallback after Inter.
- Lint guard (P7): a script that greps `src/pages` and `src/features` for JSX text nodes with Latin letters outside `t()`.

## 7. Theming & design system

- Tokens are already in `src/index.css` `@theme` (primary/secondary/accent/success/warning/danger/surface/muted, Inter, JetBrains Mono).
- Dark mode: add `@custom-variant dark (&:where(.dark, .dark *));` to `index.css`. `uiStore.theme` (`system|light|dark`)
  toggles `.dark` on `<html>` (watch `matchMedia('(prefers-color-scheme: dark)')` when `system`).
  Add `dark:` variants to layout, cards (`.glass` ↔ `.glass-dark`), inputs, tables, and charts (axis/text colours).
- Eligibility badge colours: success / warning / danger with icons (CheckCircle / AlertTriangle / XCircle), always with a text label (not colour alone).
- Risk badges: Low (green), Medium (amber), High (red).

## 8. Dependency hygiene

| Package | Action |
|:--|:--|
| `@tanstack/react-query` | **Adopt** (data layer, §4) |
| `date-fns` | **Adopt** for formatting (`formatInTimeZone` needs `date-fns-tz`), or drop and use `Intl.DateTimeFormat`. Pick one in P0 |
| `jspdf-autotable` | **Adopt** in `pdfGenerator.js` / merit list PDF, or remove |
| `zod` | `required_error` in `src/features/questions/questionSchema.js` is Zod 3 API. Change to `{ error: '…' }` (Zod 4) |
