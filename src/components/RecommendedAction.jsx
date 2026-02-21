import React from 'react';
import { COLORS } from '../utils/constants';
import { formatPercent } from '../utils/formatters';

export default function RecommendedAction({ recommendations, scenarioMode = 'outage' }) {
  if (!recommendations || recommendations.length < 1) return null;

  const primary = recommendations[0];
  const hedge = recommendations.length > 1 ? recommendations[1] : null;
  const totalCoverage = recommendations.reduce((s, r) => s + (r.coveragePct || 0), 0);

  const modeLabel =
    scenarioMode === 'combined' ? 'Combined Tariff + Outage' :
    scenarioMode === 'tariff' ? 'Tariff Shock' : 'Supplier Outage';

  return (
    <div className="space-y-2">
      <div className="text-xs tracking-widest uppercase" style={{ color: COLORS.textMuted }}>
        Recommended Action
      </div>
      <div className="border-t" style={{ borderColor: COLORS.separator }} />

      <div className="text-xs space-y-1">
        <div style={{ color: COLORS.textMuted }}>Scenario: {modeLabel}</div>
        <div>
          <span style={{ color: COLORS.electricBlue }}>&rarr; Primary: </span>
          <span className="font-bold">{primary.name}</span>
          <span style={{ color: COLORS.textMuted }}> ({primary.parent_company_id})</span>
        </div>
        {hedge && (
          <div>
            <span style={{ color: COLORS.electricBlue }}>&rarr; Hedge: </span>
            <span className="font-bold">{hedge.name}</span>
            <span style={{ color: COLORS.textMuted }}> ({hedge.parent_company_id})</span>
          </div>
        )}
        {totalCoverage < 1 && (
          <div style={{ color: COLORS.riskMedium }}>
            &rarr; Coverage shortfall: {formatPercent(1 - totalCoverage)} remains uncovered.
          </div>
        )}
      </div>
    </div>
  );
}
