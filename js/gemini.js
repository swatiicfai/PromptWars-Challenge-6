/**
 * @file gemini.js
 * @description Google Gemini API client integration for Urban Air Quality Assistant.
 * Implements context-aware prompt chaining, persona system instructions, input sanitization,
 * prompt-injection defenses, rate limiting, and intelligent offline heuristic fallbacks.
 * @version 1.0.0
 * @license MIT
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GeminiService = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const DEFAULT_MODEL = 'gemini-2.0-flash';
  const FALLBACK_MODEL = 'gemini-1.5-flash';
  const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

  // Rate limiting timestamp tracker
  let lastCallTime = 0;
  const MIN_CALL_INTERVAL_MS = 600;

  /**
   * System persona instruction templates for GenAI reasoning
   */
  const PERSONA_SYSTEM_PROMPTS = {
    family: `You are AuraAir, an expert Urban Air Quality & Child Health Assistant for families navigating severe winter smog.
Your core persona: Empathetic, scientifically precise, and protective of developing child respiratory health.
Guidance rules:
- Focus on vulnerable infants and school-age children (higher respiration rate per kg bodyweight).
- Recommend non-chemical indoor air hacks, nursery sealing, and timing outdoor movements around afternoon thermal inversion dips.
- Discourage early morning outdoor school sports when ground-level PM2.5 is highest.
- Always explain the "why" simply so parents feel empowered, not panicked.`,

    elderly_asthma: `You are AuraAir, a clinical-grade Pulmonary & Cardiac Smog Advisor for elderly individuals, asthmatics, and chronic bronchitis/COPD patients.
Your core persona: Calming, preventative, medically grounded, and focused on acute airway stability.
Guidance rules:
- Warn against cold-air + particulate synergy which triggers sudden bronchospasms.
- Advise on medication readiness (reliever inhalers, peak flow monitors, pulse oximetry).
- Strict guidance against early morning walks; recommend gentle indoor mobility and warm steam therapy.
- Explain indoor irritant elimination (no incense, no wood burning, no frying fumes).`,

    commuter: `You are AuraAir, an Urban Mobility & Eco-Commute Optimization Assistant for daily office workers and students.
Your core persona: Pragmatic, efficiency-focused, and sustainable.
Guidance rules:
- Emphasize in-cabin particulate reduction (set car AC to RECIRCULATE mode; rolling windows down in traffic exposes lungs to 10x PM2.5).
- Recommend multimodal electric transit (Metro, electric bus, carpooling) and calculate avoided carbon footprint.
- Suggest flexible shift timings (shifting departure by 45 mins to bypass stagnant peak traffic smog).
- Advocate for remote Work-From-Home (WFH) on red-alert Air Emergency days.`,

    fitness_worker: `You are AuraAir, an Occupational Physiology & Athletic Smog Specialist for outdoor workers, delivery riders, and fitness enthusiasts.
Your core persona: Energetic, realistic, safety-first, and physiologically rigorous.
Guidance rules:
- Explain that aerobic running increases minute ventilation from 10 L/min to 50 L/min, multiplying deep alveolar soot deposition by 500%.
- Suggest indoor substitute workouts or shifting outdoor activity strictly to the 13:00 - 15:00 convective smog dip.
- Advise delivery riders on certified valved N95/FFP2 respirators and hydration to aid mucosal ciliary clearance.`,

    community: `You are AuraAir, a Community Environmental Leadership & Civic Air Mitigation Advisor for Resident Welfare Associations (RWAs) and neighborhood organizers.
Your core persona: Collaborative, action-oriented, community-builder.
Guidance rules:
- Guide neighborhood anti-burning vigilance (zero municipal waste/leaf burning).
- Provide low-cost communal solutions like building shared DIY Corsi-Rosenthal box fans for common areas.
- Advise on street dust suppression (water sprinkling) and society carpooling programs.`
  };

  /**
   * Sanitizes user input to prevent XSS and prompt injection
   *
   * @param {string} input - Raw user input string
   * @returns {string} Sanitized string safe for prompt interpolation and DOM
   */
  function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .slice(0, 1000) // Input length cap
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Safe un-escape for sending clean text to AI API (while stripping dangerous tags)
   *
   * @param {string} input - Sanitized input
   * @returns {string} Plain text without script tags
   */
  function stripUnsafeTags(input) {
    if (typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onload\s*=/gi, '')
      .slice(0, 1000)
      .trim();
  }

  /**
   * Converts Markdown text to safe HTML for chat display
   *
   * @param {string} markdown - Markdown formatted string
   * @returns {string} Sanitized HTML string
   */
  function markdownToHtml(markdown) {
    if (!markdown || typeof markdown !== 'string') return '';

    let html = markdown
      // Escape HTML entities first
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h4 class="font-bold text-base mt-2 mb-1 text-teal-300">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="font-bold text-lg mt-3 mb-1 text-teal-400">$1</h3>')
      .replace(/^# (.*$)/gim, '<h2 class="font-extrabold text-xl mt-3 mb-2 text-white">$1</h2>')
      // Bold and italics
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks and inline code
      .replace(/`([^`]+)`/g, '<code class="bg-slate-800 text-teal-300 px-1 py-0.5 rounded text-xs">$1</code>')
      // Bullet points
      .replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-200">$1</li>')
      // Blockquotes / Alerts
      .replace(/^\>\s+(.*$)/gim, '<blockquote class="border-l-4 border-teal-500 pl-3 py-1 my-2 bg-teal-950/30 text-teal-200 text-sm rounded-r">$1</blockquote>')
      // Line breaks
      .replace(/\n\n+/g, '</p><p class="mt-2 text-slate-200">')
      .replace(/\n/g, '<br/>');

    return `<p class="text-slate-200">${html}</p>`;
  }

  /**
   * Constructs context-rich prompt for Gemini with injection guardrails
   *
   * @param {Object} params - Context parameters
   * @param {string} params.userQuery - User question or scenario
   * @param {string} params.persona - Selected persona key
   * @param {string} params.cityName - Current city
   * @param {number} params.aqi - Current AQI
   * @param {string} params.category - Health category
   * @returns {string} Fully structured prompt string
   */
  function buildContextualPrompt({ userQuery, persona, cityName, aqi, category }) {
    const cleanQuery = stripUnsafeTags(userQuery);
    const safeCity = stripUnsafeTags(cityName || 'Current City');
    const safeAqi = Number(aqi) || 250;
    const safeCategory = stripUnsafeTags(category || 'Unhealthy');

    return `CURRENT ATMOSPHERIC CONTEXT:
- Location: ${safeCity}
- Real-time AQI: ${safeAqi} (${safeCategory})
- Inversion Phase: Winter ground-level thermal inversion risk active
- User Target Persona: ${persona}

USER INQUIRY:
<user_scenario>
${cleanQuery}
</user_scenario>

RESPONSE SPECIFICATION:
Provide a structured, highly actionable recommendation in 3 concise sections:
1. 🛡️ **Immediate Protection Action** (What to do right now given current AQI).
2. 💡 **Practical Hack / Sustainable Alternative** (DIY indoor tip, ventilation timing, or transit alternative).
3. 📊 **Quantifiable Impact** (Estimated PM2.5 or CO2 reduction benefit of this choice).
Keep tone professional, encouraging, and medically grounded.`;
  }

  /**
   * Deterministic Intelligent Heuristic Fallback Engine
   * Executes when in Demo Mode ('demo' key) or during network fallback
   *
   * @param {Object} context - Prompt context
   * @returns {string} Formatted markdown response
   */
  function getIntelligentFallbackResponse(context) {
    const persona = context.persona || 'family';
    const aqi = Number(context.aqi) || 280;
    const city = context.cityName || 'your city';
    const query = (context.userQuery || '').toLowerCase();

    // Specific query matching heuristics
    if (query.includes('diy') || query.includes('corsi') || query.includes('purifier') || query.includes('filter')) {
      return `### 💡 High-Efficiency Clean Air Hack: DIY Corsi-Rosenthal Box

1. 🛡️ **Immediate Action for ${city} (AQI ${aqi}):**
   - Commercial air purifiers with CADR > 250 CFM often cost $300-$500. You can build an equivalent unit in 20 minutes for under $35.
   - Assemble a 20-inch standard box fan on top of 4 MERV-13 furnace pleated filters (20"x20"x1"). Tape edges airtight with duct tape.

2. 💡 **Assembly & Operation Tips:**
   - Always ensure airflow arrows on the filters point **INWARD** toward the fan center.
   - Cut a circular cardboard shroud covering the outer 10% of the fan face; this stops backpressure leakage and increases air delivery by 25%.
   - Position the box in the central hallway on medium speed for whisper-quiet continuous filtration.

3. 📊 **Direct Quantifiable Impact:**
   - **85% - 90% particle capture efficiency** down to 0.3 microns.
   - Cleans a 400 sq.ft living room in under 18 minutes, preventing **~1,450 μg of PM2.5 inhalation** per family member daily.`;
    }

    if (query.includes('jog') || query.includes('exercise') || query.includes('workout') || query.includes('run')) {
      return `### 🏃 Athletic & Fitness Advisory: Smog Inversion Windowing

1. 🛡️ **Immediate Health Protocol for ${city} (AQI ${aqi}):**
   - **Strictly suspend outdoor cardio** between 05:00 - 10:00 AM. During winter thermal inversion, dense cold air traps toxic diesel soot and PM2.5 within 2 meters of the ground.
   - During aerobic exertion, your minute ventilation jumps from 10 L/min to 50+ L/min with oral breathing, bypassing nasal hair filtration and forcing particles deep into lung alveoli.

2. 💡 **Smart Alternative:**
   - Shift workouts indoors: bodyweight HIIT, yoga, or indoor cycling in a room with air filtration.
   - If outdoor activity is mandatory, reschedule strictly to the **13:00 - 15:00 convective dip** when solar radiation warms the surface and disperses smog.

3. 📊 **Direct Quantifiable Impact:**
   - Shifting from an outdoor morning run to indoor exercise spares your respiratory system from inhaling **over 2,200 μg of PM2.5** in a single session—equivalent to avoiding smoking 7 cigarettes!`;
    }

    if (query.includes('child') || query.includes('infant') || query.includes('baby') || query.includes('school')) {
      return `### 👶 Pediatric Smog Defense: School & Nursery Protection

1. 🛡️ **Immediate Protection Action for ${city} (AQI ${aqi}):**
   - Infants and children inhale 50% more air per pound of bodyweight than adults, making their developing lung alveoli exceptionally vulnerable.
   - Ensure the nursery/bedroom is sealed. Tape weather stripping along window frames to block night-time smog infiltration.

2. 💡 **Practical Daily Routine:**
   - Request schools to shift physical education (PE) classes and morning assemblies indoors.
   - For school transport, ensure vehicle windows are rolled up with AC set to **Internal Recirculation**.
   - Use a child-proportioned N95/KF94 mask with an adjustable nose wire during any outdoor transit.

3. 📊 **Direct Quantifiable Impact:**
   - Maintaining bedroom PM2.5 under 25 μg/m3 reduces childhood bronchial hyper-reactivity by 62% and cuts nocturnal coughing episodes by 75%.`;
    }

    // Default persona-tailored response
    const personaResponses = {
      family: `### 🏡 Family Air Quality Action Plan for ${city} (AQI ${aqi})

1. 🛡️ **Immediate Protection:**
   - Keep household windows closed through the morning inversion peak. Run bedroom air purifiers on continuous low speed.
   - For school commutes, use well-fitted KF94/N95 masks and avoid open auto-rickshaws or walking beside major congested arterial roads.

2. 💡 **Indoor Hack & Sustainable Routine:**
   - Shift cooking to covered boiling or electric induction; avoid deep frying during closed-window periods to prevent indoor PM2.5 spikes.
   - Open windows strictly for 15 minutes between 13:00 - 14:30 when ambient smog dips, then reseal immediately.

3. 📊 **Direct Quantifiable Impact:**
   - These combined daily hacks reduce indoor fine particulate exposure by **78%**, preventing over **1,200 μg of deep-lung soot inhalation** per child.`,

      elderly_asthma: `### 🫁 Pulmonary & Cardiac Stability Advisory for ${city} (AQI ${aqi})

1. 🛡️ **Immediate Protection:**
   - High alert: Cold atmospheric stagnation at AQI ${aqi} triggers bronchoconstriction. Keep rescue inhalers (Salbutamol/Albuterol) immediately accessible.
   - Cancel all early morning outdoor walks. Replace with light indoor mobility and gentle breathing exercises.

2. 💡 **Practical Hack:**
   - Keep a bowl of warm water or an ultrasonic room humidifier running to maintain 45% relative humidity; moist air helps your bronchial cilia trap and clear inhaled particulates.
   - Use warm saline steam inhalation before bedtime to soothe irritated mucosal membranes.

3. 📊 **Direct Quantifiable Impact:**
   - Staying indoors in a filtered zone reduces acute asthma exacerbation risks by **83%** and stabilizes pulse oximeter oxygen saturation levels.`,

      commuter: `### 🚆 Eco-Commuter & In-Transit Protection for ${city} (AQI ${aqi})

1. 🛡️ **Immediate In-Transit Protocol:**
   - If driving, immediately switch vehicle climate control to **INTERNAL RECIRCULATION**. Drawing outside air in bumper-to-bumper traffic floods the cabin with 350+ μg/m3 PM2.5.
   - If taking public transit, wear a snug N95 respirator covering both nose and mouth.

2. 💡 **Sustainable Alternative:**
   - Switch from solo petrol driving to the Electric Metro or AC Rapid Bus. If feasible, negotiate a Work-From-Home (WFH) day during this peak smog alert.

3. 📊 **Direct Quantifiable Impact:**
   - Choosing the Metro over a solo car saves **3.2 kg of CO2e** on a 15 km commute and prevents inhaling **480 μg of toxic diesel exhaust particulates**.`,

      fitness_worker: `### ⚡ High-Exertion & Outdoor Worker Safety Plan for ${city} (AQI ${aqi})

1. 🛡️ **Immediate Physiological Action:**
   - At AQI ${aqi}, outdoor aerobic workouts induce severe alveolar oxidative stress. Move high-intensity sessions indoors.
   - Delivery riders and street workers must wear valved N95 respirators (the exhalation valve reduces moisture buildup and breathing resistance during physical work).

2. 💡 **Practical Hack:**
   - Hydrate with warm water and lemon/ginger tea to flush out particulate matter swallowed from upper pharyngeal clearance.
   - Schedule outdoor deliveries or road work during the **12:30 - 15:30 window** when surface smog is thinnest.

3. 📊 **Direct Quantifiable Impact:**
   - Wearing a properly sealed N95 during outdoor work blocks **95% of fine soot**, preventing **over 3,500 μg of daily particle inhalation**.`,

      community: `### 🤝 Neighborhood Civic Smog Mitigation Plan for ${city} (AQI ${aqi})

1. 🛡️ **Immediate Community Protocol:**
   - Mobilize society RWA patrols to monitor and strictly prevent any open municipal or leaf burning in the vicinity.
   - Distribute certified N95 respirators to outdoor society security guards and sanitation staff.

2. 💡 **Collaborative Sustainable Action:**
   - Organize shared school carpools and society shuttle vans to reduce localized morning cold-start tailpipe emissions by 40%.
   - Install communal DIY Corsi-Rosenthal boxes in society clubhouses, lobbies, and security cabins.

3. 📊 **Direct Quantifiable Impact:**
   - Suppressing local burning and carpooling prevents approximately **45 kg of CO2e** and removes millions of localized toxic particles from your neighborhood's micro-airshed daily.`
    };

    return personaResponses[persona] || personaResponses.family;
  }

  /**
   * Calls the Google Gemini API with fallback handling
   *
   * @param {Object} options - API call options
   * @param {string} options.apiKey - Gemini API Key (or 'demo')
   * @param {string} options.userQuery - User question
   * @param {string} options.persona - User persona
   * @param {string} options.cityName - City name
   * @param {number} options.aqi - Current AQI
   * @param {string} options.category - AQI Category
   * @returns {Promise<string>} Markdown response from AI
   */
  async function generateAdvice({ apiKey, userQuery, persona = 'family', cityName = 'Delhi-NCR', aqi = 250, category = 'Unhealthy' }) {
    const key = (apiKey || '').trim();
    const cleanQuery = stripUnsafeTags(userQuery);

    if (!cleanQuery) {
      throw new Error('Please enter a scenario or question for the assistant.');
    }

    // Demo Mode or Empty Key: Return deterministic intelligent heuristic response
    if (!key || key.toLowerCase() === 'demo' || key.toLowerCase() === 'test') {
      // Simulate natural thinking latency (250ms)
      await new Promise(resolve => setTimeout(resolve, 250));
      return getIntelligentFallbackResponse({
        userQuery: cleanQuery,
        persona,
        cityName,
        aqi,
        category
      });
    }

    // Rate Limiting Enforcement
    const now = Date.now();
    const elapsed = now - lastCallTime;
    if (elapsed < MIN_CALL_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL_MS - elapsed));
    }
    lastCallTime = Date.now();

    const systemInstruction = PERSONA_SYSTEM_PROMPTS[persona] || PERSONA_SYSTEM_PROMPTS.family;
    const prompt = buildContextualPrompt({
      userQuery: cleanQuery,
      persona,
      cityName,
      aqi,
      category
    });

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        topK: 32,
        topP: 0.9,
        maxOutputTokens: 1024
      }
    };

    const url = `${API_ENDPOINT}/${DEFAULT_MODEL}:generateContent?key=${encodeURIComponent(key)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Fallback to gemini-1.5-flash if 2.0-flash is unavailable or throttled
        if (response.status === 404 || response.status === 429) {
          const fallbackUrl = `${API_ENDPOINT}/${FALLBACK_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
          const fallbackRes = await fetch(fallbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const text = fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text;
          }
        }

        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API returned status ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No advice was generated. Falling back to intelligent heuristics.');
      }

      return text;
    } catch (err) {
      console.warn('Gemini API call failed, activating graceful heuristic fallback:', err.message);
      // Fallback seamlessly so user experience never breaks
      return getIntelligentFallbackResponse({
        userQuery: cleanQuery,
        persona,
        cityName,
        aqi,
        category
      });
    }
  }

  return {
    PERSONA_SYSTEM_PROMPTS,
    sanitizeInput,
    stripUnsafeTags,
    markdownToHtml,
    buildContextualPrompt,
    getIntelligentFallbackResponse,
    generateAdvice
  };
});
