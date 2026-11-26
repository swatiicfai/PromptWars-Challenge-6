/**
 * @file app.js
 * @description Master UI application controller for Urban Air Quality Assistant (AuraAir).
 * Manages reactive state, persona selection, telemetry rendering, calculators, chat interface,
 * accessibility modes (High Contrast, Colorblind, Screen Reader announcements), and action exports.
 * @version 1.0.0
 * @license MIT
 */

'use strict';

(function () {
  // Application State
  const state = {
    apiKey: localStorage.getItem('auraair_gemini_key') || '',
    selectedCity: 'delhi-ncr',
    customAQI: 385,
    selectedPersona: 'family',
    activeTab: 'tab-dashboard',
    highContrast: localStorage.getItem('auraair_high_contrast') === 'true',
    colorblindMode: localStorage.getItem('auraair_colorblind') === 'true',
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

  /**
   * DOM Elements Cache
   */
  let dom = {};

  function initDomElements() {
    dom = {
      // Accessibility & Global
      body: document.body,
      highContrastToggle: document.getElementById('highContrastToggle'),
      colorblindToggle: document.getElementById('colorblindToggle'),
      screenReaderLive: document.getElementById('screenReaderLive'),
      apiKeyInput: document.getElementById('apiKeyInput'),
      saveApiKeyBtn: document.getElementById('saveApiKeyBtn'),
      apiStatusBadge: document.getElementById('apiStatusBadge'),

      // Selectors
      citySelect: document.getElementById('citySelect'),
      customAqiSlider: document.getElementById('customAqiSlider'),
      customAqiDisplay: document.getElementById('customAqiDisplay'),
      personaSelect: document.getElementById('personaSelect'),

      // Navigation Tabs
      tabBtns: document.querySelectorAll('.tab-nav-btn'),
      tabPanels: document.querySelectorAll('.tab-panel'),

      // Telemetry Cards
      telemetryCityName: document.getElementById('telemetryCityName'),
      telemetryAqiVal: document.getElementById('telemetryAqiVal'),
      telemetryAqiBadge: document.getElementById('telemetryAqiBadge'),
      telemetryAqiAdvisory: document.getElementById('telemetryAqiAdvisory'),
      telemetryPm25: document.getElementById('telemetryPm25'),
      telemetryPm10: document.getElementById('telemetryPm10'),
      telemetryNo2: document.getElementById('telemetryNo2'),
      telemetryInversion: document.getElementById('telemetryInversion'),
      hourlyForecastGrid: document.getElementById('hourlyForecastGrid'),

      // Routine Tab
      routineTitle: document.getElementById('routineTitle'),
      routineTarget: document.getElementById('routineTarget'),
      routineAlert: document.getElementById('routineAlert'),
      routineMorning: document.getElementById('routineMorning'),
      routineMidday: document.getElementById('routineMidday'),
      routineEvening: document.getElementById('routineEvening'),
      routineNight: document.getElementById('routineNight'),

      // IAQ Hacks Tab
      hacksContainer: document.getElementById('hacksContainer'),

      // Impact Calculator Tab
      calcActivity: document.getElementById('calcActivity'),
      calcDuration: document.getElementById('calcDuration'),
      calcDurationVal: document.getElementById('calcDurationVal'),
      calcIntervention: document.getElementById('calcIntervention'),
      calcAvoidedUg: document.getElementById('calcAvoidedUg'),
      calcAvoidedMg: document.getElementById('calcAvoidedMg'),
      calcCigarettes: document.getElementById('calcCigarettes'),
      calcPercentReduction: document.getElementById('calcPercentReduction'),

      // Carbon Calculator
      calcDistance: document.getElementById('calcDistance'),
      calcDistanceVal: document.getElementById('calcDistanceVal'),
      calcBaselineMode: document.getElementById('calcBaselineMode'),
      calcAltMode: document.getElementById('calcAltMode'),
      calcDailySavedCo2: document.getElementById('calcDailySavedCo2'),
      calcAnnualSavedCo2: document.getElementById('calcAnnualSavedCo2'),
      calcTreeYears: document.getElementById('calcTreeYears'),

      // Community Score
      communityScoreVal: document.getElementById('communityScoreVal'),
      communityScoreTier: document.getElementById('communityScoreTier'),
      communityScoreSummary: document.getElementById('communityScoreSummary'),
      actionCheckboxes: document.querySelectorAll('.action-checkbox'),

      // Chat Tab
      chatMessagesContainer: document.getElementById('chatMessagesContainer'),
      chatForm: document.getElementById('chatForm'),
      chatInput: document.getElementById('chatInput'),
      quickPromptBtns: document.querySelectorAll('.quick-prompt-btn'),
      clearChatBtn: document.getElementById('clearChatBtn'),
      exportPlanBtn: document.getElementById('exportPlanBtn')
    };
  }

  /**
   * Accessible Announcer for Screen Readers
   */
  function announceToScreenReader(message) {
    if (dom.screenReaderLive) {
      dom.screenReaderLive.textContent = message;
    }
  }

  /**
   * Updates API Status Badge
   */
  function updateApiStatus() {
    if (!dom.apiStatusBadge) return;
    const key = state.apiKey.trim().toLowerCase();
    if (!key || key === 'demo' || key === 'test') {
      dom.apiStatusBadge.textContent = 'Mode: Intelligent Demo (Zero Key Required)';
      dom.apiStatusBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40';
    } else {
      dom.apiStatusBadge.textContent = 'Mode: Gemini 2.0 Flash (Live Cloud AI)';
      dom.apiStatusBadge.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    }
  }

  /**
   * Refreshes all Dashboard Telemetry Cards
   */
  function renderDashboard() {
    const city = AQIEngine.PRESET_CITIES[state.selectedCity] || AQIEngine.PRESET_CITIES['delhi-ncr'];
    const aqi = state.customAQI;
    const cat = AQIEngine.getAQICategory(aqi);

    // Update Telemetry Header
    if (dom.telemetryCityName) dom.telemetryCityName.textContent = city.name;
    if (dom.telemetryAqiVal) dom.telemetryAqiVal.textContent = aqi;
    if (dom.telemetryAqiBadge) {
      dom.telemetryAqiBadge.textContent = `${cat.badge} ${cat.category}`;
      dom.telemetryAqiBadge.style.backgroundColor = cat.color;
      dom.telemetryAqiBadge.style.color = '#ffffff';
    }
    if (dom.telemetryAqiAdvisory) dom.telemetryAqiAdvisory.textContent = cat.advisory;

    // Derived pollutant concentrations
    const ratio = aqi / (city.aqi || 300);
    const pm25 = Math.round((city.pm25 * ratio) * 10) / 10;
    const pm10 = Math.round((city.pm10 * ratio) * 10) / 10;
    const no2 = Math.round((city.no2 * ratio) * 10) / 10;

    if (dom.telemetryPm25) dom.telemetryPm25.textContent = `${pm25} µg/m³`;
    if (dom.telemetryPm10) dom.telemetryPm10.textContent = `${pm10} µg/m³`;
    if (dom.telemetryNo2) dom.telemetryNo2.textContent = `${no2} µg/m³`;
    if (dom.telemetryInversion) dom.telemetryInversion.textContent = city.inversionRisk;

    // Render 24-Hour Forecast Grid
    renderHourlyForecast(aqi);

    // Also update Routine Tab
    renderRoutineTab(state.selectedPersona, aqi);

    // Also update Impact Calculations
    calculateInhalation();
    calculateCarbon();
  }

  /**
   * Renders 24-Hour Thermal Inversion Forecast Grid
   */
  function renderHourlyForecast(baseAqi) {
    if (!dom.hourlyForecastGrid) return;
    const forecast = AQIEngine.getHourlyInversionForecast(baseAqi);

    dom.hourlyForecastGrid.innerHTML = '';
    forecast.forEach(slot => {
      const cat = AQIEngine.getAQICategory(slot.aqi);
      const isOptimal = slot.windowType === 'optimal-ventilation';
      const isHazard = slot.windowType === 'peak-hazard';

      const card = document.createElement('div');
      card.className = `p-3 rounded-lg border text-center transition-all ${
        isOptimal
          ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500'
          : isHazard
          ? 'bg-red-950/30 border-red-500/40'
          : 'bg-slate-800/60 border-slate-700/60'
      }`;

      card.innerHTML = `
        <div class="text-xs font-semibold text-slate-400">${slot.timeLabel}</div>
        <div class="text-lg font-bold my-1" style="color: ${cat.color}">${slot.aqi}</div>
        <div class="text-[10px] uppercase font-bold tracking-wider px-1 py-0.5 rounded ${
          isOptimal ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
        }">${isOptimal ? '✨ Dip Window' : cat.category.split(' ')[0]}</div>
      `;
      dom.hourlyForecastGrid.appendChild(card);
    });
  }

  /**
   * Renders the Personalized Daily Routine Schedule
   */
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

  /**
   * Renders the Indoor Air Quality (IAQ) Hacks
   */
  function renderIaqHacks() {
    if (!dom.hacksContainer) return;
    dom.hacksContainer.innerHTML = '';

    ImpactCalculator.IAQ_HACKS.forEach(hack => {
      const card = document.createElement('article');
      card.className = 'glass-card p-5 rounded-xl border border-slate-700/70 bg-slate-800/50 hover:border-teal-500/50 transition-all';
      card.setAttribute('aria-labelledby', `hack-title-${hack.id}`);

      const materialsList = hack.materials.map(m => `<li class="text-sm text-slate-300">${m}</li>`).join('');
      const stepsList = hack.steps.map((s, i) => `<li class="text-sm text-slate-300 mb-1.5"><strong class="text-teal-400">Step ${i+1}:</strong> ${s}</li>`).join('');

      card.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">${hack.badge}</span>
          <span class="text-xs text-slate-400">${hack.costCategory} • ${hack.difficulty}</span>
        </div>
        <h3 id="hack-title-${hack.id}" class="text-xl font-bold text-white mb-2">${hack.title}</h3>
        <p class="text-sm text-slate-300 mb-4">${hack.summary}</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 p-3.5 bg-slate-900/60 rounded-lg border border-slate-700/50">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">Required Materials</h4>
            <ul class="list-disc list-inside space-y-1">${materialsList}</ul>
          </div>
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-teal-400 mb-2">Implementation Steps</h4>
            <ol class="space-y-1">${stepsList}</ol>
          </div>
        </div>

        <div class="text-xs text-slate-400 bg-teal-950/30 p-2.5 rounded border border-teal-500/20">
          <strong class="text-teal-300">Atmospheric Science Note:</strong> ${hack.scienceNote}
        </div>
      `;
      dom.hacksContainer.appendChild(card);
    });
  }

  /**
   * Calculates avoided particulate inhalation
   */
  function calculateInhalation() {
    const city = AQIEngine.PRESET_CITIES[state.selectedCity] || AQIEngine.PRESET_CITIES['delhi-ncr'];
    const ratio = state.customAQI / (city.aqi || 300);
    const pm25 = Math.round(city.pm25 * ratio);

    const activity = dom.calcActivity ? dom.calcActivity.value : 'walking';
    const hours = dom.calcDuration ? Number(dom.calcDuration.value) : 2;
    const intervention = dom.calcIntervention ? dom.calcIntervention.value : 'n95Mask';

    if (dom.calcDurationVal) dom.calcDurationVal.textContent = `${hours} hrs`;

    const res = ImpactCalculator.calculateInhalationImpact(pm25, hours, activity, intervention);

    if (dom.calcAvoidedUg) dom.calcAvoidedUg.textContent = `${res.avoidedUg.toLocaleString()} µg`;
    if (dom.calcAvoidedMg) dom.calcAvoidedMg.textContent = `${res.avoidedMg} mg`;
    if (dom.calcCigarettes) dom.calcCigarettes.textContent = `${res.cigarettesAvoided} cigs`;
    if (dom.calcPercentReduction) dom.calcPercentReduction.textContent = `${res.percentReduction}%`;
  }

  /**
   * Calculates avoided carbon emissions
   */
  function calculateCarbon() {
    const distance = dom.calcDistance ? Number(dom.calcDistance.value) : 15;
    const baseline = dom.calcBaselineMode ? dom.calcBaselineMode.value : 'petrolCar';
    const alt = dom.calcAltMode ? dom.calcAltMode.value : 'metroRail';

    if (dom.calcDistanceVal) dom.calcDistanceVal.textContent = `${distance} km`;

    const res = ImpactCalculator.calculateCarbonSavings(distance, baseline, alt);

    if (dom.calcDailySavedCo2) dom.calcDailySavedCo2.textContent = `${res.dailySavedKg} kg`;
    if (dom.calcAnnualSavedCo2) dom.calcAnnualSavedCo2.textContent = `${res.annualSavedKg} kg`;
    if (dom.calcTreeYears) dom.calcTreeYears.textContent = `${res.treeYearsEquivalent} trees/yr`;
  }

  /**
   * Updates Community Contribution Score
   */
  function updateCommunityScore() {
    const actions = {};
    if (dom.actionCheckboxes) {
      dom.actionCheckboxes.forEach(cb => {
        actions[cb.value] = cb.checked;
      });
    }
    state.savedActions = actions;

    const res = ImpactCalculator.evaluateCommunityScore(actions);

    if (dom.communityScoreVal) dom.communityScoreVal.textContent = res.score;
    if (dom.communityScoreTier) dom.communityScoreTier.textContent = `${res.badge} ${res.tier}`;
    if (dom.communityScoreSummary) dom.communityScoreSummary.textContent = res.summary;
  }

  /**
   * Handles Sending a Message in the GenAI Chat
   */
  async function handleSendMessage(customPrompt) {
    const query = customPrompt || (dom.chatInput ? dom.chatInput.value.trim() : '');
    if (!query) return;

    if (dom.chatInput) dom.chatInput.value = '';

    // Append User Message to Chat
    appendChatMessage('user', query);
    announceToScreenReader(`User question sent: ${query}`);

    // Loading indicator
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
        category: cat.category
      });

      removeLoadingMessage(loadingId);
      appendChatMessage('assistant', adviceMarkdown, true);
      announceToScreenReader('AuraAir generated new advice');
    } catch (err) {
      removeLoadingMessage(loadingId);
      appendChatMessage('assistant', `⚠️ **Error:** ${err.message}\n\nPlease check your input or verify your Gemini API key in the top settings.`);
    }
  }

  /**
   * Appends a message bubble to the chat container
   */
  function appendChatMessage(role, content, isMarkdown = false) {
    if (!dom.chatMessagesContainer) return;

    const msgWrapper = document.createElement('div');
    msgWrapper.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-4`;

    const bubble = document.createElement('div');
    bubble.className = `max-w-[85%] md:max-w-[75%] p-4 rounded-2xl ${
      role === 'user'
        ? 'bg-teal-600 text-white rounded-br-none shadow-md'
        : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/80 shadow-md'
    }`;

    if (role === 'user') {
      bubble.textContent = content;
    } else {
      bubble.innerHTML = isMarkdown ? GeminiService.markdownToHtml(content) : content;
    }

    msgWrapper.appendChild(bubble);
    dom.chatMessagesContainer.appendChild(msgWrapper);
    dom.chatMessagesContainer.scrollTop = dom.chatMessagesContainer.scrollHeight;

    state.chatHistory.push({ role, content, timestamp: new Date().toISOString() });
  }

  /**
   * Shows a typing indicator in chat
   */
  function appendLoadingMessage() {
    if (!dom.chatMessagesContainer) return null;
    const id = `loading-${Date.now()}`;
    const loader = document.createElement('div');
    loader.id = id;
    loader.className = 'flex justify-start mb-4';
    loader.innerHTML = `
      <div class="bg-slate-800/90 text-teal-400 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-700 flex items-center space-x-2">
        <span class="inline-block w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
        <span class="inline-block w-2 h-2 rounded-full bg-teal-400 animate-pulse delay-150"></span>
        <span class="inline-block w-2 h-2 rounded-full bg-teal-400 animate-pulse delay-300"></span>
        <span class="text-xs font-medium text-slate-300 ml-2">AuraAir is reasoning...</span>
      </div>
    `;
    dom.chatMessagesContainer.appendChild(loader);
    dom.chatMessagesContainer.scrollTop = dom.chatMessagesContainer.scrollHeight;
    return id;
  }

  function removeLoadingMessage(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  /**
   * Export Personalized Daily Action Plan as Text/File
   */
  function exportDailyPlan() {
    const city = AQIEngine.PRESET_CITIES[state.selectedCity] || AQIEngine.PRESET_CITIES['delhi-ncr'];
    const aqi = state.customAQI;
    const cat = AQIEngine.getAQICategory(aqi);
    const routine = AQIEngine.getPersonalizedRoutine(state.selectedPersona, aqi);

    const planText = `=====================================================
AuraAir: Urban Air Quality Daily Action Plan
Challenge 6: Urban Air Quality Assistant
=====================================================
Generated: ${new Date().toLocaleString()}
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
Powered by Google Gemini 2.0 Flash • Pure HTML/CSS/JS
=====================================================`;

    const blob = new Blob([planText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AuraAir-Action-Plan-${state.selectedCity}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    announceToScreenReader('Daily action plan downloaded successfully');
  }

  /**
   * Sets up Tab Navigation
   */
  function setupTabs() {
    if (!dom.tabBtns) return;

    dom.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        state.activeTab = targetId;

        dom.tabBtns.forEach(b => {
          b.classList.remove('active', 'border-teal-400', 'text-teal-400', 'bg-slate-800');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active', 'border-teal-400', 'text-teal-400', 'bg-slate-800');
        btn.setAttribute('aria-selected', 'true');

        dom.tabPanels.forEach(panel => {
          if (panel.id === targetId) {
            panel.classList.remove('hidden');
            panel.setAttribute('aria-hidden', 'false');
          } else {
            panel.classList.add('hidden');
            panel.setAttribute('aria-hidden', 'true');
          }
        });

        announceToScreenReader(`Switched to tab: ${btn.textContent.trim()}`);
      });
    });
  }

  /**
   * Event Listeners Registration
   */
  function setupEventListeners() {
    // API Key Storage
    if (dom.saveApiKeyBtn && dom.apiKeyInput) {
      dom.saveApiKeyBtn.addEventListener('click', () => {
        const val = dom.apiKeyInput.value.trim();
        state.apiKey = val;
        localStorage.setItem('auraair_gemini_key', val);
        updateApiStatus();
        announceToScreenReader('API settings updated');
        alert(val ? 'Gemini API Key saved in localStorage!' : 'Reset to Intelligent Demo Mode (No Key Required).');
      });
    }

    // High Contrast Mode Toggle
    if (dom.highContrastToggle) {
      dom.highContrastToggle.addEventListener('click', () => {
        state.highContrast = !state.highContrast;
        localStorage.setItem('auraair_high_contrast', state.highContrast);
        dom.body.classList.toggle('high-contrast', state.highContrast);
        announceToScreenReader(`High contrast mode ${state.highContrast ? 'enabled' : 'disabled'}`);
      });
    }

    // Colorblind Mode Toggle
    if (dom.colorblindToggle) {
      dom.colorblindToggle.addEventListener('click', () => {
        state.colorblindMode = !state.colorblindMode;
        localStorage.setItem('auraair_colorblind', state.colorblindMode);
        dom.body.classList.toggle('colorblind-mode', state.colorblindMode);
        announceToScreenReader(`Colorblind accessible mode ${state.colorblindMode ? 'enabled' : 'disabled'}`);
      });
    }

    // City Selector
    if (dom.citySelect) {
      dom.citySelect.addEventListener('change', e => {
        state.selectedCity = e.target.value;
        const city = AQIEngine.PRESET_CITIES[state.selectedCity];
        if (city) {
          state.customAQI = city.aqi;
          if (dom.customAqiSlider) dom.customAqiSlider.value = city.aqi;
          if (dom.customAqiDisplay) dom.customAqiDisplay.textContent = city.aqi;
        }
        renderDashboard();
        announceToScreenReader(`Location changed to ${city.name}`);
      });
    }

    // Custom AQI Slider
    if (dom.customAqiSlider) {
      dom.customAqiSlider.addEventListener('input', e => {
        state.customAQI = Number(e.target.value);
        if (dom.customAqiDisplay) dom.customAqiDisplay.textContent = state.customAQI;
        renderDashboard();
      });
    }

    // Persona Selector
    if (dom.personaSelect) {
      dom.personaSelect.addEventListener('change', e => {
        state.selectedPersona = e.target.value;
        renderRoutineTab(state.selectedPersona, state.customAQI);
        announceToScreenReader(`Target persona updated to ${state.selectedPersona}`);
      });
    }

    // Impact Calculator Listeners
    if (dom.calcActivity) dom.calcActivity.addEventListener('change', calculateInhalation);
    if (dom.calcDuration) dom.calcDuration.addEventListener('input', calculateInhalation);
    if (dom.calcIntervention) dom.calcIntervention.addEventListener('change', calculateInhalation);

    if (dom.calcDistance) dom.calcDistance.addEventListener('input', calculateCarbon);
    if (dom.calcBaselineMode) dom.calcBaselineMode.addEventListener('change', calculateCarbon);
    if (dom.calcAltMode) dom.calcAltMode.addEventListener('change', calculateCarbon);

    // Community Checkboxes
    if (dom.actionCheckboxes) {
      dom.actionCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateCommunityScore);
      });
    }

    // Chat Form
    if (dom.chatForm) {
      dom.chatForm.addEventListener('submit', e => {
        e.preventDefault();
        handleSendMessage();
      });
    }

    // Quick Prompts
    if (dom.quickPromptBtns) {
      dom.quickPromptBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const text = btn.getAttribute('data-prompt') || btn.textContent.trim();
          handleSendMessage(text);
        });
      });
    }

    // Clear Chat
    if (dom.clearChatBtn && dom.chatMessagesContainer) {
      dom.clearChatBtn.addEventListener('click', () => {
        dom.chatMessagesContainer.innerHTML = '';
        state.chatHistory = [];
        appendChatMessage('assistant', 'Chat history cleared. How can I assist your family or community today?');
        announceToScreenReader('Chat history cleared');
      });
    }

    // Export Plan
    if (dom.exportPlanBtn) {
      dom.exportPlanBtn.addEventListener('click', exportDailyPlan);
    }
  }

  /**
   * Initializes Application on DOMContentLoaded
   */
  document.addEventListener('DOMContentLoaded', () => {
    initDomElements();
    setupTabs();
    setupEventListeners();

    // Restore saved toggles
    if (state.highContrast) dom.body.classList.add('high-contrast');
    if (state.colorblindMode) dom.body.classList.add('colorblind-mode');
    if (state.apiKey && dom.apiKeyInput) dom.apiKeyInput.value = state.apiKey;

    updateApiStatus();
    renderDashboard();
    renderIaqHacks();
    updateCommunityScore();

    // Initial assistant greeting
    appendChatMessage(
      'assistant',
      `👋 **Welcome to AuraAir – Your Urban Air Quality & Winter Smog Assistant!**\n\n` +
      `I am calibrated to help you navigate severe seasonal inversion, optimize daily low-emission routines, and safeguard your household against PM2.5 inhalation.\n\n` +
      `*Select a quick question below or type your scenario to receive context-tailored advice.*`
    );
  });
})();
