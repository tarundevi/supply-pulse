import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import GlobeGL from 'react-globe.gl';
import { COLORS, RISK_THRESHOLDS } from '../utils/constants';

// Parse rgba string into components and return a darkened version for background boxes
function darkenRgba(rgbaStr, bgAlpha = 0.85) {
  const m = rgbaStr.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (!m) return 'rgba(30,30,40,0.85)';
  const r = Math.round(Number(m[1]) * 0.35);
  const g = Math.round(Number(m[2]) * 0.35);
  const b = Math.round(Number(m[3]) * 0.35);
  return `rgba(${r},${g},${b},${bgAlpha})`;
}

function borderFromRgba(rgbaStr, alpha = 0.6) {
  const m = rgbaStr.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  if (!m) return 'rgba(100,100,120,0.5)';
  return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
}

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

// Interpolate along the actual great circle path (SLERP) — matches the 3D arc path
// t=0 is start, t=1 is end; t=0.5 gives the true great circle midpoint
function interpolateGreatCircle(lat1, lng1, lat2, lng2, t = 0.5) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1), λ1 = toRad(lng1);
  const φ2 = toRad(lat2), λ2 = toRad(lng2);
  // Convert to 3D cartesian on unit sphere
  const x1 = Math.cos(φ1) * Math.cos(λ1), y1 = Math.cos(φ1) * Math.sin(λ1), z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2) * Math.cos(λ2), y2 = Math.cos(φ2) * Math.sin(λ2), z2 = Math.sin(φ2);
  // Angular distance
  const dot = x1 * x2 + y1 * y2 + z1 * z2;
  const omega = Math.acos(Math.min(1, Math.max(-1, dot)));
  if (omega < 1e-6) return { lat: lat1, lng: lng1 }; // same point
  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;
  const x = a * x1 + b * x2;
  const y = a * y1 + b * y2;
  const z = a * z1 + b * z2;
  return { lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lng: toDeg(Math.atan2(y, x)) };
}

// Estimate the peak altitude of a react-globe.gl arc (matches its internal calculation)
// Returns altitude in globe-radius units for the apex of the parabolic curve
function estimateArcPeakAlt(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  let dLng = lng2 - lng1;
  if (dLng > 180) dLng -= 360;
  if (dLng < -180) dLng += 360;
  const dLngRad = toRad(dLng);
  const dLatRad = toRad(lat2 - lat1);
  const a =
    Math.sin(dLatRad / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLngRad / 2) ** 2;
  const angDist = 2 * Math.asin(Math.sqrt(a));
  // Match three-globe's auto altitude: altAutoScale(0.5) * straightLineDist / 2
  const straightDist = 2 * Math.sin(angDist / 2);
  return (0.5 * straightDist) / 2;
}

function rotationSpeedFromAltitude(altitude) {
  // Significantly slower rotation overall; zoom in = slower.
  const minAlt = 1.2;
  const maxAlt = 3.2;
  const t = clamp((altitude - minAlt) / (maxAlt - minAlt), 0, 1);
  return 0.008 + t * 0.045;
}

const NVIDIA_GREEN = '#22c55e';

// Human-readable descriptions for each transported material in the Nvidia supply chain
const NVIDIA_CATEGORY_LABELS = {
  semiconductors: 'Semiconductors',
  ai_chips: 'AI Chips',
  hbm: 'High-Bandwidth Memory',
  graphics_cards: 'Graphics Cards',
  automotive: 'Automotive AI Modules',
  substrate: 'IC Substrates',
  materials: 'Raw Materials',
  memory: 'Memory Modules',
  packaging: 'Chip Packaging',
};

// Distinct arc colors per category for visual differentiation
const NVIDIA_ARC_COLORS = {
  semiconductors: 'rgba(34,197,94,0.7)',
  ai_chips: 'rgba(56,189,248,0.7)',
  hbm: 'rgba(168,85,247,0.7)',
  graphics_cards: 'rgba(251,191,36,0.7)',
  automotive: 'rgba(244,114,182,0.7)',
  substrate: 'rgba(45,212,191,0.7)',
  materials: 'rgba(251,146,60,0.7)',
  memory: 'rgba(129,140,248,0.7)',
  packaging: 'rgba(163,230,53,0.7)',
};

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
    const controls = globeRef.current.controls();
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.35;
    controls.zoomSpeed = 3.0; // Increase scroll zoom sensitivity (default 1.0)
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
      .filter((e) => isNvidia ? true : e.category === activeCategory)
      .map((edge) => {
        const src = nodeById.get(edge.source_id);
        if (!src) return null;
        const tgt = nodeById.get(edge.target_id);
        const isDisrupted = edge.source_id === disruptedNodeId;
        const isNvidiaArc = isNvidia && (src.parent_company_id === 'NVIDIA' || tgt?.parent_company_id === 'NVIDIA');
        // Make country mode arcs thinner, matching company mode style
        let strokeWidth = Math.max(0.45, Math.log10((edge.baseline_volume || 0) + 1) * 0.75);
        if (mode === 'country') {
          strokeWidth = Math.max(0.12, Math.log10((edge.baseline_volume || 0) + 1) * 0.18);
        }
        const categoryLabel = NVIDIA_CATEGORY_LABELS[edge.category] || edge.category;
        const srcName = src.name?.replace('NVIDIA ', '') || edge.source_id;
        const tgtName = tgt?.name?.replace('NVIDIA ', '') || edge.target_market || edge.target_id;
        return {
          startLat: src.lat,
          startLng: src.lng,
          endLat: edge.targetLat,
          endLng: edge.targetLng,
          color: isDisrupted
            ? 'rgba(239,68,68,0.25)'
            : isNvidiaArc
              ? (NVIDIA_ARC_COLORS[edge.category] || 'rgba(34,197,94,0.6)')
              : COLORS.arcDefault,
          stroke: strokeWidth,
          label: isNvidiaArc
            ? `<b>${categoryLabel}</b><br/><span style="opacity:0.8">${srcName} → ${tgtName}</span>`
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

  // Always-visible HTML labels for Nvidia nodes and arc midpoints
  const htmlLabels = useMemo(() => {
    const isNvidia = selectedCompany === 'nvidia';
    if (!isNvidia) return [];

    // Node labels — offset slightly in latitude so they sit beside the node
    const nodeLabels = points.map((p) => {
      const shortName = p.name?.replace('NVIDIA ', '') || p.id;
      const accentColor = p.color || NVIDIA_GREEN;
      return {
        lat: p.lat + 1.8,
        lng: p.lng + 2.5,
        text: shortName,
        bgColor: darkenRgba(accentColor),
        borderColor: borderFromRgba(accentColor),
        textColor: '#fff',
        altitude: 0.012,
        isHQ: false,
      };
    });

    // NVIDIA HQ anchor label
    const hqNode = (graph?.nodes || []).find(n => n.id === 'NVDA_SC');
    if (hqNode) {
      nodeLabels.push({
        lat: hqNode.lat + 2.5,
        lng: hqNode.lng + 3,
        text: '\u2b22 NVIDIA HQ',
        bgColor: darkenRgba(NVIDIA_GREEN),
        borderColor: borderFromRgba(NVIDIA_GREEN),
        textColor: NVIDIA_GREEN,
        altitude: 0.015,
        isHQ: true,
      });
    }

    // Arc labels placed at the peak (apex) of the parabolic arc
    const arcLabels = arcs
      .filter((a) => a.isNvidiaArc)
      .map((arc, i) => {
        // Place label at the arc apex (t=0.5) with slight stagger
        const t = 0.48 + (i % 3) * 0.02;
        const pos = interpolateGreatCircle(arc.startLat, arc.startLng, arc.endLat, arc.endLng, t);
        const categoryMatch = arc.label?.match(/<b>([^<]+)<\/b>/);
        const categoryText = categoryMatch ? categoryMatch[1] : '';
        const accentColor = arc.color || 'rgba(255,255,255,0.8)';
        // Compute the peak altitude so the label floats at the top of the arc
        const peakAlt = estimateArcPeakAlt(arc.startLat, arc.startLng, arc.endLat, arc.endLng);
        return {
          lat: pos.lat,
          lng: pos.lng,
          text: categoryText,
          bgColor: darkenRgba(accentColor),
          borderColor: borderFromRgba(accentColor),
          textColor: '#fff',
          altitude: peakAlt, // sit exactly on the arc peak
          isHQ: false,
        };
      });

    return [...nodeLabels, ...arcLabels];
  }, [points, arcs, selectedCompany, graph]);

  // Create HTML element for each label — styled colored box
  const createLabelElement = useCallback((d) => {
    const el = document.createElement('div');
    el.style.cssText = `
      background: ${d.bgColor};
      border: 1px solid ${d.borderColor};
      color: ${d.textColor};
      padding: 2px 7px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: ${d.isHQ ? '11px' : '9px'};
      font-weight: ${d.isHQ ? '700' : '500'};
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      backdrop-filter: blur(4px);
      letter-spacing: 0.3px;
      line-height: 1.4;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transform: translate(8px, -50%);
    `;
    el.textContent = d.text;
    return el;
  }, []);

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
        htmlElementsData={htmlLabels}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude="altitude"
        htmlElement={createLabelElement}
        htmlTransitionDuration={300}
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
