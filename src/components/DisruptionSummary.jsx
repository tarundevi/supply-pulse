import React from 'react';
import { COLORS, MODE_CATEGORY_MAP } from '../utils/constants';
import { formatPercent, formatVolume } from '../utils/formatters';

function riskBar(eventCount) {
  const filled = Math.min(Math.round((eventCount / 150) * 10), 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

export default function DisruptionSummary({ node, category, graph, mode = 'company' }) {
  if (!node) return null;

  const categoryLabel = MODE_CATEGORY_MAP[mode]?.[category]?.label || category;
  const disruptedVolume = node.baseline_volume_by_category?.[category] || 0;

  const allEdges = (graph?.edges || []).filter((e) => e.category === category);
  const totalVolume = allEdges.reduce((sum, e) => sum + (e.baseline_volume || 0), 0);
  const nodeVolume = allEdges
    .filter((e) => e.source_id === node.id)
    .reduce((sum, e) => sum + (e.baseline_volume || 0), 0);
  const dependencyPct = totalVolume > 0 ? nodeVolume / totalVolume : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-red-500 text-lg">&#9888;</span>
        <span className="text-red-400 font-bold text-sm tracking-wide">
          {mode === 'company' ? 'SUPPLIER OUTAGE' : 'COUNTRY DISRUPTION'}: {node.name} ({categoryLabel})
        </span>
      </div>

      <div className="text-xs tracking-widest uppercase mt-3 mb-1" style={{ color: COLORS.textMuted }}>
        {mode === 'company' ? 'Company Supply Baseline' : 'Trade Flow Baseline'}
      </div>
      <div className="border-t mb-2" style={{ borderColor: COLORS.separator }} />

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Disrupted Volume:</span>
          <span className="font-bold">{formatVolume(disruptedVolume)} units / cycle</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Location:</span>
          <span>{node.country_iso3}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Baseline Dependency:</span>
          <span className="font-bold">{formatPercent(dependencyPct)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Lead Time:</span>
          <span>{node.lead_time_days} days</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: COLORS.textMuted }}>Risk Signal:</span>
          <span>
            <span className="font-mono text-red-400">{riskBar(node.risk_event_count || 0)}</span>{' '}
            {node.risk_event_count || 0} events / 90d
          </span>
        </div>
      </div>
    </div>
  );
}
