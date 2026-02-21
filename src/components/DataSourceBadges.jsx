import React from 'react';
import { COLORS } from '../utils/constants';

const SOURCES = [
  { name: 'UN Comtrade API', status: '2023 data', active: true },
  { name: 'GDELT', status: 'updated today', active: true },
  { name: 'World Bank WITS', status: 'tariff rates', active: true },
];

export default function DataSourceBadges() {
  return (
    <div className="space-y-2">
      <div
        className="text-xs tracking-widest uppercase"
        style={{ color: COLORS.textMuted }}
      >
        Data Sources
      </div>
      <div className="space-y-1">
        {SOURCES.map((src) => (
          <div key={src.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: src.active ? COLORS.riskLow : COLORS.textMuted }}
            />
            <span>{src.name}</span>
            <span style={{ color: COLORS.textMuted }}>({src.status})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
