import React from 'react';
import { COLORS, COMMODITY_CATEGORIES } from '../utils/constants';
import { formatCurrency, formatPercent } from '../utils/formatters';
import AnimatedNumber from './AnimatedNumber';

function riskBar(gdeltScore) {
  const filled = Math.min(Math.round(gdeltScore), 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

export default function AlternativeSuppliers({ recommendations, category, isTariffScenario = false }) {
  if (!recommendations || recommendations.length === 0) return null;

  const categoryLabel = COMMODITY_CATEGORIES[category]?.label || category;

  return (
    <div className="space-y-3">
      <div
        className="text-xs tracking-widest uppercase"
        style={{ color: COLORS.textMuted }}
      >
        Top Alternative Suppliers
      </div>
      <div
        className="border-t mb-1"
        style={{ borderColor: COLORS.separator }}
      />

      {recommendations.map((rec, i) => (
        <div
          key={rec.id}
          className="p-2 rounded text-xs space-y-1"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="font-bold text-sm" style={{ color: COLORS.electricBlue }}>
            {i + 1}. {rec.country}
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>2023 Export Volume:</span>
            <span>
              <AnimatedNumber
                value={rec.export_volumes[category]}
                formatter={formatCurrency}
                duration={1.2}
              />
              {' '}(HS-{COMMODITY_CATEGORIES[category]?.hsCode})
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Applied Tariff:</span>
            <span>
              <AnimatedNumber
                value={rec.tariff_rates[category]}
                formatter={(v) => (v * 100).toFixed(1)}
                suffix="%"
                duration={0.8}
              />
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>GDELT Risk:</span>
            <span>
              <span className="font-mono">{riskBar(rec.gdelt_risk_score)}</span>{' '}
              {rec.riskLabel}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>
              {isTariffScenario ? 'Est. Cost Savings:' : 'Est. Cost Delta:'}
            </span>
            <span
              style={{
                color: isTariffScenario
                  ? (rec.costSavings > 0 ? COLORS.riskLow : COLORS.riskMedium)
                  : (rec.costDelta > 0 ? COLORS.riskMedium : COLORS.riskLow),
              }}
            >
              <AnimatedNumber
                value={isTariffScenario ? rec.costSavings * 100 : rec.costDelta * 100}
                formatter={(v) => (v >= 0 ? '+' : '') + v.toFixed(1)}
                suffix="%"
                duration={0.8}
              />
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Coverage:</span>
            <span>
              <AnimatedNumber
                value={Math.min(rec.coveragePct, 1)}
                formatter={(v) => (v * 100).toFixed(0)}
                suffix="%"
                duration={1}
              />
            </span>
          </div>
        </div>
      ))}

      {/* Coverage gap warning */}
      {(() => {
        const totalCoverage = recommendations.reduce(
          (sum, r) => sum + r.coveragePct,
          0
        );
        if (totalCoverage < 1) {
          return (
            <div className="text-xs p-2 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: COLORS.riskMedium }}>
              {isTariffScenario 
                ? `Gap: ${formatPercent(1 - totalCoverage)} of affected volume could shift to alternatives — consider split sourcing.`
                : `Gap: ${formatPercent(1 - totalCoverage)} of disrupted volume cannot be covered by top alternatives — split sourcing required.`
              }
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
