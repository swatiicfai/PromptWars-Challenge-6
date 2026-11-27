# Changelog

All notable changes to AuraAir are documented in this file.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [2.0.1] – 2026-11-27

### Added
- **Progressive Web App (PWA)**: `manifest.json` and `sw.js` Service Worker with cache-first strategy
  — enables full offline operation for all deterministic features (AQI math, thermal inversion
  forecasting, impact calculator, IAQ blueprints). GenAI gracefully degrades to intelligent
  heuristic fallback engine when offline.
- **Interactive Forecast Slots**: 24-hour forecast cards upgraded from `<div>` to semantic
  `<button>` elements with `aria-pressed`, `data-hour` attributes, click-to-select, toggle-off,
  and automatic `<select>` sync via `syncTimeWindowControl()`.
- **Tri-Tier Persona Routines**: `getPersonalizedRoutine()` now produces dynamically different
  daily schedules per AQI severity tier (clean / elevated / severe) for all 5 personas.
- **WCAG Contrast Math**: Added `displayColor` field (brighter teal/amber/red palette tuned for
  dark `#0f172a` card backgrounds) to all 6 `getAQICategory()` returns. All pairs verified
  ≥ 4.5:1 against their backgrounds in automated Suite 2 tests.
- **Verdict Banner Severity Tiers**: `.verdict-banner[data-status]` now shows color-coded
  `border-left` per hazard level for immediate visual scanning.
- **Bounded Chat History**: `appendChatMessage()` trims to `MAX_CHAT_HISTORY = 50` entries,
  preventing unbounded DOM growth in long sessions.
- **226 Automated Tests**: Expanded from 187 to 226 tests covering WCAG contrast math,
  tri-tier routines, XSS fixed-point hardening, AQ token redaction, history fingerprint cache,
  and forecast slot interactivity.

### Changed
- **XSS Hardening**: `stripUnsafeTags()` upgraded to 5-pass fixed-point iteration, defeating
  nested `javajavascript:` obfuscation patterns.
- **Cache Key Bug Fix**: Session response cache key changed from `history.length` (caused
  collisions for different conversations of equal length) to a full history fingerprint
  (`role:content[:60]` concat over last 4 turns).
- **Gemini 4H Parameters**: `buildBody()` updated to `max_output_tokens: 32768` and added
  `thinking_level: 'low'` per Gemini 4 Hydrogen Interactions API guidance.
- **Secret Redaction**: `redactSecrets()` expanded to also catch `AQ.` and `ya29.` Bearer
  token patterns in addition to existing `AIza` patterns.
- **Button Primary Contrast**: `.btn-primary` background darkened to `#0f766e` (hover `#115e59`)
  for WCAG AA compliant contrast against white text.
- **`renderHourlyForecast()` Memoization**: Forecast cards now carry closured click handlers
  with captured `slot.hour` values, correctly surviving memoization cycles.

### Fixed
- `exportDailyPlan()` deferred `URL.revokeObjectURL` with `setTimeout` to prevent race condition
  on slow blob-link creation.
- `syncFormControlsWithState()` added to `initApp()` so select/input controls correctly reflect
  JS state on startup without requiring user interaction.
- `selectContextHour()` toggle correctly deselects when clicking the already-active forecast slot
  (sets `state.selectedHour = null`, resets `aria-pressed` on all slots).

---

## [2.0.0] – 2026-11-26

### Added
- **Gemini 4 Hydrogen Integration**: Switched to `POST /v1/interactions` with `Api-Revision: 2026-05-20`,
  `gemini-4-hydrogen` primary model, automatic HTTP 404/429 fallback to `gemini-3.5-flash-lite`.
- **Dual EPA + Indian NAQI Telemetry**: Parallel US EPA AQI and Indian CPCB NAQI sub-index
  computation for PM2.5, PM10, with monotonic inter-bracket gap bridging.
- **5-Persona Context Engine**: Family, Elderly/Asthma, Commuter, Fitness Worker, Community —
  each with dedicated system instructions, verdict logic, and AI persona.
- **24-Hour Thermal Inversion Forecaster**: Diurnal boundary-layer model with peak hazard
  windows (06:00–09:30, 19:00–23:00) and midday convective dip (12:30–15:30).
- **Inhalation Impact Calculator**: ICRP minute-ventilation physiology, Berkeley Earth cigarette
  equivalence, 7 interventions from no protection to True HEPA.
- **Carbon Footprint Calculator**: IPCC/Defra transport emission factors, annual kg CO₂e savings,
  urban tree-year equivalents.
- **Community Clean Air Score**: 7-habit household scorecard (0–100).
- **5 DIY IAQ Blueprints**: Corsi-Rosenthal MERV-13, thermal windowing, wet baffles, NASA CAM
  plants, kitchen combustion isolation.
- **Strict CSP**: Zero `unsafe-eval`, `unsafe-inline`, no external CDN/fonts.
- **WCAG 2.1 AA/AAA**: Skip link, `aria-live`, `aria-busy`, WAI-ARIA tabs, High-Contrast AAA
  mode, Colorblind Pattern mode, `prefers-reduced-motion`, `prefers-contrast: more`.
- **151 Automated Tests** across 13 suites: EPA/NAQI math, inversion forecasting, persona
  routines, inhalation physics, carbon math, community scoring, XSS sanitization, Gemini API
  mocking, LRU caching, DOM/accessibility integration, CSP/HTML security.

---

## [1.0.0] – 2026-11-25

### Added
- Initial AuraAir release with static AQI lookup, basic city profiles, and prototype Gemini chat.
