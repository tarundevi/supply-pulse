"""
pull_wits.py — Fetch applied tariff rates from World Bank WITS API.

For each country pair in the supplier graph and each commodity category,
pulls the applied (MFN) tariff rate. This feeds the cost delta calculation
in the optimizer.

API: https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN/...
No API key required for basic queries. Note: WITS is often slow; pre-pull
all data and cache.

Output: pipeline/data/tariff_matrix.json
"""

import argparse
import json
import os
import time

import requests

REPORTERS = {
    "USA": "840",
}

PARTNERS = {
    "China": "156",
    "Vietnam": "704",
    "South Korea": "410",
    "Mexico": "484",
    "India": "356",
    "Germany": "276",
    "Japan": "392",
    "Thailand": "764",
    "Malaysia": "458",
    "Brazil": "076",
}

COMMODITY_HS = {
    "electronics": "85",
    "textiles": "61",
    "chemicals": "28",
    "machinery": "84",
    "vehicles": "87",
}

API_BASE = "https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "tariff_matrix.json")


def fetch_tariff(reporter_code, partner_code, hs_code, year="2022"):
    """Fetch applied tariff rate for a reporter-partner-product combination."""
    url = f"{API_BASE}/reporter/{reporter_code}/partner/{partner_code}/product/{hs_code}/year/{year}"
    # TODO: Implement actual API call and XML/SDMX response parsing
    # response = requests.get(url)
    # response.raise_for_status()
    # return parse_sdmx_tariff(response.text)
    return None


def main(args):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    matrix = {}

    for reporter_name, reporter_code in REPORTERS.items():
        for partner_name, partner_code in PARTNERS.items():
            for category, hs_code in COMMODITY_HS.items():
                key = f"{reporter_name}_{partner_name}_{category}"
                print(f"Fetching tariff: {key}...")
                # TODO: Call fetch_tariff and store rate
                # rate = fetch_tariff(reporter_code, partner_code, hs_code, year=args.year)
                # matrix[key] = rate
                matrix[key] = {"status": "stub", "tariff_rate": None}
                time.sleep(1)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(matrix, f, indent=2)

    print(f"Wrote {len(matrix)} tariff entries to {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pull applied tariff rates from World Bank WITS API"
    )
    parser.add_argument(
        "--year", default="2022", help="Tariff data year (default: 2022)"
    )
    args = parser.parse_args()
    main(args)
