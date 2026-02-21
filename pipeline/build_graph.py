"""
build_graph.py — Merge data sources into unified supplier_graph.json.

Reads the outputs from pull_comtrade.py, pull_gdelt.py, and pull_wits.py,
then merges them into a single supplier_graph.json file that the frontend
reads at runtime.

Steps:
  1. Load trade_flows.json → build nodes with export volumes, build edges
  2. Load disruption_signals.json → attach GDELT risk scores to nodes
  3. Load tariff_matrix.json → attach tariff rates to nodes/edges
  4. Compute composite edge weights: cost = trade_cost * tariff * distance
  5. Write supplier_graph.json

Output: public/data/supplier_graph.json
"""

import argparse
import json
import os

PIPELINE_DATA = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_FILE = os.path.join(
    os.path.dirname(__file__), "..", "public", "data", "supplier_graph.json"
)

# Country metadata (lat/lng for globe rendering)
# Coordinates point to each country's primary manufacturer distribution hub / export port
COUNTRY_META = {
    "156": {"id": "CHN", "country": "China", "lat": 31.23, "lng": 121.47, "hub": "Port of Shanghai"},
    "704": {"id": "VNM", "country": "Vietnam", "lat": 10.76, "lng": 106.66, "hub": "Ho Chi Minh City (Cat Lai Port)"},
    "410": {"id": "KOR", "country": "South Korea", "lat": 35.10, "lng": 129.03, "hub": "Port of Busan"},
    "484": {"id": "MEX", "country": "Mexico", "lat": 19.05, "lng": -104.32, "hub": "Port of Manzanillo"},
    "356": {"id": "IND", "country": "India", "lat": 18.95, "lng": 72.95, "hub": "JNPT / Nhava Sheva (Mumbai)"},
    "276": {"id": "DEU", "country": "Germany", "lat": 53.55, "lng": 9.97, "hub": "Port of Hamburg"},
    "392": {"id": "JPN", "country": "Japan", "lat": 35.44, "lng": 139.64, "hub": "Port of Yokohama"},
    "764": {"id": "THA", "country": "Thailand", "lat": 13.08, "lng": 100.88, "hub": "Laem Chabang Port"},
    "458": {"id": "MYS", "country": "Malaysia", "lat": 3.00, "lng": 101.39, "hub": "Port Klang"},
    "076": {"id": "BRA", "country": "Brazil", "lat": -23.96, "lng": -46.30, "hub": "Port of Santos"},
    "616": {"id": "POL", "country": "Poland", "lat": 54.35, "lng": 18.65, "hub": "Port of Gdańsk"},
    "752": {"id": "SWE", "country": "Sweden", "lat": 57.71, "lng": 11.97, "hub": "Port of Gothenburg"},
    "528": {"id": "NLD", "country": "Netherlands", "lat": 51.90, "lng": 4.50, "hub": "Port of Rotterdam"},
    "724": {"id": "ESP", "country": "Spain", "lat": 39.45, "lng": -0.32, "hub": "Port of Valencia"},
    "380": {"id": "ITA", "country": "Italy", "lat": 44.41, "lng": 8.93, "hub": "Port of Genoa"},
}


def load_json(filepath):
    """Load a JSON file, returning empty dict if not found."""
    if not os.path.exists(filepath):
        print(f"Warning: {filepath} not found, using empty data")
        return {}
    with open(filepath) as f:
        return json.load(f)


def main(args):
    # TODO: Load pipeline outputs
    # trade_flows = load_json(os.path.join(PIPELINE_DATA, "trade_flows.json"))
    # disruption_signals = load_json(os.path.join(PIPELINE_DATA, "disruption_signals.json"))
    # tariff_matrix = load_json(os.path.join(PIPELINE_DATA, "tariff_matrix.json"))

    # TODO: Build nodes from trade_flows + disruption_signals + tariff_matrix
    # nodes = []
    # for code, meta in COUNTRY_META.items():
    #     node = {**meta, "countryCode": code}
    #     node["export_volumes"] = extract_volumes(trade_flows, code)
    #     node["gdelt_risk_score"] = compute_risk(disruption_signals, meta["country"])
    #     node["tariff_rates"] = extract_tariffs(tariff_matrix, code)
    #     node["distance_cost_factor"] = estimate_distance_cost(code)
    #     nodes.append(node)

    # TODO: Build edges from trade_flows bilateral data
    # edges = build_edges(trade_flows, nodes)

    # TODO: Assemble and write final graph
    # graph = {
    #     "nodes": nodes,
    #     "edges": edges,
    #     "metadata": {
    #         "comtrade_year": 2023,
    #         "gdelt_window": "90d",
    #         "last_updated": datetime.now().isoformat()[:10],
    #     },
    # }

    # os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    # with open(OUTPUT_FILE, "w") as f:
    #     json.dump(graph, f, indent=2)

    print("build_graph.py: stub — run pipeline scripts first, then implement merge logic")
    print(f"Output would be written to: {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Merge Comtrade, GDELT, and WITS data into supplier_graph.json"
    )
    args = parser.parse_args()
    main(args)
