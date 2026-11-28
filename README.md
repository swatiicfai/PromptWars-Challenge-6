# AuraAir – Urban Air Quality & Winter Smog Defense Assistant

> **PromptWars Virtual: [Challenge 6] Urban Air Quality Assistant**  
> An intelligent, context-aware GenAI application engineered to help families and urban communities navigate severe winter thermal inversions, minimize toxic particulate exposure ($PM_{2.5}$), and adopt high-impact low-emission lifestyles.

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-GitHub%20Pages-22c55e?style=for-the-badge)](https://swatiicfai.github.io/PromptWars-Challenge-6/)
[![Demo Video](https://img.shields.io/badge/🎥%20Demo%20Video-YouTube-FF0000?style=for-the-badge&logo=youtube)](https://youtu.be/qthQHZ2rPMs)
[![CI Pipeline](https://img.shields.io/badge/CI%20Pipeline-Passing-22c55e?style=for-the-badge&logo=githubactions)](.github/workflows/ci.yml)
[![Tests Passing](https://img.shields.io/badge/Tests-265%2F265%20Passed-10b981?style=for-the-badge)](tests/run-tests.js)
[![Linting](https://img.shields.io/badge/Linting-Zero--Dependency%20Passed-22c55e?style=for-the-badge)](scripts/lint.js)
[![GenAI](https://img.shields.io/badge/GenAI-Gemini%204%20Hydrogen-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA%2FAAA-06b6d4?style=for-the-badge)](#-evaluation-criteria-mapping)
[![Repo Size](https://img.shields.io/badge/Repo%20Size-%3C%201%20MB-8b5cf6?style=for-the-badge)](#-evaluation-criteria-mapping)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

---

## 🔗 Quick Links

| Resource | Link |
|---|---|
| 🌐 **Live Demo** | https://swatiicfai.github.io/PromptWars-Challenge-6/ |
| 🎥 **Demo Video** | https://youtu.be/qthQHZ2rPMs |
| 📦 **GitHub Repo** | https://github.com/swatiicfai/PromptWars-Challenge-6 |

---

## 🌟 Chosen Vertical & Problem Context

**Chosen Vertical:** **Urban Air Quality & Public Health Assistant** (PromptWars Challenge 6)

Urban winter smog presents an acute public health crisis across major metropolitan centers. Cold air thermal inversions trap ground-level vehicular soot, industrial emissions, and particulate matter beneath warmer upper layers, concentrating $PM_{2.5}$ to hazardous levels ($> 300\ \mu\text{g/m}^3$).

**AuraAir** solves this by providing:
1. **Dynamic Dual-Standard Telemetry & Live Context Decision Engine**: Computes both **US EPA AQI** and **Indian CPCB NAQI** classifications across $PM_{2.5}$, $PM_{10}$, and $NO_2$, and outputs immediate Yes/No verdicts for ventilation, N95 masking, and outdoor exercise based on active city, AQI level, persona, and hour of day.
2. **24-Hour Thermal Inversion Cycle Forecaster**: Models diurnal lapse rates to pinpoint peak inversion hazards ($06:00 - 09:30$, $19:00 - 23:00$) and the midday convective dispersion window ($12:30 - 15:30$).
3. **Role-Based Routine Optimization**: Contextual daily plans tailored to 5 distinct personas (`family`, `elderly_asthma`, `commuter`, `fitness_worker`, `community`) with `.txt` action-plan export.
4. **Indoor Air Quality (IAQ) DIY Blueprint Hub**: Step-by-step guides for low-cost ($<\$35$) DIY Corsi-Rosenthal MERV-13 purifiers, convective windowing, damp-fiber passive baffles, kitchen combustion isolation, and nocturnal CAM plant deployment.
5. **Quantifiable Health & Carbon Impact Engine**: Calculates exact avoided particulate lung doses ($\mu\text{g}$), Berkeley Earth cigarette equivalents, avoided commute carbon emissions ($\text{kg CO}_2\text{e}$), and a 7-habit Community Clean Air Score (0–100).
6. **Guardrailed GenAI Assistant**: Powered by **Gemini 4 Hydrogen** (`POST /v1/interactions`) with `gemini-3.5-flash-lite` fallback, multi-turn conversation context, XML boundary isolation, strict sanitization, and deterministic offline heuristic fallbacks.

---

## 🧠 Approach and Logic

AuraAir is built on a modular, zero-dependency, client-side reactive architecture that prioritizes deterministic scientific math, strict security, sub-second load times, and WCAG 2.1 AA/AAA accessibility.

```text
+-------------------------------------------------------------------------+
|                              AuraAir Core                               |
+-------------------------------------------------------------------------+
       |                                              |
       v                                              v
+-------------------------+               +-------------------------------+
| Atmospheric AQI Engine  |               | Impact & Mitigation Engine    |
| - US EPA & Indian NAQI  |               | - Minute Ventilation (V_E)    |
| - 24-hr Inversion Model |               | - Avoided Inhalation (ug)     |
| - Live Decision Verdict |               | - Carbon Footprint (CO2e)     |
+-------------------------+               +-------------------------------+
       |                                              |
       +----------------------+-----------------------+
                              |
                              v
       +-----------------------------------------------+
       |       Context Chaining & Persona Adapter      |
       |  (Family / Elderly / Commuter / Fitness / RWA)|
       +-----------------------------------------------+
                              |
                              v
       +-----------------------------------------------+
       |     GenAI Reasoning: Gemini 4 Hydrogen        |
       |  - Interactions API + Header Key Auth         |
       |  - XML Injection Isolation + Offline Fallback |
       |  - Output: Action + Hack + Quantified Impact  |
       +-----------------------------------------------+
```

### Core Design Decisions
1. **Deterministic Telemetry & Physiological Math**: EPA/NAQI breakpoint interpolation, minute ventilation ($V_E$), and carbon displacement factors run deterministically in pure JavaScript modules so scientific numbers are 100% reproducible.
2. **Context-Aware Prompt Chaining**: User queries are combined with live city, AQI, health category, active persona, and bounded recent conversation history inside isolated `<user_scenario>` XML wrappers.
3. **Dual Execution Mode (Live Interactions API & Intelligent Fallback)**:
   - **Live Cloud AI**: Connects over HTTPS to `https://generativelanguage.googleapis.com/v1/interactions` (`gemini-4-hydrogen`, fallback `gemini-3.5-flash-lite`) using the `x-goog-api-key` header and `store: false`.
   - **Intelligent Demo Mode**: Works completely offline with zero API key or network dependencies using intent-aware and persona-aware deterministic heuristics.

---

## 🎯 How the Solution Works

### 1. Atmospheric Telemetry & Breakpoints
Select from 6 urban winter hotspots (Delhi-NCR, Lahore, Beijing, Salt Lake City, Mumbai, London) or drag the live AQI slider ($20 - 500$). The engine computes pollutant levels, dynamic inversion risk tier, US EPA category, and Indian CPCB NAQI rating:

$$\text{AQI} = \frac{I_{\text{high}} - I_{\text{low}}}{C_{\text{high}} - C_{\text{low}}} \times (C - C_{\text{low}}) + I_{\text{low}}$$

### 2. Live Context Decision Engine & 24-Hour Inversion Forecast
Surface cooling during winter nights traps particulate emissions near ground level. AuraAir evaluates current AQI, persona sensitivity, and time of day to drive real-time badges (`Ventilate Now`, `N95 Mask`, `Outdoor Cardio`) alongside a 24-hour grid highlighting peak hazard hours and the midday convective dip ($12:30 - 15:30$).

### 3. Quantifiable Impact & Community Score
- **Inhalation Dose Avoided**:
  $$\text{Dose Avoided } (\mu\text{g}) = C_{\text{PM2.5}} \times V_E \times t \times \eta_{\text{filter}}$$
  Converts avoided particulate mass into Berkeley Earth cigarette equivalents.
- **Avoided Carbon Emissions**: Computes daily/annual $\text{kg CO}_2\text{e}$ savings and mature urban tree absorption years when shifting from solo combustion vehicles to electric metro, carpooling, cycling, or WFH.
- **Community Clean Air Score**: Interactive 7-habit household scorecard evaluating overall community mitigation impact (0–100).

---

## 💡 Assumptions Made

1. **Telemetry Simulation**: Pre-configured winter city profiles represent typical seasonal inversion baselines; manual slider adjustments scale derived pollutant concentrations proportionally for interactive simulation.
2. **Physiological Constants**: Minute ventilation rates follow ICRP standards (Sleep: $6\text{ L/min}$, Rest: $10\text{ L/min}$, Walking: $20\text{ L/min}$, Running: $50\text{ L/min}$).
3. **Transport Emission Factors**: Commute carbon factors follow IPCC / UK Defra passenger-kilometer averages ($\text{g CO}_2\text{e/km}$).
4. **Client-Side Volatile Key Storage**: Optional user API keys are held solely in browser `sessionStorage` (cleared automatically when the tab closes) and transmitted only to Google's official API via `x-goog-api-key` request headers with `store: false`.

---

## 📊 Evaluation Criteria Mapping

| Focus Area | Architectural Implementation in AuraAir | Verification |
| :--- | :--- | :--- |
| **Code Quality** | Modular UMD architecture (`aqi-engine.js`, `impact-calculator.js`, `gemini.js`, `app.js`, `sw-register.js`), strict mode, comprehensive JSDoc annotations, monotonic EPA/NAQI bracket bridging, zero-dependency static code quality linter (`scripts/lint.js`), `.editorconfig`, `.eslintrc.json`, self-contained CSS (`css/styles.css`). | `npm run lint` & `npm run validate` · 100% test pass · modular architecture ([ARCHITECTURE.md](ARCHITECTURE.md)) |
| **Security** | Strict self-contained CSP (`script-src 'self'`, zero `'unsafe-eval'`, zero `'unsafe-inline'`, zero external font/script CDNs), `no-referrer` policy, volatile `sessionStorage` key isolation, header `x-goog-api-key`, `store: false`, key redaction, HTML/event-handler/boundary-tag stripping (1,000-char cap). | Documented in [SECURITY.md](SECURITY.md) & Suite 8 + Suite 13 |
| **Efficiency** | Zero npm runtime dependencies and zero third-party CDNs (< 1 MB repo); `DocumentFragment` batched DOM inserts; `requestAnimationFrame` slider throttling; forecast render memoization; 600 ms rate throttle + 25s `AbortController` timeout + 20-entry LRU session response cache; **PWA Service Worker** (`sw.js`) with cache-first strategy enabling full offline operation for all deterministic features. | Repo size check in [ci.yml](.github/workflows/ci.yml) |
| **Testing** | 265 automated unit, integration, mocked API, cache, DOM/UI, accessibility, and static security checks with 100% pass rate. | `node tests/run-tests.js` |
| **Accessibility** | WCAG 2.1 AA/AAA badge & text contrast pairs, skip link, `aria-live` polite announcements, `aria-busy` async state, WAI-ARIA keyboard tabs (`ArrowLeft`/`ArrowRight`/`Home`/`End`), `Escape` toast dismissal, `@media (prefers-reduced-motion: reduce)` & `prefers-contrast: more`, High-Contrast AAA mode, and patterned Colorblind mode. | Verified in Suite 12 & `index.html` |
| **Problem Alignment** | Covers all Challenge 6 expectations: thermal inversion cycle modeling, dynamic time-context simulator, meteorological telemetry (temp/RH/driver), 5 persona routines, IAQ DIY blueprints, ICRP inhalation dose, Defra carbon math, and context-chained GenAI assistant. | All 5 interactive tabs + Live Context Decision Engine |

---

## 🧪 Testing and Verification

Run the zero-dependency automated verification suite locally:

```bash
node tests/run-tests.js
```

All **265/265** tests pass across 13 suites covering US EPA & Indian NAQI math, monotonic gap bridging, thermal inversion forecasting, persona routines, inhalation physics, carbon calculations, community scoring, XSS/injection sanitization, secret redaction, Markdown rendering, Gemini Interactions API mocking, LRU caching, DOM/accessibility integration, and static CSP/HTML security checks.

---

## 🚀 Quick Start Guide

### Prerequisites
- Any modern web browser (Chrome, Firefox, Edge, Safari)
- Node.js (v18+) for running the automated test suite

### Running Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/swatiicfai/PromptWars-Challenge-6.git
   cd PromptWars-Challenge-6
   ```
2. Open `index.html` directly in your browser, or serve locally:
   ```bash
   npx serve .
   ```
3. To test GenAI features:
   - Leave the key blank or click **Demo** to use **Intelligent Demo Mode**.
   - Or paste a Google Gemini API key and click **Save** to invoke **Gemini 4 Hydrogen** via the Interactions API.

---

## 👩‍💻 Author & Credits

**Swati Gupta**  
*Built for PromptWars Virtual – Challenge 6: Urban Air Quality Assistant*  
**Powered by Gemini 4 Hydrogen • Pure HTML/CSS/JS • Zero Runtime Bloat**
