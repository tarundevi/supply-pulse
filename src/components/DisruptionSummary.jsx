import React from 'react';
import { COLORS, COMMODITY_CATEGORIES, RISK_THRESHOLDS } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';

function riskBar(eventCount) {
  const filled = Math.min(Math.round((eventCount / 150) * 10), 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function riskLabel(eventCount) {
  if (eventCount > RISK_THRESHOLDS.medium) return 'HIGH';
  if (eventCount > RISK_THRESHOLDS.low) return 'MEDIUM';
  return 'LOW';
}

export default function DisruptionSummary({ node, category }) {
  if (!node) return null;

  const volume = node.export_volumes[category] || 0;
  const categoryLabel = COMMODITY_CATEGORIES[category]?.label || category;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-red-500 text-lg">&#9888;</span>
        <span className="text-red-400 font-bold text-sm tracking-wide">
          DISRUPTION DETECTED: {node.country} ({categoryLabel})
        </span>
      </div>

      <div
        className="text-xs tracking-widest uppercase mt-3 mb-1"
        style={{ color: COLORS.textMuted }}
      >
        Real Trade Data (UN Comtrade 2023)
      </div>
      <div
        className="border-t mb-2"
        style={{ borderColor: COLORS.separator }}
      />

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Affected Export Volume:</span>
          <span className="font-bold">{formatCurrency(volume)} / year</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Category Disrupted:</span>
          <span>{categoryLabel}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>GDELT Risk Signal:</span>
          <span>
            <span className="text-red-400 font-mono">{riskBar(node.gdelt_event_count)}</span>{' '}
            {riskLabel(node.gdelt_event_count)} ({node.gdelt_event_count} events / 90d)
          </span>
        </div>
      </div>
    </div>
  );
}
