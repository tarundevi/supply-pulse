import {
  TARIFF_PASS_THROUGH_RATES,
  PRICE_ELASTICITY_OF_DEMAND,
  RETAIL_PRICE_BASELINE,
  GROSS_MARGIN_RATES,
} from '../utils/constants';

/**
 * Compute downstream consumer impact of supply chain disruptions.
 * Returns null when there is no meaningful cost impact.
 */
export function computeConsumerImpact(disruptedNode, category, simulatedGraph, originalGraph, tariffSim, recommendations) {
  if (!category || (!disruptedNode && !tariffSim)) return null;

  const passThrough = TARIFF_PASS_THROUGH_RATES[category] ?? 0.7;
  const elasticity = PRICE_ELASTICITY_OF_DEMAND[category] ?? -0.8;
  const baseline = RETAIL_PRICE_BASELINE[category] ?? { avgUnitPrice: 100, markupFactor: 2.0 };
  const grossMargin = GROSS_MARGIN_RATES[category] ?? 0.3;

  // Step 1: Effective cost delta from tariff + rerouting
  let tariffDelta = 0;
  if (tariffSim && simulatedGraph && originalGraph) {
    const simNodes = simulatedGraph.nodes.filter(
      (n) => n.entity_type !== 'anchor_company' && tariffSim.countries.includes(n.country_iso3),
    );
    const origNodes = originalGraph.nodes.filter(
      (n) => n.entity_type !== 'anchor_company' && tariffSim.countries.includes(n.country_iso3),
    );
    const avgSimTariff = simNodes.length
      ? simNodes.reduce((s, n) => s + (n.tariff_rate_by_category?.[category] || 0), 0) / simNodes.length
      : 0;
    const avgOrigTariff = origNodes.length
      ? origNodes.reduce((s, n) => s + (n.tariff_rate_by_category?.[category] || 0), 0) / origNodes.length
      : 0;
    tariffDelta = avgSimTariff - avgOrigTariff;
  }

  const bestCostDelta = recommendations?.length > 0 ? (recommendations[0].costDeltaPct ?? 0) : 0;
  let rerouteDelta = Math.max(0, bestCostDelta);

  const effectiveCostDelta = tariffDelta + rerouteDelta;
  const hasNegativeImpact = effectiveCostDelta > 0;

  // Step 2: Retail price increase
  const retailPriceIncreasePct = hasNegativeImpact
    ? (effectiveCostDelta / baseline.markupFactor) * passThrough
    : 0;
  const retailPrice = baseline.avgUnitPrice * baseline.markupFactor;
  const retailPriceIncrease = retailPriceIncreasePct * retailPrice;

  // Step 3: Demand drop
  const demandDropPct = elasticity * retailPriceIncreasePct;

  // Step 4: Revenue at risk
  let affectedVolume = 0;
  if (disruptedNode) {
    affectedVolume = disruptedNode.baseline_volume_by_category?.[category] || 0;
  } else if (tariffSim && simulatedGraph) {
    affectedVolume = simulatedGraph.nodes
      .filter((n) => n.entity_type !== 'anchor_company' && tariffSim.countries.includes(n.country_iso3))
      .reduce((s, n) => s + (n.baseline_volume_by_category?.[category] || 0), 0);
  }
  const revenueAtRisk = affectedVolume * Math.abs(demandDropPct) * grossMargin;

  // Step 5: Margin preserved / cost savings
  let marginPreservedPct = 0;
  let costSavingsPct = 0;
  if (recommendations?.length > 0) {
    if (hasNegativeImpact) {
      const avoided = effectiveCostDelta - bestCostDelta;
      marginPreservedPct = Math.min(1, Math.max(0, avoided / effectiveCostDelta));
    } else {
      // Rerouting is cheaper — compute savings
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
  };
}
