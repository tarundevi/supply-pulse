import { RISK_THRESHOLDS, getNodeVolume, getNodeTotalVolume } from '../utils/constants';

const DISCOVERY_CONFIDENCE_THRESHOLD = 0.7;
const MAX_SCORED_CANDIDATES = 7;
const MAX_RECOMMENDATIONS = 5;

function norm(value, min, max) {
  if (max <= min) return 0;
  return (value - min) / (max - min);
}

function riskLabel(eventCount) {
  if (eventCount > RISK_THRESHOLDS.medium) return 'HIGH';
  if (eventCount > RISK_THRESHOLDS.low) return 'MEDIUM';
  return 'LOW';
}

function effectiveCost(node, category) {
  const tariff = node.tariff_rate_by_category?.[category] || 0;
  return (node.unit_cost_index || 1) * (1 + tariff);
}

function categoryVolume(node, category) {
  return getNodeVolume(node, category);
}

function discoveredCategoryVolume(node, category) {
  return node.max_volume_by_category?.[category] || 0;
}

function hasCategory(node, category) {
  if (!category) return true;
  return (node.categories || []).includes(category) || node.supplier_category === category;
}

function isDiscoveredNode(node) {
  return node?.is_discovered === true || node?.network_status === 'out_of_network';
}

function candidateBaseVolume(node, category) {
  if (isDiscoveredNode(node)) return discoveredCategoryVolume(node, category);
  return categoryVolume(node, category);
}

function candidatePools(graph, category, excludeIds = [], blockedCountries = []) {
  const blocked = new Set(blockedCountries || []);
  const known = [];
  const discovered = [];

  for (const node of graph.nodes || []) {
    if (excludeIds.includes(node.id)) continue;
    if (node.entity_type === 'anchor_company') continue;
    if (!hasCategory(node, category)) continue;

    const baseVolume = candidateBaseVolume(node, category);
    if (baseVolume <= 0) continue;

    if (isDiscoveredNode(node)) {
      if ((node.confidence || 0) < DISCOVERY_CONFIDENCE_THRESHOLD) continue;
      if (blocked.has(node.country_iso3)) continue;
      discovered.push(node);
      continue;
    }

    known.push(node);
  }

  return { known, discovered };
}

function buildScoredCandidates(candidates, category, weights, baselineCost, baselineLead, baselineRisk) {
  if (candidates.length === 0) return [];

  const costVals = candidates.map((c) => effectiveCost(c, category));
  const leadVals = candidates.map((c) => c.lead_time_days || 0);
  const riskVals = candidates.map((c) => c.risk_score || 0);

  const minCost = Math.min(...costVals);
  const maxCost = Math.max(...costVals);
  const minLead = Math.min(...leadVals);
  const maxLead = Math.max(...leadVals);
  const minRisk = Math.min(...riskVals);
  const maxRisk = Math.max(...riskVals);

  return candidates.map((node) => {
    const nCost = norm(effectiveCost(node, category), minCost, maxCost);
    const nLead = norm(node.lead_time_days || 0, minLead, maxLead);
    const nRisk = norm(node.risk_score || 0, minRisk, maxRisk);
    const concentrationPenalty = (node.concentration_share || 0) * 0.2;

    const score =
      nCost * weights.cost +
      nLead * weights.speed +
      nRisk * weights.risk +
      concentrationPenalty;

    const costDeltaPct = baselineCost > 0 ? effectiveCost(node, category) / baselineCost - 1 : 0;
    const leadTimeDeltaDays = (node.lead_time_days || 0) - (baselineLead || 0);
    const riskDelta = (node.risk_score || 0) - (baselineRisk || 0);
    const discovered = isDiscoveredNode(node);

    return {
      ...node,
      score,
      riskLabel: riskLabel(node.risk_event_count || 0),
      costDeltaPct,
      leadTimeDeltaDays,
      riskDelta,
      potentialCoverageVolume: candidateBaseVolume(node, category) * (node.capacity_index || 0),
      isDiscovered: discovered,
      networkStatus: node.network_status || (discovered ? 'out_of_network' : 'in_network'),
      qualificationReason: discovered ? 'gap_fill_external' : 'in_network',
    };
  });
}

function allocateCoverage(scored, allocationVolume, totalRequiredVolume = allocationVolume) {
  let remaining = allocationVolume;
  return scored.map((rec) => {
    const alloc = Math.min(Math.max(remaining, 0), rec.potentialCoverageVolume);
    remaining -= alloc;
    return {
      ...rec,
      allocatedVolume: alloc,
      coveragePct: totalRequiredVolume > 0 ? alloc / totalRequiredVolume : 0,
      potentialCoveragePct: totalRequiredVolume > 0 ? rec.potentialCoverageVolume / totalRequiredVolume : 0,
    };
  });
}

function buildScenarioRecommendations({
  graph,
  category,
  excludeIds,
  blockedCountries,
  requiredVolume,
  weights,
  baselineCost,
  baselineLead,
  baselineRisk,
  transform,
}) {
  if (requiredVolume <= 0) return [];
  const applyTransform = typeof transform === 'function' ? transform : (record) => record;

  const { known, discovered } = candidatePools(graph, category, excludeIds, blockedCountries);

  const knownScored = buildScoredCandidates(
    known,
    category,
    weights,
    baselineCost,
    baselineLead,
    baselineRisk
  )
    .map((record) => applyTransform({ ...record, qualificationReason: 'in_network' }))
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_SCORED_CANDIDATES);

  const knownAllocated = allocateCoverage(knownScored, requiredVolume, requiredVolume)
    .filter((record) => record.allocatedVolume > 0);

  const coveredByKnown = knownAllocated.reduce((sum, record) => sum + record.allocatedVolume, 0);
  const remainingVolume = Math.max(requiredVolume - coveredByKnown, 0);

  let discoveredAllocated = [];
  if (discovered.length > 0) {
    const discoveredScored = buildScoredCandidates(
      discovered,
      category,
      weights,
      baselineCost,
      baselineLead,
      baselineRisk
    )
      .map((record) => applyTransform({ ...record, qualificationReason: 'gap_fill_external' }))
      .sort((a, b) => a.score - b.score)
      .slice(0, MAX_SCORED_CANDIDATES);

    // If there's remaining volume, allocate it to discovered suppliers
    // Otherwise, show them with proportional/indicative allocation so they appear in the UI
    const discoveredVolume = remainingVolume > 0
      ? remainingVolume
      : requiredVolume;

    discoveredAllocated = allocateCoverage(discoveredScored, discoveredVolume, requiredVolume)
      .filter((record) => record.allocatedVolume > 0);
  }

  return [...knownAllocated, ...discoveredAllocated].slice(0, MAX_RECOMMENDATIONS);
}

export function rerouteSupplierOutage(disruptedNodeId, category, graph, weights, options = {}) {
  const disruptedNode = graph.nodes.find((n) => n.id === disruptedNodeId);
  if (!disruptedNode) return [];

  const disruptedVolume = getNodeTotalVolume(disruptedNode);
  if (disruptedVolume <= 0) return [];

  return buildScenarioRecommendations({
    graph,
    category,
    excludeIds: [disruptedNodeId],
    blockedCountries: options.blockedCountries || [],
    requiredVolume: disruptedVolume,
    weights,
    baselineCost: effectiveCost(disruptedNode, category),
    baselineLead: disruptedNode.lead_time_days,
    baselineRisk: disruptedNode.risk_score,
  });
}

export function rerouteTariffShock(macroEvent, category, graph, weights) {
  if (!macroEvent || !macroEvent.countries || macroEvent.countries.length === 0) return [];

  const affected = graph.nodes.filter(
    (n) =>
      n.entity_type !== 'anchor_company' &&
      !isDiscoveredNode(n) &&
      macroEvent.countries.includes(n.country_iso3) &&
      hasCategory(n, category)
  );

  const affectedVolume = affected.reduce((sum, n) => sum + categoryVolume(n, category), 0);
  if (affectedVolume <= 0) return [];

  const avgAffectedCost =
    affected.reduce((sum, n) => sum + effectiveCost(n, category), 0) / Math.max(affected.length, 1);
  const avgAffectedLead =
    affected.reduce((sum, n) => sum + (n.lead_time_days || 0), 0) / Math.max(affected.length, 1);
  const avgAffectedRisk =
    affected.reduce((sum, n) => sum + (n.risk_score || 0), 0) / Math.max(affected.length, 1);

  return buildScenarioRecommendations({
    graph,
    category,
    excludeIds: affected.map((n) => n.id),
    blockedCountries: macroEvent.countries,
    requiredVolume: affectedVolume,
    weights,
    baselineCost: avgAffectedCost,
    baselineLead: avgAffectedLead,
    baselineRisk: avgAffectedRisk,
    transform: (record) => ({
      ...record,
      costSavingsPct: -record.costDeltaPct,
    }),
  });
}

export function rerouteSanctionShock(macroEvent, category, graph, weights) {
  if (!macroEvent || !macroEvent.countries || macroEvent.countries.length === 0) return [];

  const affected = graph.nodes.filter(
    (n) =>
      n.entity_type !== 'anchor_company' &&
      !isDiscoveredNode(n) &&
      macroEvent.countries.includes(n.country_iso3) &&
      hasCategory(n, category) &&
      (n.capacity_index || 1) === 0
  );

  const affectedVolume = affected.reduce((sum, n) => sum + categoryVolume(n, category), 0);
  if (affectedVolume <= 0) return [];

  const avgAffectedLead =
    affected.reduce((sum, n) => sum + (n.lead_time_days || 0), 0) / Math.max(affected.length, 1);
  const avgAffectedRisk =
    affected.reduce((sum, n) => sum + (n.risk_score || 0), 0) / Math.max(affected.length, 1);

  return buildScenarioRecommendations({
    graph,
    category,
    excludeIds: affected.map((n) => n.id),
    blockedCountries: macroEvent.countries,
    requiredVolume: affectedVolume,
    weights,
    baselineCost: 999999,
    baselineLead: avgAffectedLead,
    baselineRisk: avgAffectedRisk,
    transform: (record) => ({
      ...record,
      costSavingsPct: 1,
    }),
  });
}

export function rerouteCurrencyShock(macroEvent, category, graph, weights) {
  if (!macroEvent || !macroEvent.countries || macroEvent.countries.length === 0) return [];

  const affected = graph.nodes.filter(
    (n) =>
      n.entity_type !== 'anchor_company' &&
      !isDiscoveredNode(n) &&
      macroEvent.countries.includes(n.country_iso3) &&
      hasCategory(n, category)
  );

  const affectedVolume = affected.reduce((sum, n) => sum + categoryVolume(n, category), 0);
  if (affectedVolume <= 0) return [];

  const avgAffectedCost =
    affected.reduce((sum, n) => sum + effectiveCost(n, category), 0) / Math.max(affected.length, 1);
  const avgAffectedLead =
    affected.reduce((sum, n) => sum + (n.lead_time_days || 0), 0) / Math.max(affected.length, 1);
  const avgAffectedRisk =
    affected.reduce((sum, n) => sum + (n.risk_score || 0), 0) / Math.max(affected.length, 1);

  return buildScenarioRecommendations({
    graph,
    category,
    excludeIds: affected.map((n) => n.id),
    blockedCountries: macroEvent.countries,
    requiredVolume: affectedVolume,
    weights,
    baselineCost: avgAffectedCost,
    baselineLead: avgAffectedLead,
    baselineRisk: avgAffectedRisk,
    transform: (record) => ({
      ...record,
      costSavingsPct: -record.costDeltaPct,
    }),
  });
}

export function rerouteExportControlShock(macroEvent, category, graph, weights) {
  if (!macroEvent || !macroEvent.countries || macroEvent.countries.length === 0) return [];

  const affected = graph.nodes.filter(
    (n) =>
      n.entity_type !== 'anchor_company' &&
      !isDiscoveredNode(n) &&
      macroEvent.countries.includes(n.country_iso3) &&
      hasCategory(n, category) &&
      (n.capacity_index || 1) < 1
  );

  const affectedVolume = affected.reduce((sum, n) => sum + categoryVolume(n, category), 0);
  if (affectedVolume <= 0) return [];

  const avgAffectedCost =
    affected.reduce((sum, n) => sum + effectiveCost(n, category), 0) / Math.max(affected.length, 1);
  const avgAffectedLead =
    affected.reduce((sum, n) => sum + (n.lead_time_days || 0), 0) / Math.max(affected.length, 1);
  const avgAffectedRisk =
    affected.reduce((sum, n) => sum + (n.risk_score || 0), 0) / Math.max(affected.length, 1);

  return buildScenarioRecommendations({
    graph,
    category,
    excludeIds: affected.map((n) => n.id),
    blockedCountries: macroEvent.countries,
    requiredVolume: affectedVolume,
    weights,
    baselineCost: avgAffectedCost,
    baselineLead: avgAffectedLead,
    baselineRisk: avgAffectedRisk,
    transform: (record) => ({
      ...record,
      costSavingsPct: -record.costDeltaPct,
    }),
  });
}

export function rerouteInterestRateShock(macroEvent, category, graph, weights) {
  return [];
}

export function rerouteMacroEventShock(macroEvent, category, graph, weights) {
  if (!macroEvent || !macroEvent.eventType) return [];

  switch (macroEvent.eventType) {
    case 'tariff':
      return rerouteTariffShock(macroEvent, category, graph, weights);
    case 'sanction':
      return rerouteSanctionShock(macroEvent, category, graph, weights);
    case 'currency':
      return rerouteCurrencyShock(macroEvent, category, graph, weights);
    case 'export_control':
      return rerouteExportControlShock(macroEvent, category, graph, weights);
    case 'interest_rate':
      return rerouteInterestRateShock(macroEvent, category, graph, weights);
    default:
      return [];
  }
}

export function simulateCombinedScenario(disruptedNodeId, macroEvent, category, graph, weights) {
  if (!macroEvent || !macroEvent.eventType) {
    return rerouteSupplierOutage(disruptedNodeId, category, graph, weights);
  }

  let adjustedGraph = graph;

  switch (macroEvent.eventType) {
    case 'tariff': {
      adjustedGraph = {
        ...graph,
        nodes: graph.nodes.map((n) => {
          if (!macroEvent.countries?.includes(n.country_iso3)) return n;
          const nextTariffs = { ...(n.tariff_rate_by_category || {}) };
          const cats = macroEvent.categories?.length ? macroEvent.categories : [category];
          for (const cat of cats) {
            const cur = nextTariffs[cat] || 0;
            nextTariffs[cat] = macroEvent.isIncrement ? cur + macroEvent.tariffRate : macroEvent.tariffRate;
          }
          return { ...n, tariff_rate_by_category: nextTariffs };
        }),
      };
      break;
    }

    case 'sanction': {
      adjustedGraph = {
        ...graph,
        nodes: graph.nodes.map((n) => {
          if (!macroEvent.countries?.includes(n.country_iso3)) return n;
          if (!hasCategory(n, category)) return n;
          return {
            ...n,
            capacity_index: 0,
            tariff_rate_by_category: Object.fromEntries(
              (n.tariff_rate_by_category ? Object.keys(n.tariff_rate_by_category) : [category])
                .map((cat) => [cat, 9.99])
            ),
          };
        }),
      };
      break;
    }

    case 'currency': {
      const categories = macroEvent.categories?.length ? macroEvent.categories : [category];
      adjustedGraph = {
        ...graph,
        nodes: graph.nodes.map((n) => {
          if (!macroEvent.countries?.includes(n.country_iso3)) return n;
          const nodeCategory = n.supplier_category || categories[0];
          const passThrough = 0.6;
          return {
            ...n,
            unit_cost_index: (n.unit_cost_index || 1) * (1 + macroEvent.currencyChangePct * passThrough),
          };
        }),
      };
      break;
    }

    case 'export_control': {
      const categories = macroEvent.categories?.length ? macroEvent.categories : [category];
      const costPremium = 0.2;
      adjustedGraph = {
        ...graph,
        nodes: graph.nodes.map((n) => {
          if (!macroEvent.countries?.includes(n.country_iso3)) return n;
          if (!n.supplier_category || !categories.includes(n.supplier_category)) return n;
          const currentCapacity = n.capacity_index || 1;
          const newCapacity = currentCapacity * (1 - macroEvent.restrictionLevel);
          return {
            ...n,
            capacity_index: newCapacity,
            unit_cost_index: (n.unit_cost_index || 1) * (1 + macroEvent.restrictionLevel * costPremium),
          };
        }),
      };
      break;
    }

    case 'interest_rate': {
      return [];
    }

    default:
      break;
  }

  return rerouteSupplierOutage(disruptedNodeId, category, adjustedGraph, weights, {
    blockedCountries: macroEvent.countries || [],
  });
}
