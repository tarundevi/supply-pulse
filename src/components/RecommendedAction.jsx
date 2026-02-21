import React from 'react';
import { COLORS } from '../utils/constants';
import { formatPercent } from '../utils/formatters';

export default function RecommendedAction({ recommendations }) {
  if (!recommendations || recommendations.length < 2) return null;

  const primary = recommendations[0];
  // Hedge = lowest cost delta among remaining
  const hedge = recommendations
    .slice(1)
    .sort((a, b) => a.costDelta - b.costDelta)[0];

  const totalCoverage = recommendations.reduce((s, r) => s + r.coveragePct, 0);

  const primaryReason =
    primary.costDelta <= 0
      ? 'lowest cost delta'
      : primary.riskLabel === 'LOW'
        ? 'lowest risk'
        : 'best overall score';

  const hedgeReason =
    hedge.costDelta <= primary.costDelta
      ? 'lowest cost delta'
      : hedge.riskLabel === 'LOW'
        ? 'low risk'
        : 'diversification';

  return (
    <div className="space-y-2">
      <div
        className="text-xs tracking-widest uppercase"
        style={{ color: COLORS.textMuted }}
      >
        Recommended Action
      </div>
      <div className="border-t" style={{ borderColor: COLORS.separator }} />

      <div className="text-xs space-y-1">
        <div>
          <span style={{ color: COLORS.electricBlue }}>&rarr; Primary: </span>
          <span className="font-bold">{primary.country}</span>
          <span style={{ color: COLORS.textMuted }}> ({primaryReason})</span>
        </div>
        <div>
          <span style={{ color: COLORS.electricBlue }}>&rarr; Hedge: </span>
          <span className="font-bold">{hedge.country}</span>
          <span style={{ color: COLORS.textMuted }}> ({hedgeReason})</span>
        </div>
        {totalCoverage < 1 && (
          <div style={{ color: COLORS.riskMedium }}>
            &rarr; Gap: {formatPercent(1 - totalCoverage)} of volume cannot be
            covered by a single alternative — split sourcing required
          </div>
        )}
      </div>
    </div>
  );
}
