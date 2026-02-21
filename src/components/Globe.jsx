import React, { useRef, useEffect, useMemo } from 'react';
import GlobeGL from 'react-globe.gl';
import { COLORS, RISK_THRESHOLDS, DESTINATION_MARKETS } from '../utils/constants';

const DESTINATION_COORDS = {
  USA: { lat: 37.09, lng: -95.71 },
  EU: { lat: 50.11, lng: 9.68 },
  JPN: { lat: 36.20, lng: 138.25 },
};

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
  destinationMarket,
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

  // Fly to disrupted country, or resume auto-rotate on reset
  useEffect(() => {
    if (!globeRef.current) return;
    if (disruptedCountry && graph) {
      const node = graph.nodes.find((n) => n.id === disruptedCountry);
      if (node) {
        globeRef.current.controls().autoRotate = false;
        globeRef.current.pointOfView(
          { lat: node.lat, lng: node.lng, altitude: 2.0 },
          800
        );
      }
    } else {
      globeRef.current.controls().autoRotate = true;
    }
  }, [disruptedCountry, graph]);

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

    const dest = DESTINATION_COORDS[destinationMarket] || DESTINATION_COORDS.USA;
    const recArcs = (recommendations || []).map((rec) => ({
      startLat: rec.lat,
      startLng: rec.lng,
      endLat: dest.lat,
      endLng: dest.lng,
      color: COLORS.arcRecommended,
      stroke: 2.5,
      label: `Recommended: ${rec.country}`,
      isRecommended: true,
    }));

    return [...baseArcs, ...recArcs];
  }, [graph, activeCategory, disruptedCountry, recommendations, destinationMarket]);

  if (!graph) return null;

  return (
    <GlobeGL
      ref={globeRef}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      // Points layer
      pointsData={points}
      pointLat="lat"
      pointLng="lng"
      pointAltitude={0.01}
      pointRadius={(d) => d.size * 1.5}
      pointColor="color"
      pointLabel={(d) => `${d.country} (${d.id})`}
      onPointClick={(point) => onNodeClick(point.id)}
      onGlobeClick={() => onNodeClick(null)}
      // Arcs layer
      arcsData={arcs}
      arcStartLat="startLat"
      arcStartLng="startLng"
      arcEndLat="endLat"
      arcEndLng="endLng"
      arcColor="color"
      arcStroke="stroke"
      arcDashLength={(d) => d.isRecommended ? 0.4 : undefined}
      arcDashGap={(d) => d.isRecommended ? 0.2 : undefined}
      arcDashAnimateTime={(d) => d.isRecommended ? 1500 : 0}
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
      atmosphereColor="#4da6ff"
      atmosphereAltitude={0.2}
    />
  );
}
