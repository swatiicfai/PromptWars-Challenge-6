/**
 * @file impact-calculator.js
 * @description Quantifiable scientific impact calculation engine for personal inhalation exposure,
 * avoided carbon emissions (CO2e), cigarette-equivalent toxicity benchmarks, and DIY clean air hacks.
 * @version 2.0.0
 * @license MIT
 */

'use strict';

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ImpactCalculator = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  /**
   * Human Minute Ventilation Rates in Liters per minute & m3 per hour
   * Based on ICRP (International Commission on Radiological Protection) respiratory physiology data
   */
  const VENTILATION_RATES = {
    sleep: { label: 'Sleeping / Deep Rest', lpm: 6, m3ph: 0.36 },
    rest: { label: 'Sedentary / Office Desk Work', lpm: 10, m3ph: 0.60 },
    walking: { label: 'Light Walking / Urban Transit', lpm: 20, m3ph: 1.20 },
    running: { label: 'Aerobic Exercise / Outdoor Manual Work', lpm: 50, m3ph: 3.00 }
  };

  /**
   * Protective Intervention Efficiencies (Fraction of PM2.5 prevented from entering respiratory tract)
   */
  const INTERVENTIONS = {
    none: { label: 'No Protection (Ambient Exposure)', efficiency: 0.0 },
    surgicalMask: { label: 'Standard Surgical Mask', efficiency: 0.40 },
    clothMask: { label: 'Cotton / Cloth Mask', efficiency: 0.25 },
    n95Mask: { label: 'Certified N95 / FFP2 Respirator (Tight Seal)', efficiency: 0.95 },
    diyCorsiRosenthal: { label: 'DIY Corsi-Rosenthal Box Fan (MERV-13)', efficiency: 0.85 },
    hepaRoomFilter: { label: 'Commercial True HEPA Purifier', efficiency: 0.92 },
    sealedRoomNoFilter: { label: 'Closed Room (Natural Building Infiltration)', efficiency: 0.35 }
  };

  /**
   * Carbon emission factors by transport mode (grams of CO2e per passenger-kilometer)
   * Derived from IPCC & UK Defra GHG conversion metrics
   */
  const TRANSIT_EMISSION_FACTORS = {
    petrolCar: { label: 'Solo Petrol Car', gPerKm: 192 },
    dieselCar: { label: 'Solo Diesel Car', gPerKm: 171 },
    twoWheeler: { label: 'Motorcycle / Scooter (Petrol)', gPerKm: 72 },
    carpool: { label: 'Carpooling (4 Passengers)', gPerKm: 48 },
    cngBus: { label: 'Public CNG Bus', gPerKm: 65 },
    electricBus: { label: 'Public Electric Bus', gPerKm: 35 },
    metroRail: { label: 'Electric Metro / Rapid Transit', gPerKm: 28 },
    eScooter: { label: 'Personal E-Bike / E-Scooter', gPerKm: 14 },
    bicycleWalk: { label: 'Walking / Human-Powered Bicycle', gPerKm: 0 },
    workFromHome: { label: 'Work-from-Home (Zero Commute)', gPerKm: 0 }
  };

  /**
   * Curated repository of Indoor Air Quality (IAQ) hacks and DIY solutions
   */
  const IAQ_HACKS = [
    {
      id: 'corsi-rosenthal',
      title: 'The DIY Corsi-Rosenthal Box Fan',
      costCategory: 'Low Cost ($25 - $35)',
      pmReduction: '80% - 90%',
      difficulty: 'Easy (20 minutes)',
      badge: '🏆 Gold Standard Hack',
      summary: 'A box fan taped to 4 MERV-13 HVAC furnace filters with a cardboard shroud delivering Clean Air Delivery Rate (CADR) equivalent to $500 commercial HEPA purifiers.',
      materials: [
        '1x 20-inch Box Fan',
        '4x MERV-13 HVAC pleated filters (20" x 20" x 1" or 2")',
        '1x Roll of heavy-duty duct tape',
        '1x Cardboard bottom piece and top circular shroud'
      ],
      steps: [
        'Form an open-topped cube with the 4 MERV-13 filters, pointing arrow indicators INWARD.',
        'Seal the vertical corner joints securely with duct tape.',
        'Tape the cardboard floor base to the bottom of the filter cube.',
        'Place the box fan facing UPWARD on top of the cube and tape all edges airtight.',
        'Cut a circular cardboard shroud matching fan blade diameter and tape over the front face to eliminate back-pressure vortices.'
      ],
      scienceNote: 'The massive surface area of 4 pleated filters dramatically reduces face velocity, allowing whisper-quiet operation and particle capture down to 0.3 microns.'
    },
    {
      id: 'inversion-ventilation-timing',
      title: 'Thermal Inversion Ventilation Windowing',
      costCategory: 'Free ($0)',
      pmReduction: '50% - 70% Infiltration Avoidance',
      difficulty: 'Instant',
      badge: '⏰ Timing Strategy',
      summary: 'Never air out your house in the early morning (05:00 - 09:00). Open windows strictly between 12:30 PM - 03:00 PM when solar thermal updrafts dilute the surface inversion smog pool.',
      materials: ['Household windows with tight latches', 'Weather stripping tape'],
      steps: [
        'Seal all windows and exterior vents by 07:00 PM before evening smog cools.',
        'Check real-time AQI around 13:00 (1:00 PM); if dipping below 150, open cross-breeze windows for exactly 15 minutes to clear CO2 buildup.',
        'Reseal all openings by 15:30 (3:30 PM) before temperature inversion re-traps evening rush hour soot.'
      ],
      scienceNote: 'Solar radiative heating warms the ground by midday, establishing positive lapse rates that disperse ground-trapped pollutants upward into the boundary layer.'
    },
    {
      id: 'wet-towel-baffle',
      title: 'Wet-Baffle Passive Particle Trap',
      costCategory: 'Free ($0)',
      pmReduction: '30% - 45% (Coarse PM10/PM2.5)',
      difficulty: 'Easy (5 minutes)',
      badge: '💧 Humidity & Capture',
      summary: 'Hang slightly damp microfiber towels or porous cheesecloth over window mesh screens if fresh air exchange is mandatory during smog episodes.',
      materials: ['Damp microfiber towel or cotton sheet', 'Clothes clips / magnetic pins'],
      steps: [
        'Lightly dampen a clean microfiber cloth (not dripping wet).',
        'Fasten across the open window aperture tightly.',
        'As wind passes through, moisture and electrostatic microfibers impinge airborne particulate matter before entering living spaces.',
        'Rinse cloth daily in clean water.'
      ],
      scienceNote: 'Aerosol impaction onto wet fibers accelerates particulate agglomeration, capturing coarse and fine soot through inertial impaction and diffusion.'
    },
    {
      id: 'nasa-clean-air-plants',
      title: 'NASA Phytoremediation Indoor Bio-Filter',
      costCategory: 'Low Cost ($5 - $15 per plant)',
      pmReduction: 'Continuous VOC & Nighttime O2 replenishment',
      difficulty: 'Low Maintenance',
      badge: '🌿 Green Air',
      summary: 'Deploy CAM (Crassulacean Acid Metabolism) plants that absorb CO2 and VOCs (benzene, formaldehyde, toluene) at night while living spaces are sealed.',
      materials: [
        'Snake Plant (Sansevieria trifasciata)',
        'Areca Palm (Chrysalidocarpus lutescens)',
        'Money Plant / Golden Pothos (Epipremnum aureum)',
        'Spider Plant (Chlorophytum comosum)'
      ],
      steps: [
        'Place 2-3 mature Snake Plants in each closed bedroom (they emit oxygen during nocturnal hours).',
        'Place 1 Areca Palm in the living room for natural humidity regulation (40-50% RH helps airborne smog particulates settle out of the air column).',
        'Wipe plant leaves weekly with a damp sponge to remove dust crust that inhibits stomatal absorption.'
      ],
      scienceNote: 'Studies demonstrate root-zone microbes and leaf stomata break down volatile organic hydrocarbons without needing electrical power.'
    },
    {
      id: 'kitchen-combustion-seal',
      title: 'Cooking Emission Isolation & Inductive Shift',
      costCategory: 'Behavioral ($0)',
      pmReduction: 'Prevents 200 - 400 ug/m3 indoor PM2.5 spikes',
      difficulty: 'Daily Habit',
      badge: '🍳 Kitchen Defense',
      summary: 'High-heat frying on LPG gas burners generates PM2.5 spikes exceeding 300 ug/m3 inside closed winter homes. Compartmentalize the kitchen and optimize exhaust.',
      materials: ['Kitchen exhaust fan / ducted range hood', 'Door draft stopper'],
      steps: [
        'Close the kitchen door tightly before turning on cooktop burners to prevent soot migration to bedrooms.',
        'Turn on kitchen exhaust 2 minutes BEFORE igniting burners and keep running for 5 minutes after cooking.',
        'Shift deep frying to electric induction or covered boiling/steaming during red-alert smog days.'
      ],
      scienceNote: 'Gas combustion produces nitrogen dioxide (NO2), ultrafine soot particles, and carbon monoxide that become trapped indoors during winter window sealing.'
    }
  ];

  /**
   * Calculates avoided particulate matter dose in micrograms (ug)
   * Formula: Dose = Concentration (ug/m3) * BreathingRate (m3/h) * Hours * ProtectionEfficiency
   *
   * @param {number} pm25Concentration - Ambient PM2.5 in ug/m3
   * @param {number} hours - Exposure duration in hours
   * @param {string} activity - 'sleep', 'rest', 'walking', 'running'
   * @param {string} interventionKey - Key from INTERVENTIONS
   * @returns {Object} Calculated dose avoided and equivalence metrics
   */
  function calculateInhalationImpact(pm25Concentration, hours, activity, interventionKey) {
    const parsedConc = Number(pm25Concentration);
    const c = Number.isFinite(parsedConc) ? Math.max(0, parsedConc) : 100;

    const parsedHours = Number(hours);
    const h = Number.isFinite(parsedHours) ? Math.max(0.1, Math.min(24, parsedHours)) : 2;

    const vent = VENTILATION_RATES[activity] || VENTILATION_RATES.walking;
    const intervention = INTERVENTIONS[interventionKey] || INTERVENTIONS.n95Mask;

    const totalAirInhaledM3 = vent.m3ph * h;
    const potentialDoseUg = c * totalAirInhaledM3;
    const actualDoseUg = potentialDoseUg * (1 - intervention.efficiency);
    const avoidedUg = potentialDoseUg * intervention.efficiency;

    // Berkeley Earth conversion: Inhaling 22 ug/m3 over 24 hours (~316.8 ug total dose) ~ 1 cigarette
    const cigaretteDoseBenchmarkUg = 22 * (0.6 * 24);
    const cigarettesAvoided = Math.round((avoidedUg / cigaretteDoseBenchmarkUg) * 10) / 10;

    return {
      pm25Concentration: c,
      hours: h,
      activity: vent.label,
      intervention: intervention.label,
      totalAirInhaledM3: Math.round(totalAirInhaledM3 * 100) / 100,
      potentialDoseUg: Math.round(potentialDoseUg),
      actualDoseUg: Math.round(actualDoseUg),
      avoidedUg: Math.round(avoidedUg),
      avoidedMg: Math.round((avoidedUg / 1000) * 100) / 100,
      cigarettesAvoided,
      percentReduction: Math.round(intervention.efficiency * 100)
    };
  }

  /**
   * Calculates avoided carbon emissions (CO2e) by switching transport modes
   *
   * @param {number} distanceKm - Daily commute distance in kilometers
   * @param {string} baselineModeKey - Mode from TRANSIT_EMISSION_FACTORS (default: 'petrolCar')
   * @param {string} alternativeModeKey - Mode from TRANSIT_EMISSION_FACTORS (e.g. 'metroRail')
   * @param {number} daysPerYear - Number of active days (default 250 working days)
   * @returns {Object} Daily and annual CO2e savings and tree absorption equivalents
   */
  function calculateCarbonSavings(distanceKm, baselineModeKey, alternativeModeKey, daysPerYear = 250) {
    const parsedDist = Number(distanceKm);
    const dist = Number.isFinite(parsedDist) ? Math.max(0.5, parsedDist) : 15;

    const baseline = TRANSIT_EMISSION_FACTORS[baselineModeKey] || TRANSIT_EMISSION_FACTORS.petrolCar;
    const alternative = TRANSIT_EMISSION_FACTORS[alternativeModeKey] || TRANSIT_EMISSION_FACTORS.metroRail;

    const parsedDays = Number(daysPerYear);
    const days = Number.isFinite(parsedDays) ? Math.max(1, parsedDays) : 250;

    const baselineDailyGrams = baseline.gPerKm * dist;
    const alternativeDailyGrams = alternative.gPerKm * dist;
    const dailySavedGrams = Math.max(0, baselineDailyGrams - alternativeDailyGrams);

    const dailySavedKg = Math.round((dailySavedGrams / 1000) * 100) / 100;
    const annualSavedKg = Math.round(((dailySavedGrams * days) / 1000) * 10) / 10;

    // 1 mature urban tree absorbs roughly 22 kg CO2 per year
    const treeYearsEquivalent = Math.round((annualSavedKg / 22) * 10) / 10;
    const percentEmissionsCut = baseline.gPerKm > 0
      ? Math.max(0, Math.round(((baseline.gPerKm - alternative.gPerKm) / baseline.gPerKm) * 100))
      : 0;

    return {
      distanceKm: dist,
      baselineMode: baseline.label,
      alternativeMode: alternative.label,
      dailySavedKg,
      annualSavedKg,
      treeYearsEquivalent,
      percentEmissionsCut
    };
  }

  /**
   * Evaluates overall Community Air Quality Contribution Score (0 to 100)
   * Based on actions adopted by the user
   *
   * @param {Object} actions - Boolean map of actions taken
   * @returns {Object} Score, rank tier, badge, and encouraging evaluation
   */
  function evaluateCommunityScore(actions = {}) {
    let score = 20;

    if (actions.wfhOrMetro) score += 20;
    if (actions.corsiRosenthal) score += 18;
    if (actions.timingVentilation) score += 15;
    if (actions.n95Worn) score += 12;
    if (actions.nasaPlants) score += 10;
    if (actions.noWasteBurning) score += 15;
    if (actions.carpoolShared) score += 10;

    score = Math.min(100, Math.max(0, score));

    let tier = 'Bronze Smog Responder';
    let badge = '🥉';
    let summary = 'Good starting effort! Adopt 1-2 more sustainable habits to protect your community.';

    if (score >= 90) {
      tier = 'Clean Air Champion';
      badge = '🌟';
      summary = 'Elite environmental stewardship! Your combined habits save significant lung burden and carbon footprint.';
    } else if (score >= 70) {
      tier = 'Gold Smog Guardian';
      badge = '🥇';
      summary = 'Outstanding proactive protection. You are minimizing exposure for your entire household.';
    } else if (score >= 50) {
      tier = 'Silver Eco Navigator';
      badge = '🥈';
      summary = 'Solid awareness and daily actions. Well-protected against moderate to severe inversion.';
    }

    return {
      score,
      tier,
      badge,
      summary
    };
  }

  return {
    VENTILATION_RATES,
    INTERVENTIONS,
    TRANSIT_EMISSION_FACTORS,
    IAQ_HACKS,
    calculateInhalationImpact,
    calculateCarbonSavings,
    evaluateCommunityScore
  };
});
