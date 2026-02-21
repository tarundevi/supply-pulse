import React from 'react';
import { COLORS } from '../utils/constants';
import DisruptionSummary from './DisruptionSummary';
import AlternativeSuppliers from './AlternativeSuppliers';
import OptimizationSliders from './OptimizationSliders';
import DataSourceBadges from './DataSourceBadges';

export default function TerminalSidebar({
  disruptedNode,
  activeCategory,
  recommendations,
  weights,
  onWeightsChange,
}) {
  return (
    <div
      className="h-full flex flex-col gap-4 p-4 overflow-y-auto font-mono"
      style={{ background: COLORS.panelBg }}
    >
      {/* Header */}
      <div className="text-lg font-bold tracking-wide" style={{ color: COLORS.electricBlue }}>
        TERMINAL
      </div>

      {/* Disruption info — shown when a country is clicked */}
      {disruptedNode ? (
        <>
          <DisruptionSummary node={disruptedNode} category={activeCategory} />
          <AlternativeSuppliers
            recommendations={recommendations}
            category={activeCategory}
          />
        </>
      ) : null}

      {/* Always show default widgets */}
      {!disruptedNode && (
        <div className="text-xs mb-2" style={{ color: COLORS.textMuted }}>
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
