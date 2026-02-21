import React, { useRef, useEffect, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';
import { COLORS, RISK_THRESHOLDS } from '../utils/constants';

function riskColor(gdeltEventCount) {
  if (gdeltEventCount > RISK_THRESHOLDS.medium) return COLORS.riskHigh;
  if (gdeltEventCount > RISK_THRESHOLDS.low) return COLORS.riskMedium;
  return COLORS.riskLow;
}

export default function Globe({
  graph,
  activeCategory,
  disruptedCountry,
  onNodeClick,
  recommendations,
}) {
  const globeRef = useRef();

  useEffect(() => {
    if (!globeRef.current) return;
    // Auto-rotate
    globeRef.current.controls().autoRotate = true;
    globeRef.current.controls().autoRotateSpeed = 0.4;
    // Initial camera position
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
  }, []);

  // Stop auto-rotate when a disruption is active
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.controls().autoRotate = !disruptedCountry;
  }, [disruptedCountry]);

  // Build point data from nodes
  const points = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.map((node) => {
      const vol = node.export_volumes[activeCategory] || 0;
      const isDisrupted = node.id === disruptedCountry;
      return {
        ...node,
        size: Math.max(0.3, Math.log10(vol / 1e8 + 1) * 0.5),
        color: isDisrupted ? COLORS.arcDisrupted : riskColor(node.gdelt_event_count),
        ringColor: isDisrupted ? COLORS.arcDisrupted : riskColor(node.gdelt_event_count),
      };
    });
  }, [graph, activeCategory, disruptedCountry]);

  // Build arcs from edges
  const arcs = useMemo(() => {
    if (!graph) return [];

    const baseArcs = graph.edges
      .filter((e) => e.category === activeCategory)
      .map((edge) => {
        const srcNode = graph.nodes.find((n) => n.id === edge.source);
        if (!srcNode) return null;
        const isDisrupted = edge.source === disruptedCountry;
        return {
          startLat: srcNode.lat,
          startLng: srcNode.lng,
          endLat: edge.targetLat,
          endLng: edge.targetLng,
          color: isDisrupted
            ? 'rgba(239,68,68,0.3)'
            : COLORS.arcDefault,
          stroke: Math.max(0.5, Math.log10(edge.volume / 1e9 + 1) * 1.5),
          label: `${edge.source} → ${edge.target}`,
        };
      })
      .filter(Boolean);

    // TODO: Add animated recommended route arcs in electric blue
    const recArcs = (recommendations || []).map((rec) => ({
      startLat: rec.lat,
      startLng: rec.lng,
      endLat: 37.09, // TODO: Use actual destination coordinates
      endLng: -95.71,
      color: COLORS.arcRecommended,
      stroke: 2.5,
      label: `Recommended: ${rec.country}`,
    }));

    return [...baseArcs, ...recArcs];
  }, [graph, activeCategory, disruptedCountry, recommendations]);

  if (!graph) return null;

  return (
    <GlobeGL
      ref={globeRef}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      // Points layer
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointAltitude={0.01}
      pointRadius="size"
      pointColor="color"
      pointLabel={(d) => `${d.country} (${d.id})`}
      onPointClick={(point) => onNodeClick(point.id)}
      // Arcs layer
      arcsData={arcs}
      arcStartLat="startLat"
      arcStartLng="startLng"
      arcEndLat="endLat"
      arcEndLng="endLng"
      arcColor="color"
      arcStroke="stroke"
      arcDashLength={0.5}
      arcDashGap={0.2}
      arcDashAnimateTime={2000}
      arcLabel="label"
      // Rings on disrupted node
      ringsData={disruptedCountry ? points.filter((p) => p.id === disruptedCountry) : []}
      ringLat="lat"
      ringLng="lng"
      ringColor="ringColor"
      ringMaxRadius={4}
      ringPropagationSpeed={2}
      ringRepeatPeriod={800}
      // Globe style
      atmosphereColor="#1e40af"
      atmosphereAltitude={0.15}
    />
  );
}
