import React, { useState } from 'react';
import { COLORS } from '../utils/constants';
import { formatCurrency, formatPercent, formatVolume } from '../utils/formatters';

function thresholdColor(pct, greenMax, amberMax) {
  if (pct < greenMax) return COLORS.riskLow;
  if (pct <= amberMax) return COLORS.riskMedium;
  return COLORS.riskHigh;
}

const hl = { color: COLORS.electricBlue };
const val = { color: COLORS.textPrimary };
const mut = { color: COLORS.textMuted };
const sym = { color: '#a78bfa' };

function FormulaBlock({ name, symbolic, substituted, result, resultColor }) {
  return (
    <div
      className="rounded-md px-3 py-1.5 font-mono text-[9px] leading-[1.6] space-y-0.5"
      style={{
        background: 'rgba(0,200,255,0.03)',
        border: `1px solid ${COLORS.separator}`,
      }}
    >
      <div style={{ ...hl, fontSize: '8px', letterSpacing: '0.08em' }}>{name}</div>
      <div style={mut}>{symbolic}</div>
      <div style={mut}>= {substituted}</div>
      <div>
        = <span className="font-bold" style={{ color: resultColor || COLORS.textPrimary }}>{result}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, barPct, icon }) {
  return (
    <div
      className="relative overflow-hidden rounded-md px-3 py-2"
      style={{
        background: 'rgba(15,23,42,0.7)',
        border: `1px solid ${color}22`,
      }}
    >
      {barPct > 0 && (
        <div
          className="absolute inset-y-0 left-0 opacity-[0.08]"
          style={{
            width: `${Math.min(barPct, 100)}%`,
            background: color,
            transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      )}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px]" style={mut}>{icon}</span>
          <span className="text-[10px] tracking-wide" style={mut}>{label}</span>
        </div>
        <span
          className="font-mono font-bold text-[11px] tabular-nums"
          style={{ color, textShadow: `0 0 8px ${color}44` }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function p(n) {
  if (n === undefined || n === null) return '?';
  return `${(n * 100).toFixed(1)}%`;
}

export default function ConsumerImpact({ impact }) {
  if (!impact) return null;
  const [showFormulas, setShowFormulas] = useState(false);

  const {
    retailPriceIncrease,
    retailPriceIncreasePct,
    demandDropPct,
    revenueAtRisk,
    marginPreservedPct,
    costSavingsPct,
    hasNegativeImpact,
    inputs,
  } = impact;

  const i = inputs || {};
  const constantsLabel = (i.normalizedCategory || i.category || '').toUpperCase();
  const isSelectionComposite = i.selectionMode === 'selected'
    && (i.scenarioType === 'outage' || i.scenarioType === 'combined');

  const toggleBtn = (
    <button
      onClick={() => setShowFormulas((v) => !v)}
      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
      style={{
        color: showFormulas ? COLORS.electricBlue : COLORS.textMuted,
        background: showFormulas ? 'rgba(0,200,255,0.1)' : 'transparent',
        border: `1px solid ${showFormulas ? COLORS.electricBlue + '44' : COLORS.separator}`,
        cursor: 'pointer',
      }}
    >
      {showFormulas ? 'HIDE MATH' : 'SHOW MATH'}
    </button>
  );

  const inputsPanel = showFormulas && inputs && (
    <div
      className="rounded-md px-3 py-2 font-mono text-[9px] leading-relaxed"
      style={{
        background: 'rgba(0,200,255,0.04)',
        border: `1px solid ${COLORS.electricBlue}22`,
        color: COLORS.textMuted,
      }}
    >
      <div style={{ ...hl, fontSize: '8px', letterSpacing: '0.1em', marginBottom: '3px' }}>
        CONSTANTS - {constantsLabel}
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-0.5">
        <div><span style={sym}>passThrough</span> <span style={val}>{i.passThrough}</span></div>
        <div><span style={sym}>elasticity</span> <span style={val}>{i.elasticity}</span></div>
        <div><span style={sym}>markup</span> <span style={val}>{i.markupFactor}x</span></div>
        <div><span style={sym}>basePrice</span> <span style={val}>{formatCurrency(i.avgUnitPrice || 0)}</span></div>
        <div><span style={sym}>margin</span> <span style={val}>{p(i.grossMargin)}</span></div>
        <div><span style={sym}>volume</span> <span style={val}>{formatVolume(i.affectedVolume || 0)}</span></div>
      </div>
      <div className="border-t mt-1.5 pt-1 space-y-0.5" style={{ borderColor: COLORS.separator }}>
        <div>
          <span style={sym}>scenario</span> <span style={val}>{i.scenarioType || 'outage'}</span>
          {' '}
          <span style={sym}>selection</span> <span style={val}>{i.selectionMode || 'baseline'}</span>
        </div>
        <div>
          <span style={sym}>affectedRevenue</span> <span style={val}>{formatCurrency(i.affectedRevenue || 0)}</span>
        </div>
        <div>
          <span style={sym}>baseShockCostDelta</span> <span style={val}>{p(i.baseShockCostDelta)}</span>
          {' '}
          <span style={sym}>chosenMitigationDelta</span> <span style={val}>{p(i.chosenMitigationDelta)}</span>
        </div>
        <div>
          <span style={sym}>mitigatedCostDelta</span> <span style={val}>{p(i.mitigatedCostDelta)}</span>
          {' '}
          <span style={sym}>effectiveCostDelta</span> <span style={val}>{p(i.effectiveCostDelta)}</span>
        </div>
        {isSelectionComposite && (
          <>
            <div>
              <span style={sym}>selectedCoveragePct</span> <span style={val}>{p(i.selectedCoveragePct)}</span>
            </div>
            <div>
              <span style={sym}>residualShockComponent</span> <span style={val}>{p(i.residualShockComponent)}</span>
              {' '}
              <span style={sym}>selectedCostComponent</span> <span style={val}>{p(i.selectedCostComponent)}</span>
            </div>
            <div>
              <span style={sym}>selectedOperationalPenalty</span> <span style={val}>{p(i.selectedOperationalPenalty)}</span>
              {' '}
              <span style={sym}>coverageGapPenalty</span> <span style={val}>{p(i.coverageGapPenalty)}</span>
              {' '}
              <span style={sym}>leadTimePenalty</span> <span style={val}>{p(i.leadTimePenalty)}</span>
              {' '}
              <span style={sym}>riskPenalty</span> <span style={val}>{p(i.riskPenalty)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (hasNegativeImpact) {
    const priceColor = thresholdColor(retailPriceIncreasePct, 0.03, 0.08);
    const demandColor = Math.abs(demandDropPct) > 0.05 ? COLORS.riskHigh : COLORS.riskMedium;
    const marginColor = marginPreservedPct >= 0.8
      ? COLORS.riskLow
      : marginPreservedPct >= 0.4
        ? COLORS.riskMedium
        : COLORS.riskHigh;

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[11px] font-bold tracking-widest" style={hl}>
            CONSUMER IMPACT FORECAST
          </span>
          {toggleBtn}
        </div>

        {inputsPanel}

        {showFormulas && isSelectionComposite && (
          <FormulaBlock
            name="effectiveCostDelta"
            symbolic={<><span style={sym}>residualShockComponent</span> + <span style={sym}>selectedCostComponent</span> + <span style={sym}>selectedOperationalPenalty</span></>}
            substituted={<>{p(i.residualShockComponent)} + {p(i.selectedCostComponent)} + {p(i.selectedOperationalPenalty)}</>}
            result={p(i.effectiveCostDelta)}
            resultColor={priceColor}
          />
        )}
        {showFormulas && isSelectionComposite && (
          <FormulaBlock
            name="selectedOperationalPenalty"
            symbolic={<><span style={sym}>coverageGapPenalty</span> + <span style={sym}>leadTimePenalty</span> + <span style={sym}>riskPenalty</span></>}
            substituted={<>{p(i.coverageGapPenalty)} + {p(i.leadTimePenalty)} + {p(i.riskPenalty)}</>}
            result={p(i.selectedOperationalPenalty)}
            resultColor={COLORS.riskMedium}
          />
        )}

        <MetricCard
          icon="&#9650;"
          label="Retail Price"
          value={`+${formatCurrency(retailPriceIncrease)}  (+${(retailPriceIncreasePct * 100).toFixed(1)}%)`}
          color={priceColor}
          barPct={Math.min(retailPriceIncreasePct * 100 * 5, 100)}
        />
        {showFormulas && (
          <FormulaBlock
            name="retailPriceIncreasePct"
            symbolic={<><span style={sym}>effectiveCostDelta</span> / <span style={sym}>markup</span> * <span style={sym}>passThrough</span></>}
            substituted={<>{p(i.effectiveCostDelta)} / {i.markupFactor} * {i.passThrough}</>}
            result={p(retailPriceIncreasePct)}
            resultColor={priceColor}
          />
        )}

        <MetricCard
          icon="&#9660;"
          label="Demand Drop"
          value={`-${(Math.abs(demandDropPct) * 100).toFixed(1)}%`}
          color={demandColor}
          barPct={Math.abs(demandDropPct) * 100 * 5}
        />
        {showFormulas && (
          <FormulaBlock
            name="demandDropPct"
            symbolic={<><span style={sym}>elasticity</span> * <span style={sym}>retailPriceIncreasePct</span></>}
            substituted={<>{i.elasticity} * {p(retailPriceIncreasePct)}</>}
            result={p(demandDropPct)}
            resultColor={demandColor}
          />
        )}

        <MetricCard
          icon="$"
          label="Revenue at Risk"
          value={formatCurrency(revenueAtRisk)}
          color={COLORS.riskHigh}
          barPct={60}
        />
        {showFormulas && (
          <FormulaBlock
            name="revenueAtRisk"
            symbolic={<><span style={sym}>affectedRevenue</span> * |<span style={sym}>demandDropPct</span>| * <span style={sym}>grossMargin</span></>}
            substituted={<>{formatCurrency(i.affectedRevenue || 0)} * {p(Math.abs(demandDropPct))} * {p(i.grossMargin)}</>}
            result={formatCurrency(revenueAtRisk)}
            resultColor={COLORS.riskHigh}
          />
        )}

        <MetricCard
          icon="&#9632;"
          label="Margin Preserved"
          value={formatPercent(marginPreservedPct)}
          color={marginColor}
          barPct={marginPreservedPct * 100}
        />
        {showFormulas && (
          <FormulaBlock
            name="marginPreservedPct"
            symbolic={<>(<span style={sym}>baseShockCostDelta</span> - <span style={sym}>mitigatedCostDelta</span>) / <span style={sym}>baseShockCostDelta</span></>}
            substituted={`(${p(i.baseShockCostDelta)} - ${p(i.mitigatedCostDelta)}) / ${p(i.baseShockCostDelta)}`}
            result={p(marginPreservedPct)}
            resultColor={marginColor}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[11px] font-bold tracking-widest" style={hl}>
          CONSUMER IMPACT FORECAST
        </span>
        {toggleBtn}
      </div>

      {showFormulas && inputs && (
        <div
          className="rounded-md px-3 py-2 font-mono text-[9px] leading-relaxed"
          style={{
            background: 'rgba(0,200,255,0.04)',
            border: `1px solid ${COLORS.electricBlue}22`,
            color: COLORS.textMuted,
          }}
        >
          <div style={{ ...hl, fontSize: '8px', letterSpacing: '0.1em', marginBottom: '2px' }}>
            CONSTANTS - {constantsLabel}
          </div>
          <div>
            <span style={sym}>baseShockCostDelta</span> = <span style={val}>{p(i.baseShockCostDelta)}</span>
            {' '}
            <span style={sym}>mitigatedCostDelta</span> = <span style={val}>{p(i.mitigatedCostDelta)}</span>
          </div>
          {isSelectionComposite && (
            <div>
              <span style={sym}>effectiveCostDelta</span> = <span style={val}>{p(i.residualShockComponent)} + {p(i.selectedCostComponent)} + {p(i.selectedOperationalPenalty)}</span>
            </div>
          )}
          <div style={{ marginTop: '4px' }}>No negative impact - mitigation fully offsets modeled cost shock.</div>
        </div>
      )}

      <MetricCard icon="&#10003;" label="Retail Price" value="No increase" color={COLORS.riskLow} barPct={0} />
      <MetricCard icon="&#10003;" label="Demand Drop" value="None" color={COLORS.riskLow} barPct={0} />
      <MetricCard
        icon={costSavingsPct > 0 ? '&#9660;' : '-'}
        label="Reroute Cost Savings"
        value={costSavingsPct > 0 ? `-${(costSavingsPct * 100).toFixed(1)}%` : 'Neutral'}
        color={costSavingsPct > 0 ? COLORS.riskLow : COLORS.textMuted}
        barPct={costSavingsPct * 100 * 5}
      />
      <MetricCard
        icon="&#9632;"
        label="Margin Preserved"
        value={formatPercent(marginPreservedPct)}
        color={COLORS.riskLow}
        barPct={marginPreservedPct * 100}
      />
    </div>
  );
}
