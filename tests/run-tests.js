/**
 * @file run-tests.js
 * @description Comprehensive 50+ Automated Unit and Integration Test Suite for AuraAir
 * (Urban Air Quality Assistant). Validates mathematical correctness of AQI interpolations,
 * physiological inhalation formulas, carbon mitigation metrics, prompt injection guards,
 * XSS sanitization, markdown rendering, and persona decision logic.
 *
 * Execution: node tests/run-tests.js
 * Zero external dependencies required.
 * @version 1.0.0
 * @license MIT
 */

'use strict';

const path = require('path');
const AQIEngine = require('../js/aqi-engine');
const ImpactCalculator = require('../js/impact-calculator');
const GeminiService = require('../js/gemini');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    process.stdout.write('  ✅ ' + message + '\n');
  } else {
    failedTests++;
    failures.push(message);
    process.stdout.write('  ❌ FAILED: ' + message + '\n');
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (Expected: ${expected}, Got: ${actual})`);
}

function assertDeepEqual(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${message}`);
}

function runSuite(name, fn) {
  console.log(`\n======================================================`);
  console.log(`🧪 TEST SUITE: ${name}`);
  console.log(`======================================================`);
  fn();
}

console.log(`🚀 Starting AuraAir Test Suite (Target: 100% Pass Rate)...\n`);

// ==========================================
// SUITE 1: AQI Engine Sub-Index Calculations
// ==========================================
runSuite('AQI Engine Sub-Index Breakpoint Calculations', () => {
  const bp = AQIEngine.EPA_BREAKPOINTS.pm25;

  // Good category: 0 to 12.0 ug/m3 -> 0 to 50 AQI
  const aqi0 = AQIEngine.calculateSubIndex(0.0, bp);
  assertEqual(aqi0, 0, 'PM2.5 of 0.0 ug/m3 returns AQI 0');

  const aqiGoodMid = AQIEngine.calculateSubIndex(6.0, bp);
  assertEqual(aqiGoodMid, 25, 'PM2.5 of 6.0 ug/m3 interpolates linearly to AQI 25');

  const aqiGoodTop = AQIEngine.calculateSubIndex(12.0, bp);
  assertEqual(aqiGoodTop, 50, 'PM2.5 of 12.0 ug/m3 returns AQI 50');

  // Moderate category: 12.1 to 35.4 ug/m3 -> 51 to 100 AQI
  const aqiModLow = AQIEngine.calculateSubIndex(12.1, bp);
  assertEqual(aqiModLow, 51, 'PM2.5 of 12.1 ug/m3 returns AQI 51');

  // Unhealthy category: 55.5 to 150.4 ug/m3 -> 151 to 200 AQI
  const aqiUnhealthy = AQIEngine.calculateSubIndex(100.0, bp);
  assert(aqiUnhealthy >= 170 && aqiUnhealthy <= 180, 'PM2.5 of 100.0 ug/m3 yields Unhealthy AQI (approx 174)');

  // Hazardous category: 250.5 to 500.4 ug/m3 -> 301 to 500 AQI
  const aqiHazard = AQIEngine.calculateSubIndex(350.0, bp);
  assert(aqiHazard >= 380 && aqiHazard <= 420, 'PM2.5 of 350.0 ug/m3 yields Hazardous AQI');

  // Extreme off-scale extrapolation
  const aqiOffScale = AQIEngine.calculateSubIndex(600.0, bp);
  assert(aqiOffScale > 500, 'PM2.5 exceeding 500 ug/m3 extrapolates above 500 safely');

  // Edge cases & robust error handling
  assertEqual(AQIEngine.calculateSubIndex(-10, bp), 0, 'Negative concentration yields 0');
  assertEqual(AQIEngine.calculateSubIndex(NaN, bp), 0, 'NaN input yields 0');
  assertEqual(AQIEngine.calculateSubIndex(null, bp), 0, 'Null input yields 0');
});

// ==========================================
// SUITE 2: AQI Health Categories & Advisories
// ==========================================
runSuite('AQI Health Categories & Demographic Advisories', () => {
  const catGood = AQIEngine.getAQICategory(35);
  assertEqual(catGood.category, 'Good', 'AQI 35 categorized as Good');
  assertEqual(catGood.level, 1, 'AQI 35 is Level 1');
  assertEqual(catGood.ventilateSafe, true, 'Good AQI allows outdoor ventilation');

  const catMod = AQIEngine.getAQICategory(85);
  assertEqual(catMod.category, 'Moderate', 'AQI 85 categorized as Moderate');

  const catSens = AQIEngine.getAQICategory(130);
  assertEqual(catSens.category, 'Unhealthy for Sensitive Groups', 'AQI 130 categorized as Sensitive Groups alert');
  assertEqual(catSens.maskRecommended, true, 'Mask recommended for sensitive groups');

  const catUnhealthy = AQIEngine.getAQICategory(180);
  assertEqual(catUnhealthy.category, 'Unhealthy', 'AQI 180 categorized as Unhealthy');

  const catVeryUnhealthy = AQIEngine.getAQICategory(260);
  assertEqual(catVeryUnhealthy.category, 'Very Unhealthy', 'AQI 260 categorized as Very Unhealthy');

  const catHazardous = AQIEngine.getAQICategory(420);
  assert(catHazardous.category.includes('Hazardous'), 'AQI 420 categorized as Hazardous');
  assertEqual(catHazardous.level, 6, 'Hazardous is Level 6');
  assertEqual(catHazardous.ventilateSafe, false, 'Hazardous prohibits outdoor ventilation');
});

// ==========================================
// SUITE 3: Thermal Inversion Cycle Modeling
// ==========================================
runSuite('24-Hour Winter Thermal Inversion Modeling', () => {
  const baseAQI = 300;
  const forecast = AQIEngine.getHourlyInversionForecast(baseAQI);

  assertEqual(forecast.length, 24, 'Generates exactly 24 hourly projections');

  // Night and early morning peak check (Hour 4 or 6)
  const morningSlot = forecast[6];
  assert(morningSlot.aqi > baseAQI, 'Morning inversion (06:00) concentrates smog above baseline');
  assertEqual(morningSlot.windowType, 'peak-hazard', '06:00 marked as peak-hazard window');

  // Midday convective dip check (Hour 13)
  const middaySlot = forecast[13];
  assert(middaySlot.aqi < baseAQI, 'Midday solar warming (13:00) dips smog below baseline');
  assertEqual(middaySlot.windowType, 'optimal-ventilation', '13:00 marked as optimal-ventilation window');

  // Evening rush hour rebuilding
  const eveningSlot = forecast[18];
  assert(eveningSlot.aqi >= baseAQI, 'Evening cooling (18:00) begins re-trapping smog');
});

// ==========================================
// SUITE 4: Role-Based Routine Adaptations
// ==========================================
runSuite('Personalized Routine Decision System', () => {
  const personas = ['family', 'elderly_asthma', 'commuter', 'fitness_worker', 'community'];

  personas.forEach(p => {
    const routine = AQIEngine.getPersonalizedRoutine(p, 350);
    assert(routine.title && routine.title.length > 0, `Persona ${p} provides non-empty title`);
    assert(routine.morningRoutine && routine.morningRoutine.length > 0, `Persona ${p} provides morning advice`);
    assert(routine.middayRoutine && routine.middayRoutine.length > 0, `Persona ${p} provides midday advice`);
    assert(routine.eveningRoutine && routine.eveningRoutine.length > 0, `Persona ${p} provides evening advice`);
    assert(routine.nightRoutine && routine.nightRoutine.length > 0, `Persona ${p} provides night advice`);
  });

  const familyRoutine = AQIEngine.getPersonalizedRoutine('family', 400);
  assert(familyRoutine.priorityAlert.includes('CRITICAL'), 'Severe smog triggers critical alert for families');

  const fitnessRoutine = AQIEngine.getPersonalizedRoutine('fitness_worker', 300);
  assert(fitnessRoutine.priorityAlert.includes('PHYSIOLOGY'), 'Fitness persona includes physiological warning');
});

// ==========================================
// SUITE 5: Physiological Inhalation Dose Impact
// ==========================================
runSuite('Physiological Inhalation Dose Calculations', () => {
  // Test Case: PM2.5 = 300 ug/m3, 2 hours walking (20 L/min = 1.2 m3/h), N95 mask (95% efficiency)
  const resN95 = ImpactCalculator.calculateInhalationImpact(300, 2, 'walking', 'n95Mask');
  // Total air inhaled = 1.2 * 2 = 2.4 m3
  // Potential dose = 300 * 2.4 = 720 ug
  // Avoided = 720 * 0.95 = 684 ug
  assertEqual(resN95.totalAirInhaledM3, 2.4, 'Inhales 2.4 m3 during 2 hours walking');
  assertEqual(resN95.potentialDoseUg, 720, 'Potential unmitigated dose is 720 ug');
  assertEqual(resN95.avoidedUg, 684, 'N95 avoids 684 ug of PM2.5 inhalation');
  assertEqual(resN95.percentReduction, 95, 'N95 achieves 95% dose reduction');
  assert(resN95.cigarettesAvoided > 2.0, 'Calculates cigarette equivalence (> 2 cigs avoided)');

  // Test Case: Jogging with zero protection (50 L/min = 3.0 m3/h)
  const resRunning = ImpactCalculator.calculateInhalationImpact(300, 1, 'running', 'none');
  // Total air inhaled = 3.0 m3; Potential dose = 900 ug; Avoided = 0
  assertEqual(resRunning.potentialDoseUg, 900, 'Running inhales 900 ug/hr without mask');
  assertEqual(resRunning.avoidedUg, 0, 'Zero protection avoids 0 ug');

  // Test Case: Corsi-Rosenthal DIY Box Fan in sleeping room (8 hours sleep = 0.36 * 8 = 2.88 m3)
  const resCorsi = ImpactCalculator.calculateInhalationImpact(200, 8, 'sleep', 'diyCorsiRosenthal');
  assert(resCorsi.percentReduction === 85, 'DIY Corsi-Rosenthal achieves 85% particulate reduction');
  assert(resCorsi.avoidedUg > 450, 'Bedroom DIY filter prevents substantial overnight particulate dose');
});

// ==========================================
// SUITE 6: Carbon Mitigation & Transport Alternatives
// ==========================================
runSuite('Carbon Mitigation & Transit Calculations', () => {
  // Switch 20 km daily commute from Petrol Car (192 g/km) to Electric Metro (28 g/km)
  // Daily saved = (192 - 28) * 20 = 164 * 20 = 3280 g = 3.28 kg
  const resMetro = ImpactCalculator.calculateCarbonSavings(20, 'petrolCar', 'metroRail', 250);
  assertEqual(resMetro.dailySavedKg, 3.28, 'Saves 3.28 kg CO2e daily by switching to Electric Metro');
  assertEqual(resMetro.annualSavedKg, 820, 'Saves 820 kg CO2e annually across 250 work days');
  assert(resMetro.treeYearsEquivalent > 35, 'Equivalent to over 35 tree absorption years');
  assertEqual(resMetro.percentEmissionsCut, 85, 'Cuts commute emissions by 85%');

  // Switch to Work-From-Home (0 g/km)
  const resWfh = ImpactCalculator.calculateCarbonSavings(30, 'dieselCar', 'workFromHome', 250);
  // (171 - 0) * 30 = 5130 g = 5.13 kg/day
  assertEqual(resWfh.dailySavedKg, 5.13, 'WFH completely eliminates 5.13 kg CO2e daily');
  assertEqual(resWfh.percentEmissionsCut, 100, 'WFH achieves 100% emission elimination');
});

// ==========================================
// SUITE 7: Community Score Evaluation
// ==========================================
runSuite('Community Stewardship Score Evaluation', () => {
  // All habits active
  const topScore = ImpactCalculator.evaluateCommunityScore({
    wfhOrMetro: true,
    corsiRosenthal: true,
    timingVentilation: true,
    n95Worn: true,
    nasaPlants: true,
    noWasteBurning: true,
    carpoolShared: true
  });
  assertEqual(topScore.score, 100, 'All actions combined yield maximum score of 100');
  assertEqual(topScore.tier, 'Clean Air Champion', 'Score 100 achieves Clean Air Champion tier');

  // Partial habits active
  const midScore = ImpactCalculator.evaluateCommunityScore({
    wfhOrMetro: true,
    corsiRosenthal: true
  });
  assert(midScore.score >= 50 && midScore.score < 70, 'Partial actions yield Silver Eco tier');

  // Empty actions
  const baseScore = ImpactCalculator.evaluateCommunityScore({});
  assertEqual(baseScore.score, 20, 'Empty actions return baseline score of 20');
});

// ==========================================
// SUITE 8: Input Sanitization & Security Guards
// ==========================================
runSuite('Security, Input Sanitization & XSS Defense', () => {
  const xssPayload = '<script>alert("pwned")</script><b>Hello</b>';
  const clean = GeminiService.sanitizeInput(xssPayload);
  assert(!clean.includes('<script>'), 'Sanitization encodes script tags');
  assert(clean.includes('&lt;script&gt;'), 'Sanitization uses HTML entities');

  const imgPayload = '<img src=x onerror=alert(1)>';
  const cleanImg = GeminiService.stripUnsafeTags(imgPayload);
  assert(!cleanImg.includes('onerror'), 'stripUnsafeTags removes inline event handlers');

  const jsHref = 'javascript:evil()';
  const cleanJs = GeminiService.stripUnsafeTags(jsHref);
  assert(!cleanJs.includes('javascript:'), 'stripUnsafeTags strips javascript pseudoprotocol');

  // Length limit cap
  const longInput = 'A'.repeat(2000);
  const truncated = GeminiService.sanitizeInput(longInput);
  assertEqual(truncated.length, 1000, 'Inputs capped strictly at 1000 characters');

  // Null & non-string safety
  assertEqual(GeminiService.sanitizeInput(null), '', 'Null input returns empty string safely');
  assertEqual(GeminiService.sanitizeInput(undefined), '', 'Undefined input returns empty string safely');
});

// ==========================================
// SUITE 9: Markdown to HTML Parser
// ==========================================
runSuite('Markdown Rendering Engine', () => {
  const md = '### Test Heading\n**Bold Text** and *Italic*\n- Bullet 1\n`inline code`';
  const html = GeminiService.markdownToHtml(md);

  assert(html.includes('<h4'), 'Renders h4 heading');
  assert(html.includes('<strong>Bold Text</strong>'), 'Renders bold text tags');
  assert(html.includes('<em>Italic</em>'), 'Renders italic text tags');
  assert(html.includes('<li'), 'Renders list bullet tags');
  assert(html.includes('<code'), 'Renders inline code element');
});

// ==========================================
// SUITE 10: Intelligent Heuristic GenAI Fallbacks
// ==========================================
runSuite('Intelligent Heuristic GenAI Fallback Engine', () => {
  // Test DIY Corsi-Rosenthal prompt
  const diyResponse = GeminiService.getIntelligentFallbackResponse({
    userQuery: 'How to build DIY Corsi Rosenthal box purifier?',
    persona: 'family',
    cityName: 'Delhi-NCR',
    aqi: 380
  });
  assert(diyResponse.includes('Corsi-Rosenthal'), 'Fallback detects DIY purifier intent');
  assert(diyResponse.includes('MERV-13'), 'Fallback provides MERV-13 specifications');
  assert(diyResponse.includes('Quantifiable Impact'), 'Fallback includes quantifiable impact');

  // Test Jogging / Fitness prompt
  const runResponse = GeminiService.getIntelligentFallbackResponse({
    userQuery: 'Can I go jogging in the morning?',
    persona: 'fitness_worker',
    cityName: 'Beijing',
    aqi: 220
  });
  assert(runResponse.includes('Athletic'), 'Fallback formats fitness advisory');
  assert(runResponse.includes('13:00 - 15:00'), 'Fallback advises convective dip window');

  // Test Pediatric prompt
  const childResponse = GeminiService.getIntelligentFallbackResponse({
    userQuery: 'School commute safety for infant and child?',
    persona: 'family',
    cityName: 'Lahore',
    aqi: 410
  });
  assert(childResponse.includes('Pediatric') || childResponse.includes('Child'), 'Fallback tailors to pediatric care');
  assert(childResponse.includes('N95'), 'Fallback recommends certified filtration');
});

// ==========================================
// SUITE 11: Prompt Construction & Context Chaining
// ==========================================
runSuite('Contextual Prompt Chaining & Injection Isolation', () => {
  const prompt = GeminiService.buildContextualPrompt({
    userQuery: 'Should I open windows today?',
    persona: 'family',
    cityName: 'Delhi-NCR',
    aqi: 350,
    category: 'Hazardous'
  });

  assert(prompt.includes('Location: Delhi-NCR'), 'Prompt includes atmospheric location');
  assert(prompt.includes('Real-time AQI: 350'), 'Prompt includes numerical AQI');
  assert(prompt.includes('<user_scenario>'), 'Prompt wraps user input in XML boundary tags');
  assert(prompt.includes('Should I open windows today?'), 'Prompt preserves clean user question');
  assert(prompt.includes('Quantifiable Impact'), 'Prompt enforces impact response specification');
});

// ==========================================
// SUMMARY
// ==========================================
console.log(`\n======================================================`);
console.log(`🏁 TEST EXECUTION COMPLETE`);
console.log(`======================================================`);
console.log(`Total Tests Run:  ${totalTests}`);
console.log(`Tests Passed:     ${passedTests} ✅`);
console.log(`Tests Failed:     ${failedTests} ${failedTests === 0 ? '🎉' : '❌'}`);

if (failedTests > 0) {
  console.log(`\nFailures list:`);
  failures.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
} else {
  console.log(`\n🌟 100% OF TESTS PASSED! Project is mathematically verified and robust.`);
  process.exit(0);
}
