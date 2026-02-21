import React from 'react';
import { COLORS } from '../utils/constants';
import { formatCurrency, formatPercent } from '../utils/formatters';

function thresholdColor(pct, greenMax, amberMax) {
  if (pct < greenMax) return COLORS.riskLow;
  if (pct <= amberMax) return COLORS.riskMedium;
  return COLORS.riskHigh;
}

export default function ConsumerImpact({ impact }) {
  if (!impact) return null;

  const {
    retailPriceIncrease,
    retailPriceIncreasePct,
    demandDropPct,
    revenueAtRisk,
    marginPreservedPct,
    costSavingsPct,
    hasNegativeImpact,
  } = impact;

  let rows;

  if (hasNegativeImpact) {
    const priceColor = thresholdColor(retailPriceIncreasePct, 0.03, 0.08);
    const demandColor = Math.abs(demandDropPct) > 0.05 ? COLORS.riskHigh : COLORS.riskMedium;
    const marginColor = marginPreservedPct >= 0.8 ? COLORS.riskLow : marginPreservedPct >= 0.4 ? COLORS.riskMedium : COLORS.riskHigh;

    rows = [
      {
        label: 'Projected Retail Price',
        value: `+$${retailPriceIncrease.toFixed(2)} (+${(retailPriceIncreasePct * 100).toFixed(1)}%)`,
        color: priceColor,
      },
      {
        label: 'Forecasted Demand Drop',
        value: `-${(Math.abs(demandDropPct) * 100).toFixed(1)}%`,
        color: demandColor,
      },
      {
        label: 'Gross Revenue at Risk',
        value: formatCurrency(revenueAtRisk),
        color: COLORS.riskHigh,
      },
      {
        label: 'Margin Preserved',
        value: formatPercent(marginPreservedPct),
        color: marginColor,
      },
    ];
  } else {
    rows = [
      {
        label: 'Projected Retail Price',
        value: 'No increase',
        color: COLORS.riskLow,
      },
      {
        label: 'Forecasted Demand Drop',
        value: 'None',
        color: COLORS.riskLow,
      },
      {
        label: 'Reroute Cost Savings',
        value: costSavingsPct > 0 ? `-${(costSavingsPct * 100).toFixed(1)}%` : 'Neutral',
        color: costSavingsPct > 0 ? COLORS.riskLow : COLORS.textMuted,
      },
      {
        label: 'Margin Preserved',
        value: formatPercent(marginPreservedPct),
        color: COLORS.riskLow,
      },
    ];
  }

  return (
    <div>
      <div className="text-[11px] font-bold tracking-widest mb-1" style={{ color: COLORS.electricBlue }}>
        CONSUMER IMPACT FORECAST
      </div>
      <div className="text-[10px] border rounded px-3 py-2" style={{ borderColor: COLORS.separator, background: 'rgba(15,23,42,0.6)' }}>
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between py-0.5">
            <span style={{ color: COLORS.textMuted }}>{row.label}</span>
            <span className="font-bold" style={{ color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
