import React from 'react';
import { COLORS, COMMODITY_CATEGORIES } from '../utils/constants';
import { formatCurrency, formatPercent } from '../utils/formatters';

export default function TariffImpactSummary({ affectedNodes, category, tariffSim }) {
  if (!affectedNodes || affectedNodes.length === 0 || !tariffSim) return null;

  const categoryLabel = COMMODITY_CATEGORIES[category]?.label || category;

  const totalAffectedVolume = affectedNodes.reduce(
    (sum, n) => sum + (n.export_volumes[category] || 0),
    0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-amber-500 text-lg">&#9888;</span>
        <span className="text-amber-400 font-bold text-sm tracking-wide">
          TARIFF IMPACT DETECTED
        </span>
      </div>

      <div
        className="text-xs tracking-widest uppercase mt-3 mb-1"
        style={{ color: COLORS.textMuted }}
      >
        Tariff Simulation
      </div>
      <div
        className="border-t mb-2"
        style={{ borderColor: COLORS.separator }}
      />

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Simulated Tariff:</span>
          <span className="font-bold text-amber-400">
            {Math.round(tariffSim.tariffRate * 100)}%
            {tariffSim.isIncrement ? ' additional' : ''}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Categories Affected:</span>
          <span>{tariffSim.categories.map(c => COMMODITY_CATEGORIES[c]?.label || c).join(', ')}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Countries Affected:</span>
          <span>{affectedNodes.map(n => n.country).join(', ')}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Total Export Volume:</span>
          <span className="font-bold">{formatCurrency(totalAffectedVolume)} / year</span>
        </div>
      </div>

      <div
        className="border-t mt-2 pt-2"
        style={{ borderColor: COLORS.separator }}
      />

      <div className="space-y-1 text-xs">
        {affectedNodes.map((node) => (
          <div key={node.id} className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>{node.country} ({categoryLabel}):</span>
            <span className="text-amber-400">
              {formatCurrency(node.export_volumes[category] || 0)} @ {formatPercent(node.tariff_rates[category])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
