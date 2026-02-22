import {
  TARIFF_PASS_THROUGH_RATES,
  PRICE_ELASTICITY_OF_DEMAND,
  RETAIL_PRICE_BASELINE,
  GROSS_MARGIN_RATES,
  SANCTION_PRICE_SHOCK_FACTOR,
  INTEREST_RATE_COST_SENSITIVITY,
  EXPORT_CONTROL_COST_PREMIUM,
  CURRENCY_PASS_THROUGH_RATES,
  getNodeVolume,
  getNodeTotalVolume,
} from '../utils/constants';

/**
 * Compute downstream consumer impact of supply chain disruptions.
 * Returns null when there is no meaningful cost impact.
 */
export function computeConsumerImpact(disruptedNode, category, simulatedGraph, originalGraph, macroEvent, recommendations) {
  if (!category || (!disruptedNode && !macroEvent)) return null;

  const passThrough = TARIFF_PASS_THROUGH_RATES[category] ?? 0.7;
  const elasticity = PRICE_ELASTICITY_OF_DEMAND[category] ?? -0.8;
  const baseline = RETAIL_PRICE_BASELINE[category] ?? { avgUnitPrice: 100, markupFactor: 2.0 };
  const grossMargin = GROSS_MARGIN_RATES[category] ?? 0.3;

  const categoryForConstants = category;

  let eventEffectiveCostDelta = 0;
  let affectedVolume = 0;
  let eventDescription = '';

  if (macroEvent && simulatedGraph && originalGraph) {
    switch (macroEvent.eventType) {
      case 'tariff': {
        const simNodes = simulatedGraph.nodes.filter(
          (n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3),
        );
        const origNodes = originalGraph.nodes.filter(
          (n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3),
        );
        const avgSimTariff = simNodes.length
          ? simNodes.reduce((s, n) => s + (n.tariff_rate_by_category?.[categoryForConstants] || 0), 0) / simNodes.length
          : 0;
        const avgOrigTariff = origNodes.length
          ? origNodes.reduce((s, n) => s + (n.tariff_rate_by_category?.[categoryForConstants] || 0), 0) / origNodes.length
          : 0;
        eventEffectiveCostDelta = avgSimTariff - avgOrigTariff;
        
        affectedVolume = simulatedGraph.nodes
          .filter((n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3))
          .reduce((s, n) => s + (getNodeVolume(n, categoryForConstants)), 0);
        
        eventDescription = `Tariff Impact`;
        break;
      }

      case 'sanction': {
        const simNodes = simulatedGraph.nodes.filter(
          (n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3),
        );
        const origNodes = originalGraph.nodes.filter(
          (n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3),
        );
        
        const simVolume = simNodes.reduce((s, n) => s + (getNodeVolume(n, categoryForConstants)), 0);
        const origVolume = origNodes.reduce((s, n) => s + (getNodeVolume(n, categoryForConstants)), 0);
        
        const affectedVolumeShare = origVolume > 0 ? (origVolume - simVolume) / origVolume : 0;
        
        eventEffectiveCostDelta = SANCTION_PRICE_SHOCK_FACTOR * affectedVolumeShare;
        affectedVolume = simVolume;
        eventDescription = `Supply Blocked`;
        break;
      }

      case 'interest_rate': {
        const sensitivity = INTEREST_RATE_COST_SENSITIVITY[categoryForConstants] || 0.1;
        eventEffectiveCostDelta = macroEvent.rateChangePct * sensitivity;
        
        affectedVolume = simulatedGraph.nodes
          .filter((n) => n.entity_type !== 'anchor_company')
          .reduce((s, n) => s + (getNodeVolume(n, categoryForConstants)), 0);
        
        eventDescription = `Cost of Capital Increase`;
        break;
      }

      case 'currency': {
        const simNodes = simulatedGraph.nodes.filter(
          (n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3),
        );
        const origNodes = originalGraph.nodes.filter(
          (n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3),
        );
        
        const passThroughRate = CURRENCY_PASS_THROUGH_RATES[categoryForConstants] || 0.6;
        
        const avgSimCost = simNodes.length
          ? simNodes.reduce((s, n) => s + (n.unit_cost_index || 1), 0) / simNodes.length
          : 1;
        const avgOrigCost = origNodes.length
          ? origNodes.reduce((s, n) => s + (n.unit_cost_index || 1), 0) / origNodes.length
          : 1;
        
        const costDelta = avgSimCost - avgOrigCost;
        eventEffectiveCostDelta = costDelta / avgOrigCost;
        
        affectedVolume = simulatedGraph.nodes
          .filter((n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3))
          .reduce((s, n) => s + (getNodeVolume(n, categoryForConstants)), 0);
        
        eventDescription = `FX Impact`;
        break;
      }

      case 'export_control': {
        const simNodes = simulatedGraph.nodes.filter(
          (n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3) && n.supplier_category === categoryForConstants,
        );
        const origNodes = originalGraph.nodes.filter(
          (n) => n.entity_type !== 'anchor_company' && macroEvent.countries.includes(n.country_iso3) && n.supplier_category === categoryForConstants,
        );
        
        const simCapacity = simNodes.reduce((s, n) => s + (n.capacity_index || 1), 0);
        const origCapacity = origNodes.reduce((s, n) => s + (n.capacity_index || 1), 0);
        
        const capacityLoss = origCapacity > 0 ? (origCapacity - simCapacity) / origCapacity : 0;
        
        const costPremium = EXPORT_CONTROL_COST_PREMIUM[categoryForConstants] || 0.2;
        eventEffectiveCostDelta = capacityLoss * costPremium;
        
        affectedVolume = simNodes.reduce((s, n) => s + (getNodeVolume(n, categoryForConstants)), 0);
        eventDescription = `Export Restriction`;
        break;
      }

      default:
        eventEffectiveCostDelta = 0;
        affectedVolume = 0;
        eventDescription = `Unknown Event`;
    }
  } else if (disruptedNode) {
    eventDescription = `Supplier Disruption`;
    affectedVolume = getNodeTotalVolume(disruptedNode);

    // Supplier outage: cost delta = weighted-avg reroute cost across all allocated alternatives
    if (recommendations?.length > 0) {
      const totalAlloc = recommendations.reduce((s, r) => s + (r.allocatedVolume || 0), 0);
      if (totalAlloc > 0) {
        eventEffectiveCostDelta = recommendations.reduce(
          (s, r) => s + (r.costDeltaPct ?? 0) * (r.allocatedVolume || 0), 0
        ) / totalAlloc;
      } else {
        eventEffectiveCostDelta = recommendations[0].costDeltaPct ?? 0;
      }
      // Outage always has a cost impact — even "cheaper" reroutes carry disruption risk premium
      eventEffectiveCostDelta = Math.max(eventEffectiveCostDelta, 0.02);
    }
  }

  const bestCostDelta = recommendations?.length > 0 ? (recommendations[0].costDeltaPct ?? 0) : 0;
  let rerouteDelta = Math.max(0, bestCostDelta);

  const effectiveCostDelta = eventEffectiveCostDelta + rerouteDelta;
  const hasNegativeImpact = effectiveCostDelta > 0;

  const retailPriceIncreasePct = hasNegativeImpact
    ? (effectiveCostDelta / baseline.markupFactor) * passThrough
    : 0;
  const retailPrice = baseline.avgUnitPrice * baseline.markupFactor;
  const retailPriceIncrease = retailPriceIncreasePct * retailPrice;

  const demandDropPct = elasticity * retailPriceIncreasePct;

  const revenueAtRisk = affectedVolume * Math.abs(demandDropPct) * grossMargin;

  let marginPreservedPct = 0;
  let costSavingsPct = 0;
  if (recommendations?.length > 0) {
    if (hasNegativeImpact) {
      const avoided = effectiveCostDelta - bestCostDelta;
      marginPreservedPct = Math.min(1, Math.max(0, avoided / effectiveCostDelta));
    } else {
      costSavingsPct = Math.abs(bestCostDelta);
      marginPreservedPct = 1;
    }
  }

  return {
    retailPriceIncrease,
    retailPriceIncreasePct,
    demandDropPct,
    revenueAtRisk,
    marginPreservedPct,
    costSavingsPct,
    hasNegativeImpact,
    eventDescription,
    eventType: macroEvent?.eventType || null,
    // Formula inputs for transparent display
    inputs: {
      category,
      passThrough,
      elasticity,
      markupFactor: baseline.markupFactor,
      avgUnitPrice: baseline.avgUnitPrice,
      grossMargin,
      effectiveCostDelta,
      affectedVolume,
      bestCostDelta,
    },
  };
}