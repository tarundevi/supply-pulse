import {
  TARIFF_PASS_THROUGH_RATES,
  PRICE_ELASTICITY_OF_DEMAND,
  RETAIL_PRICE_BASELINE,
  GROSS_MARGIN_RATES,
  SANCTION_PRICE_SHOCK_FACTOR,
  EXPORT_CONTROL_COST_PREMIUM,
  CURRENCY_PASS_THROUGH_RATES,
  SELECTION_IMPACT_FACTORS,
  normalizeEconomicCategory,
  getNodeVolume,
  getNodeTotalVolume,
} from '../utils/constants';

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function toFiniteNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function inCategory(node, category) {
  return node?.supplier_category === category || (node?.categories || []).includes(category);
}

function getSelectionImpactFactors(normalizedCategory) {
  return {
    ...(SELECTION_IMPACT_FACTORS.default || {}),
    ...(SELECTION_IMPACT_FACTORS[normalizedCategory] || {}),
  };
}

function computeCompositeSelectionDelta(baseShockCostDelta, recommendation, factors) {
  const selectedCoveragePct = clamp01(
    toFiniteNumber(recommendation?.coveragePct ?? recommendation?.potentialCoveragePct, 0)
  );
  const coverageGap = 1 - selectedCoveragePct;
  const leadDays = Math.max(toFiniteNumber(recommendation?.leadTimeDeltaDays, 0), 0);
  const riskDelta = Math.max(toFiniteNumber(recommendation?.riskDelta, 0), 0);

  const coverageGapPenalty = coverageGap * toFiniteNumber(factors.coverageGapMax, 0);
  const leadTimePenalty = leadDays * toFiniteNumber(factors.leadPerDay, 0);
  const riskPenalty = riskDelta * toFiniteNumber(factors.riskPerPoint, 0);
  const selectedOperationalPenalty = coverageGapPenalty + leadTimePenalty + riskPenalty;

  const selectedCostComponent = Math.max(toFiniteNumber(recommendation?.costDeltaPct, 0), 0);
  const residualShockComponent =
    Math.max(toFiniteNumber(baseShockCostDelta, 0), 0) * toFiniteNumber(factors.unavoidableShockShare, 0);

  const effectiveCostDelta =
    residualShockComponent + selectedCostComponent + selectedOperationalPenalty;

  return {
    selectedCoveragePct,
    coverageGapPenalty,
    leadTimePenalty,
    riskPenalty,
    selectedOperationalPenalty,
    selectedCostComponent,
    residualShockComponent,
    effectiveCostDelta,
  };
}

function applyMacroRecommendationDelta(baseShockCostDelta, recommendationCostDelta) {
  if (!Number.isFinite(recommendationCostDelta)) return Math.max(baseShockCostDelta, 0);
  return Math.max(baseShockCostDelta + recommendationCostDelta, 0);
}

function getCategoryRevenueForNode(node, category, normalizedCategory) {
  const revenueMap = node?.baseline_revenue_by_category;
  if (!revenueMap) return null;

  const categoryValue = Number(revenueMap[category]);
  if (Number.isFinite(categoryValue)) return categoryValue;

  const normalizedValue = Number(revenueMap[normalizedCategory]);
  if (Number.isFinite(normalizedValue)) return normalizedValue;

  return null;
}

function summarizeCategoryRevenue(nodes, category, normalizedCategory) {
  let total = 0;
  let hasData = false;
  for (const node of nodes || []) {
    const value = getCategoryRevenueForNode(node, category, normalizedCategory);
    if (value !== null) {
      total += value;
      hasData = true;
    }
  }
  return { total, hasData };
}

function weightedRecommendationCostDelta(recommendations) {
  if (!recommendations?.length) return 0;

  const totalAllocated = recommendations.reduce(
    (sum, recommendation) => sum + (recommendation.allocatedVolume || 0),
    0
  );

  if (totalAllocated > 0) {
    return recommendations.reduce(
      (sum, recommendation) =>
        sum + (recommendation.costDeltaPct ?? 0) * (recommendation.allocatedVolume || 0),
      0
    ) / totalAllocated;
  }

  return recommendations[0].costDeltaPct ?? 0;
}

/**
 * Compute downstream consumer impact of supply chain disruptions.
 * Returns null only when required scenario context is missing.
 */
export function computeConsumerImpact(disruptedNode, category, simulatedGraph, originalGraph, macroEvent, recommendations, selectedRec = null) {
  if (!category || (!disruptedNode && !macroEvent)) return null;

  const normalizedCategory = normalizeEconomicCategory(category);
  const passThrough = TARIFF_PASS_THROUGH_RATES[normalizedCategory] ?? 0.7;
  const elasticity = PRICE_ELASTICITY_OF_DEMAND[normalizedCategory] ?? -0.8;
  const baseline = RETAIL_PRICE_BASELINE[normalizedCategory] ?? { avgUnitPrice: 100, markupFactor: 2.0 };
  const grossMargin = GROSS_MARGIN_RATES[normalizedCategory] ?? 0.3;
  const selectionFactors = getSelectionImpactFactors(normalizedCategory);

  const getNodeCategoryVolume = (node) => {
    const directVolume = getNodeVolume(node, category);
    if (directVolume > 0) return directVolume;
    if (normalizedCategory !== category) return getNodeVolume(node, normalizedCategory);
    return directVolume;
  };

  let baseShockCostDelta = 0;
  let affectedVolume = 0;
  let affectedRevenue = 0;
  let hasRevenueData = false;
  let eventDescription = '';

  if (macroEvent && simulatedGraph && originalGraph) {
    switch (macroEvent.eventType) {
      case 'tariff': {
        const simNodes = simulatedGraph.nodes.filter(
          (node) => node.entity_type !== 'anchor_company' && macroEvent.countries.includes(node.country_iso3),
        );
        const origNodes = originalGraph.nodes.filter(
          (node) => node.entity_type !== 'anchor_company' && macroEvent.countries.includes(node.country_iso3),
        );

        const avgSimTariff = simNodes.length
          ? simNodes.reduce(
            (sum, node) => sum + (node.tariff_rate_by_category?.[category] ?? node.tariff_rate_by_category?.[normalizedCategory] ?? 0),
            0
          ) / simNodes.length
          : 0;
        const avgOrigTariff = origNodes.length
          ? origNodes.reduce(
            (sum, node) => sum + (node.tariff_rate_by_category?.[category] ?? node.tariff_rate_by_category?.[normalizedCategory] ?? 0),
            0
          ) / origNodes.length
          : 0;

        baseShockCostDelta = avgSimTariff - avgOrigTariff;
        affectedVolume = simNodes.reduce((sum, node) => sum + getNodeCategoryVolume(node), 0);
        const revenueSummary = summarizeCategoryRevenue(simNodes, category, normalizedCategory);
        affectedRevenue = revenueSummary.total;
        hasRevenueData = revenueSummary.hasData;
        eventDescription = 'Tariff Impact';
        break;
      }

      case 'sanction': {
        const simNodes = simulatedGraph.nodes.filter(
          (node) => node.entity_type !== 'anchor_company' && macroEvent.countries.includes(node.country_iso3),
        );
        const origNodes = originalGraph.nodes.filter(
          (node) => node.entity_type !== 'anchor_company' && macroEvent.countries.includes(node.country_iso3),
        );

        const simVolume = simNodes.reduce((sum, node) => sum + getNodeCategoryVolume(node), 0);
        const origVolume = origNodes.reduce((sum, node) => sum + getNodeCategoryVolume(node), 0);
        const affectedVolumeShare = origVolume > 0 ? (origVolume - simVolume) / origVolume : 0;

        baseShockCostDelta = SANCTION_PRICE_SHOCK_FACTOR * affectedVolumeShare;
        affectedVolume = simVolume;
        const revenueSummary = summarizeCategoryRevenue(simNodes, category, normalizedCategory);
        affectedRevenue = revenueSummary.total;
        hasRevenueData = revenueSummary.hasData;
        eventDescription = 'Supply Blocked';
        break;
      }

      case 'currency': {
        const simNodes = simulatedGraph.nodes.filter(
          (node) => node.entity_type !== 'anchor_company' && macroEvent.countries.includes(node.country_iso3),
        );
        const origNodes = originalGraph.nodes.filter(
          (node) => node.entity_type !== 'anchor_company' && macroEvent.countries.includes(node.country_iso3),
        );

        const fxPassThroughRate = CURRENCY_PASS_THROUGH_RATES[normalizedCategory] || 0.6;
        const avgSimCost = simNodes.length
          ? simNodes.reduce((sum, node) => sum + (node.unit_cost_index || 1), 0) / simNodes.length
          : 1;
        const avgOrigCost = origNodes.length
          ? origNodes.reduce((sum, node) => sum + (node.unit_cost_index || 1), 0) / origNodes.length
          : 1;

        const costDeltaPct = avgOrigCost > 0 ? (avgSimCost - avgOrigCost) / avgOrigCost : 0;
        baseShockCostDelta = costDeltaPct * fxPassThroughRate;
        affectedVolume = simNodes.reduce((sum, node) => sum + getNodeCategoryVolume(node), 0);
        const revenueSummary = summarizeCategoryRevenue(simNodes, category, normalizedCategory);
        affectedRevenue = revenueSummary.total;
        hasRevenueData = revenueSummary.hasData;
        eventDescription = 'FX Impact';
        break;
      }

      case 'export_control': {
        const simNodes = simulatedGraph.nodes.filter(
          (node) =>
            node.entity_type !== 'anchor_company' &&
            macroEvent.countries.includes(node.country_iso3) &&
            (inCategory(node, category) || inCategory(node, normalizedCategory)),
        );
        const origNodes = originalGraph.nodes.filter(
          (node) =>
            node.entity_type !== 'anchor_company' &&
            macroEvent.countries.includes(node.country_iso3) &&
            (inCategory(node, category) || inCategory(node, normalizedCategory)),
        );

        const simCapacity = simNodes.reduce((sum, node) => sum + (node.capacity_index || 1), 0);
        const origCapacity = origNodes.reduce((sum, node) => sum + (node.capacity_index || 1), 0);
        const capacityLoss = origCapacity > 0 ? (origCapacity - simCapacity) / origCapacity : 0;

        const costPremium = EXPORT_CONTROL_COST_PREMIUM[normalizedCategory] || 0.2;
        baseShockCostDelta = capacityLoss * costPremium;
        affectedVolume = simNodes.reduce((sum, node) => sum + getNodeCategoryVolume(node), 0);
        const revenueSummary = summarizeCategoryRevenue(simNodes, category, normalizedCategory);
        affectedRevenue = revenueSummary.total;
        hasRevenueData = revenueSummary.hasData;
        eventDescription = 'Export Restriction';
        break;
      }

      default:
        baseShockCostDelta = 0;
        affectedVolume = 0;
        eventDescription = 'Unknown Event';
    }
  } else if (disruptedNode) {
    eventDescription = 'Supplier Disruption';
    affectedVolume = getNodeTotalVolume(disruptedNode);

    const disruptedRevenue = getCategoryRevenueForNode(disruptedNode, category, normalizedCategory);
    if (disruptedRevenue !== null) {
      affectedRevenue = disruptedRevenue;
      hasRevenueData = true;
    }

    // Outage baseline before mitigation: weighted reroute pressure with a floor.
    if (recommendations?.length > 0) {
      baseShockCostDelta = Math.max(weightedRecommendationCostDelta(recommendations), 0.02);
    } else {
      baseShockCostDelta = 0.02;
    }
  }

  const scenarioType = disruptedNode && macroEvent
    ? 'combined'
    : macroEvent
      ? 'macro'
      : 'outage';
  const usesCompositeSelection = scenarioType === 'outage' || scenarioType === 'combined';

  let selectionMode = 'baseline';
  let selectedCoveragePct = 0;
  let coverageGapPenalty = 0;
  let leadTimePenalty = 0;
  let riskPenalty = 0;
  let selectedOperationalPenalty = 0;
  let selectedCostComponent = 0;
  let residualShockComponent = Math.max(baseShockCostDelta, 0);

  let effectiveCostDelta = Math.max(baseShockCostDelta, 0);
  if (selectedRec) {
    selectionMode = 'selected';
    if (usesCompositeSelection) {
      const selectedComposite = computeCompositeSelectionDelta(
        baseShockCostDelta,
        selectedRec,
        selectionFactors
      );
      selectedCoveragePct = selectedComposite.selectedCoveragePct;
      coverageGapPenalty = selectedComposite.coverageGapPenalty;
      leadTimePenalty = selectedComposite.leadTimePenalty;
      riskPenalty = selectedComposite.riskPenalty;
      selectedOperationalPenalty = selectedComposite.selectedOperationalPenalty;
      selectedCostComponent = selectedComposite.selectedCostComponent;
      residualShockComponent = selectedComposite.residualShockComponent;
      effectiveCostDelta = selectedComposite.effectiveCostDelta;
    } else {
      const selectedCostDelta = toFiniteNumber(selectedRec.costDeltaPct, 0);
      selectedCostComponent = selectedCostDelta;
      residualShockComponent = Math.max(baseShockCostDelta, 0);
      effectiveCostDelta = applyMacroRecommendationDelta(baseShockCostDelta, selectedCostDelta);
    }
  }
  effectiveCostDelta = Math.max(toFiniteNumber(effectiveCostDelta, 0), 0);
  const hasNegativeImpact = effectiveCostDelta > 0;

  // Potential mitigation for margin-preserved uses selected recommendation when
  // present, otherwise top recommendation.
  const referenceRec = selectedRec || recommendations?.[0] || null;
  const referenceCostDelta = referenceRec ? toFiniteNumber(referenceRec.costDeltaPct, 0) : null;
  let mitigatedCostDelta = Math.max(baseShockCostDelta, 0);
  if (referenceRec) {
    if (usesCompositeSelection) {
      mitigatedCostDelta = computeCompositeSelectionDelta(
        baseShockCostDelta,
        referenceRec,
        selectionFactors
      ).effectiveCostDelta;
    } else {
      mitigatedCostDelta = applyMacroRecommendationDelta(baseShockCostDelta, referenceCostDelta);
    }
  }
  mitigatedCostDelta = Math.max(toFiniteNumber(mitigatedCostDelta, 0), 0);
  const chosenMitigationDelta = mitigatedCostDelta - baseShockCostDelta;

  const retailPrice = baseline.avgUnitPrice * baseline.markupFactor;
  const retailPriceIncreasePct = hasNegativeImpact
    ? (effectiveCostDelta / baseline.markupFactor) * passThrough
    : 0;
  const retailPriceIncrease = retailPriceIncreasePct * retailPrice;
  const demandDropPct = elasticity * retailPriceIncreasePct;

  if (!hasRevenueData) {
    affectedRevenue = affectedVolume * retailPrice;
  }
  const revenueAtRisk = affectedRevenue * Math.abs(demandDropPct) * grossMargin;

  let marginPreservedPct = 0;
  if (baseShockCostDelta > 0) {
    marginPreservedPct = clamp01((baseShockCostDelta - mitigatedCostDelta) / baseShockCostDelta);
  } else if (recommendations?.length > 0) {
    marginPreservedPct = 1;
  }

  let costSavingsPct = 0;
  if (referenceCostDelta !== null && referenceCostDelta < 0) {
    costSavingsPct = Math.abs(referenceCostDelta);
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
      normalizedCategory,
      scenarioType,
      selectionMode,
      passThrough,
      elasticity,
      markupFactor: baseline.markupFactor,
      avgUnitPrice: baseline.avgUnitPrice,
      grossMargin,
      effectiveCostDelta,
      baseShockCostDelta,
      chosenMitigationDelta,
      mitigatedCostDelta,
      selectedCoveragePct,
      coverageGapPenalty,
      leadTimePenalty,
      riskPenalty,
      selectedOperationalPenalty,
      selectedCostComponent,
      residualShockComponent,
      affectedVolume,
      affectedRevenue,
      bestCostDelta: referenceCostDelta ?? 0,
    },
  };
}
