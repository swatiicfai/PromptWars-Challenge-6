/**
 * @file app.js
 * @description Master UI application controller for Urban Air Quality Assistant (AuraAir).
 * Manages reactive state, persona selection, telemetry rendering, live context verdicts,
 * calculators, chat interface, accessibility modes (High Contrast, Colorblind, WAI-ARIA tabs,
 * Screen Reader announcements), and action exports.
 * @version 2.0.0
 * @license MIT
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./aqi-engine'),
      require('./impact-calculator'),
      require('./gemini')
    );
  } else {
    root.AuraAirApp = factory(root.AQIEngine, root.ImpactCalculator, root.GeminiService);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (AQIEngine, ImpactCalculator, GeminiService) {

  const safeStorage = {
    get(key) {
      try {
        return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      } catch (_err) {
        return null;
      }
    },
    set(key, value) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, String(value));
        }
      } catch (_err) {
        // Ignore storage quota or sandbox restrictions
      }
    },
    remove(key) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (_err) {
        // Ignore storage errors
      }
    }
  };

  function createInitialState() {
    return {
      apiKey: safeStorage.get('auraair_gemini_key') || '',
      selectedCity: 'delhi-ncr',
      customAQI: 385,
      selectedPersona: 'family',
      activeTab: 'tab-dashboard',
      highContrast: safeStorage.get('auraair_high_contrast') === 'true',
      colorblindMode: safeStorage.get('auraair_colorblind') === 'true',
      chatHistory: [],
      savedActions: {
        wfhOrMetro: true,
        corsiRosenthal: true,
        timingVentilation: true,
        n95Worn: true,
        nasaPlants: true,
        noWasteBurning: true,
        carpoolShared: false
      }
    };
  }

  let state = createInitialState();
  let dom = {};
  let toastTimer = null;

  function initDomElements(doc) {
    const d = doc || document;
    dom = {
      doc: d,
      body: d.body,
      highContrastToggle: d.getElementById('highContrastToggle'),
      colorblindToggle: d.getElementById('colorblindToggle'),
      screenReaderLive: d.getElementById('screenReaderLive'),
      statusToast: d.getElementById('statusToast'),
      apiKeyInput: d.getElementById('apiKeyInput'),
      saveApiKeyBtn: d.getElementById('saveApiKeyBtn'),
      clearApiKeyBtn: d.getElementById('clearApiKeyBtn'),
      apiStatusBadge: d.getElementById('apiStatusBadge'),

      citySelect: d.getElementById('citySelect'),
      customAqiSlider: d.getElementById('customAqiSlider'),
      customAqiDisplay: d.getElementById('customAqiDisplay'),
      personaSelect: d.getElementById('personaSelect'),

      tabBtns: d.querySelectorAll('.tab-nav-btn'),
      tabPanels: d.querySelectorAll('.tab-panel'),

      contextVerdictBanner: d.getElementById('contextVerdictBanner'),
      verdictHeadline: d.getElementById('verdictHeadline'),
      verdictBestWindow: d.getElementById('verdictBestWindow'),
      verdictVentilateChip: d.getElementById('verdictVentilateChip'),
      verdictMaskChip: d.getElementById('verdictMaskChip'),
      verdictExerciseChip: d.getElementById('verdictExerciseChip'),

      aqiGaugeCard: d.getElementById('aqiGaugeCard'),
      telemetryCityName: d.getElementById('telemetryCityName'),
      telemetryAqiVal: d.getElementById('telemetryAqiVal'),
      telemetryAqiBadge: d.getElementById('telemetryAqiBadge'),
      telemetryNaqiSummary: d.getElementById('telemetryNaqiSummary'),
      telemetryAqiAdvisory: d.getElementById('telemetryAqiAdvisory'),
      telemetryPm25: d.getElementById('telemetryPm25'),
      telemetryPm10: d.getElementById('telemetryPm10'),
      telemetryNo2: d.getElementById('telemetryNo2'),
      pm25Progress: d.getElementById('pm25Progress'),
      pm10Progress: d.getElementById('pm10Progress'),
      no2Progress: d.getElementById('no2Progress'),
      pm25Bar: d.getElementById('pm25Bar'),
      pm10Bar: d.getElementById('pm10Bar'),
      no2Bar: d.getElementById('no2Bar'),
      telemetryInversion: d.getElementById('telemetryInversion'),
      hourlyForecastGrid: d.getElementById('hourlyForecastGrid'),

      routineTitle: d.getElementById('routineTitle'),
      routineTarget: d.getElementById('routineTarget'),
      routineAlert: d.getElementById('routineAlert'),
      routineMorning: d.getElementById('routineMorning'),
      routineMidday: d.getElementById('routineMidday'),
      routineEvening: d.getElementById('routineEvening'),
      routineNight: d.getElementById('routineNight'),

      hacksContainer: d.getElementById('hacksContainer'),

      calcActivity: d.getElementById('calcActivity'),
      calcDuration: d.getElementById('calcDuration'),
      calcDurationVal: d.getElementById('calcDurationVal'),
      calcIntervention: d.getElementById('calcIntervention'),
      calcAvoidedUg: d.getElementById('calcAvoidedUg'),
      calcAvoidedMg: d.getElementById('calcAvoidedMg'),
      calcCigarettes: d.getElementById('calcCigarettes'),
      calcPercentReduction: d.getElementById('calcPercentReduction'),

      calcDistance: d.getElementById('calcDistance'),
      calcDistanceVal: d.getElementById('calcDistanceVal'),
      calcBaselineMode: d.getElementById('calcBaselineMode'),
      calcAltMode: d.getElementById('calcAltMode'),
      calcDailySavedCo2: d.getElementById('calcDailySavedCo2'),
      calcAnnualSavedCo2: d.getElementById('calcAnnualSavedCo2'),
      calcTreeYears: d.getElementById('calcTreeYears'),

      communityScoreVal: d.getElementById('communityScoreVal'),
      communityScoreTier: d.getElementById('communityScoreTier'),
      communityScoreSummary: d.getElementById('communityScoreSummary'),
      actionCheckboxes: d.querySelectorAll('.action-checkbox'),

      chatMessagesContainer: d.getElementById('chatMessagesContainer'),
      chatForm: d.getElementById('chatForm'),
      chatInput: d.getElementById('chatInput'),
      quickPromptBtns: d.querySelectorAll('.quick-prompt-btn'),
      clearChatBtn: d.getElementById('clearChatBtn'),
      exportPlanBtn: d.getElementById('exportPlanBtn')
    };
  }

  function announceToScreenReader(message) {
    if (dom.screenReaderLive) {
      dom.screenReaderLive.textContent = message;
    }
  }

  function showToast(message) {
    announceToScreenReader(message);
    if (!dom.statusToast) return;
    dom.statusToast.textContent = message;
    dom.statusToast.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (dom.statusToast) dom.statusToast.classList.add('hidden');
    }, 3500);
  }

  function updateApiStatus() {
    if (!dom.apiStatusBadge) return;
    const key = state.apiKey.trim().toLowerCase();
    if (!key || key === 'demo' || key === 'test') {
      dom.apiStatusBadge.textContent = 'Mode: Intelligent Demo (Zero Key Required)';
      dom.apiStatusBadge.className = 'status-badge status-badge-demo';
    } else {
      dom.apiStatusBadge.textContent = 'Mode: Gemini 4 Hydrogen (Live Cloud AI)';
      dom.apiStatusBadge.className = 'status-badge status-badge-live';
    }
  }

  function updatePollutantMeter(barEl, progressEl, value, maxVal) {
    const pct = Math.min(100, Math.max(4, Math.round((value / maxVal) * 100)));
    if (barEl && barEl.style) {
      barEl.style.width = `${pct}%`;
    }
    if (progressEl) {
      progressEl.setAttribute('aria-valuenow', String(Math.round(value)));
    }
  }

  function renderContextVerdict(aqi, persona) {
    const verdict = AQIEngine.getContextDecisionVerdict({ aqi, persona });

    if (dom.contextVerdictBanner) {
      dom.contextVerdictBanner.setAttribute('data-status', verdict.statusKey);
    }
    if (dom.verdictHeadline) {
      dom.verdictHeadline.textContent = verdict.headline;
    }
    if (dom.verdictBestWindow) {
      dom.verdictBestWindow.textContent = `Best Window: ${verdict.bestWindow}`;
    }
    if (dom.verdictVentilateChip) {
      dom.verdictVentilateChip.textContent = verdict.ventilateNow ? '🪟 Ventilate Now: YES' : '🪟 Ventilate Now: NO';
      dom.verdictVentilateChip.className = `decision-chip ${verdict.ventilateNow ? 'chip-safe' : 'chip-danger'}`;
    }
    if (dom.verdictMaskChip) {
      dom.verdictMaskChip.textContent = verdict.maskRequired ? '😷 N95 Mask: REQUIRED' : '😷 N95 Mask: OPTIONAL';
      dom.verdictMaskChip.className = `decision-chip ${verdict.maskRequired ? 'chip-warning' : 'chip-safe'}`;
    }
    if (dom.verdictExerciseChip) {
      dom.verdictExerciseChip.textContent = verdict.outdoorExerciseSafe ? '🏃 Outdoor Cardio: SAFE' : '🏃 Outdoor Cardio: UNSAFE';
      dom.verdictExerciseChip.className = `decision-chip ${verdict.outdoorExerciseSafe ? 'chip-safe' : 'chip-danger'}`;
    }
  }

  function renderDashboard() {
    const city = AQIEngine.PRESET_CITIES[state.selectedCity] || AQIEngine.PRESET_CITIES['delhi-ncr'];
    const aqi = state.customAQI;
    const cat = AQIEngine.getAQICategory(aqi);
    const pollutants = AQIEngine.estimatePollutantsFromAQI(aqi, city);
    const naqi = AQIEngine.getIndianNAQIAssessment(pollutants.pm25, pollutants.pm10);
    const inversionRisk = AQIEngine.getInversionRiskTier(aqi);

    if (dom.aqiGaugeCard) {
      dom.aqiGaugeCard.setAttribute('data-status', cat.statusKey);
    }
    if (dom.telemetryCityName) dom.telemetryCityName.textContent = city.name;
    if (dom.telemetryAqiVal) {
      dom.telemetryAqiVal.textContent = String(aqi);
      if (dom.telemetryAqiVal.style) dom.telemetryAqiVal.style.color = cat.color;
    }
    if (dom.telemetryAqiBadge) {
      dom.telemetryAqiBadge.textContent = `${cat.badge} ${cat.category}`;
      if (dom.telemetryAqiBadge.style) {
        dom.telemetryAqiBadge.style.backgroundColor = cat.color;
        dom.telemetryAqiBadge.style.color = '#ffffff';
      }
    }
    if (dom.telemetryNaqiSummary) {
      dom.telemetryNaqiSummary.textContent = `Indian CPCB NAQI: ${naqi.naqi} (${naqi.category})`;
    }
    if (dom.telemetryAqiAdvisory) dom.telemetryAqiAdvisory.textContent = cat.advisory;

    if (dom.telemetryPm25) dom.telemetryPm25.textContent = `${pollutants.pm25} µg/m³`;
    if (dom.telemetryPm10) dom.telemetryPm10.textContent = `${pollutants.pm10} µg/m³`;
    if (dom.telemetryNo2) dom.telemetryNo2.textContent = `${pollutants.no2} µg/m³`;
    if (dom.telemetryInversion) dom.telemetryInversion.textContent = inversionRisk;

    updatePollutantMeter(dom.pm25Bar, dom.pm25Progress, pollutants.pm25, 400);
    updatePollutantMeter(dom.pm10Bar, dom.pm10Progress, pollutants.pm10, 600);
    updatePollutantMeter(dom.no2Bar, dom.no2Progress, pollutants.no2, 150);

    if (dom.customAqiSlider) {
      dom.customAqiSlider.setAttribute('aria-valuenow', String(aqi));
      dom.customAqiSlider.setAttribute('aria-valuetext', `AQI ${aqi} (${cat.category})`);
    }

    renderContextVerdict(aqi, state.selectedPersona);
    renderHourlyForecast(aqi);
    renderRoutineTab(state.selectedPersona, aqi);
    calculateInhalation();
    calculateCarbon();
  }

  function renderHourlyForecast(baseAqi) {
    if (!dom.hourlyForecastGrid) return;
    const d = dom.doc || document;
    const forecast = AQIEngine.getHourlyInversionForecast(baseAqi);

    dom.hourlyForecastGrid.innerHTML = '';
    forecast.forEach(slot => {
      const cat = AQIEngine.getAQICategory(slot.aqi);
      const isOptimal = slot.windowType === 'optimal-ventilation';
      const isHazard = slot.windowType === 'peak-hazard';

      const card = d.createElement('div');
      card.className = `forecast-slot ${
        isOptimal ? 'forecast-slot-optimal' : isHazard ? 'forecast-slot-hazard' : ''
      }`;
      card.setAttribute('data-status', cat.statusKey);
      card.setAttribute('title', `${slot.timeLabel}: AQI ${slot.aqi} — ${slot.recommendation}`);

      const timeEl = d.createElement('div');
      timeEl.className = 'forecast-time';
      timeEl.textContent = slot.timeLabel;

      const valEl = d.createElement('div');
      valEl.className = 'forecast-aqi';
      valEl.textContent = String(slot.aqi);
      if (valEl.style) valEl.style.color = cat.color;

      const tagEl = d.createElement('div');
      tagEl.className = `forecast-tag ${isOptimal ? 'forecast-tag-optimal' : ''}`;
      tagEl.textContent = isOptimal ? '✨ Dip' : cat.category.split(' ')[0];

      card.appendChild(timeEl);
      card.appendChild(valEl);
      card.appendChild(tagEl);
      dom.hourlyForecastGrid.appendChild(card);
    });
  }

  function renderRoutineTab(persona, aqi) {
    const routine = AQIEngine.getPersonalizedRoutine(persona, aqi);

    if (dom.routineTitle) dom.routineTitle.textContent = routine.title;
    if (dom.routineTarget) dom.routineTarget.textContent = routine.targetGroup;
    if (dom.routineAlert) dom.routineAlert.textContent = routine.priorityAlert;
    if (dom.routineMorning) dom.routineMorning.textContent = routine.morningRoutine;
    if (dom.routineMidday) dom.routineMidday.textContent = routine.middayRoutine;
    if (dom.routineEvening) dom.routineEvening.textContent = routine.eveningRoutine;
    if (dom.routineNight) dom.routineNight.textContent = routine.nightRoutine;
  }

  function renderIaqHacks() {
    if (!dom.hacksContainer) return;
    const d = dom.doc || document;
    dom.hacksContainer.innerHTML = '';

    ImpactCalculator.IAQ_HACKS.forEach(hack => {
      const card = d.createElement('article');
      card.className = 'glass-card hack-card';
      card.setAttribute('aria-labelledby', `hack-title-${hack.id}`);

      const metaRow = d.createElement('div');
      metaRow.className = 'card-header-row wrap-gap';

      const badgeSpan = d.createElement('span');
      badgeSpan.className = 'pill-teal';
      badgeSpan.textContent = hack.badge;

      const costSpan = d.createElement('span');
      costSpan.className = 'caption-muted';
      costSpan.textContent = `${hack.costCategory} • ${hack.difficulty}`;

      metaRow.appendChild(badgeSpan);
      metaRow.appendChild(costSpan);

      const titleEl = d.createElement('h3');
      titleEl.id = `hack-title-${hack.id}`;
      titleEl.className = 'section-subtitle';
      titleEl.textContent = hack.title;

      const summaryEl = d.createElement('p');
      summaryEl.className = 'body-muted';
      summaryEl.textContent = hack.summary;

      const cols = d.createElement('div');
      cols.className = 'hack-columns';

      const matCol = d.createElement('div');
      const matHeading = d.createElement('h4');
      matHeading.className = 'eyebrow text-teal block-mb';
      matHeading.textContent = 'Required Materials';
      const matUl = d.createElement('ul');
      matUl.className = 'hack-list';
      hack.materials.forEach(m => {
        const li = d.createElement('li');
        li.textContent = m;
        matUl.appendChild(li);
      });
      matCol.appendChild(matHeading);
      matCol.appendChild(matUl);

      const stepCol = d.createElement('div');
      const stepHeading = d.createElement('h4');
      stepHeading.className = 'eyebrow text-teal block-mb';
      stepHeading.textContent = 'Implementation Steps';
      const stepOl = d.createElement('ol');
      stepOl.className = 'hack-list';
      hack.steps.forEach((s, idx) => {
        const li = d.createElement('li');
        const strong = d.createElement('strong');
        strong.className = 'text-teal';
        strong.textContent = `Step ${idx + 1}: `;
        li.appendChild(strong);
        li.appendChild(d.createTextNode(s));
        stepOl.appendChild(li);
      });
      stepCol.appendChild(stepHeading);
      stepCol.appendChild(stepOl);

      cols.appendChild(matCol);
      cols.appendChild(stepCol);

      const noteEl = d.createElement('div');
      noteEl.className = 'highlight-box';
      const noteStrong = d.createElement('strong');
      noteStrong.textContent = 'Atmospheric Science Note: ';
      noteEl.appendChild(noteStrong);
      noteEl.appendChild(d.createTextNode(hack.scienceNote));

      card.appendChild(metaRow);
      card.appendChild(titleEl);
      card.appendChild(summaryEl);
      card.appendChild(cols);
      card.appendChild(noteEl);
      dom.hacksContainer.appendChild(card);
    });
  }

  function calculateInhalation() {
    const city = AQIEngine.PRESET_CITIES[state.selectedCity] || AQIEngine.PRESET_CITIES['delhi-ncr'];
    const pollutants = AQIEngine.estimatePollutantsFromAQI(state.customAQI, city);

    const activity = dom.calcActivity ? dom.calcActivity.value : 'walking';
    const hours = dom.calcDuration ? Number(dom.calcDuration.value) : 2;
    const intervention = dom.calcIntervention ? dom.calcIntervention.value : 'n95Mask';

    if (dom.calcDuration) dom.calcDuration.setAttribute('aria-valuenow', String(hours));
    if (dom.calcDurationVal) dom.calcDurationVal.textContent = `${hours} hrs`;

    const res = ImpactCalculator.calculateInhalationImpact(pollutants.pm25, hours, activity, intervention);

    if (dom.calcAvoidedUg) dom.calcAvoidedUg.textContent = `${res.avoidedUg.toLocaleString()} µg`;
    if (dom.calcAvoidedMg) dom.calcAvoidedMg.textContent = `(${res.avoidedMg} mg)`;
    if (dom.calcCigarettes) dom.calcCigarettes.textContent = `${res.cigarettesAvoided} cigs`;
    if (dom.calcPercentReduction) dom.calcPercentReduction.textContent = `${res.percentReduction}% reduction`;
    return res;
  }

  function calculateCarbon() {
    const distance = dom.calcDistance ? Number(dom.calcDistance.value) : 15;
    const baseline = dom.calcBaselineMode ? dom.calcBaselineMode.value : 'petrolCar';
    const alt = dom.calcAltMode ? dom.calcAltMode.value : 'metroRail';

    if (dom.calcDistance) dom.calcDistance.setAttribute('aria-valuenow', String(distance));
    if (dom.calcDistanceVal) dom.calcDistanceVal.textContent = `${distance} km`;

    const res = ImpactCalculator.calculateCarbonSavings(distance, baseline, alt);

    if (dom.calcDailySavedCo2) dom.calcDailySavedCo2.textContent = `${res.dailySavedKg} kg`;
    if (dom.calcAnnualSavedCo2) dom.calcAnnualSavedCo2.textContent = `${res.annualSavedKg} kg CO₂/yr`;
    if (dom.calcTreeYears) dom.calcTreeYears.textContent = `${res.treeYearsEquivalent} trees/yr`;
    return res;
  }

  function updateCommunityScore() {
    const actions = {};
    if (dom.actionCheckboxes) {
      dom.actionCheckboxes.forEach(cb => {
        actions[cb.value] = Boolean(cb.checked);
      });
    }
    state.savedActions = actions;

    const res = ImpactCalculator.evaluateCommunityScore(actions);

    if (dom.communityScoreVal) dom.communityScoreVal.textContent = String(res.score);
    if (dom.communityScoreTier) dom.communityScoreTier.textContent = `${res.badge} ${res.tier}`;
    if (dom.communityScoreSummary) dom.communityScoreSummary.textContent = res.summary;
    return res;
  }

  function appendChatMessage(role, content, isMarkdown = false) {
    if (!dom.chatMessagesContainer) return;
    const d = dom.doc || document;

    const msgWrapper = d.createElement('div');
    msgWrapper.className = `chat-row ${role === 'user' ? 'chat-row-user' : 'chat-row-assistant'}`;

    const bubble = d.createElement('div');
    bubble.className = `chat-bubble ${role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`;

    if (role === 'user') {
      bubble.textContent = content;
    } else if (isMarkdown) {
      bubble.innerHTML = GeminiService.markdownToHtml(content);
    } else {
      bubble.textContent = content;
    }

    msgWrapper.appendChild(bubble);
    dom.chatMessagesContainer.appendChild(msgWrapper);
    dom.chatMessagesContainer.scrollTop = dom.chatMessagesContainer.scrollHeight;

    state.chatHistory.push({ role, content, timestamp: new Date().toISOString() });
  }

  function appendLoadingMessage() {
    if (!dom.chatMessagesContainer) return null;
    const d = dom.doc || document;
    const id = `loading-${Date.now()}`;
    const loader = d.createElement('div');
    loader.id = id;
    loader.className = 'chat-row chat-row-assistant';

    const bubble = d.createElement('div');
    bubble.className = 'chat-bubble chat-bubble-assistant';
    bubble.textContent = 'AuraAir is reasoning with current atmospheric context...';

    loader.appendChild(bubble);
    dom.chatMessagesContainer.appendChild(loader);
    dom.chatMessagesContainer.scrollTop = dom.chatMessagesContainer.scrollHeight;
    return id;
  }

  function removeLoadingMessage(id) {
    if (!id) return;
    const d = dom.doc || document;
    const el = d.getElementById(id);
    if (el) el.remove();
  }

  async function handleSendMessage(customPrompt) {
    const query = customPrompt || (dom.chatInput ? dom.chatInput.value.trim() : '');
    if (!query) return;

    if (dom.chatInput) dom.chatInput.value = '';

    const priorHistory = state.chatHistory.slice(-4);
    appendChatMessage('user', query);
    announceToScreenReader(`User question sent: ${query}`);

    const loadingId = appendLoadingMessage();

    try {
      const city = AQIEngine.PRESET_CITIES[state.selectedCity] || AQIEngine.PRESET_CITIES['delhi-ncr'];
      const cat = AQIEngine.getAQICategory(state.customAQI);

      const adviceMarkdown = await GeminiService.generateAdvice({
        apiKey: state.apiKey,
        userQuery: query,
        persona: state.selectedPersona,
        cityName: city.name,
        aqi: state.customAQI,
        category: cat.category,
        history: priorHistory
      });

      removeLoadingMessage(loadingId);
      appendChatMessage('assistant', adviceMarkdown, true);
      announceToScreenReader('AuraAir generated new advice');
    } catch (err) {
      removeLoadingMessage(loadingId);
      const safeMsg = GeminiService.sanitizeInput(err && err.message ? err.message : 'Unable to generate response.');
      appendChatMessage(
        'assistant',
        `⚠️ **Notice:** ${safeMsg}\n\nPlease check your input or switch to Intelligent Demo Mode.`,
        true
      );
    }
  }

  function buildActionPlanText() {
    const city = AQIEngine.PRESET_CITIES[state.selectedCity] || AQIEngine.PRESET_CITIES['delhi-ncr'];
    const aqi = state.customAQI;
    const cat = AQIEngine.getAQICategory(aqi);
    const routine = AQIEngine.getPersonalizedRoutine(state.selectedPersona, aqi);

    return `=====================================================
AuraAir: Urban Air Quality Daily Action Plan
Challenge 6: Urban Air Quality Assistant
=====================================================
Generated: ${new Date().toISOString()}
Location: ${city.name}
Current AQI: ${aqi} (${cat.category})
Target Persona: ${routine.title} - ${routine.targetGroup}

CRITICAL PRIORITY ALERT:
${routine.priorityAlert}

RECOMMENDED DAILY SCHEDULE:
• Morning (06:00 - 09:30): ${routine.morningRoutine}
• Midday Dip (12:00 - 15:00): ${routine.middayRoutine}
• Evening (17:00 - 20:30): ${routine.eveningRoutine}
• Night (21:00 - 06:00): ${routine.nightRoutine}

RECOMMENDED INDOOR & TRANSIT HACKS:
1. DIY Corsi-Rosenthal Box Fan (MERV-13) - 85% PM2.5 capture.
2. In-Cabin Recirculation on congested commute corridors.
3. NASA CAM Plants (Snake Plant) for bedroom nocturnal O2 replenishment.
4. Sealed Window Timing: Vent strictly between 12:30 PM - 03:00 PM.

=====================================================
Powered by Gemini 4 Hydrogen • Pure HTML/CSS/JS
=====================================================`;
  }

  function exportDailyPlan() {
    const planText = buildActionPlanText();
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
      return planText;
    }
    const d = dom.doc || document;
    const blob = new Blob([planText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = d.createElement('a');
    link.href = url;
    link.download = `AuraAir-Action-Plan-${state.selectedCity}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Daily action plan downloaded.');
    return planText;
  }

  function switchTab(targetId) {
    if (!dom.tabBtns || !dom.tabPanels) return;
    state.activeTab = targetId;

    dom.tabBtns.forEach(b => {
      const isSelected = b.getAttribute('data-tab') === targetId;
      b.classList.toggle('active', isSelected);
      b.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      b.setAttribute('tabindex', isSelected ? '0' : '-1');
      if (isSelected) {
        announceToScreenReader(`Switched to tab: ${b.textContent.trim()}`);
      }
    });

    dom.tabPanels.forEach(panel => {
      const isVisible = panel.id === targetId;
      panel.classList.toggle('hidden', !isVisible);
      panel.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    });
  }

  function setupTabs() {
    if (!dom.tabBtns || dom.tabBtns.length === 0) return;
    const tabs = Array.from(dom.tabBtns);

    tabs.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        switchTab(btn.getAttribute('data-tab'));
      });

      btn.addEventListener('keydown', e => {
        let nextIndex = null;
        if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = tabs.length - 1;

        if (nextIndex !== null) {
          e.preventDefault();
          const nextTab = tabs[nextIndex];
          switchTab(nextTab.getAttribute('data-tab'));
          if (typeof nextTab.focus === 'function') nextTab.focus();
        }
      });
    });
  }

  function setupEventListeners() {
    if (dom.saveApiKeyBtn && dom.apiKeyInput) {
      dom.saveApiKeyBtn.addEventListener('click', () => {
        const val = dom.apiKeyInput.value.trim();
        state.apiKey = val;
        if (val) {
          safeStorage.set('auraair_gemini_key', val);
          showToast('Gemini API Key saved locally in browser storage.');
        } else {
          safeStorage.remove('auraair_gemini_key');
          showToast('Switched to Intelligent Demo Mode (No Key Required).');
        }
        updateApiStatus();
      });
    }

    if (dom.clearApiKeyBtn) {
      dom.clearApiKeyBtn.addEventListener('click', () => {
        state.apiKey = '';
        if (dom.apiKeyInput) dom.apiKeyInput.value = '';
        safeStorage.remove('auraair_gemini_key');
        updateApiStatus();
        showToast('Reset to Intelligent Demo Mode.');
      });
    }

    if (dom.highContrastToggle) {
      dom.highContrastToggle.addEventListener('click', () => {
        state.highContrast = !state.highContrast;
        safeStorage.set('auraair_high_contrast', state.highContrast);
        dom.body.classList.toggle('high-contrast', state.highContrast);
        dom.highContrastToggle.setAttribute('aria-pressed', String(state.highContrast));
        showToast(`High contrast mode ${state.highContrast ? 'enabled' : 'disabled'}.`);
      });
    }

    if (dom.colorblindToggle) {
      dom.colorblindToggle.addEventListener('click', () => {
        state.colorblindMode = !state.colorblindMode;
        safeStorage.set('auraair_colorblind', state.colorblindMode);
        dom.body.classList.toggle('colorblind-mode', state.colorblindMode);
        dom.colorblindToggle.setAttribute('aria-pressed', String(state.colorblindMode));
        showToast(`Colorblind pattern mode ${state.colorblindMode ? 'enabled' : 'disabled'}.`);
      });
    }

    if (dom.citySelect) {
      dom.citySelect.addEventListener('change', e => {
        state.selectedCity = e.target.value;
        const city = AQIEngine.PRESET_CITIES[state.selectedCity];
        if (city) {
          state.customAQI = city.aqi;
          if (dom.customAqiSlider) dom.customAqiSlider.value = String(city.aqi);
          if (dom.customAqiDisplay) dom.customAqiDisplay.textContent = String(city.aqi);
          announceToScreenReader(`Location changed to ${city.name}`);
        }
        renderDashboard();
      });
    }

    if (dom.customAqiSlider) {
      dom.customAqiSlider.addEventListener('input', e => {
        state.customAQI = Number(e.target.value);
        if (dom.customAqiDisplay) dom.customAqiDisplay.textContent = String(state.customAQI);
        renderDashboard();
      });
    }

    if (dom.personaSelect) {
      dom.personaSelect.addEventListener('change', e => {
        state.selectedPersona = e.target.value;
        renderDashboard();
        announceToScreenReader(`Target persona updated to ${state.selectedPersona}`);
      });
    }

    if (dom.calcActivity) dom.calcActivity.addEventListener('change', calculateInhalation);
    if (dom.calcDuration) dom.calcDuration.addEventListener('input', calculateInhalation);
    if (dom.calcIntervention) dom.calcIntervention.addEventListener('change', calculateInhalation);

    if (dom.calcDistance) dom.calcDistance.addEventListener('input', calculateCarbon);
    if (dom.calcBaselineMode) dom.calcBaselineMode.addEventListener('change', calculateCarbon);
    if (dom.calcAltMode) dom.calcAltMode.addEventListener('change', calculateCarbon);

    if (dom.actionCheckboxes) {
      dom.actionCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateCommunityScore);
      });
    }

    if (dom.chatForm) {
      dom.chatForm.addEventListener('submit', e => {
        e.preventDefault();
        handleSendMessage();
      });
    }

    if (dom.quickPromptBtns) {
      dom.quickPromptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.getAttribute('data-prompt') || btn.textContent.trim();
          handleSendMessage(text);
        });
      });
    }

    if (dom.clearChatBtn && dom.chatMessagesContainer) {
      dom.clearChatBtn.addEventListener('click', () => {
        dom.chatMessagesContainer.innerHTML = '';
        state.chatHistory = [];
        appendChatMessage('assistant', 'Chat history cleared. How can I assist your family or community today?', true);
        announceToScreenReader('Chat history cleared');
      });
    }

    if (dom.exportPlanBtn) {
      dom.exportPlanBtn.addEventListener('click', exportDailyPlan);
    }
  }

  function initApp(doc) {
    state = createInitialState();
    initDomElements(doc);
    setupTabs();
    setupEventListeners();

    if (state.highContrast && dom.body) {
      dom.body.classList.add('high-contrast');
      if (dom.highContrastToggle) dom.highContrastToggle.setAttribute('aria-pressed', 'true');
    }
    if (state.colorblindMode && dom.body) {
      dom.body.classList.add('colorblind-mode');
      if (dom.colorblindToggle) dom.colorblindToggle.setAttribute('aria-pressed', 'true');
    }
    if (state.apiKey && dom.apiKeyInput) {
      dom.apiKeyInput.value = state.apiKey;
    }

    updateApiStatus();
    renderDashboard();
    renderIaqHacks();
    updateCommunityScore();

    appendChatMessage(
      'assistant',
      `👋 **Welcome to AuraAir – Your Urban Air Quality & Winter Smog Assistant!**\n\n` +
      `I am calibrated to help you navigate severe seasonal inversion, optimize daily low-emission routines, and safeguard your household against PM2.5 inhalation.\n\n` +
      `*Select a quick question above or type your scenario below to receive context-tailored advice.*`,
      true
    );
  }

  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', () => initApp(document));
  }

  return {
    initApp,
    getState: () => state,
    updateApiStatus,
    renderDashboard,
    renderHourlyForecast,
    renderRoutineTab,
    renderIaqHacks,
    calculateInhalation,
    calculateCarbon,
    updateCommunityScore,
    switchTab,
    handleSendMessage,
    buildActionPlanText,
    exportDailyPlan
  };
});
