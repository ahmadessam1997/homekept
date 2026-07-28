// The brain of HomeKept: a master library of maintenance tasks.
// Each task carries rules deciding WHO sees it (conditions) and WHEN (schedule).
//
// schedule types:
//   { type: 'interval', days: 90 }              -> repeats every N days
//   { type: 'seasonal', months: [3, 9] }        -> due in given months (1-12)
//
// conditions match against the user's home profile. Omitted key = applies to all.

export const TASKS = [
  // ---- HVAC & Air ----
  {
    id: 'hvac-filter',
    title: 'Replace HVAC / furnace filter',
    detail: 'A clogged filter strains the blower and raises energy bills. Check the size printed on the old filter frame.',
    icon: '🌬️',
    schedule: { type: 'interval', days: 90 },
    conditions: { heating: ['furnace', 'heat-pump'] },
    diy: true,
  },
  {
    id: 'hvac-service',
    title: 'Annual HVAC professional service',
    detail: 'A pro tune-up before peak season catches failing capacitors and refrigerant leaks early.',
    icon: '🛠️',
    schedule: { type: 'seasonal', months: [4] },
    conditions: { heating: ['furnace', 'heat-pump'] },
    diy: false,
  },
  {
    id: 'boiler-service',
    title: 'Annual boiler service',
    detail: 'Have a technician inspect pressure, bleed radiators, and test the pressure relief valve.',
    icon: '♨️',
    schedule: { type: 'seasonal', months: [9] },
    conditions: { heating: ['boiler'] },
    diy: false,
  },

  // ---- Safety ----
  {
    id: 'smoke-detectors',
    title: 'Test smoke & CO detectors',
    detail: 'Press and hold the test button on every unit. Replace batteries yearly, whole units every 10 years.',
    icon: '🚨',
    schedule: { type: 'interval', days: 180 },
    conditions: {},
    diy: true,
  },
  {
    id: 'fire-extinguisher',
    title: 'Check fire extinguisher gauge',
    detail: 'Needle should sit in the green zone. Shake dry-chemical units to keep powder loose.',
    icon: '🧯',
    schedule: { type: 'seasonal', months: [1] },
    conditions: {},
    diy: true,
  },
  {
    id: 'dryer-vent',
    title: 'Clean dryer vent duct',
    detail: 'Lint buildup in the duct is a leading cause of house fires. Disconnect and vacuum the full run.',
    icon: '🔥',
    schedule: { type: 'seasonal', months: [6] },
    conditions: {},
    diy: true,
  },

  // ---- Water & Plumbing ----
  {
    id: 'water-heater-flush',
    title: 'Flush water heater tank',
    detail: 'Drain a few gallons to clear sediment. Sediment shortens tank life and cuts efficiency.',
    icon: '🚿',
    schedule: { type: 'seasonal', months: [10] },
    conditions: {},
    diy: true,
  },
  {
    id: 'check-leaks',
    title: 'Inspect under-sink plumbing for leaks',
    detail: 'Run water, then feel joints and look for staining under every sink. Small drips destroy cabinets slowly.',
    icon: '💧',
    schedule: { type: 'interval', days: 180 },
    conditions: {},
    diy: true,
  },
  {
    id: 'winterize-pipes',
    title: 'Winterize outdoor faucets & pipes',
    detail: 'Disconnect hoses, shut interior valves, and drain exterior lines before the first hard freeze.',
    icon: '🥶',
    schedule: { type: 'seasonal', months: [10] },
    conditions: { climate: ['cold'], homeType: ['house', 'townhouse'] },
    diy: true,
  },
  {
    id: 'sump-pump',
    title: 'Test sump pump',
    detail: 'Pour a bucket of water into the pit and confirm the pump kicks on and drains it.',
    icon: '⛲',
    schedule: { type: 'seasonal', months: [3] },
    conditions: { hasBasement: true },
    diy: true,
  },

  // ---- Exterior ----
  {
    id: 'gutters',
    title: 'Clean gutters & downspouts',
    detail: 'Clogged gutters push water into fascia and foundations. Clear after leaf fall and after spring seeds.',
    icon: '🍂',
    schedule: { type: 'seasonal', months: [5, 11] },
    conditions: { homeType: ['house', 'townhouse'] },
    diy: true,
  },
  {
    id: 'roof-inspect',
    title: 'Visual roof inspection',
    detail: 'From the ground with binoculars: look for lifted shingles, damaged flashing, and moss.',
    icon: '🏠',
    schedule: { type: 'seasonal', months: [4, 10] },
    conditions: { homeType: ['house', 'townhouse'] },
    diy: true,
  },
  {
    id: 'caulk-windows',
    title: 'Inspect window & door caulking',
    detail: 'Cracked exterior caulk lets water and drafts in. Re-caulk gaps wider than a nickel.',
    icon: '🪟',
    schedule: { type: 'seasonal', months: [9] },
    conditions: { homeType: ['house', 'townhouse', 'condo'] },
    diy: true,
  },
  {
    id: 'driveway-seal',
    title: 'Check driveway / walkway cracks',
    detail: 'Seal small cracks before winter; freeze-thaw cycles turn hairlines into potholes.',
    icon: '🛣️',
    schedule: { type: 'seasonal', months: [9] },
    conditions: { homeType: ['house'], climate: ['cold', 'temperate'] },
    diy: true,
  },

  // ---- Yard ----
  {
    id: 'sprinkler-blowout',
    title: 'Blow out irrigation system',
    detail: 'Compressed-air blowout prevents burst underground lines over winter.',
    icon: '💨',
    schedule: { type: 'seasonal', months: [10] },
    conditions: { hasYard: true, climate: ['cold'] },
    diy: false,
  },
  {
    id: 'tree-trim',
    title: 'Trim branches near roof & lines',
    detail: 'Keep limbs 6+ feet from the roof to stop abrasion damage and pest highways.',
    icon: '🌳',
    schedule: { type: 'seasonal', months: [2] },
    conditions: { hasYard: true },
    diy: false,
  },
  {
    id: 'fertilize-lawn',
    title: 'Fertilize & overseed lawn',
    detail: 'Early fall feeding builds roots for next year. Overseed thin patches while soil is warm.',
    icon: '🌱',
    schedule: { type: 'seasonal', months: [9] },
    conditions: { hasYard: true },
    diy: true,
  },

  // ---- Appliances & interior ----
  {
    id: 'fridge-coils',
    title: 'Vacuum refrigerator coils',
    detail: 'Dusty coils make the compressor run hot. Coils are behind the kick plate or rear panel.',
    icon: '🧊',
    schedule: { type: 'seasonal', months: [6] },
    conditions: {},
    diy: true,
  },
  {
    id: 'range-hood-filter',
    title: 'Degrease range hood filter',
    detail: 'Soak the metal mesh filter in hot water and degreaser; grease-clogged filters trap smoke.',
    icon: '🍳',
    schedule: { type: 'interval', days: 90 },
    conditions: {},
    diy: true,
  },
  {
    id: 'washer-hoses',
    title: 'Inspect washing machine hoses',
    detail: 'Bulging or cracking rubber hoses burst without warning. Replace with braided stainless every 5 years.',
    icon: '🧺',
    schedule: { type: 'seasonal', months: [7] },
    conditions: {},
    diy: true,
  },
  {
    id: 'garage-door',
    title: 'Lubricate garage door hardware',
    detail: 'Silicone spray on rollers, hinges, and springs. Test the auto-reverse safety with a block of wood.',
    icon: '🚗',
    schedule: { type: 'seasonal', months: [5] },
    conditions: { hasGarage: true },
    diy: true,
  },
  {
    id: 'water-softener',
    title: 'Top up water softener salt',
    detail: 'Keep the brine tank at least half full; break up any hardened salt bridges.',
    icon: '🧂',
    schedule: { type: 'interval', days: 60 },
    conditions: { hasSoftener: true },
    diy: true,
  },

  // ---- Pool ----
  {
    id: 'pool-open',
    title: 'Open & balance pool',
    detail: 'Remove cover, restart circulation, shock, and balance chemistry before swim season.',
    icon: '🏊',
    schedule: { type: 'seasonal', months: [5] },
    conditions: { hasPool: true },
    diy: true,
  },
  {
    id: 'pool-close',
    title: 'Winterize & close pool',
    detail: 'Balance water, lower level, blow out lines, and cover before sustained freezing.',
    icon: '🧊',
    schedule: { type: 'seasonal', months: [10] },
    conditions: { hasPool: true, climate: ['cold', 'temperate'] },
    diy: true,
  },

  // ---- Older-home extras ----
  {
    id: 'electrical-panel',
    title: 'Check electrical panel & GFCIs',
    detail: 'Press TEST on every GFCI outlet. Warm breakers or buzzing at the panel means call an electrician.',
    icon: '⚡',
    schedule: { type: 'seasonal', months: [8] },
    conditions: { homeAge: ['30plus'] },
    diy: true,
  },
  {
    id: 'foundation-check',
    title: 'Walk foundation & grading',
    detail: 'Look for new cracks and soil that slopes toward the house. Water should drain away from walls.',
    icon: '🧱',
    schedule: { type: 'seasonal', months: [4] },
    conditions: { homeType: ['house'], homeAge: ['10to30', '30plus'] },
    diy: true,
  },
];

// Profile questions used by onboarding — single source of truth.
export const PROFILE_QUESTIONS = [
  {
    key: 'homeType',
    label: 'What type of home?',
    options: [
      { value: 'house', label: 'House' },
      { value: 'townhouse', label: 'Townhouse' },
      { value: 'condo', label: 'Condo / Apartment' },
    ],
  },
  {
    key: 'homeAge',
    label: 'How old is it?',
    options: [
      { value: 'under10', label: 'Under 10 years' },
      { value: '10to30', label: '10 – 30 years' },
      { value: '30plus', label: 'Over 30 years' },
    ],
  },
  {
    key: 'heating',
    label: 'Heating system?',
    options: [
      { value: 'furnace', label: 'Furnace (forced air)' },
      { value: 'heat-pump', label: 'Heat pump' },
      { value: 'boiler', label: 'Boiler / radiators' },
      { value: 'other', label: 'Other / none' },
    ],
  },
  {
    key: 'climate',
    label: 'Your winters are…',
    options: [
      { value: 'cold', label: 'Freezing (snow, hard frosts)' },
      { value: 'temperate', label: 'Cool (light frost)' },
      { value: 'warm', label: 'Mild (rarely freezes)' },
    ],
  },
  {
    key: 'features',
    label: 'Which do you have?',
    multi: true,
    options: [
      { value: 'hasYard', label: 'Yard' },
      { value: 'hasGarage', label: 'Garage' },
      { value: 'hasBasement', label: 'Basement' },
      { value: 'hasPool', label: 'Pool' },
      { value: 'hasSoftener', label: 'Water softener' },
    ],
  },
];
