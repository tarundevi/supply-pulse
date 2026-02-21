"""Merge pipeline outputs into public/data/supplier_graph.json."""

from __future__ import annotations

import argparse
import os
from typing import Dict, List

from common import (
    COMMODITY_CODES,
    COUNTRY_META,
    DESTINATION_MARKETS,
    DISTANCE_COST_FACTOR,
    OUTPUT_GRAPH,
    ensure_data_dir,
    json_dump,
    json_load,
    today_iso,
)

TRADE_FILE = os.path.join(os.path.dirname(__file__), "data", "trade_flows.json")
GDELT_FILE = os.path.join(os.path.dirname(__file__), "data", "disruption_signals.json")
WITS_FILE = os.path.join(os.path.dirname(__file__), "data", "tariff_matrix.json")


def _empty_category_map(default: float = 0.0) -> Dict[str, float]:
    return {category: float(default) for category in COMMODITY_CODES}


def _build_nodes(trade_data: dict, gdelt_data: dict, wits_data: dict) -> List[dict]:
    by_reporter = trade_data.get("by_reporter", {})
    gdelt_by_country = gdelt_data.get("by_country", {})
    wits_by_partner = wits_data.get("by_partner", {})

    nodes = []
    for numeric_code, meta in COUNTRY_META.items():
        reporter_item = by_reporter.get(numeric_code, {})
        categories_item = reporter_item.get("categories", {})

        export_volumes = _empty_category_map(0.0)
        for category in COMMODITY_CODES:
            export_volumes[category] = float(
                categories_item.get(category, {}).get("total_export_value", 0.0)
            )

        tariffs = _empty_category_map(0.0)
        partner_item = wits_by_partner.get(meta["id"], {})
        for category in COMMODITY_CODES:
            tariffs[category] = float(partner_item.get("tariff_rates", {}).get(category, 0.0))

        gdelt_item = gdelt_by_country.get(meta["country"], {})
        gdelt_event_count = int(gdelt_item.get("event_count", 0))
        gdelt_risk_score = float(gdelt_item.get("risk_score", 0.0))

        nodes.append(
            {
                "id": meta["id"],
                "country": meta["country"],
                "countryCode": numeric_code,
                "lat": meta["lat"],
                "lng": meta["lng"],
                "hub": meta["hub"],
                "export_volumes": export_volumes,
                "tariff_rates": tariffs,
                "gdelt_risk_score": gdelt_risk_score,
                "gdelt_event_count": gdelt_event_count,
                "distance_cost_factor": DISTANCE_COST_FACTOR.get(meta["id"], 0.08),
            }
        )

    return nodes


def _build_edges(trade_data: dict) -> List[dict]:
    by_reporter = trade_data.get("by_reporter", {})
    edges = []

    for numeric_code, meta in COUNTRY_META.items():
        reporter_item = by_reporter.get(numeric_code, {})
        categories_item = reporter_item.get("categories", {})

        for category in COMMODITY_CODES:
            destination_exports = categories_item.get(category, {}).get("destination_exports", {})
            for market_name, market in DESTINATION_MARKETS.items():
                volume = float(destination_exports.get(market_name, 0.0))
                if volume <= 0:
                    continue
                edges.append(
                    {
                        "source": meta["id"],
                        "target": market_name,
                        "category": category,
                        "volume": volume,
                        "targetLat": market["lat"],
                        "targetLng": market["lng"],
                    }
                )

    return edges


def _validate_graph(graph: dict) -> None:
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    assert isinstance(nodes, list) and len(nodes) > 0, "Graph must include non-empty nodes"
    assert isinstance(edges, list), "Graph edges must be a list"

    required_node_fields = {
        "id",
        "country",
        "lat",
        "lng",
        "export_volumes",
        "tariff_rates",
        "gdelt_risk_score",
        "gdelt_event_count",
        "distance_cost_factor",
    }
    for node in nodes:
        missing = required_node_fields - set(node.keys())
        assert not missing, f"Node missing fields: {missing}"

    required_edge_fields = {"source", "target", "category", "volume", "targetLat", "targetLng"}
    for edge in edges:
        missing = required_edge_fields - set(edge.keys())
        assert not missing, f"Edge missing fields: {missing}"


def main(_args):
    ensure_data_dir()
    trade_data = json_load(TRADE_FILE, default={})
    gdelt_data = json_load(GDELT_FILE, default={})
    wits_data = json_load(WITS_FILE, default={})

    nodes = _build_nodes(trade_data, gdelt_data, wits_data)
    edges = _build_edges(trade_data)

    graph = {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            "comtrade_year": trade_data.get("metadata", {}).get("period", "2023"),
            "gdelt_window": gdelt_data.get("metadata", {}).get("timespan", "90d"),
            "wits_year": wits_data.get("metadata", {}).get("year", "2022"),
            "last_updated": today_iso(),
            "build_type": "basic",
        },
    }

    _validate_graph(graph)
    os.makedirs(os.path.dirname(OUTPUT_GRAPH), exist_ok=True)
    json_dump(OUTPUT_GRAPH, graph)

    print(f"Wrote {OUTPUT_GRAPH}")
    print(f"Nodes: {len(nodes)}")
    print(f"Edges: {len(edges)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build unified supplier graph JSON")
    main(parser.parse_args())
