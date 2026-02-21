"""
pull_comtrade.py — Fetch bilateral trade flow data from UN Comtrade API.

For each commodity category (HS codes 85, 61, 28, 84, 87) and each of the
top 15 exporting countries, pulls export volumes to US, EU, and Japan.

API: https://comtradeapi.un.org/public/v1/preview/C/A/HS
Rate limit: 500 records/day on free preview tier (no API key required).

Output: pipeline/data/trade_flows.json
"""

import argparse
import json
import os
import time

import requests

COMMODITY_CODES = {
    "electronics": "85",
    "textiles": "61",
    "chemicals": "28",
    "machinery": "84",
    "vehicles": "87",
}

TOP_EXPORTERS = [
    "156", "704", "410", "484", "356",
    "276", "392", "764", "458", "076",
    "616", "752", "528", "724", "380",
]

DESTINATION_MARKETS = {
    "USA": "842",
    "EU": "918",
    "JPN": "392",
}

API_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "trade_flows.json")


def fetch_with_rate_limit_handling(url, params=None, max_retries=3):
    """Make HTTP request with rate limit handling and friendly error messages."""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, params=params, timeout=30)
            
            if response.status_code == 429:
                wait_time = int(response.headers.get('Retry-After', 60))
                print(f"  ⚠ Rate limit hit. Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
                continue
                
            if response.status_code == 403:
                print("  ✕ Access forbidden. The API may require authentication.")
                return None
                
            if response.status_code >= 500:
                print(f"  ⚠ Server error ({response.status_code}). Retrying in 5 seconds...")
                time.sleep(5)
                continue
                
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            print(f"  ⚠ Request timed out. Retrying ({attempt + 1}/{max_retries})...")
            time.sleep(5)
        except requests.exceptions.ConnectionError:
            print("  ✕ Connection error. Please check your internet connection.")
            return None
        except requests.exceptions.HTTPError as e:
            print(f"  ✕ HTTP error: {e}")
            return None
    
    print("  ✕ Failed after all retries. Please try again later.")
    return None


def main(args):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    results = {}

    for country_code in TOP_EXPORTERS:
        for category, hs_code in COMMODITY_CODES.items():
            key = f"{country_code}_{category}"
            print(f"Fetching {key}...")
            # TODO: Call fetch_exports, parse response, aggregate by partner
            # data = fetch_exports(country_code, hs_code, period=args.period)
            # results[key] = parse_comtrade_response(data)
            results[key] = {"status": "stub", "reporter": country_code, "hs": hs_code}
            time.sleep(1)  # Respect rate limits

    with open(OUTPUT_FILE, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Wrote {len(results)} entries to {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pull bilateral trade flow data from UN Comtrade API"
    )
    parser.add_argument(
        "--period", default="2023", help="Trade data year (default: 2023)"
    )
    args = parser.parse_args()
    main(args)
