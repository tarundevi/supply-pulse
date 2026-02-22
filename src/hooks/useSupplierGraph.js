import { useState, useEffect, useRef } from 'react';
import { INDUSTRY_COMPANY_MAP } from '../utils/industries';

const DISCOVERY_LIMIT_PER_CATEGORY = 20;
const DISCOVERY_CONFIDENCE_THRESHOLD = 0.7;

const COMPANY_KEYS = Array.from(
  new Set(
    Object.values(INDUSTRY_COMPANY_MAP)
      .flatMap((industry) => industry.companies || [])
      .map((company) => company.key)
      .filter(Boolean)
  )
);

function clampConfidence(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return DISCOVERY_CONFIDENCE_THRESHOLD;
  return Math.max(0, Math.min(1, num));
}

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

function collectGraphCategories(graph) {
  const categories = new Set(Object.keys(graph?.metadata?.category_labels || {}));

  for (const node of graph?.nodes || []) {
    for (const category of node.categories || []) {
      categories.add(category);
    }
    for (const category of Object.keys(node.baseline_volume_by_category || {})) {
      categories.add(category);
    }
  }
  return categories;
}

function toDiscoveryPoolEntries(graph, companyKey) {
  const entries = [];
  for (const node of graph?.nodes || []) {
    if (node.entity_type === 'anchor_company') continue;
    if (node.is_discovered || node.network_status === 'out_of_network') continue;

    const baselineVolume = node.baseline_volume_by_category || {};
    const categories = Array.from(
      new Set([...(node.categories || []), ...Object.keys(baselineVolume)])
    ).filter((category) => Number(baselineVolume[category] || 0) > 0 || (node.categories || []).includes(category));

    if (categories.length === 0) continue;

    entries.push({
      id: node.id,
      name: node.name,
      parent_company_id: node.parent_company_id,
      lat: Number(node.lat || 0),
      lng: Number(node.lng || 0),
      country_iso3: node.country_iso3,
      country: node.country,
      categories,
      maxVolumeByCategory: { ...baselineVolume },
      capacity_index: Number(node.capacity_index || 0.5),
      lead_time_days: Number(node.lead_time_days || 25),
      unit_cost_index: Number(node.unit_cost_index || 1),
      tariff_rate_by_category: { ...(node.tariff_rate_by_category || {}) },
      risk_score: Number(node.risk_score || 0),
      risk_event_count: Number(node.risk_event_count || 0),
      concentration_share: Number(node.concentration_share || 0),
      confidence: clampConfidence(node.confidence),
      sources: { ...(node.sources || {}) },
      originCompanyKey: companyKey,
    });
  }
  return entries;
}

function withDiscoveredNodes(graph, selectedCompany, poolEntries) {
  if (!graph?.nodes?.length) return graph;

  const graphCategories = collectGraphCategories(graph);
  const graphCategoryList = Array.from(graphCategories);
  if (graphCategoryList.length === 0) return graph;

  const existingIds = new Set((graph.nodes || []).map((node) => node.id));
  const categoryCounts = Object.fromEntries(graphCategoryList.map((category) => [category, 0]));
  const discoveredNodes = [];

  const rankedPool = [...poolEntries].sort((a, b) => b.confidence - a.confidence);
  for (const candidate of rankedPool) {
    if (candidate.originCompanyKey === selectedCompany) continue;
    if (candidate.confidence < DISCOVERY_CONFIDENCE_THRESHOLD) continue;

    const eligibleCategories = candidate.categories.filter((category) => {
      if (!graphCategories.has(category)) return false;
      if (categoryCounts[category] >= DISCOVERY_LIMIT_PER_CATEGORY) return false;
      return Number(candidate.maxVolumeByCategory?.[category] || 0) > 0;
    });
    if (eligibleCategories.length === 0) continue;

    const discoveredId = `DISC_${candidate.originCompanyKey}_${candidate.id}`;
    if (existingIds.has(discoveredId)) continue;

    const baselineVolumeByCategory = {};
    const maxVolumeByCategory = {};
    for (const category of graphCategoryList) {
      baselineVolumeByCategory[category] = 0;
      maxVolumeByCategory[category] = eligibleCategories.includes(category)
        ? Number(candidate.maxVolumeByCategory?.[category] || 0)
        : 0;
    }

    discoveredNodes.push({
      id: discoveredId,
      name: candidate.name,
      entity_type: 'facility',
      parent_company_id: candidate.parent_company_id || 'External Supplier',
      lat: candidate.lat,
      lng: candidate.lng,
      country_iso3: candidate.country_iso3 || 'UNK',
      country: candidate.country || candidate.country_iso3 || 'UNK',
      categories: eligibleCategories,
      capacity_index: candidate.capacity_index,
      lead_time_days: candidate.lead_time_days,
      unit_cost_index: candidate.unit_cost_index,
      tariff_rate_by_category: { ...candidate.tariff_rate_by_category },
      risk_score: candidate.risk_score,
      risk_event_count: candidate.risk_event_count,
      concentration_share: candidate.concentration_share,
      confidence: candidate.confidence,
      sources: {
        ...candidate.sources,
        discovery_mode: 'cross_company_catalog',
        discovery_origin_company: candidate.originCompanyKey,
      },
      baseline_volume_by_category: baselineVolumeByCategory,
      max_volume_by_category: maxVolumeByCategory,
      is_discovered: true,
      network_status: 'out_of_network',
      discovery_source: `cross_company:${candidate.originCompanyKey}`,
    });

    existingIds.add(discoveredId);
    for (const category of eligibleCategories) {
      categoryCounts[category] += 1;
    }

    if (graphCategoryList.every((category) => categoryCounts[category] >= DISCOVERY_LIMIT_PER_CATEGORY)) {
      break;
    }
  }

  if (discoveredNodes.length === 0) return graph;

  const discoveredCategories = Array.from(
    new Set(discoveredNodes.flatMap((node) => node.categories || []))
  ).sort();

  return {
    ...graph,
    nodes: [...graph.nodes, ...discoveredNodes],
    metadata: {
      ...(graph.metadata || {}),
      discovery_build_version: 'cross-company-v1',
      discovered_supplier_count: discoveredNodes.length,
      discovered_categories: discoveredCategories,
    },
  };
}

// Save a custom generated graph to local storage.
export function saveCustomGraph(graph) {
  const key = graph?.metadata?.company_key;
  if (!key) {
    console.error('Failed to save custom graph to localStorage: missing metadata.company_key');
    return;
  }

  try {
    localStorage.setItem(`supplyPulse_graph_${key}`, JSON.stringify(graph));
  } catch (e) {
    console.error('Failed to save custom graph to localStorage', e);
  }
}

export function useSupplierGraph(selectedCompany) {
  const [baseGraphs, setBaseGraphs] = useState({ company: null, country: null });
  const [companyChain, setCompanyChain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const chainCache = useRef({});
  const rawChainCache = useRef({});
  const discoveryPoolCache = useRef(null);

  // Load the base graphs once on mount.
  useEffect(() => {
    async function loadBaseGraphs() {
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
          if (warning) setError(warning);
        }

        setBaseGraphs({ company: companyGraph, country: countryGraph });
        if (warning && companyGraph) setError(warning);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBaseGraphs();
  }, []);

  // Dynamically load per-company supply chain when selectedCompany changes.
  useEffect(() => {
    if (!selectedCompany) {
      setCompanyChain(null);
      return;
    }

    if (chainCache.current[selectedCompany]) {
      setCompanyChain(chainCache.current[selectedCompany]);
      return;
    }

    let isActive = true;

    async function fetchChain(companyKey) {
      if (rawChainCache.current[companyKey]) return rawChainCache.current[companyKey];
      const res = await fetch(`/data/supply_chains/${companyKey}.json`);
      if (!res.ok) return null;
      const data = await res.json();
      rawChainCache.current[companyKey] = data;
      return data;
    }

    async function loadDiscoveryPool() {
      if (discoveryPoolCache.current) return discoveryPoolCache.current;

      const results = await Promise.all(
        COMPANY_KEYS.map(async (companyKey) => {
          try {
            const chain = await fetchChain(companyKey);
            return { companyKey, chain };
          } catch {
            return { companyKey, chain: null };
          }
        })
      );

      const poolEntries = [];
      for (const { companyKey, chain } of results) {
        if (!chain) continue;
        poolEntries.push(...toDiscoveryPoolEntries(chain, companyKey));
      }
      discoveryPoolCache.current = poolEntries;
      return poolEntries;
    }

    async function loadChain() {
      try {
        let customGraph = null;
        try {
          const customGraphRaw = localStorage.getItem(`supplyPulse_graph_${selectedCompany}`);
          if (customGraphRaw) {
            customGraph = JSON.parse(customGraphRaw);
          }
        } catch (e) {
          console.error('Could not load from localStorage', e);
        }

        const data = customGraph || await fetchChain(selectedCompany);
        if (!data) {
          if (isActive) setCompanyChain(null);
          return;
        }

        const discoveryPool = await loadDiscoveryPool();
        const merged = withDiscoveredNodes(data, selectedCompany, discoveryPool);
        chainCache.current[selectedCompany] = merged;

        if (isActive) setCompanyChain(merged);
      } catch {
        if (isActive) setCompanyChain(null);
      }
    }

    loadChain();
    return () => {
      isActive = false;
    };
  }, [selectedCompany]);

  const graphs = {
    company: baseGraphs.company,
    country: baseGraphs.country,
    companyChain,
  };

  return { graphs, loading, error };
}
