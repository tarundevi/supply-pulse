import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Globe from './components/Globe';
import TerminalSidebar from './components/TerminalSidebar';
import CategoryFilter from './components/CategoryFilter';
import IndustryFilter from './components/IndustryFilter';
import CompanyFilter from './components/CompanyFilter';
import DestinationFilter from './components/DestinationFilter';
import { INDUSTRY_COMPANY_MAP } from './utils/industries';
import MacroEventSimulator from './components/MacroEventSimulator';
import { useSupplierGraph } from './hooks/useSupplierGraph';
import {
  rerouteSupplierOutage,
  rerouteMacroEventShock,
  simulateCombinedScenario,
} from './engine/optimizer';
import { computeConsumerImpact } from './engine/consumerImpact';
import {
  DEFAULT_WEIGHTS,
  COLORS,
  SCENARIO_MODES,
  MODE_CATEGORY_MAP,
  PARSER_CONFIG_BY_MODE,
  INTEREST_RATE_COST_SENSITIVITY,
  SANCTION_PRICE_SHOCK_FACTOR,
  EXPORT_CONTROL_COST_PREMIUM,
  CURRENCY_PASS_THROUGH_RATES,
} from './utils/constants';

const DEFAULT_MODE = (import.meta.env.VITE_APP_MODE || 'company').toLowerCase() === 'country' ? 'country' : 'company';

export default function App() {
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [disruptedNodeId, setDisruptedNodeId] = useState(null);
  const [destinationMarket, setDestinationMarket] = useState('USA');
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [macroEvent, setMacroEvent] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedRecId, setSelectedRecId] = useState(null);
  // New for company mode
  const [selectedIndustry, setSelectedIndustry] = useState(Object.keys(INDUSTRY_COMPANY_MAP)[0]);
  const [selectedCompany, setSelectedCompany] = useState(INDUSTRY_COMPANY_MAP[Object.keys(INDUSTRY_COMPANY_MAP)[0]].companies[0].key);

  const { graphs, loading, error } = useSupplierGraph(selectedCompany);

  const graph = useMemo(() => {
    if (mode === 'company' && graphs.companyChain) return graphs.companyChain;
    if (mode === 'company' && graphs.company) return graphs.company;
    if (mode === 'country' && graphs.country) return graphs.country;
    return graphs.company || graphs.country || null;
  }, [mode, graphs]);

  const categories = useMemo(() => {
    if (mode === 'company') {
      const labels = graph?.metadata?.category_labels || {};
      const keys = Object.keys(labels);
      if (keys.length > 0) {
        return Object.fromEntries(
          keys.map((key) => [key, { label: labels[key], code: key.toUpperCase() }])
        );
      }
    }
    return MODE_CATEGORY_MAP[mode];
  }, [mode, graph]);

  const parserConfig = useMemo(() => {
    const base = PARSER_CONFIG_BY_MODE[mode];
    if (mode !== 'company') return base;

    const dynamicCategories = Object.keys(categories || {});
    const nodes = graph?.nodes || [];
    const dynamicCountries = Array.from(
      new Set(nodes.map((node) => node.country_iso3).filter(Boolean))
    );

    const dynamicCountryAliases = {};
    for (const node of nodes) {
      if (!node?.country_iso3) continue;
      if (node.country) dynamicCountryAliases[String(node.country).toLowerCase()] = node.country_iso3;
      if (node.country_iso3) dynamicCountryAliases[String(node.country_iso3).toLowerCase()] = node.country_iso3;
    }

    const dynamicAliases = { ...(base.categoryAliases || {}) };
    for (const category of dynamicCategories) {
      dynamicAliases[category] = category;
      dynamicAliases[category.replace(/_/g, ' ')] = category;
      if (category.endsWith('s') && category.length > 1) {
        dynamicAliases[category.slice(0, -1)] = category;
      }
    }

    return {
      ...base,
      validCategories: dynamicCategories.length > 0 ? dynamicCategories : base.validCategories,
      categoryAliases: dynamicAliases,
      validCountries: dynamicCountries.length > 0
        ? Array.from(new Set([...(base.validCountries || []), ...dynamicCountries]))
        : base.validCountries,
      countryAliases: {
        ...(base.countryAliases || {}),
        ...dynamicCountryAliases,
      },
    };
  }, [mode, categories, graph]);

  const [activeCategory, setActiveCategory] = useState(Object.keys(MODE_CATEGORY_MAP[DEFAULT_MODE])[0]);

  useEffect(() => {
    setDisruptedNodeId(null);
    setMacroEvent(null);
    // Reset industry/company on mode switch
    if (mode === 'company') {
      setSelectedIndustry(Object.keys(INDUSTRY_COMPANY_MAP)[0]);
      setSelectedCompany(INDUSTRY_COMPANY_MAP[Object.keys(INDUSTRY_COMPANY_MAP)[0]].companies[0].key);
    }
  }, [mode]);

  // Track if we're currently processing a node click to prevent resets
  const [isProcessingClick, setIsProcessingClick] = useState(false);

  useEffect(() => {
    console.log('[categories effect] Running, isProcessingClick:', isProcessingClick, 'activeCategory:', activeCategory);
    // Skip if we're currently processing a node click
    if (isProcessingClick) {
      console.log('[categories effect] Skipping due to isProcessingClick');
      return;
    }
    
    const keys = Object.keys(categories || {});
    console.log('[categories effect] keys:', keys, 'includes activeCategory:', keys.includes(activeCategory));
    if (keys.length > 0 && !keys.includes(activeCategory)) {
      console.log('[categories effect] Setting defaults - activeCategory:', keys[0]);
      setActiveCategory(keys[0]);
      setDisruptedNodeId(null);
      setMacroEvent(null);
    }
  }, [categories, activeCategory, isProcessingClick]);

  const simulatedGraph = useMemo(() => {
    if (!graph || !macroEvent) return graph;

    const categoriesToAdjust = macroEvent.categories?.length ? macroEvent.categories : [activeCategory];

    switch (macroEvent.eventType) {
      case 'tariff':
        return {
          ...graph,
          nodes: graph.nodes.map((node) => {
            if (!macroEvent.countries.includes(node.country_iso3)) return node;
            const nextTariffs = { ...(node.tariff_rate_by_category || {}) };
            categoriesToAdjust.forEach((cat) => {
              const cur = nextTariffs[cat] || 0;
              nextTariffs[cat] = macroEvent.isIncrement ? cur + macroEvent.tariffRate : macroEvent.tariffRate;
            });
            return { ...node, tariff_rate_by_category: nextTariffs };
          }),
        };

      case 'sanction':
        return {
          ...graph,
          nodes: graph.nodes.map((node) => {
            if (!macroEvent.countries.includes(node.country_iso3)) return node;
            return {
              ...node,
              capacity_index: 0,
              tariff_rate_by_category: Object.fromEntries(
                (node.tariff_rate_by_category ? Object.keys(node.tariff_rate_by_category) : categoriesToAdjust)
                  .map((cat) => [cat, 9.99])
              ),
            };
          }),
        };

      case 'interest_rate':
        return {
          ...graph,
          nodes: graph.nodes.map((node) => {
            if (node.entity_type === 'anchor_company') return node;

            const category = node.supplier_category || categoriesToAdjust[0];
            const sensitivity = INTEREST_RATE_COST_SENSITIVITY[category] || 0.1;

            return {
              ...node,
              unit_cost_index: (node.unit_cost_index || 1) * (1 + macroEvent.rateChangePct * sensitivity),
            };
          }),
        };

      case 'currency':
        return {
          ...graph,
          nodes: graph.nodes.map((node) => {
            if (!macroEvent.countries.includes(node.country_iso3)) return node;

            const category = node.supplier_category || categoriesToAdjust[0];
            const passThrough = CURRENCY_PASS_THROUGH_RATES[category] || 0.6;

            return {
              ...node,
              unit_cost_index: (node.unit_cost_index || 1) * (1 + macroEvent.currencyChangePct * passThrough),
            };
          }),
        };

      case 'export_control':
        return {
          ...graph,
          nodes: graph.nodes.map((node) => {
            if (!macroEvent.countries.includes(node.country_iso3)) return node;
            if (!node.supplier_category || !categoriesToAdjust.includes(node.supplier_category)) return node;

            const currentCapacity = node.capacity_index || 1;
            const newCapacity = currentCapacity * (1 - macroEvent.restrictionLevel);

            const costPremium = EXPORT_CONTROL_COST_PREMIUM[categoriesToAdjust[0]] || 0.2;

            return {
              ...node,
              capacity_index: newCapacity,
              unit_cost_index: (node.unit_cost_index || 1) * (1 + macroEvent.restrictionLevel * costPremium),
            };
          }),
        };

      default:
        return graph;
    }
  }, [graph, macroEvent, activeCategory]);

  const disruptedNode = useMemo(() => {
    if (!simulatedGraph || !disruptedNodeId) return null;
    return simulatedGraph.nodes.find((n) => n.id === disruptedNodeId) || null;
  }, [simulatedGraph, disruptedNodeId]);

  const affectedNodes = useMemo(() => {
    if (!simulatedGraph || !macroEvent) return [];

    if (macroEvent.eventType === 'interest_rate') {
      return simulatedGraph.nodes.filter((n) => n.entity_type !== 'anchor_company');
    }

    return simulatedGraph.nodes.filter(
      (n) => n.entity_type !== 'anchor_company' && macroEvent.countries?.includes(n.country_iso3)
    );
  }, [simulatedGraph, macroEvent]);

  const scenarioMode = useMemo(() => {
    if (disruptedNodeId && macroEvent) {
      return SCENARIO_MODES.combined;
    }
    if (macroEvent) {
      return SCENARIO_MODES[macroEvent.eventType] || SCENARIO_MODES.tariff;
    }
    return SCENARIO_MODES.outage;
  }, [disruptedNodeId, macroEvent]);

  const recommendations = useMemo(() => {
    if (!simulatedGraph) return [];

    if (disruptedNodeId && macroEvent) {
      return simulateCombinedScenario(disruptedNodeId, macroEvent, activeCategory, graph, weights);
    }
    if (disruptedNodeId) {
      return rerouteSupplierOutage(disruptedNodeId, activeCategory, simulatedGraph, weights);
    }
    if (macroEvent) {
      return rerouteMacroEventShock(macroEvent, activeCategory, simulatedGraph, weights);
    }
    return [];
  }, [simulatedGraph, graph, disruptedNodeId, macroEvent, activeCategory, weights]);

  const consumerImpact = useMemo(() => {
    if (!simulatedGraph) return null;
    const selectedRec = selectedRecId ? recommendations.find(r => r.id === selectedRecId) : null;
    return computeConsumerImpact(disruptedNode, activeCategory, simulatedGraph, graph, macroEvent, recommendations, selectedRec);
  }, [disruptedNode, activeCategory, simulatedGraph, graph, macroEvent, recommendations, selectedRecId]);

  const handleNodeClick = useCallback((nodeId) => {
    console.log('[handleNodeClick] Called with nodeId:', nodeId);
    console.log('[handleNodeClick] Current disruptedNodeId:', disruptedNodeId);
    console.log('[handleNodeClick] Current activeCategory:', activeCategory);
    console.log('[handleNodeClick] Current mode:', mode);
    
    if (!nodeId) {
      console.log('[handleNodeClick] No nodeId, setting disruptedNodeId to null');
      setDisruptedNodeId(null);
      return;
    }

    // Prevent the categories effect from resetting our state
    console.log('[handleNodeClick] Setting isProcessingClick to true');
    setIsProcessingClick(true);

    setDisruptedNodeId((prev) => {
      console.log('[handleNodeClick] setDisruptedNodeId callback, prev:', prev);
      if (prev === nodeId) {
        setIsProcessingClick(false);
        console.log('[handleNodeClick] Same node, returning null');
        return null;
      }
      console.log('[handleNodeClick] Returning new nodeId:', nodeId);
      return nodeId;
    });

    // Auto-switch activeCategory to match clicked node's category
    if (mode === 'company' && simulatedGraph) {
      const clickedNode = simulatedGraph.nodes.find((n) => n.id === nodeId);
      console.log('[handleNodeClick] Clicked node:', clickedNode?.name, clickedNode?.categories);
      if (clickedNode && clickedNode.categories?.length > 0) {
        const nodeCategory = clickedNode.categories[0];
        console.log('[handleNodeClick] Setting activeCategory to:', nodeCategory);
        setActiveCategory(nodeCategory);
      }
    }

    // Allow the effect to run again after state updates
    console.log('[handleNodeClick] Scheduling isProcessingClick reset');
    setTimeout(() => {
      console.log('[handleNodeClick] Setting isProcessingClick to false');
      setIsProcessingClick(false);
    }, 0);
  }, [mode, simulatedGraph, disruptedNodeId, activeCategory]);

  // Log disruptedNodeId changes
  useEffect(() => {
    console.log('[disruptedNodeId effect] disruptedNodeId changed to:', disruptedNodeId);
  }, [disruptedNodeId]);

  // Clear selected recommendation when disrupted node changes
  useEffect(() => {
    setSelectedRecId(null);
  }, [disruptedNodeId, macroEvent]);

  const handleReset = useCallback(() => {
    setDisruptedNodeId(null);
    setMacroEvent(null);
    setSelectedRecId(null);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: COLORS.background }}>
        <div className="text-sm font-mono" style={{ color: COLORS.textMuted }}>
          Loading graph data...
        </div>
      </div>
    );
  }

  if (error && !graph) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: COLORS.background }}>
        <div className="text-sm font-mono text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: COLORS.background }}>
      <header className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: COLORS.separator }}>
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold tracking-wide" style={{ color: COLORS.electricBlue }}>
            &lt;suppl.ai&gt;
          </span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="text-xs font-mono px-2 py-1 rounded border cursor-pointer"
            style={{ background: COLORS.panelBg, borderColor: COLORS.separator, color: COLORS.textPrimary }}
          >
            <option value="company" disabled={!graphs.company}>Company Mode</option>
            <option value="country" disabled={!graphs.country}>Country Mode</option>
          </select>
          {mode === 'company' ? (
            <>
              <IndustryFilter
                value={selectedIndustry}
                onChange={(ind) => {
                  setSelectedIndustry(ind);
                  setSelectedCompany(INDUSTRY_COMPANY_MAP[ind].companies[0].key);
                }}
                industries={INDUSTRY_COMPANY_MAP}
              />
              <CompanyFilter
                value={selectedCompany}
                onChange={setSelectedCompany}
                companies={INDUSTRY_COMPANY_MAP[selectedIndustry].companies}
              />
            </>
          ) : (
            <>
              <CategoryFilter value={activeCategory} onChange={setActiveCategory} categories={categories} />
              <DestinationFilter value={destinationMarket} onChange={setDestinationMarket} />
            </>
          )}
          <MacroEventSimulator
            onSimulate={setMacroEvent}
            onClear={() => setMacroEvent(null)}
            isActive={!!macroEvent}
            parserConfig={parserConfig}
            placeholder={mode === 'company' ? 'e.g. 25% tariff on China chips, sanction Russia, 2% rate hike' : 'e.g. 25% tariff on China electronics, 15% currency devaluation'}
          />
        </div>

        <button
          onClick={handleReset}
          className="text-xs font-mono px-3 py-1 rounded border cursor-pointer hover:opacity-80"
          style={{ borderColor: COLORS.separator, color: COLORS.textMuted, background: 'transparent' }}
        >
          &#8634; Reset
        </button>
      </header>

      {error && (
        <div className="px-4 py-1 text-[11px] font-mono" style={{ color: COLORS.riskMedium }}>
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="flex-1 min-w-0 bg-black relative">
          {/* Floating Pause Button */}
          <div
            style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 20 }}
            className="pointer-events-auto"
          >
            <button
              onClick={() => setAutoRotate((r) => !r)}
              className="text-xs font-mono px-3 py-2 rounded border shadow-lg bg-slate-900/90 hover:bg-slate-800 transition-colors cursor-pointer"
              style={{ borderColor: COLORS.separator, color: COLORS.textPrimary }}
            >
              {autoRotate ? 'Pause Globe Rotation' : 'Resume Globe Rotation'}
            </button>
          </div>
          <Globe
            graph={simulatedGraph}
            activeCategory={activeCategory}
            disruptedNodeId={disruptedNodeId}
            onNodeClick={handleNodeClick}
            recommendations={recommendations}
            destinationMarket={destinationMarket}
            mode={mode}
            autoRotate={autoRotate}
            selectedCompany={selectedCompany}
            selectedRecId={selectedRecId}
            macroEvent={macroEvent}
          />
        </div>
        <TerminalSidebar
          disruptedNode={disruptedNode}
          activeCategory={activeCategory}
          recommendations={recommendations}
          weights={weights}
          onWeightsChange={setWeights}
          graph={simulatedGraph}
          macroEvent={macroEvent}
          affectedNodes={affectedNodes}
          scenarioMode={scenarioMode}
          mode={mode}
          consumerImpact={consumerImpact}
          selectedRecId={selectedRecId}
          onSelectRec={setSelectedRecId}
        />
      </div>
    </div>
  );
}
