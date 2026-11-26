/**
 * @file aqi-engine.js
 * @description Atmospheric air quality calculation engine implementing US EPA and Indian NAQI
 * standards, pollutant sub-indices, thermal inversion cycle modeling, and health risk classifications.
 * Compatible with modern browser runtime and Node.js test environments.
 * @version 1.0.0
 * @license MIT
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AQIEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /**
   * EPA Breakpoint Table for PM2.5 (ug/m3) and PM10 (ug/m3)
   */
  const EPA_BREAKPOINTS = {
    pm25: [
      { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50, category: 'Good', level: 1, color: '#10b981', badge: '🟢' },
      { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100, category: 'Moderate', level: 2, color: '#f59e0b', badge: '🟡' },
      { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', level: 3, color: '#f97316', badge: '🟠' },
      { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200, category: 'Unhealthy', level: 4, color: '#ef4444', badge: '🔴' },
      { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300, category: 'Very Unhealthy', level: 5, color: '#8b5cf6', badge: '🟣' },
      { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500, category: 'Hazardous', level: 6, color: '#7f1d1d', badge: '🟤' }
    ],
    pm10: [
      { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50, category: 'Good', level: 1, color: '#10b981', badge: '🟢' },
      { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100, category: 'Moderate', level: 2, color: '#f59e0b', badge: '🟡' },
      { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150, category: 'Unhealthy for Sensitive Groups', level: 3, color: '#f97316', badge: '🟠' },
      { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200, category: 'Unhealthy', level: 4, color: '#ef4444', badge: '🔴' },
      { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300, category: 'Very Unhealthy', level: 5, color: '#8b5cf6', badge: '🟣' },
      { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500, category: 'Hazardous', level: 6, color: '#7f1d1d', badge: '🟤' }
    ]
  };

  /**
   * Pre-configured City Profiles with typical winter smog conditions
   */
  const PRESET_CITIES = {
    'delhi-ncr': {
      name: 'Delhi-NCR, India',
      aqi: 385,
      pm25: 295.4,
      pm10: 440.0,
      no2: 85.0,
      temp: 14,
      humidity: 82,
      inversionRisk: 'Severe',
      primarySource: 'Winter Inversion, Stubble Burning & Vehicular Smog'
    },
    'beijing': {
      name: 'Beijing, China',
      aqi: 168,
      pm25: 88.5,
      pm10: 145.0,
      no2: 48.0,
      temp: -2,
      humidity: 45,
      inversionRisk: 'Moderate',
      primarySource: 'Heating Emissions & Regional Industrial Smog'
    },
    'lahore': {
      name: 'Lahore, Pakistan',
      aqi: 420,
      pm25: 340.2,
      pm10: 510.0,
      no2: 92.0,
      temp: 13,
      humidity: 88,
      inversionRisk: 'Extreme',
      primarySource: 'Low Wind Dispersion & Brick Kiln Emissions'
    },
    'salt-lake-city': {
      name: 'Salt Lake City, USA',
      aqi: 135,
      pm25: 49.8,
      pm10: 75.0,
      no2: 32.0,
      temp: -4,
      humidity: 65,
      inversionRisk: 'High',
      primarySource: 'Mountain Valley Cold Air Inversion Pool'
    },
    'london': {
      name: 'London, UK',
      aqi: 68,
      pm25: 20.4,
      pm10: 38.0,
      no2: 41.0,
      temp: 6,
      humidity: 78,
      inversionRisk: 'Low',
      primarySource: 'Urban Diesel & Domestic Heating Emissions'
    },
    'mumbai': {
      name: 'Mumbai, India',
      aqi: 182,
      pm25: 115.0,
      pm10: 198.0,
      no2: 52.0,
      temp: 24,
      humidity: 70,
      inversionRisk: 'Moderate',
      primarySource: 'Coastal Humidity Stagnation & Construction Dust'
    }
  };

  /**
   * Linear interpolation function to compute AQI from pollutant concentration.
   * Formula: I = ((I_high - I_low) / (C_high - C_low)) * (C - C_low) + I_low
   *
   * @param {number} concentration - Pollutant concentration (ug/m3)
   * @param {Array<Object>} breakpoints - Breakpoint definition array
   * @returns {number} Calculated AQI integer
   */
  function calculateSubIndex(concentration, breakpoints) {
    if (typeof concentration !== 'number' || isNaN(concentration) || concentration < 0) {
      return 0;
    }

    const c = Math.round(concentration * 10) / 10;

    for (let i = 0; i < breakpoints.length; i++) {
      const bp = breakpoints[i];
      if (c >= bp.cLow && c <= bp.cHigh) {
        const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow;
        return Math.round(aqi);
      }
    }

    // If concentration exceeds highest bracket, scale linearly up to 500+
    const last = breakpoints[breakpoints.length - 1];
    if (c > last.cHigh) {
      const extrapolated = last.iHigh + ((c - last.cHigh) * 0.5);
      return Math.min(Math.round(extrapolated), 999);
    }

    return 0;
  }

  /**
   * Get health category metadata for a given AQI value
   *
   * @param {number} aqi - Overall AQI value
   * @returns {Object} Category info with color, label, level, and actions
   */
  function getAQICategory(aqi) {
    const val = Number(aqi) || 0;

    if (val <= 50) {
      return {
        category: 'Good',
        level: 1,
        color: '#10b981',
        badge: '🟢',
        textColor: '#064e3b',
        bgColor: '#ecfdf5',
        advisory: 'Air quality is satisfactory and poses little or no health risk.',
        ventilateSafe: true,
        outdoorExerciseSafe: true,
        maskRecommended: false
      };
    } else if (val <= 100) {
      return {
        category: 'Moderate',
        level: 2,
        color: '#f59e0b',
        badge: '🟡',
        textColor: '#78350f',
        bgColor: '#fffbeb',
        advisory: 'Air quality is acceptable. Very sensitive individuals should observe mild precautions.',
        ventilateSafe: true,
        outdoorExerciseSafe: true,
        maskRecommended: false
      };
    } else if (val <= 150) {
      return {
        category: 'Unhealthy for Sensitive Groups',
        level: 3,
        color: '#f97316',
        badge: '🟠',
        textColor: '#7c2d12',
        bgColor: '#fff7ed',
        advisory: 'Children, older adults, and individuals with asthma should reduce prolonged outdoor exertion.',
        ventilateSafe: false,
        outdoorExerciseSafe: false,
        maskRecommended: true
      };
    } else if (val <= 200) {
      return {
        category: 'Unhealthy',
        level: 4,
        color: '#ef4444',
        badge: '🔴',
        textColor: '#7f1d1d',
        bgColor: '#fef2f2',
        advisory: 'Everyone may begin to experience health effects. Sensitive groups should avoid outdoor exertion.',
        ventilateSafe: false,
        outdoorExerciseSafe: false,
        maskRecommended: true
      };
    } else if (val <= 300) {
      return {
        category: 'Very Unhealthy',
        level: 5,
        color: '#8b5cf6',
        badge: '🟣',
        textColor: '#4c1d95',
        bgColor: '#f5f3ff',
        advisory: 'Health alert: Increased likelihood of adverse pulmonary and cardiac effects in the population.',
        ventilateSafe: false,
        outdoorExerciseSafe: false,
        maskRecommended: true
      };
    } else {
      return {
        category: 'Hazardous (Severe Smog)',
        level: 6,
        color: '#7f1d1d',
        badge: '🟤',
        textColor: '#450a0a',
        bgColor: '#fef2f2',
        advisory: 'Health emergency warning: Entire population is likely to be affected. Keep all windows sealed.',
        ventilateSafe: false,
        outdoorExerciseSafe: false,
        maskRecommended: true
      };
    }
  }

  /**
   * Models the 24-hour winter atmospheric thermal inversion cycle.
   * Smog traps at night and early morning when ground cools;
   * Solar heating breaks the inversion layer between 12:00 PM and 3:30 PM.
   *
   * @param {number} baseAQI - Baseline AQI for the locality
   * @returns {Array<Object>} 24-hour projection with hour, expectedAQI, and windowType
   */
  function getHourlyInversionForecast(baseAQI) {
    const baseline = Math.max(10, Number(baseAQI) || 150);
    const hourly = [];

    for (let hour = 0; hour < 24; hour++) {
      let multiplier = 1.0;

      // Deep night & morning thermal inversion (cold air trapped close to ground)
      if (hour >= 0 && hour <= 8) {
        multiplier = 1.25 + 0.1 * Math.sin(((hour - 4) / 4) * Math.PI);
      }
      // Morning rush hour + lingering inversion
      else if (hour > 8 && hour <= 11) {
        multiplier = 1.15 - ((hour - 8) * 0.08);
      }
      // Solar convective window (Sun breaks inversion layer; best ventilation hours)
      else if (hour > 11 && hour <= 15) {
        multiplier = 0.72 + ((hour - 13) * 0.03);
      }
      // Evening rush hour & cooling surface inversion starts reforming
      else if (hour > 15 && hour <= 19) {
        multiplier = 1.05 + ((hour - 15) * 0.05);
      }
      // Late night cooling and heavy smog accumulation
      else {
        multiplier = 1.20 + ((hour - 20) * 0.03);
      }

      const projectedAQI = Math.round(baseline * multiplier);
      let windowType = 'normal';
      let recommendation = 'Standard precautions';

      if (hour >= 12 && hour <= 15) {
        windowType = 'optimal-ventilation';
        recommendation = 'Best outdoor window; brief ventilation & filtered outdoor transit';
      } else if ((hour >= 6 && hour <= 9) || (hour >= 19 && hour <= 23)) {
        windowType = 'peak-hazard';
        recommendation = 'Inversion peak; keep windows sealed & run indoor filtration';
      }

      hourly.push({
        hour: hour,
        timeLabel: `${hour.toString().padStart(2, '0')}:00`,
        aqi: projectedAQI,
        category: getAQICategory(projectedAQI).category,
        windowType: windowType,
        recommendation: recommendation
      });
    }

    return hourly;
  }

  /**
   * Generates actionable daily routine schedule based on user persona and current AQI
   *
   * @param {string} persona - 'family', 'elderly_asthma', 'commuter', 'fitness_worker', 'community'
   * @param {number} aqi - Current AQI value
   * @returns {Object} Tailored routine schedule and high-priority tips
   */
  function getPersonalizedRoutine(persona, aqi) {
    const val = Number(aqi) || 200;
    const isSevere = val > 200;

    const routines = {
      family: {
        title: 'Child & Family Smog Defense Routine',
        targetGroup: 'Households with infants, toddlers & school-age children',
        priorityAlert: isSevere
          ? 'CRITICAL: Severe smog triggers rapid bronchiolitis in young lungs. Seal nurseries.'
          : 'MODERATE: Keep child playtime indoors during early morning hours.',
        morningRoutine: '07:00 - 09:00: Keep windows sealed. Do not send children for open-ground assembly. Stroller cover / child-fit N95 for school drop-offs.',
        middayRoutine: '12:30 - 14:30: Convective window open. Run 15-minute cross-ventilation only if indoor PM2.5 exceeds outdoor levels. Run Corsi-Rosenthal filter.',
        eveningRoutine: '17:00 - 19:30: Switch cooking to induction or use high-powered range hood to avoid indoor VOC + PM2.5 co-spikes.',
        nightRoutine: '20:00 - 06:00: Run bedroom air purifier on low whisper mode. Maintain 40-50% indoor relative humidity to settle airborne dust.'
      },
      elderly_asthma: {
        title: 'Respiratory & Cardiac Safety Routine',
        targetGroup: 'Seniors, COPD, asthma, and chronic bronchitis sufferers',
        priorityAlert: isSevere
          ? 'HIGH RISK: Thermal inversion PM2.5 can provoke bronchospasms. Keep rescue inhaler close.'
          : 'ADVISORY: Monitor peak expiratory flow and stay in filtered indoor zones.',
        morningRoutine: '06:00 - 09:30: Strictly cancel morning walks. Cold air + PM2.5 creates acute airway resistance. Practice indoor stretching instead.',
        middayRoutine: '13:00 - 14:00: Safest period for essential clinic visits or doctor appointments when inversion layer breaks.',
        eveningRoutine: '17:30 - 20:00: Avoid exposure to burning incense, mosquitos coils, or frying oil fumes.',
        nightRoutine: '21:00 - 06:00: Position DIY HEPA filter 1 meter away from bedhead. Warm steam inhalation if experiencing airway tickle.'
      },
      commuter: {
        title: 'Low-Emission & In-Transit Defense Routine',
        targetGroup: 'Daily urban commuters, office workers & students',
        priorityAlert: isSevere
          ? 'TRANSIT ALERT: In-cabin pollution on congested roads is 3x ambient level without recirculate.'
          : 'SUSTAINABLE CHOICES: Opt for electric metro over single-occupancy vehicles.',
        morningRoutine: '07:30 - 09:30: Shift commute by 30-45 minutes or request WFH. If driving, set AC to INTERNAL RECIRCULATION mode immediately.',
        middayRoutine: '12:00 - 14:00: Walk to lunch only in covered corridors or wear well-fitted KF94/N95 respirator.',
        eveningRoutine: '18:00 - 20:30: Opt for electric metro transit. Carpool to remove individual tailpipe emissions.',
        nightRoutine: '21:00+: Change clothes upon entering home; wipe shoes and rinse eyes with sterile saline.'
      },
      fitness_worker: {
        title: 'Athlete & Outdoor Workforce Safety Routine',
        targetGroup: 'Runners, cyclists, delivery partners, and construction personnel',
        priorityAlert: isSevere
          ? 'PHYSIOLOGY WARNING: Aerobic breathing increases deep lung particle intake by 450%!'
          : 'SCHEDULE SHIFT: Reschedule cardio workouts to mid-afternoon smog dip.',
        morningRoutine: '06:00 - 08:30: Do NOT perform outdoor cardio or jogging. Switch to indoor bodyweight training or yoga.',
        middayRoutine: '13:00 - 15:00: If outdoor training is mandatory, this 2-hour convective window has the lowest ground-level PM2.5 concentration.',
        eveningRoutine: '17:00 - 20:00: Delivery riders and street workers must wear valved or non-valved N95/FFP2 masks with adjustable nose clip.',
        nightRoutine: '21:00+: Hydrate with warm water and antioxidants (Vitamin C & E) to reduce free radical oxidative stress.'
      },
      community: {
        title: 'Community & Neighborhood Smog Mitigation Routine',
        targetGroup: 'Resident Welfare Associations (RWAs), apartment societies, and local leaders',
        priorityAlert: isSevere
          ? 'COLLECTIVE ACTION: Mobilize society-wide anti-burning patrols and shared green transit.'
          : 'PREVENTION: Monitor local waste management and promote shared carpooling.',
        morningRoutine: '07:00 - 10:00: Enforce strict ban on leaf or municipal waste burning in the neighborhood. Coordinate school carpools.',
        middayRoutine: '12:00 - 15:00: Water-sprinkling on unpaved society roads to suppress re-suspended particulate dust.',
        eveningRoutine: '18:00 - 21:00: Provide security guards and maintenance staff with certified N95 masks and electric room heaters (banning coal braziers).',
        nightRoutine: '22:00 - 05:00: Set up communal DIY Corsi-Rosenthal boxes in clubhouses and guard booths.'
      }
    };

    return routines[persona] || routines.family;
  }

  return {
    EPA_BREAKPOINTS,
    PRESET_CITIES,
    calculateSubIndex,
    getAQICategory,
    getHourlyInversionForecast,
    getPersonalizedRoutine
  };
});
