import React from 'react';
import { COLORS } from '../utils/constants';

export default function DataSourceBadges({ metadata, mode = 'company' }) {
  const sources = mode === 'company'
    ? [
      { name: 'SEC EDGAR', status: metadata?.anchor_company ? 'anchor metadata' : 'fallback', active: true },
      { name: 'GDELT', status: metadata?.gdelt_window || '90d signal', active: true },
      { name: 'Tariff Matrix', status: metadata?.tariff_year || 'proxy', active: true },
      { name: 'Supplier Baseline', status: 'curated', active: true },
    ]
    : [
      { name: 'UN Comtrade', status: metadata?.comtrade_year || 'trade flows', active: true },
      { name: 'GDELT', status: metadata?.gdelt_window || '90d signal', active: true },
      { name: 'World Bank WITS', status: metadata?.wits_year || 'tariffs', active: true },
    ];

  return (
    <div className="space-y-2">
      <div className="text-xs tracking-widest uppercase" style={{ color: COLORS.textMuted }}>
        Data Sources
      </div>
      <div className="space-y-1">
        {sources.map((src) => (
          <div key={src.name} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: src.active ? COLORS.riskLow : COLORS.textMuted }} />
            <span>{src.name}</span>
            <span style={{ color: COLORS.textMuted }}>({src.status})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
