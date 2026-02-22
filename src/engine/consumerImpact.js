import {
  TARIFF_PASS_THROUGH_RATES,
  PRICE_ELASTICITY_OF_DEMAND,
  RETAIL_PRICE_BASELINE,
  GROSS_MARGIN_RATES,
  SANCTION_PRICE_SHOCK_FACTOR,
  EXPORT_CONTROL_COST_PREMIUM,
  CURRENCY_PASS_THROUGH_RATES,
  getNodeVolume,
  getNodeTotalVolume,
} from '../utils/constants';

/**
 * Compute downstream consumer impact of supply chain disruptions.
 * Returns null when there is no meaningful cost impact.
 */
export function computeConsumerImpact(disruptedNode, category, simulatedGraph, originalGraph, macroEvent, recommendations, selectedRec = null) {
  if (!category || (!disruptedNode && !macroEvent)) return null;

  const customFinancials = originalGraph?.metadata?.financials;

  const passThrough = customFinancials?.passThrough ?? TARIFF_PASS_THROUGH_RATES[category] ?? 0.7;
  const elasticity = customFinancials?.elasticity ?? PRICE_ELASTICITY_OF_DEMAND[category] ?? -0.8;
  const baseline = {
    avgUnitPrice: customFinancials?.avgUnitPrice ?? RETAIL_PRICE_BASELINE[category]?.avgUnitPrice ?? 100,
    markupFactor: customFinancials?.markupFactor ?? RETAIL_PRICE_BASELINE[category]?.markupFactor ?? 2.0
  };
  const grossMargin = customFinancials?.grossMargin ?? GROSS_MARGIN_RATES[category] ?? 0.3;

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

    // Supplier outage: cost delta from rerouting
    if (recommendations?.length > 0) {
      if (selectedRec) {
        // Use the specific selected recommendation's cost delta
        eventEffectiveCostDelta = selectedRec.costDeltaPct ?? 0;
      } else {
        // Weighted-avg reroute cost across all allocated alternatives
        const totalAlloc = recommendations.reduce((s, r) => s + (r.allocatedVolume || 0), 0);
        if (totalAlloc > 0) {
          eventEffectiveCostDelta = recommendations.reduce(
            (s, r) => s + (r.costDeltaPct ?? 0) * (r.allocatedVolume || 0), 0
          ) / totalAlloc;
        } else {
          eventEffectiveCostDelta = recommendations[0].costDeltaPct ?? 0;
        }
      }
      // Outage always has a cost impact — even "cheaper" reroutes carry disruption risk premium
      eventEffectiveCostDelta = Math.max(eventEffectiveCostDelta, 0.02);
    } else {
      // If there are no viable alternatives, the production halts. 
      // Apply a severe cost penalty to reflect unmitigated disruption
      eventEffectiveCostDelta = 0.50; // 50% implicit cost jump representing extreme risk / lost revenue
    }
  }

  // Reset rerouteDelta to 0 when no recommendation is selected
  let rerouteDelta = 0;

  // Determine best cost delta from recommendations
  const chosenRec = selectedRec || recommendations?.[0];
  const bestCostDelta = chosenRec ? (chosenRec.costDeltaPct ?? 0) : 0;

  // For macro events: incorporate selected recommendation's cost impact
  if (macroEvent && selectedRec && recommendations?.length > 0) {
    rerouteDelta = Math.max(0, selectedRec.costDeltaPct ?? 0);
  } else if (disruptedNode && !macroEvent) {
    // For single supplier disruption: use the selected recommendation's cost delta
    // If no recommendation is selected, use 0
    rerouteDelta = Math.max(0, bestCostDelta);
  }

  const effectiveCostDelta = eventEffectiveCostDelta + rerouteDelta;
  const hasNegativeImpact = effectiveCostDelta > 0;

  const retailPriceIncreasePct = hasNegativeImpact
    ? (effectiveCostDelta / baseline.markupFactor) * passThrough
    : 0;
  const retailPrice = baseline.avgUnitPrice * baseline.markupFactor;
  const retailPriceIncrease = retailPriceIncreasePct * retailPrice;

  const demandDropPct = elasticity * retailPriceIncreasePct;

  let revenueAtRisk = affectedVolume * Math.abs(demandDropPct) * grossMargin;

  // Scale affected abstract volume units to true dollar revenue if financial baselines are provided
  if (customFinancials?.annualRevenue && customFinancials?.totalUnitsShipped) {
    const revenuePerUnit = customFinancials.annualRevenue / customFinancials.totalUnitsShipped;
    revenueAtRisk = (affectedVolume * revenuePerUnit) * Math.abs(demandDropPct) * grossMargin;
  } else if (customFinancials?.annualRevenue) {
    // If only annual revenue is known, assume volume abstract numbers represent a percentage (out of 100 for instance)
    // Wait, the safest bet if only revenue is known is to treat affectedVolume as a fraction, but we don't know the denominator reliably here.
    // Instead we will rely on the unit scaling or standard fallback.
  }

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
