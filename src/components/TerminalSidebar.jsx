import React from 'react';
import { COLORS } from '../utils/constants';
import DisruptionSummary from './DisruptionSummary';
import TariffImpactSummary from './TariffImpactSummary';
import AlternativeSuppliers from './AlternativeSuppliers';
import OptimizationSliders from './OptimizationSliders';
import RecommendedAction from './RecommendedAction';
import DataSourceBadges from './DataSourceBadges';
import ConsumerImpact from './ConsumerImpact';

export default function TerminalSidebar({
  disruptedNode,
  activeCategory,
  recommendations,
  weights,
  onWeightsChange,
  graph,
  tariffSim,
  tariffAffectedNodes,
  scenarioMode,
  mode,
  consumerImpact,
}) {
  return (
    <div
      className="flex flex-col gap-3 p-4 w-96 h-full overflow-y-auto font-mono pointer-events-auto border-l shadow-xl backdrop-blur-md bg-slate-900/85 text-left"
      style={{ borderColor: COLORS.separator }}
    >
      <div className="text-base font-bold tracking-wide" style={{ color: COLORS.electricBlue }}>
        TERMINAL
      </div>

      {tariffSim && (
        <div
          className="text-xs px-3 py-2 rounded border"
          style={{ borderColor: COLORS.riskMedium, color: COLORS.riskMedium, background: 'rgba(245, 158, 11, 0.08)' }}
        >
          TARIFF SIM: {Math.round(tariffSim.tariffRate * 100)}%
          {tariffSim.isIncrement ? ' additional' : ''} on {tariffSim.categories.join(', ')} from {tariffSim.countries.join(', ')}
        </div>
      )}

      {disruptedNode ? (
        <>
          <DisruptionSummary node={disruptedNode} category={activeCategory} graph={graph} mode={mode} />
          <AlternativeSuppliers
            recommendations={recommendations}
            category={activeCategory}
            isTariffScenario={scenarioMode !== 'outage'}
            mode={mode}
          />
          <RecommendedAction recommendations={recommendations} scenarioMode={scenarioMode} />
          <ConsumerImpact impact={consumerImpact} />
        </>
      ) : tariffSim && tariffAffectedNodes.length > 0 ? (
        <>
          <TariffImpactSummary affectedNodes={tariffAffectedNodes} category={activeCategory} tariffSim={tariffSim} mode={mode} />
          <AlternativeSuppliers recommendations={recommendations} category={activeCategory} isTariffScenario={true} mode={mode} />
          <RecommendedAction recommendations={recommendations} scenarioMode={scenarioMode} />
          <ConsumerImpact impact={consumerImpact} />
        </>
      ) : (
        <div className="text-xs" style={{ color: COLORS.textMuted }}>
          Click a node on the globe to simulate an outage, or run a tariff scenario.
        </div>
      )}

      <div className="border-t" style={{ borderColor: COLORS.separator }} />
      <OptimizationSliders weights={weights} onWeightsChange={onWeightsChange} />
      <div className="flex-1" />
      <div className="border-t pt-3" style={{ borderColor: COLORS.separator }}>
        <DataSourceBadges metadata={graph?.metadata} mode={mode} />
      </div>
    </div>
  );
}
