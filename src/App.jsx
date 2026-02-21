import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Globe from './components/Globe';
import TerminalSidebar from './components/TerminalSidebar';
import CategoryFilter from './components/CategoryFilter';
import DestinationFilter from './components/DestinationFilter';
import TariffSimulator from './components/TariffSimulator';
import { useSupplierGraph } from './hooks/useSupplierGraph';
import {
  rerouteSupplierOutage,
  rerouteTariffShock,
  simulateCombinedScenario,
} from './engine/optimizer';
import {
  DEFAULT_WEIGHTS,
  COLORS,
  SCENARIO_MODES,
  MODE_CATEGORY_MAP,
  PARSER_CONFIG_BY_MODE,
} from './utils/constants';

const DEFAULT_MODE = (import.meta.env.VITE_APP_MODE || 'company').toLowerCase() === 'country' ? 'country' : 'company';

export default function App() {
  const { graphs, loading, error } = useSupplierGraph();
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [disruptedNodeId, setDisruptedNodeId] = useState(null);
  const [destinationMarket, setDestinationMarket] = useState('USA');
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [tariffSim, setTariffSim] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);

  const graph = useMemo(() => {
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
    setTariffSim(null);
  }, [mode, categories]);

  const simulatedGraph = useMemo(() => {
    if (!graph || !tariffSim) return graph;
    const categoriesToAdjust = tariffSim.categories?.length ? tariffSim.categories : [activeCategory];

    return {
      ...graph,
      nodes: graph.nodes.map((node) => {
        if (!tariffSim.countries.includes(node.country_iso3)) return node;
        const nextTariffs = { ...(node.tariff_rate_by_category || {}) };
        categoriesToAdjust.forEach((cat) => {
          const cur = nextTariffs[cat] || 0;
          nextTariffs[cat] = tariffSim.isIncrement ? cur + tariffSim.tariffRate : tariffSim.tariffRate;
        });
        return { ...node, tariff_rate_by_category: nextTariffs };
      }),
    };
  }, [graph, tariffSim, activeCategory]);

  const disruptedNode = useMemo(() => {
    if (!simulatedGraph || !disruptedNodeId) return null;
    return simulatedGraph.nodes.find((n) => n.id === disruptedNodeId) || null;
  }, [simulatedGraph, disruptedNodeId]);

  const tariffAffectedNodes = useMemo(() => {
    if (!simulatedGraph || !tariffSim) return [];
    return simulatedGraph.nodes.filter(
      (n) => n.entity_type !== 'anchor_company' && tariffSim.countries.includes(n.country_iso3)
    );
  }, [simulatedGraph, tariffSim]);

  const scenarioMode = useMemo(() => {
    if (disruptedNodeId && tariffSim) return SCENARIO_MODES.combined;
    if (tariffSim) return SCENARIO_MODES.tariff;
    return SCENARIO_MODES.outage;
  }, [disruptedNodeId, tariffSim]);

  const recommendations = useMemo(() => {
    if (!simulatedGraph) return [];

    if (disruptedNodeId && tariffSim) {
      return simulateCombinedScenario(disruptedNodeId, tariffSim, activeCategory, graph, weights);
    }
    if (disruptedNodeId) {
      return rerouteSupplierOutage(disruptedNodeId, activeCategory, simulatedGraph, weights);
    }
    if (tariffSim) {
      return rerouteTariffShock(tariffSim, activeCategory, simulatedGraph, weights);
    }
    return [];
  }, [simulatedGraph, graph, disruptedNodeId, tariffSim, activeCategory, weights]);

  const handleNodeClick = useCallback((nodeId) => {
    setDisruptedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleReset = useCallback(() => {
    setDisruptedNodeId(null);
    setTariffSim(null);
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
            SourceShift
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

          <CategoryFilter value={activeCategory} onChange={setActiveCategory} categories={categories} />
          <DestinationFilter value={destinationMarket} onChange={setDestinationMarket} />
          <TariffSimulator
            onSimulate={setTariffSim}
            onClear={() => setTariffSim(null)}
            isActive={!!tariffSim}
            parserConfig={parserConfig}
            placeholder={mode === 'company' ? 'e.g. 25% tariff on China chips' : 'e.g. 25% tariff on Chinese electronics'}
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
            style={{ position: 'absolute', top: 20, left: 20, zIndex: 20 }}
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
          />
        </div>
        <TerminalSidebar
          disruptedNode={disruptedNode}
          activeCategory={activeCategory}
          recommendations={recommendations}
          weights={weights}
          onWeightsChange={setWeights}
          graph={simulatedGraph}
          tariffSim={tariffSim}
          tariffAffectedNodes={tariffAffectedNodes}
          scenarioMode={scenarioMode}
          mode={mode}
        />
      </div>
    </div>
  );
}
