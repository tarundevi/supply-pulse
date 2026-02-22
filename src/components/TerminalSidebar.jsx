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
  macroEvent,
  affectedNodes,
  scenarioMode,
  mode,
  consumerImpact,
  selectedRecId,
  onSelectRec,
}) {

  const renderEventBanner = () => {
    if (!macroEvent) return null;

    const eventType = macroEvent.eventType;
    let bannerText = '';
    let bannerStyle = { borderColor: COLORS.riskMedium, color: COLORS.riskMedium, background: 'rgba(245, 158, 11, 0.08)' };

    switch (eventType) {
      case 'tariff':
        bannerText = `TARIFF: ${Math.round(macroEvent.tariffRate * 100)}%${macroEvent.isIncrement ? ' additional' : ''} on ${macroEvent.categories.join(', ')} from ${macroEvent.countries.join(', ')}`;
        break;
      case 'sanction':
        bannerText = `SANCTION: Trade blocked on ${macroEvent.categories.join(', ')} from ${macroEvent.countries.join(', ')}`;
        bannerStyle = { borderColor: COLORS.riskHigh, color: COLORS.riskHigh, background: 'rgba(239, 68, 68, 0.1)' };
        break;
      case 'currency':
        const changeDir = macroEvent.currencyChangePct < 0 ? 'devaluation' : 'appreciation';
        bannerText = `CURRENCY: ${Math.round(Math.abs(macroEvent.currencyChangePct) * 100)}% ${changeDir} in ${macroEvent.countries.join(', ')}`;
        bannerStyle = { borderColor: COLORS.riskMedium, color: COLORS.riskMedium, background: 'rgba(245, 158, 11, 0.08)' };
        break;
      case 'export_control':
        bannerText = `EXPORT CONTROL: ${Math.round(macroEvent.restrictionLevel * 100)}% restriction on ${macroEvent.categories.join(', ')} from ${macroEvent.countries.join(', ')}`;
        bannerStyle = { borderColor: COLORS.riskMedium, color: COLORS.riskMedium, background: 'rgba(245, 158, 11, 0.08)' };
        break;
      default:
        return null;
    }

    return (
      <div className="text-xs px-3 py-2 rounded border" style={bannerStyle}>
        {bannerText}
      </div>
    );
  };

  return (
    <div
      className="flex flex-col gap-3 p-4 w-96 h-full overflow-y-auto font-mono pointer-events-auto border-l shadow-xl backdrop-blur-md bg-slate-900/85 text-left"
      style={{ borderColor: COLORS.separator }}
    >
      <div className="text-base font-bold tracking-wide" style={{ color: COLORS.electricBlue }}>
        TERMINAL
      </div>

      {renderEventBanner()}

      {disruptedNode ? (
        <>
          <DisruptionSummary node={disruptedNode} category={activeCategory} graph={graph} mode={mode} />
          <ConsumerImpact impact={consumerImpact} />
          <AlternativeSuppliers
            recommendations={recommendations}
            category={activeCategory}
            isTariffScenario={scenarioMode !== 'outage'}
            mode={mode}
            selectedRecId={selectedRecId}
            onSelectRec={onSelectRec}
          />
          <RecommendedAction recommendations={recommendations} scenarioMode={scenarioMode} />
        </>
      ) : macroEvent && affectedNodes.length > 0 ? (
        <>
          <TariffImpactSummary affectedNodes={affectedNodes} category={activeCategory} macroEvent={macroEvent} mode={mode} />
          <ConsumerImpact impact={consumerImpact} />
          <AlternativeSuppliers recommendations={recommendations} category={activeCategory} isTariffScenario={true} mode={mode} selectedRecId={selectedRecId} onSelectRec={onSelectRec} />
          <RecommendedAction recommendations={recommendations} scenarioMode={scenarioMode} />
        </>
      ) : (
        <div className="text-xs" style={{ color: COLORS.textMuted }}>
          Click a node on the globe to simulate an outage, or run a macro event scenario.
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
