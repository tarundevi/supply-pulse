// Commodity categories mapped to HS codes
export const COMMODITY_CATEGORIES = {
  electronics: { label: 'Electronics & Components', hsCode: '85' },
  textiles: { label: 'Textiles & Apparel', hsCode: '61' },
  chemicals: { label: 'Industrial Chemicals', hsCode: '28' },
  machinery: { label: 'Machinery & Equipment', hsCode: '84' },
  vehicles: { label: 'Vehicles & Auto Parts', hsCode: '87' },
};

// Country code → name mapping (ISO 3166 numeric used by Comtrade)
export const COUNTRY_CODES = {
  '156': 'China',
  '704': 'Vietnam',
  '410': 'South Korea',
  '484': 'Mexico',
  '356': 'India',
  '276': 'Germany',
  '392': 'Japan',
  '764': 'Thailand',
  '458': 'Malaysia',
  '076': 'Brazil',
  '616': 'Poland',
  '752': 'Sweden',
  '528': 'Netherlands',
  '724': 'Spain',
  '380': 'Italy',
};

// Destination markets
export const DESTINATION_MARKETS = {
  USA: { label: 'United States', code: '842' },
  EU: { label: 'European Union', code: '918' },
  JPN: { label: 'Japan', code: '392' },
};

// Color palette
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

// Default optimization weights (must sum to 1)
export const DEFAULT_WEIGHTS = {
  cost: 0.4,
  speed: 0.35,
  risk: 0.25,
};

// GDELT risk thresholds (event count in 90 days)
export const RISK_THRESHOLDS = {
  low: 30,
  medium: 100,
};
