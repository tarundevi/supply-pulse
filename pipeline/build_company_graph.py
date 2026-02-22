"""Build canonical company_graph.json for Apple-first company mode."""

from __future__ import annotations

import argparse
from collections import defaultdict

from company_common import (
    CATEGORY_MAP_APPLE,
    DATA_RAW_DIR,
    DATA_STAGED_DIR,
    OUTPUT_GRAPH,
    ensure_dirs,
    json_dump,
    json_load,
    today_iso,
)

MANUAL_FILE = f"{DATA_STAGED_DIR}/manual_supplier_baseline.json"
DISCOVERED_FILE = f"{DATA_STAGED_DIR}/discovered_suppliers.json"
EDGAR_FILE = f"{DATA_RAW_DIR}/edgar_company.json"
GDELT_FILE = f"{DATA_RAW_DIR}/gdelt_company_risk.json"
TARIFF_FILE = f"{DATA_RAW_DIR}/tariff_country_matrix.json"

BASELINE_COUNTS = {
    "CHN": 120,
    "TWN": 40,
    "KOR": 32,
    "JPN": 26,
    "IND": 54,
    "THA": 20,
    "MYS": 18,
    "USA": 12,
}

MARKET_COORDS = {
    "USA": {"lat": 33.75, "lng": -118.19},
    "EU": {"lat": 51.90, "lng": 4.50},
    "JPN": {"lat": 35.44, "lng": 139.64},
}


def _tariff_map(country_iso3: str, tariff_by_country: dict):
    return {
        category: float(tariff_by_country.get(country_iso3, {}).get(category, 0.04))
        for category in CATEGORY_MAP_APPLE
    }


def _fallback_risk(country_iso3: str, max_count: int):
    event_count = int(BASELINE_COUNTS.get(country_iso3, 15))
    risk_score = round(min((event_count / max(max_count, 1)) * 10.0, 10.0), 2)
    return event_count, risk_score


def _build_nodes(manual: dict, discovered: dict, gdelt: dict, tariffs: dict):
    risk_map = {r["facility_id"]: r for r in gdelt.get("rows", [])}
    max_gdelt_count = max((int(r.get("risk_event_count", 0)) for r in gdelt.get("rows", [])), default=1)
    tariff_by_country = tariffs.get("tariff_by_country", {})

    allocations = manual.get("allocations", [])
    volume_by_supplier = defaultdict(lambda: defaultdict(float))
    for row in allocations:
        volume_by_supplier[row["supplier_id"]][row["category"]] += float(row["baseline_volume"])

    suppliers = manual.get("suppliers", {})
    facilities = manual.get("facilities", {})

    nodes = []
    node_ids = set()
    for sid, supplier in suppliers.items():
        facility = facilities.get(sid)
        if not facility:
            continue

        risk = risk_map.get(sid, {})
        country_iso3 = facility.get("country_iso3", "CHN")

        node = {
            "id": sid,
            "name": facility.get("facility_name", sid),
            "entity_type": facility.get("entity_type", "facility"),
            "parent_company_id": supplier.get("parent_company", "Unknown"),
            "lat": float(facility.get("lat", 0.0)),
            "lng": float(facility.get("lng", 0.0)),
            "country_iso3": country_iso3,
            "country": country_iso3,
            "categories": supplier.get("categories", []),
            "capacity_index": float(supplier.get("capacity_index", 0.5)),
            "lead_time_days": float(supplier.get("lead_time_days", 25.0)),
            "unit_cost_index": float(supplier.get("unit_cost_index", 1.0)),
            "tariff_rate_by_category": _tariff_map(country_iso3, tariff_by_country),
            "risk_score": float(risk.get("risk_score", 3.0)),
            "risk_event_count": int(risk.get("risk_event_count", 0)),
            "concentration_share": float(supplier.get("concentration_share", 0.0)),
            "confidence": float(supplier.get("confidence", 0.7)),
            "sources": {
                "source_type": supplier.get("source_type", "manual"),
                "facility": facility.get("sources", "manual"),
                "risk": risk.get("source_type", "manual"),
            },
            "baseline_volume_by_category": {
                category: float(volume_by_supplier[sid].get(category, 0.0))
                for category in CATEGORY_MAP_APPLE
            },
            "is_discovered": False,
            "network_status": "in_network",
        }
        nodes.append(node)
        node_ids.add(sid)

    for row in discovered.get("suppliers", []):
        sid = row.get("supplier_id")
        if not sid or sid in node_ids:
            continue

        country_iso3 = row.get("country_iso3", "CHN")
        categories = [category for category in row.get("categories", []) if category in CATEGORY_MAP_APPLE]
        if not categories:
            continue

        raw_max_volume = row.get("max_volume_by_category", {})
        if not isinstance(raw_max_volume, dict):
            raw_max_volume = {}
        max_volume_by_category = {
            category: float(raw_max_volume.get(category, 0.0))
            for category in CATEGORY_MAP_APPLE
        }
        if max(max_volume_by_category.values(), default=0.0) <= 0:
            continue

        risk_event_count, risk_score = _fallback_risk(country_iso3, max_gdelt_count)
        discovered_node = {
            "id": sid,
            "name": row.get("facility_name", sid),
            "entity_type": row.get("entity_type", "facility"),
            "parent_company_id": row.get("parent_company", "Unknown"),
            "lat": float(row.get("lat", 0.0)),
            "lng": float(row.get("lng", 0.0)),
            "country_iso3": country_iso3,
            "country": row.get("country", country_iso3),
            "categories": categories,
            "capacity_index": float(row.get("capacity_index", 0.5)),
            "lead_time_days": float(row.get("lead_time_days", 25.0)),
            "unit_cost_index": float(row.get("unit_cost_index", 1.0)),
            "tariff_rate_by_category": _tariff_map(country_iso3, tariff_by_country),
            "risk_score": risk_score,
            "risk_event_count": risk_event_count,
            "concentration_share": float(row.get("concentration_share", 0.0)),
            "confidence": float(row.get("confidence", 0.7)),
            "sources": {
                "source_type": row.get("source_type", "manual_catalog"),
                "facility": "manual_catalog",
                "risk": "country_baseline",
            },
            "baseline_volume_by_category": {category: 0.0 for category in CATEGORY_MAP_APPLE},
            "max_volume_by_category": max_volume_by_category,
            "is_discovered": True,
            "network_status": "out_of_network",
            "discovery_source": row.get("source_type", "manual_catalog"),
        }
        nodes.append(discovered_node)
        node_ids.add(sid)

    nodes.append(
        {
            "id": "AAPL_HQ",
            "name": "Apple Cupertino",
            "entity_type": "anchor_company",
            "parent_company_id": "Apple Inc.",
            "lat": 37.3349,
            "lng": -122.0090,
            "country_iso3": "USA",
            "country": "USA",
            "categories": list(CATEGORY_MAP_APPLE.keys()),
            "capacity_index": 1.0,
            "lead_time_days": 0.0,
            "unit_cost_index": 1.0,
            "tariff_rate_by_category": {category: 0.0 for category in CATEGORY_MAP_APPLE},
            "risk_score": 1.0,
            "risk_event_count": 2,
            "concentration_share": 0.0,
            "confidence": 0.95,
            "sources": {"source_type": "free_api", "facility": "manual", "risk": "manual"},
            "baseline_volume_by_category": {category: 0.0 for category in CATEGORY_MAP_APPLE},
            "is_discovered": False,
            "network_status": "in_network",
        }
    )

    return nodes


def _build_edges(manual: dict):
    edges = []
    for row in manual.get("allocations", []):
        market = row.get("target_market", "USA")
        coord = MARKET_COORDS.get(market, MARKET_COORDS["USA"])
        edges.append(
            {
                "source_id": row["supplier_id"],
                "target_id": "AAPL_HQ",
                "category": row["category"],
                "relationship_type": "supplies",
                "baseline_volume": float(row["baseline_volume"]),
                "baseline_share": float(row["baseline_share"]),
                "effective_cost_index": 1.0,
                "lead_time_days": 0.0,
                "target_market": market,
                "targetLat": coord["lat"],
                "targetLng": coord["lng"],
            }
        )
    return edges


def _validate(graph: dict):
    assert graph.get("nodes"), "company_graph requires nodes"
    assert graph.get("edges") is not None, "company_graph requires edges list"
    node_ids = {n["id"] for n in graph["nodes"]}
    for edge in graph["edges"]:
        assert edge["source_id"] in node_ids, f"Missing edge source {edge['source_id']}"


def main(_args):
    ensure_dirs()
    manual = json_load(MANUAL_FILE, {})
    discovered = json_load(DISCOVERED_FILE, {})
    edgar = json_load(EDGAR_FILE, {})
    gdelt = json_load(GDELT_FILE, {})
    tariffs = json_load(TARIFF_FILE, {})

    nodes = _build_nodes(manual, discovered, gdelt, tariffs)
    discovered_nodes = [n for n in nodes if n.get("is_discovered")]
    discovered_categories = sorted(
        {category for node in discovered_nodes for category in node.get("categories", [])}
    )

    graph = {
        "nodes": nodes,
        "edges": _build_edges(manual),
        "metadata": {
            "anchor_company": edgar.get("title", "Apple Inc."),
            "pull_date": today_iso(),
            "gdelt_window": gdelt.get("metadata", {}).get("timespan", "90d"),
            "tariff_year": tariffs.get("metadata", {}).get("tariff_year", "2025-proxy"),
            "build_version": "company-v1",
            "discovery_build_version": discovered.get("metadata", {}).get("build_version", "discovery-v1"),
            "discovered_supplier_count": len(discovered_nodes),
            "discovered_categories": discovered_categories,
            "assumption_notes": "Hybrid free+manual sources. Baseline allocations curated for MVP.",
        },
    }

    _validate(graph)
    json_dump(OUTPUT_GRAPH, graph)
    print(f"Wrote {OUTPUT_GRAPH}")
    print(f"Nodes: {len(graph['nodes'])}")
    print(f"Edges: {len(graph['edges'])}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build company graph JSON")
    main(parser.parse_args())
