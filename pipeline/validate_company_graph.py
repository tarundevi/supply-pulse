"""Validate public/data/company_graph.json schema and constraints."""

from __future__ import annotations

import argparse
from pathlib import Path

from company_common import OUTPUT_GRAPH, json_load


def main(args):
    graph_path = Path(args.path or OUTPUT_GRAPH)
    graph = json_load(str(graph_path), {})

    if not graph:
        raise SystemExit(f"Graph file missing or empty: {graph_path}")

    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    if not nodes:
        raise SystemExit("Validation failed: no nodes")

    node_ids = {n.get("id") for n in nodes}
    required_node_keys = {
        "id", "name", "entity_type", "parent_company_id", "lat", "lng", "country_iso3",
        "categories", "capacity_index", "lead_time_days", "unit_cost_index", "tariff_rate_by_category",
        "risk_score", "risk_event_count", "concentration_share", "confidence", "sources",
    }

    for node in nodes:
        missing = required_node_keys - set(node.keys())
        if missing:
            raise SystemExit(f"Validation failed: node {node.get('id')} missing {sorted(missing)}")
        if node["capacity_index"] < 0 or node["unit_cost_index"] < 0 or node["lead_time_days"] < 0:
            raise SystemExit(f"Validation failed: negative numeric fields in node {node['id']}")
        if not (0 <= node["confidence"] <= 1):
            raise SystemExit(f"Validation failed: confidence out of range in node {node['id']}")

    required_edge_keys = {
        "source_id", "target_id", "category", "relationship_type", "baseline_volume",
        "baseline_share", "effective_cost_index", "lead_time_days",
    }
    for edge in edges:
        missing = required_edge_keys - set(edge.keys())
        if missing:
            raise SystemExit(f"Validation failed: edge missing {sorted(missing)}")
        if edge["source_id"] not in node_ids:
            raise SystemExit(f"Validation failed: orphan source {edge['source_id']}")

    print(f"Validation passed: {graph_path}")
    print(f"Nodes: {len(nodes)} | Edges: {len(edges)}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate company_graph.json")
    parser.add_argument("--path", default="")
    main(parser.parse_args())
