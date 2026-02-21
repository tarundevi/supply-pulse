"""
pull_gdelt.py — Fetch supply chain disruption signals from GDELT.

Queries the GDELT DOC API for news articles related to supply chain
disruptions, port closures, factory shutdowns, etc. for each country
in the supplier graph. Returns event counts per country over a 90-day window.

API: https://api.gdeltproject.org/api/v2/doc/doc
No API key required. Free and unlimited.

Output: pipeline/data/disruption_signals.json
"""

import argparse
import json
import os
import time

import requests

COUNTRIES = [
    "China", "Vietnam", "South Korea", "Mexico", "India",
    "Germany", "Japan", "Thailand", "Malaysia", "Brazil",
]

API_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "disruption_signals.json")


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


def fetch_disruption_count(country, timespan="90d"):
    """Query GDELT for supply chain disruption articles mentioning a country."""
    params = {
        "query": f"supply chain disruption factory port {country}",
        "mode": "artlist",
        "format": "json",
        "TIMESPAN": timespan,
        "MAXRECORDS": "250",
    }
    # TODO: Implement actual API call
    # data = fetch_with_rate_limit_handling(API_URL, params)
    # if data:
    #     return len(data.get("articles", []))
    return 0


def main(args):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    risk_scores = {}

    for country in COUNTRIES:
        print(f"Querying GDELT for {country}...")
        # TODO: Call fetch_disruption_count and store raw event count
        # count = fetch_disruption_count(country, timespan=args.timespan)
        # risk_scores[country] = count
        risk_scores[country] = {"status": "stub", "event_count": 0}
        time.sleep(1)

    with open(OUTPUT_FILE, "w") as f:
        json.dump(risk_scores, f, indent=2)

    print(f"Wrote disruption signals for {len(risk_scores)} countries to {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pull supply chain disruption signals from GDELT"
    )
    parser.add_argument(
        "--timespan", default="90d", help="GDELT lookback window (default: 90d)"
    )
    args = parser.parse_args()
    main(args)
