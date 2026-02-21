import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import GlobeGL from 'react-globe.gl';
import { COLORS, RISK_THRESHOLDS } from '../utils/constants';

const DESTINATION_COORDS = {
  USA: { lat: 33.75, lng: -118.19, hub: 'US Distribution', label: 'United States' },
  EU: { lat: 51.90, lng: 4.50, hub: 'EU Distribution', label: 'European Union' },
  JPN: { lat: 35.44, lng: 139.64, hub: 'Japan Distribution', label: 'Japan' },
};

function riskColor(eventCount) {
  if (eventCount > RISK_THRESHOLDS.medium) return COLORS.riskHigh;
  if (eventCount > RISK_THRESHOLDS.low) return COLORS.riskMedium;
  return COLORS.riskLow;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rotationSpeedFromAltitude(altitude) {
  // Significantly slower rotation overall; zoom in = slower.
  const minAlt = 1.2;
  const maxAlt = 3.2;
  const t = clamp((altitude - minAlt) / (maxAlt - minAlt), 0, 1);
  return 0.008 + t * 0.045;
}

const NVIDIA_GREEN = '#22c55e';

export default function Globe({
  graph,
  activeCategory,
  disruptedNodeId,
  onNodeClick,
  recommendations,
  destinationMarket,
  mode = 'company',
  autoRotate = true,
  selectedCompany = null,
}) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDimensions({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Only set initial view on mount
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.controls().autoRotate = autoRotate;
    globeRef.current.controls().autoRotateSpeed = 0.35;
    globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    if (disruptedNodeId && graph) {
      const node = graph.nodes.find((n) => n.id === disruptedNodeId);
      if (node) {
        globeRef.current.controls().autoRotate = false;
        globeRef.current.pointOfView({ lat: node.lat, lng: node.lng, altitude: 2.0 }, 800);
      }
    } else {
      globeRef.current.controls().autoRotate = autoRotate;
    }
  }, [disruptedNodeId, graph, autoRotate]);

  const points = useMemo(() => {
    if (!graph) return [];

    const isNvidia = selectedCompany === 'nvidia';
    const nvidiaNodes = isNvidia
      ? graph.nodes.filter((n) => n.parent_company_id === 'NVIDIA' && n.entity_type !== 'anchor_company')
      : [];

    const nodesToRender = isNvidia
      ? nvidiaNodes
      : graph.nodes.filter((n) => n.entity_type !== 'anchor_company');

    const supplierPoints = nodesToRender.map((node) => {
      const vol = node.baseline_volume_by_category?.[activeCategory] || 0;
      const isDisrupted = node.id === disruptedNodeId;
      const isNvidiaFacility = isNvidia && node.parent_company_id === 'NVIDIA';
      return {
        ...node,
        size: mode === 'country'
          ? Math.max(0.1, Math.log10(vol + 1) * 0.08)
          : isNvidiaFacility
            ? Math.max(0.35, Math.log10(vol + 1) * 0.28)
            : Math.max(0.28, Math.log10(vol + 1) * 0.23),
        color: isDisrupted
          ? COLORS.arcDisrupted
          : isNvidiaFacility
            ? NVIDIA_GREEN
            : riskColor(node.risk_event_count || 0),
        ringColor: isDisrupted ? COLORS.arcDisrupted : isNvidiaFacility ? NVIDIA_GREEN : riskColor(node.risk_event_count || 0),
        isDestination: false,
        isNvidiaFacility: isNvidiaFacility,
      };
    });

    const dest = DESTINATION_COORDS[destinationMarket] || DESTINATION_COORDS.USA;
    const destPoint = {
      id: destinationMarket,
      name: dest.label,
      country_iso3: destinationMarket,
      lat: dest.lat,
      lng: dest.lng,
      size: 0.82,
      color: COLORS.electricBlue,
      ringColor: COLORS.electricBlue,
      isDestination: true,
    };

    return isNvidia
      ? [...supplierPoints]
      : [...supplierPoints, destPoint];
  }, [graph, activeCategory, disruptedNodeId, destinationMarket, selectedCompany, mode]);

  const arcs = useMemo(() => {
    if (!graph) return [];

    const isNvidia = selectedCompany === 'nvidia';
    const nodeById = new Map((graph.nodes || []).map((n) => [n.id, n]));
    
    let filteredEdges = graph.edges || [];
    if (isNvidia) {
      filteredEdges = filteredEdges.filter((e) => {
        const src = nodeById.get(e.source_id);
        const target = nodeById.get(e.target_id);
        return src?.parent_company_id === 'NVIDIA' || target?.parent_company_id === 'NVIDIA';
      });
    }

    const baseArcs = filteredEdges
      .filter((e) => e.category === activeCategory)
      .map((edge) => {
        const src = nodeById.get(edge.source_id);
        if (!src) return null;
        const isDisrupted = edge.source_id === disruptedNodeId;
        const isNvidiaArc = isNvidia && (src.parent_company_id === 'NVIDIA' || nodeById.get(edge.target_id)?.parent_company_id === 'NVIDIA');
        // Make country mode arcs thinner, matching company mode style
        let strokeWidth = Math.max(0.45, Math.log10((edge.baseline_volume || 0) + 1) * 0.75);
        if (mode === 'country') {
          strokeWidth = Math.max(0.12, Math.log10((edge.baseline_volume || 0) + 1) * 0.18);
        }
        return {
          startLat: src.lat,
          startLng: src.lng,
          endLat: edge.targetLat,
          endLng: edge.targetLng,
          color: isDisrupted
            ? 'rgba(239,68,68,0.25)'
            : isNvidiaArc
              ? 'rgba(34,197,94,0.6)'
              : COLORS.arcDefault,
          stroke: strokeWidth,
          label: isNvidiaArc
            ? `${edge.category}: ${src.name} -> ${edge.target_market || edge.target_id}`
            : `${src.name} -> ${edge.target_market || edge.target_id}`,
          isNvidiaArc: isNvidiaArc,
        };
      })
      .filter(Boolean);

    const dest = DESTINATION_COORDS[destinationMarket] || DESTINATION_COORDS.USA;
    const recArcs = !isNvidia && (recommendations || []).map((rec) => ({
      startLat: rec.lat,
      startLng: rec.lng,
      endLat: dest.lat,
      endLng: dest.lng,
      color: COLORS.arcRecommended,
      stroke: 2.5,
      label: `Recommended: ${rec.name}`,
      isRecommended: true,
    }));

    return isNvidia
      ? baseArcs
      : [...baseArcs, ...(recArcs || [])];
  }, [graph, activeCategory, disruptedNodeId, recommendations, destinationMarket, selectedCompany, mode]);

  const nvidiaLabel = useMemo(() => {
    if (selectedCompany !== 'nvidia') return null;
    const nvidiaNode = points.find(p => p.id === 'NVDA_SC');
    if (!nvidiaNode) return null;
    return {
      lat: nvidiaNode.lat,
      lng: nvidiaNode.lng,
      text: 'NVIDIA HQ',
    };
  }, [points, selectedCompany]);

  if (!graph) return null;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {dimensions.width > 0 && <GlobeGL
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.01}
        pointRadius={(d) => d.size * 1.45}
        pointColor="color"
        pointLabel={(d) =>
          d.isDestination
            ? `${d.name}`
            : d.isNvidiaFacility
              ? `<b>${d.name}</b><br/>${d.country_iso3}<br/>NVIDIA Manufacturing Facility`
              : `${d.name} (${d.country_iso3})<br/>${d.parent_company_id || 'Supplier'}`
        }
        onPointClick={(point) => (point.isDestination ? null : onNodeClick(point.id))}
        onGlobeClick={() => onNodeClick(null)}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcStroke="stroke"
        arcDashLength={(d) => (d.isRecommended ? 0.4 : undefined)}
        arcDashGap={(d) => (d.isRecommended ? 0.2 : undefined)}
        arcDashAnimateTime={(d) => (d.isRecommended ? 1500 : 0)}
        arcLabel="label"
        ringsData={disruptedNodeId ? points.filter((p) => p.id === disruptedNodeId) : []}
        ringLat="lat"
        ringLng="lng"
        ringColor="ringColor"
        ringMaxRadius={4}
        ringPropagationSpeed={2}
        ringRepeatPeriod={800}
        atmosphereColor="#4da6ff"
        atmosphereAltitude={0.2}
        width={dimensions.width}
        height={dimensions.height}
      />}
    </div>
  );
}
