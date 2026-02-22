export const COMMODITY_CATEGORIES_COMPANY = {
  chips: { label: 'Semiconductors', code: 'CHIP' },
  displays: { label: 'Displays', code: 'DISP' },
  batteries: { label: 'Batteries', code: 'BATT' },
  assembly: { label: 'Final Assembly', code: 'ASSY' },
  sensors: { label: 'Sensors', code: 'SENS' },
};

export const COMMODITY_CATEGORIES_COUNTRY = {
  electronics: { label: 'Electronics & Components', code: '85' },
  textiles: { label: 'Textiles & Apparel', code: '61' },
  chemicals: { label: 'Industrial Chemicals', code: '28' },
  machinery: { label: 'Machinery & Equipment', code: '84' },
  vehicles: { label: 'Vehicles & Auto Parts', code: '87' },
};

export const MODE_CATEGORY_MAP = {
  company: COMMODITY_CATEGORIES_COMPANY,
  country: COMMODITY_CATEGORIES_COUNTRY,
};

export const ENTITY_TYPES = {
  supplier: 'supplier',
  facility: 'facility',
  anchorCompany: 'anchor_company',
};

export const EVENT_TYPES = {
  tariff: 'tariff',
  sanction: 'sanction',
  interest_rate: 'interest_rate',
  currency: 'currency',
  export_control: 'export_control',
};

export const SCENARIO_MODES = {
  outage: 'outage',
  tariff: 'tariff',
  sanction: 'sanction',
  interest_rate: 'interest_rate',
  currency: 'currency',
  export_control: 'export_control',
  combined: 'combined',
};

export const SANCTION_PRICE_SHOCK_FACTOR = 0.25;

export const INTEREST_RATE_COST_SENSITIVITY = {
  // Country mode
  electronics: 0.12, textiles: 0.05, chemicals: 0.15, machinery: 0.20, vehicles: 0.18,
  // Company mode
  chips: 0.14, displays: 0.10, batteries: 0.16, assembly: 0.08, sensors: 0.11,
};

export const EXPORT_CONTROL_COST_PREMIUM = {
  electronics: 0.30, textiles: 0.05, chemicals: 0.20, machinery: 0.25, vehicles: 0.15,
  chips: 0.35, displays: 0.20, batteries: 0.25, assembly: 0.10, sensors: 0.22,
};

export const CURRENCY_PASS_THROUGH_RATES = {
  electronics: 0.60, textiles: 0.80, chemicals: 0.50, machinery: 0.55, vehicles: 0.45,
  chips: 0.65, displays: 0.55, batteries: 0.50, assembly: 0.70, sensors: 0.58,
};

export const PARSER_CONFIG_BY_MODE = {
  company: {
    validCountries: ['CHN', 'TWN', 'KOR', 'JPN', 'IND', 'THA', 'MYS', 'USA'],
    countryAliases: {
      china: 'CHN',
      taiwan: 'TWN',
      korea: 'KOR',
      'south korea': 'KOR',
      japan: 'JPN',
      india: 'IND',
      thailand: 'THA',
      malaysia: 'MYS',
      usa: 'USA',
      'united states': 'USA',
    },
    validCategories: Object.keys(COMMODITY_CATEGORIES_COMPANY),
    categoryAliases: {
      chip: 'chips', chips: 'chips', semiconductor: 'chips', semiconductors: 'chips',
      display: 'displays', displays: 'displays', screen: 'displays', screens: 'displays',
      battery: 'batteries', batteries: 'batteries',
      assembly: 'assembly', assembled: 'assembly',
      sensor: 'sensors', sensors: 'sensors',
    },
  },
  country: {
    validCountries: ['CHN', 'VNM', 'KOR', 'MEX', 'IND', 'DEU', 'JPN', 'THA', 'MYS', 'BRA', 'POL', 'SWE', 'NLD', 'ESP', 'ITA'],
    countryAliases: {
      china: 'CHN', vietnam: 'VNM', korea: 'KOR', 'south korea': 'KOR',
      mexico: 'MEX', india: 'IND', germany: 'DEU', japan: 'JPN',
      thailand: 'THA', malaysia: 'MYS', brazil: 'BRA', poland: 'POL',
      sweden: 'SWE', netherlands: 'NLD', spain: 'ESP', italy: 'ITA',
    },
    validCategories: Object.keys(COMMODITY_CATEGORIES_COUNTRY),
    categoryAliases: {
      electronics: 'electronics', electronic: 'electronics', semiconductors: 'electronics', chips: 'electronics',
      textiles: 'textiles', textile: 'textiles', apparel: 'textiles',
      chemicals: 'chemicals', chemical: 'chemicals',
      machinery: 'machinery', machines: 'machinery', equipment: 'machinery',
      vehicles: 'vehicles', vehicle: 'vehicles', auto: 'vehicles', cars: 'vehicles',
    },
  },
};

export const DESTINATION_MARKETS = {
  USA: { label: 'United States', code: '842' },
  EU: { label: 'European Union', code: '918' },
  JPN: { label: 'Japan', code: '392' },
};

export const COLORS = {
  background: '#0a0f1e',
  electricBlue: '#00c8ff',
  riskLow: '#22c55e',
  riskMedium: '#f59e0b',
  riskHigh: '#ef4444',
  arcDefault: 'rgba(255,255,255,0.6)',
  arcRecommended: '#00c8ff',
  arcDisrupted: '#ef4444',
  textPrimary: '#e0e0e0',
  textMuted: '#64748b',
  panelBg: '#0f172a',
  separator: '#1e293b',
};

export const DEFAULT_WEIGHTS = {
  cost: 0.4,
  speed: 0.35,
  risk: 0.25,
};

export const RISK_THRESHOLDS = {
  low: 30,
  medium: 100,
};

export const TARIFF_PASS_THROUGH_RATES = {
  // Country mode
  electronics: 0.75, textiles: 0.90, chemicals: 0.60, machinery: 0.65, vehicles: 0.70,
  // Company mode
  chips: 0.80, displays: 0.75, batteries: 0.70, assembly: 0.85, sensors: 0.78,
};

export const PRICE_ELASTICITY_OF_DEMAND = {
  electronics: -1.0, textiles: -0.8, chemicals: -0.3, machinery: -0.5, vehicles: -0.6,
  chips: -0.9, displays: -1.1, batteries: -0.7, assembly: -1.0, sensors: -0.8,
};

export const RETAIL_PRICE_BASELINE = {
  electronics: { avgUnitPrice: 420, markupFactor: 2.4 },
  textiles:    { avgUnitPrice: 35,  markupFactor: 3.0 },
  chemicals:   { avgUnitPrice: 180, markupFactor: 1.8 },
  machinery:   { avgUnitPrice: 2500, markupFactor: 1.6 },
  vehicles:    { avgUnitPrice: 32000, markupFactor: 1.4 },
  chips:       { avgUnitPrice: 85,  markupFactor: 2.8 },
  displays:    { avgUnitPrice: 220, markupFactor: 2.2 },
  batteries:   { avgUnitPrice: 150, markupFactor: 2.0 },
  assembly:    { avgUnitPrice: 950, markupFactor: 1.5 },
  sensors:     { avgUnitPrice: 45,  markupFactor: 2.5 },
};

export const GROSS_MARGIN_RATES = {
  electronics: 0.38, textiles: 0.52, chemicals: 0.30, machinery: 0.28, vehicles: 0.22,
  chips: 0.55, displays: 0.35, batteries: 0.32, assembly: 0.18, sensors: 0.45,
};

/**
 * Maps standard UI categories to product-specific volume keys found in supply chain data.
 * A node's baseline_volume_by_category may use product-specific keys (e.g. "ai_chips")
 * instead of standard categories (e.g. "chips"). This mapping resolves them.
 */
const VOLUME_KEY_MAP = {
  // Company mode categories
  chips: ['chips', 'ai_chips', 'semiconductors', 'tpu_chips', 'graviton_chips', 'graphics_cards'],
  displays: ['displays', 'tvs', 'screens'],
  batteries: ['batteries', 'ev_batteries'],
  assembly: ['assembly', 'iphones', 'pixel_devices', 'echo_devices', 'macbooks', 'surface_devices', 'xbox', 'smart_home'],
  sensors: ['sensors', 'cameras', 'audio', 'networking', 'robotics'],
  // Country mode categories
  electronics: ['electronics', 'semiconductors', 'ai_chips', 'chips', 'displays', 'tvs', 'graphics_cards',
    'cloud_servers', 'aws_servers', 'data_storage', 'networking', 'home_appliances',
    'washing_machines', 'refrigerators', 'air_conditioners', 'ovens', 'hvac', 'compressors'],
  textiles: ['textiles', 'fashion', 'leather_goods', 'footwear', 'eyewear'],
  chemicals: ['chemicals', 'petrochemicals', 'refined_products', 'refined_fuels', 'base_oils', 'lubricants',
    'perfumes', 'wines_spirits'],
  machinery: ['machinery', 'engines', 'ev_components', 'logistics', 'renewables'],
  vehicles: ['vehicles', 'ev_platforms', 'trucks'],
};

/**
 * Get total volume for a node across ALL product keys (category-agnostic).
 * Used for supplier outage scenarios where the entire node goes offline.
 */
export function getNodeTotalVolume(node) {
  const volMap = node?.baseline_volume_by_category;
  if (!volMap) return 0;
  return Object.values(volMap).reduce((sum, v) => sum + v, 0);
}

/**
 * Get total volume for a node under a standard category by summing all matching product keys.
 */
export function getNodeVolume(node, category) {
  const volMap = node?.baseline_volume_by_category;
  if (!volMap) return 0;
  // Direct match first
  if (volMap[category] !== undefined) return volMap[category];
  // Sum all mapped product keys
  const keys = VOLUME_KEY_MAP[category];
  if (!keys) return 0;
  let total = 0;
  for (const k of keys) {
    if (volMap[k] !== undefined) total += volMap[k];
  }
  return total;
}
