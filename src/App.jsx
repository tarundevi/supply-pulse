import React, { useState, useMemo, useCallback } from 'react';
import Globe from './components/Globe';
import TerminalSidebar from './components/TerminalSidebar';
import CategoryFilter from './components/CategoryFilter';
import DestinationFilter from './components/DestinationFilter';
import TariffSimulator from './components/TariffSimulator';
import { useSupplierGraph } from './hooks/useSupplierGraph';
import { rerouteSupply, findTariffAlternatives } from './engine/optimizer';
import { DEFAULT_WEIGHTS, COLORS } from './utils/constants';

export default function App() {
  const { graph, loading, error } = useSupplierGraph();
  const [disruptedCountry, setDisruptedCountry] = useState(null);
  const [activeCategory, setActiveCategory] = useState('electronics');
  const [destinationMarket, setDestinationMarket] = useState('USA');
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [tariffSim, setTariffSim] = useState(null);

  const simulatedGraph = useMemo(() => {
    if (!graph || !tariffSim) return graph;
    return {
      ...graph,
      nodes: graph.nodes.map((node) => {
        if (!tariffSim.countries.includes(node.id)) return node;
        const newRates = { ...node.tariff_rates };
        for (const cat of tariffSim.categories) {
          if (tariffSim.isIncrement) {
            newRates[cat] = (newRates[cat] || 0) + tariffSim.tariffRate;
          } else {
            newRates[cat] = tariffSim.tariffRate;
          }
        }
        return { ...node, tariff_rates: newRates };
      }),
    };
  }, [graph, tariffSim]);

  const disruptedNode = useMemo(() => {
    if (!simulatedGraph || !disruptedCountry) return null;
    return simulatedGraph.nodes.find((n) => n.id === disruptedCountry) || null;
  }, [simulatedGraph, disruptedCountry]);

  const recommendations = useMemo(() => {
    if (!simulatedGraph || !disruptedCountry) return [];
    return rerouteSupply(disruptedCountry, activeCategory, simulatedGraph, weights);
  }, [simulatedGraph, disruptedCountry, activeCategory, weights]);

  const tariffAffectedNodes = useMemo(() => {
    if (!simulatedGraph || !tariffSim) return [];
    return simulatedGraph.nodes.filter((n) => tariffSim.countries.includes(n.id));
  }, [simulatedGraph, tariffSim]);

  const tariffRecommendations = useMemo(() => {
    if (!simulatedGraph || !graph || !tariffSim || disruptedCountry) return [];
    return findTariffAlternatives(
      tariffSim.categories.length > 0 ? tariffSim.countries : [],
      activeCategory,
      simulatedGraph,
      graph,
      weights
    );
  }, [simulatedGraph, graph, tariffSim, activeCategory, weights, disruptedCountry]);

  const handleNodeClick = useCallback((nodeId) => {
    setDisruptedCountry((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleReset = useCallback(() => {
    setDisruptedCountry(null);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: COLORS.background }}>
        <div className="text-sm font-mono" style={{ color: COLORS.textMuted }}>
          Loading supplier graph...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: COLORS.background }}>
        <div className="text-sm font-mono text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: COLORS.background }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: COLORS.separator }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-bold tracking-wide" style={{ color: COLORS.electricBlue }}>
            SourceShift
          </span>
          <CategoryFilter value={activeCategory} onChange={setActiveCategory} />
          <DestinationFilter value={destinationMarket} onChange={setDestinationMarket} />
          <TariffSimulator
            onSimulate={setTariffSim}
            onClear={() => setTariffSim(null)}
            isActive={!!tariffSim}
          />
        </div>
        <button
          onClick={handleReset}
          className="text-xs font-mono px-3 py-1 rounded border cursor-pointer hover:opacity-80"
          style={{
            borderColor: COLORS.separator,
            color: COLORS.textMuted,
            background: 'transparent',
          }}
        >
          &#8634; Reset
        </button>
      </header>

      {/* Main content: Globe + Overlay Modals */}
      <div className="flex-1 relative overflow-hidden">
        {/* Globe — 100% */}
        <div className="absolute inset-0">
          <Globe
            graph={simulatedGraph}
            activeCategory={activeCategory}
            disruptedCountry={disruptedCountry}
            onNodeClick={handleNodeClick}
            recommendations={recommendations}
            destinationMarket={destinationMarket}
          />
        </div>

        {/* Sidebar Modal — Full Height Right Side */}
        <div className="absolute top-0 right-0 bottom-0 pointer-events-none flex flex-col z-10 text-right">
          <TerminalSidebar
            disruptedNode={disruptedNode}
            activeCategory={activeCategory}
            recommendations={recommendations}
            weights={weights}
            onWeightsChange={setWeights}
            graph={simulatedGraph}
            tariffSim={tariffSim}
            tariffAffectedNodes={tariffAffectedNodes}
            tariffRecommendations={tariffRecommendations}
          />
        </div>
      </div>
    </div>
  );
}
