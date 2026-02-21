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

export const SCENARIO_MODES = {
  outage: 'outage',
  tariff: 'tariff',
  combined: 'combined',
};

export const PARSER_CONFIG_BY_MODE = {
  company: {
    validCountries: ['CHN', 'TWN', 'KOR', 'JPN', 'IND', 'THA', 'MYS', 'VNM', 'USA'],
    countryAliases: {
      china: 'CHN',
      taiwan: 'TWN',
      korea: 'KOR',
      'south korea': 'KOR',
      japan: 'JPN',
      india: 'IND',
      thailand: 'THA',
      malaysia: 'MYS',
      vietnam: 'VNM',
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
