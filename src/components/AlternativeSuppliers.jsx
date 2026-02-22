import React from 'react';
import { COLORS, MODE_CATEGORY_MAP } from '../utils/constants';
import { formatPercent, formatVolume } from '../utils/formatters';

function riskBar(score) {
  const filled = Math.min(Math.round(score || 0), 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

export default function AlternativeSuppliers({ recommendations, category, isTariffScenario = false, mode = 'company', selectedRecId = null, onSelectRec }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-xs p-2 rounded" style={{ background: 'rgba(239,68,68,0.08)', color: COLORS.textMuted }}>
        No viable alternatives found for this scenario.
      </div>
    );
  }

  const categoryLabel = MODE_CATEGORY_MAP[mode]?.[category]?.label || category;

  return (
    <div className="space-y-3">
      <div className="text-xs tracking-widest uppercase" style={{ color: COLORS.textMuted }}>
        Top Alternative Suppliers
      </div>
      <div className="border-t mb-1" style={{ borderColor: COLORS.separator }} />

      {recommendations.map((rec, i) => (
        <div
          key={rec.id}
          className="p-2 rounded text-xs space-y-1 cursor-pointer transition-all"
          style={{
            background: selectedRecId === rec.id ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)',
            border: selectedRecId === rec.id ? '1px solid rgba(34,197,94,0.5)' : '1px solid transparent',
          }}
          onClick={() => onSelectRec?.(selectedRecId === rec.id ? null : rec.id)}
        >
          <div className="flex items-center gap-2">
            <div className="font-bold text-sm" style={{ color: COLORS.electricBlue }}>
              {i + 1}. {rec.name}
            </div>
            {rec.isDiscovered && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide"
                style={{ color: '#fdba74', border: '1px solid rgba(251,146,60,0.5)', background: 'rgba(251,146,60,0.12)' }}
              >
                New / Out-of-network
              </span>
            )}
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>{mode === 'company' ? 'Parent Company:' : 'Entity:'}</span>
            <span>{rec.parent_company_id}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Country:</span>
            <span>{rec.country_iso3}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Category Capacity:</span>
            <span>{formatVolume(rec.potentialCoverageVolume || 0)} ({categoryLabel})</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Cost Delta:</span>
            <span style={{ color: rec.costDeltaPct > 0 ? COLORS.riskMedium : COLORS.riskLow }}>
              {(rec.costDeltaPct >= 0 ? '+' : '') + (rec.costDeltaPct * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Lead Time Delta:</span>
            <span style={{ color: rec.leadTimeDeltaDays > 0 ? COLORS.riskMedium : COLORS.riskLow }}>
              {rec.leadTimeDeltaDays > 0 ? '+' : ''}{rec.leadTimeDeltaDays.toFixed(1)} days
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Risk:</span>
            <span><span className="font-mono">{riskBar(rec.risk_score)}</span> {rec.riskLabel}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Allocated Coverage:</span>
            <span>{formatPercent(Math.min(rec.coveragePct || 0, 1))}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: COLORS.textMuted }}>Data Confidence:</span>
            <span>{Math.round((rec.confidence || 0) * 100)}%</span>
          </div>
          {rec.isDiscovered && (
            <>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Qualification:</span>
                <span>{rec.qualificationReason === 'gap_fill_external' ? 'Gap-fill external candidate' : rec.qualificationReason}</span>
              </div>
              <div className="text-[11px]" style={{ color: '#fdba74' }}>
                Candidate supplier outside the current baseline network.
              </div>
            </>
          )}
          {isTariffScenario && typeof rec.costSavingsPct === 'number' && (
            <div className="flex justify-between">
              <span style={{ color: COLORS.textMuted }}>Tariff Cost Savings:</span>
              <span style={{ color: rec.costSavingsPct > 0 ? COLORS.riskLow : COLORS.riskMedium }}>
                {(rec.costSavingsPct >= 0 ? '+' : '') + (rec.costSavingsPct * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      ))}

      {(() => {
        const totalCoverage = recommendations.reduce((sum, r) => sum + (r.coveragePct || 0), 0);
        return totalCoverage < 1 ? (
          <div className="text-xs p-2 rounded" style={{ background: 'rgba(239,68,68,0.1)', color: COLORS.riskMedium }}>
            Gap: {formatPercent(1 - totalCoverage)} uncovered. Split sourcing required.
          </div>
        ) : null;
      })()}
    </div>
  );
}
