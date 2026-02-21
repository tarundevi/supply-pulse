import React from 'react';
import { COLORS } from '../utils/constants';
import DisruptionSummary from './DisruptionSummary';
import AlternativeSuppliers from './AlternativeSuppliers';
import OptimizationSliders from './OptimizationSliders';
import RecommendedAction from './RecommendedAction';
import DataSourceBadges from './DataSourceBadges';

export default function TerminalSidebar({
  disruptedNode,
  activeCategory,
  recommendations,
  weights,
  onWeightsChange,
  graph,
  tariffSim,
}) {
  return (
    <div
      className="flex flex-col gap-3 p-3 mb-4 w-72 max-h-[60vh] overflow-y-auto font-mono pointer-events-auto rounded-lg border shadow-xl backdrop-blur-md bg-slate-900/85"
      style={{
        borderColor: COLORS.separator
      }}
    >
      {/* Header */}
      <div className="text-base font-bold tracking-wide" style={{ color: COLORS.electricBlue }}>
        TERMINAL
      </div>

      {/* Tariff simulation banner */}
      {tariffSim && (
        <div
          className="text-xs px-3 py-2 rounded border"
          style={{
            borderColor: COLORS.riskMedium,
            color: COLORS.riskMedium,
            background: 'rgba(245, 158, 11, 0.08)',
          }}
        >
          TARIFF SIM: {Math.round(tariffSim.tariffRate * 100)}%{tariffSim.isIncrement ? ' additional' : ''} on{' '}
          {tariffSim.categories.join(', ')} from {tariffSim.countries.join(', ')}
        </div>
      )}

      {/* Disruption info — shown when a country is clicked */}
      {disruptedNode ? (
        <>
          <DisruptionSummary node={disruptedNode} category={activeCategory} graph={graph} />
          <AlternativeSuppliers
            recommendations={recommendations}
            category={activeCategory}
          />
          <RecommendedAction recommendations={recommendations} />
        </>
      ) : (
        <div className="text-xs" style={{ color: COLORS.textMuted }}>
          Click a country node on the globe to simulate a supply chain disruption.
        </div>
      )}

      {/* Separator */}
      <div className="border-t" style={{ borderColor: COLORS.separator }} />

      {/* Optimization sliders */}
      <OptimizationSliders weights={weights} onWeightsChange={onWeightsChange} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Data source badges */}
      <div className="border-t pt-3" style={{ borderColor: COLORS.separator }}>
        <DataSourceBadges />
      </div>
    </div>
  );
}
