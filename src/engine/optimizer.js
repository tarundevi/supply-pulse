import { RISK_THRESHOLDS } from '../utils/constants';

/**
 * Re-route supply away from a disrupted country.
 * Returns top alternative suppliers ranked by weighted score.
 *
 * @param {string} disruptedCountry - Country ID (e.g. "CHN")
 * @param {string} category - Commodity category key (e.g. "electronics")
 * @param {object} graph - The supplier_graph.json data
 * @param {object} weights - { cost, speed, risk } summing to ~1
 * @returns {Array} Ranked alternative suppliers with scores and coverage
 */
export function rerouteSupply(disruptedCountry, category, graph, weights) {
  const disruptedNode = graph.nodes.find((n) => n.id === disruptedCountry);
  if (!disruptedNode) return [];

  const disruptedVolume = disruptedNode.export_volumes[category] || 0;
  if (disruptedVolume === 0) return [];

  // Find the max volume across all nodes for this category (for capacity normalization)
  const maxVolume = Math.max(
    ...graph.nodes.map((n) => n.export_volumes[category] || 0)
  );

  const available = graph.nodes.filter((n) => n.id !== disruptedCountry);

  const scored = available
    .filter((n) => (n.export_volumes[category] || 0) > 0)
    .map((node) => {
      // Cost score: tariff rate + distance cost factor (lower is better)
      const costScore =
        (node.tariff_rates[category] || 0) + node.distance_cost_factor;

      // Risk score: normalized GDELT risk (0-1 range, lower is better)
      const riskScore = node.gdelt_risk_score / 10;

      // Capacity score: inverse of existing volume — lower means more existing
      // capacity, which is actually better (proxy for supply readiness)
      const capacityScore = 1 - (node.export_volumes[category] || 0) / maxVolume;

      const score =
        costScore * weights.cost +
        riskScore * weights.risk +
        capacityScore * weights.speed;

      const coveragePct = (node.export_volumes[category] || 0) / disruptedVolume;

      // Estimate cost delta vs disrupted source
      const disruptedCost =
        (disruptedNode.tariff_rates[category] || 0) +
        disruptedNode.distance_cost_factor;
      const altCost =
        (node.tariff_rates[category] || 0) + node.distance_cost_factor;
      const costDelta = altCost - disruptedCost;

      // Risk label
      let riskLabel = 'LOW';
      if (node.gdelt_event_count > RISK_THRESHOLDS.medium) riskLabel = 'HIGH';
      else if (node.gdelt_event_count > RISK_THRESHOLDS.low) riskLabel = 'MEDIUM';

      return {
        ...node,
        score,
        coveragePct,
        costDelta,
        riskLabel,
      };
    });

  return scored.sort((a, b) => a.score - b.score).slice(0, 5);
}
