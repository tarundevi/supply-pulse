import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Globe from './components/Globe';
import TerminalSidebar from './components/TerminalSidebar';
import CategoryFilter from './components/CategoryFilter';
import IndustryFilter from './components/IndustryFilter';
import CompanyFilter from './components/CompanyFilter';
import DestinationFilter from './components/DestinationFilter';
import { INDUSTRY_COMPANY_MAP } from './utils/industries';
import MacroEventSimulator from './components/MacroEventSimulator';
import DataUploadPanel from './components/DataUploadPanel';
import { useSupplierGraph, saveCustomGraph } from './hooks/useSupplierGraph';
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
  // New for company mode
  const [selectedIndustry, setSelectedIndustry] = useState(Object.keys(INDUSTRY_COMPANY_MAP)[0]);
  const [selectedCompany, setSelectedCompany] = useState(INDUSTRY_COMPANY_MAP[Object.keys(INDUSTRY_COMPANY_MAP)[0]].companies[0].key);
  const [customCompanies, setCustomCompanies] = useState([]);

  // Load custom companies from localStorage on boot
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('supplyPulseCustomGraphs') || '[]');
      setCustomCompanies(saved);
    } catch (e) {
      console.error('Failed to load custom graphs.', e);
    }
  }, []);

  const { graphs, loading, error } = useSupplierGraph(selectedCompany);

  // Dynamically build the Industry map to include Custom Uploads
  const currentIndustryMap = useMemo(() => {
    if (customCompanies.length === 0) return INDUSTRY_COMPANY_MAP;
    return {
      custom_uploads: {
        label: 'Custom Uploads',
        description: 'User-uploaded custom supply chain data.',
        companies: customCompanies.map(g => ({
          key: g.metadata.company_key,
          label: g.metadata.anchor_company || g.metadata.company_key
        }))
      },
      ...INDUSTRY_COMPANY_MAP
    };
  }, [customCompanies]);

  const graph = useMemo(() => {
    if (mode === 'company' && graphs.companyChain) return graphs.companyChain;
    if (mode === 'company' && graphs.company) return graphs.company;
    if (mode === 'country' && graphs.country) return graphs.country;
    return graphs.company || graphs.country || null;
  }, [mode, graphs]);

  const categories = useMemo(() => MODE_CATEGORY_MAP[mode], [mode]);
  const parserConfig = useMemo(() => PARSER_CONFIG_BY_MODE[mode], [mode]);

  const [activeCategory, setActiveCategory] = useState(Object.keys(MODE_CATEGORY_MAP[DEFAULT_MODE])[0]);

  useEffect(() => {
    const keys = Object.keys(categories || {});
    if (!keys.includes(activeCategory)) {
      setActiveCategory(keys[0]);
    }
    setDisruptedNodeId(null);
    setMacroEvent(null);
    // Reset industry/company on mode switch
    if (mode === 'company') {
      const firstIndustry = Object.keys(currentIndustryMap)[0];
      setSelectedIndustry(firstIndustry);
      setSelectedCompany(currentIndustryMap[firstIndustry].companies[0].key);
    }
  }, [mode, categories, currentIndustryMap]);

  const handleCustomUpload = useCallback((parsedGraph) => {
    // Determine a new unique company_key
    let key = parsedGraph.metadata?.company_key || 'custom_' + Date.now();

    // Check if exists
    if (customCompanies.find(c => c.metadata?.company_key === key) || Object.values(INDUSTRY_COMPANY_MAP).some(ind => ind.companies.some(c => c.key === key))) {
      key = key + '_' + Date.now();
    }

    // Ensure metadata is completely setup
    const graphToSave = {
      ...parsedGraph,
      metadata: {
        ...parsedGraph.metadata,
        company_key: key,
        mode: 'company',
      }
    };

    saveCustomGraph(graphToSave);

    setCustomCompanies(prev => {
      const updated = [graphToSave, ...prev];
      localStorage.setItem('supplyPulseCustomGraphs', JSON.stringify(updated.map(g => g.metadata.company_key)));
      // Actually we just need to save the keys to local storage in app state, but the actual graphs are saved inside hook localStorage.
      // Wait, let's just save the minimal metadata to app state.
      return updated;
    });

    // Auto switch to the new company
    setMode('company');
    setSelectedIndustry('custom_uploads');
    setSelectedCompany(key);
  }, [customCompanies]);

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
    return computeConsumerImpact(disruptedNode, activeCategory, simulatedGraph, graph, macroEvent, recommendations);
  }, [disruptedNode, activeCategory, simulatedGraph, graph, macroEvent, recommendations]);

  const handleNodeClick = useCallback((nodeId) => {
    setDisruptedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleReset = useCallback(() => {
    setDisruptedNodeId(null);
    setMacroEvent(null);
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
                  setSelectedCompany(currentIndustryMap[ind].companies[0].key);
                }}
                industries={currentIndustryMap}
              />
              <CompanyFilter
                value={selectedCompany}
                onChange={setSelectedCompany}
                companies={currentIndustryMap[selectedIndustry]?.companies || []}
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
          <DataUploadPanel onUploadSuccess={handleCustomUpload} />
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
        />
      </div>
    </div>
  );
}
