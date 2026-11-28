# AuraAir — Architecture Overview

## Module Dependency Graph

```text
index.html
├── css/styles.css          (zero CDN — self-contained WCAG 2.1 AA/AAA styles)
├── js/aqi-engine.js        (US EPA + Indian NAQI math, inversion model — 0 deps)
├── js/impact-calculator.js (ICRP inhalation, Defra CO2e, DIY hacks — 0 deps)
├── js/gemini.js            (Interactions API client & offline engine — 0 deps)
├── js/sw-register.js       (PWA Service Worker registration, strict CSP — 0 deps)
└── js/app.js               (DOM controller, rAF batching, a11y — uses modules above)
    ├── scripts/lint.js     (Node.js zero-dependency code quality linter)
    └── tests/run-tests.js  (Node.js zero-dependency test runner, 14 suites)
```

## Module Responsibilities

### `js/aqi-engine.js`
- **US EPA & Indian CPCB NAQI Breakpoints**: Linear sub-index interpolation across PM2.5 and PM10 with monotonic inter-bracket gap bridging (so values between integer steps never fall back to zero).
- **Accessible Health Classification (`getAQICategory`)**: Maps AQI levels 1–6 to categories, short tags (`Good`, `Mod`, `USG`, `Unh`, `V.Unh`, `Haz`), and WCAG AA/AAA foreground/background badge color pairs (`badgeTextColor`).
- **24-Hour Thermal Inversion Forecaster (`getHourlyInversionForecast`)**: Models diurnal winter boundary-layer trapping (`06:00–09:00`, `19:00–23:00`) and midday convective dispersion (`12:00–15:00`).
- **Context Decision Engine (`getContextDecisionVerdict`)**: Computes live `Ventilate Now`, `N95 Mask`, and `Outdoor Cardio` decisions from AQI, user persona, and active hour.
- **City Meteorological Profiles (`PRESET_CITIES`)**: 6 urban winter profiles including AQI, PM2.5, PM10, NO₂, temperature, humidity, and primary emission driver.

### `js/impact-calculator.js`
- **PM2.5 Inhalation Dose (`calculateInhalationImpact`)**: ICRP minute-ventilation physiology (`6 / 10 / 20 / 50 L/min`) and intervention efficiency (`0%–95%`), plus Berkeley Earth cigarette equivalence.
- **Commute Carbon Savings (`calculateCarbonSavings`)**: IPCC / UK Defra transport mode emission factors (`gCO2e/km`), annual `kg CO2` saved, and urban tree-year equivalents.
- **Community Clean Air Score (`evaluateCommunityScore`)**: 7-habit scorecard clamped cleanly to `0–100`.
- **DIY IAQ Blueprints (`IAQ_HACKS`)**: 5 low-cost interventions including Corsi-Rosenthal MERV-13 purifier, thermal inversion windowing, wet baffles, NASA CAM plants, and kitchen combustion isolation.

### `js/gemini.js`
- **Interactions API Client (`generateAdvice`)**: `POST https://generativelanguage.googleapis.com/v1/interactions` (`Api-Revision: 2026-05-20`), primary model `gemini-4-hydrogen`, automatic fallback to `gemini-3.5-flash-lite` on HTTP `404`/`429`, privacy `store: false`, and `x-goog-api-key` header transport.
- **Resilience & Efficiency**: `AbortController` 25s timeout, serialized 600 ms rate-limiting queue, and bounded 20-entry LRU session response cache (`clearCache`).
- **Security**: `sanitizeInput` (1,000 char cap), `stripUnsafeTags` (strips HTML, event handlers, pseudo-protocols, and injected XML boundary tags), `redactSecrets`, and `isPlausibleApiKey`.
- **Safe Markdown Renderer (`markdownToHtml`)**: Escapes raw HTML first, protects inline code spans, renders semantic `.md-*` elements including ordered (`<ol>`) and unordered (`<ul>`) lists.
- **Offline Heuristic Engine (`getIntelligentFallbackResponse`)**: Intent- and AQI-tier-aware guidance covering clean air (`<= 100`) through hazardous smog (`> 300`).

### `js/sw-register.js`
- **PWA Service Worker Registration**: Registers `sw.js` upon `window.load` via external script, strictly adhering to Content Security Policy (`script-src 'self'`) without requiring `'unsafe-inline'`.

### `js/app.js`
- **State & Volatile Auth Storage**: Non-sensitive UI accessibility preferences reside in `localStorage`, while any optional API key is confined to volatile `sessionStorage`.
- **Efficient DOM Rendering**: `DocumentFragment` batched rendering for the 24-hour forecast grid and IAQ blueprint cards, forecast memoization (`lastForecastAqi`), and `requestAnimationFrame` slider throttling.
- **Accessibility & Controls**: WAI-ARIA keyboard tabs (`ArrowLeft`/`ArrowRight`/`Home`/`End`), `Escape` toast dismissal, live `aria-valuetext` readouts, `aria-busy` async chat state, High-Contrast AAA mode, and Colorblind Pattern mode.
- **Actionable Plan Export**: Downloads personalized `.txt` daily schedules incorporating active city telemetry, time window, and routine.

### `scripts/lint.js`
- **Zero-Dependency Static Linter**: Validates JavaScript syntax via Node.js compiler (`node --check`), strict mode enforcement, eval/Function prohibition, and code health checks across all modules in sub-100ms with zero npm packages.

## Security & CSP Architecture

```text
User Input
  └─▶ stripUnsafeTags() + 1000-char cap
        └─▶ <user_scenario> XML boundary isolation
              └─▶ Interactions API (x-goog-api-key header, store: false, 25s AbortController)
                    └─▶ extractInteractionText() -> markdownToHtml() (escaped -> semantic DOM)
```

`index.html` Content Security Policy:
```text
default-src 'self';
script-src 'self';
style-src 'self';
font-src 'self';
img-src 'self' data:;
connect-src 'self' https://generativelanguage.googleapis.com;
base-uri 'self';
form-action 'self';
object-src 'none'
```
