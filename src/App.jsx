import React, { useState, useMemo, useCallback } from 'react';
import Globe from './components/Globe';
import TerminalSidebar from './components/TerminalSidebar';
import CategoryFilter from './components/CategoryFilter';
import DestinationFilter from './components/DestinationFilter';
import { useSupplierGraph } from './hooks/useSupplierGraph';
import { rerouteSupply } from './engine/optimizer';
import { DEFAULT_WEIGHTS, COLORS } from './utils/constants';

export default function App() {
  const { graph, loading, error } = useSupplierGraph();
  const [disruptedCountry, setDisruptedCountry] = useState(null);
  const [activeCategory, setActiveCategory] = useState('electronics');
  const [destinationMarket, setDestinationMarket] = useState('USA');
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  const disruptedNode = useMemo(() => {
    if (!graph || !disruptedCountry) return null;
    return graph.nodes.find((n) => n.id === disruptedCountry) || null;
  }, [graph, disruptedCountry]);

  const recommendations = useMemo(() => {
    if (!graph || !disruptedCountry) return [];
    return rerouteSupply(disruptedCountry, activeCategory, graph, weights);
  }, [graph, disruptedCountry, activeCategory, weights]);

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

      {/* Main content: Globe + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Globe — 65% */}
        <div className="w-[65%] relative">
          <Globe
            graph={graph}
            activeCategory={activeCategory}
            disruptedCountry={disruptedCountry}
            onNodeClick={handleNodeClick}
            recommendations={recommendations}
          />
        </div>

        {/* Sidebar — 35% */}
        <div className="w-[35%] border-l" style={{ borderColor: COLORS.separator }}>
          <TerminalSidebar
            disruptedNode={disruptedNode}
            activeCategory={activeCategory}
            recommendations={recommendations}
            weights={weights}
            onWeightsChange={setWeights}
          />
        </div>
      </div>
    </div>
  );
}
