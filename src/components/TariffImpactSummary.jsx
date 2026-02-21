import React from 'react';
import { COLORS, MODE_CATEGORY_MAP } from '../utils/constants';
import { formatPercent, formatVolume } from '../utils/formatters';

export default function TariffImpactSummary({ affectedNodes, category, tariffSim, mode = 'company' }) {
  if (!affectedNodes || affectedNodes.length === 0 || !tariffSim) return null;

  const categoryLabel = MODE_CATEGORY_MAP[mode]?.[category]?.label || category;
  const totalAffectedVolume = affectedNodes.reduce(
    (sum, n) => sum + (n.baseline_volume_by_category?.[category] || 0),
    0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-lg">&#9888;</span>
        <span className="text-amber-400 font-bold text-sm tracking-wide">TARIFF IMPACT DETECTED</span>
      </div>

      <div className="text-xs tracking-widest uppercase mt-3 mb-1" style={{ color: COLORS.textMuted }}>
        Tariff Simulation ({categoryLabel})
      </div>
      <div className="border-t mb-2" style={{ borderColor: COLORS.separator }} />

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Simulated Tariff:</span>
          <span className="font-bold text-amber-400">
            {Math.round(tariffSim.tariffRate * 100)}%{tariffSim.isIncrement ? ' additional' : ''}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Countries Affected:</span>
          <span>{tariffSim.countries.join(', ')}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Total Exposed Volume:</span>
          <span className="font-bold">{formatVolume(totalAffectedVolume)} units / cycle</span>
        </div>
      </div>

      <div className="border-t mt-2 pt-2" style={{ borderColor: COLORS.separator }} />

      <div className="space-y-1 text-xs">
        {affectedNodes.map((node) => (
          <div key={node.id} className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>{node.name} ({node.country_iso3})</span>
            <span className="text-amber-400">
              {formatVolume(node.baseline_volume_by_category?.[category] || 0)} @ {formatPercent(node.tariff_rate_by_category?.[category] || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
