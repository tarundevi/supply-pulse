import { RISK_THRESHOLDS } from '../utils/constants';

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
  return node.baseline_volume_by_category?.[category] || 0;
}

function candidateNodes(graph, category, excludeIds = []) {
  return (graph.nodes || []).filter(
    (n) =>
      !excludeIds.includes(n.id) &&
      n.entity_type !== 'anchor_company' &&
      (n.categories || []).includes(category)
  );
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

    return {
      ...node,
      score,
      riskLabel: riskLabel(node.risk_event_count || 0),
      costDeltaPct,
      leadTimeDeltaDays,
      riskDelta,
      potentialCoverageVolume: categoryVolume(node, category) * (node.capacity_index || 0),
    };
  });
}

function allocateCoverage(scored, requiredVolume) {
  let remaining = requiredVolume;
  return scored.map((rec) => {
    const alloc = Math.min(Math.max(remaining, 0), rec.potentialCoverageVolume);
    remaining -= alloc;
    return {
      ...rec,
      allocatedVolume: alloc,
      coveragePct: requiredVolume > 0 ? alloc / requiredVolume : 0,
      potentialCoveragePct: requiredVolume > 0 ? rec.potentialCoverageVolume / requiredVolume : 0,
    };
  });
}

export function rerouteSupplierOutage(disruptedNodeId, category, graph, weights) {
  const disruptedNode = graph.nodes.find((n) => n.id === disruptedNodeId);
  if (!disruptedNode) return [];

  const disruptedVolume = categoryVolume(disruptedNode, category);
  if (disruptedVolume <= 0) return [];

  const candidates = candidateNodes(graph, category, [disruptedNodeId]);
  const scored = buildScoredCandidates(
    candidates,
    category,
    weights,
    effectiveCost(disruptedNode, category),
    disruptedNode.lead_time_days,
    disruptedNode.risk_score
  )
    .sort((a, b) => a.score - b.score)
    .slice(0, 7);

  return allocateCoverage(scored, disruptedVolume).slice(0, 5);
}

export function rerouteTariffShock(tariffSim, category, graph, weights) {
  if (!tariffSim || !tariffSim.countries || tariffSim.countries.length === 0) return [];

  const affected = graph.nodes.filter(
    (n) =>
      n.entity_type !== 'anchor_company' &&
      tariffSim.countries.includes(n.country_iso3) &&
      (n.categories || []).includes(category)
  );

  const affectedVolume = affected.reduce((sum, n) => sum + categoryVolume(n, category), 0);
  if (affectedVolume <= 0) return [];

  const avgAffectedCost =
    affected.reduce((sum, n) => sum + effectiveCost(n, category), 0) / Math.max(affected.length, 1);
  const avgAffectedLead =
    affected.reduce((sum, n) => sum + (n.lead_time_days || 0), 0) / Math.max(affected.length, 1);
  const avgAffectedRisk =
    affected.reduce((sum, n) => sum + (n.risk_score || 0), 0) / Math.max(affected.length, 1);

  const affectedIds = affected.map((n) => n.id);
  const candidates = candidateNodes(graph, category, affectedIds);
  const scored = buildScoredCandidates(
    candidates,
    category,
    weights,
    avgAffectedCost,
    avgAffectedLead,
    avgAffectedRisk
  )
    .map((r) => ({
      ...r,
      costSavingsPct: -r.costDeltaPct,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 7);

  return allocateCoverage(scored, affectedVolume).slice(0, 5);
}

export function simulateCombinedScenario(disruptedNodeId, tariffSim, category, graph, weights) {
  const tariffAdjusted = {
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (!tariffSim?.countries?.includes(n.country_iso3)) return n;
      const nextTariffs = { ...(n.tariff_rate_by_category || {}) };
      const cats = tariffSim.categories?.length ? tariffSim.categories : [category];
      for (const cat of cats) {
        const cur = nextTariffs[cat] || 0;
        nextTariffs[cat] = tariffSim.isIncrement ? cur + tariffSim.tariffRate : tariffSim.tariffRate;
      }
      return { ...n, tariff_rate_by_category: nextTariffs };
    }),
  };

  return rerouteSupplierOutage(disruptedNodeId, category, tariffAdjusted, weights);
}
