import { useState, useEffect } from 'react';

function toCompanyLikeFromCountry(legacyGraph) {
  if (!legacyGraph?.nodes) return null;

  const nodes = legacyGraph.nodes.map((n) => ({
    id: n.id,
    name: n.country,
    entity_type: 'facility',
    parent_company_id: n.country,
    lat: n.lat,
    lng: n.lng,
    country_iso3: n.id,
    country: n.country,
    categories: Object.keys(n.export_volumes || {}),
    capacity_index: 0.65,
    lead_time_days: 25,
    unit_cost_index: 1 + (n.distance_cost_factor || 0),
    tariff_rate_by_category: n.tariff_rates || {},
    risk_score: n.gdelt_risk_score || 0,
    risk_event_count: n.gdelt_event_count || 0,
    concentration_share: 0,
    confidence: 0.65,
    sources: { source_type: 'country_free_api' },
    baseline_volume_by_category: n.export_volumes || {},
  }));

  nodes.push({
    id: 'AAPL_HQ',
    name: 'Apple Cupertino',
    entity_type: 'anchor_company',
    parent_company_id: 'Apple Inc.',
    lat: 37.3349,
    lng: -122.009,
    country_iso3: 'USA',
    country: 'USA',
    categories: ['electronics', 'textiles', 'chemicals', 'machinery', 'vehicles'],
    capacity_index: 1,
    lead_time_days: 0,
    unit_cost_index: 1,
    tariff_rate_by_category: {},
    risk_score: 1,
    risk_event_count: 0,
    concentration_share: 0,
    confidence: 0.9,
    sources: { source_type: 'country_free_api' },
    baseline_volume_by_category: {},
  });

  const edges = (legacyGraph.edges || []).map((e) => ({
    source_id: e.source,
    target_id: 'AAPL_HQ',
    category: e.category,
    relationship_type: 'supplies',
    baseline_volume: e.volume,
    baseline_share: 0,
    effective_cost_index: 1,
    lead_time_days: 0,
    targetLat: e.targetLat,
    targetLng: e.targetLng,
    target_market: e.target,
  }));

  return {
    nodes,
    edges,
    metadata: {
      ...(legacyGraph.metadata || {}),
      mode: 'country',
      anchor_company: 'Country Trade Graph',
      build_version: 'country-adapter-v1',
      assumption_notes: 'Mapped country supplier_graph into company-like runtime schema.',
    },
  };
}

export function useSupplierGraph() {
  const [graphs, setGraphs] = useState({ company: null, country: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadGraphs() {
      try {
        const [companyRes, countryRes] = await Promise.all([
          fetch('/data/company_graph.json').catch(() => null),
          fetch('/data/supplier_graph.json').catch(() => null),
        ]);

        let companyGraph = null;
        let countryGraph = null;
        let warning = null;

        if (companyRes && companyRes.ok) {
          companyGraph = await companyRes.json();
        } else {
          warning = 'Company graph missing; run `python pipeline/run_company_pipeline.py` for company mode.';
        }

        if (countryRes && countryRes.ok) {
          const rawCountry = await countryRes.json();
          countryGraph = toCompanyLikeFromCountry(rawCountry);
        }

        if (!companyGraph && !countryGraph) {
          throw new Error('No graph data found. Expected /data/company_graph.json or /data/supplier_graph.json');
        }

        setGraphs({ company: companyGraph, country: countryGraph });
        if (warning) setError(warning);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadGraphs();
  }, []);

  return { graphs, loading, error };
}
