"""Fetch disruption signal counts from GDELT and cache normalized output."""

from __future__ import annotations

import argparse
import time

from common import COUNTRY_META, DATA_DIR, clamp, ensure_data_dir, json_dump, requests_session, today_iso

API_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
OUTPUT_FILE = f"{DATA_DIR}/disruption_signals.json"

# Keeps the demo usable when GDELT throttles.
BASELINE_COUNTS = {
    "China": 142,
    "Vietnam": 18,
    "South Korea": 34,
    "Mexico": 72,
    "India": 58,
    "Germany": 12,
    "Japan": 8,
    "Thailand": 24,
    "Malaysia": 15,
    "Brazil": 52,
    "Poland": 22,
    "Sweden": 6,
    "Netherlands": 10,
    "Spain": 19,
    "Italy": 16,
}


def fetch_disruption_count(session, country: str, timespan: str) -> int:
    params = {
        "query": f"\"supply chain\" disruption factory port {country}",
        "mode": "artlist",
        "format": "json",
        "TIMESPAN": timespan,
        "MAXRECORDS": "250",
    }
    response = session.get(API_URL, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()
    articles = payload.get("articles", []) if isinstance(payload, dict) else []
    return int(len(articles))


def main(args):
    ensure_data_dir()
    session = requests_session()

    countries = [meta["country"] for _, meta in COUNTRY_META.items()]
    if args.limit_countries:
        countries = countries[: args.limit_countries]
    raw_counts = {}

    for country in countries:
        print(f"GDELT fetch: {country}")
        try:
            count = fetch_disruption_count(session, country, args.timespan)
            source = "live"
        except Exception as exc:
            count = int(BASELINE_COUNTS.get(country, 0))
            source = "fallback"
            print(f"  warning: failed {country}: {exc}; using fallback={count}")

        raw_counts[country] = {
            "event_count": count,
            "source": source,
        }
        time.sleep(args.sleep_seconds)

    max_count = max((item["event_count"] for item in raw_counts.values()), default=1)
    normalized = {}
    for country, item in raw_counts.items():
        score = clamp((item["event_count"] / max_count) * 10.0, 0.0, 10.0)
        normalized[country] = {
            "event_count": item["event_count"],
            "risk_score": round(score, 2),
            "source": item["source"],
        }

    payload = {
        "metadata": {
            "source": "GDELT DOC API",
            "timespan": args.timespan,
            "pulled_on": today_iso(),
            "max_event_count": max_count,
        },
        "by_country": normalized,
    }

    json_dump(OUTPUT_FILE, payload)
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pull disruption event counts from GDELT.")
    parser.add_argument("--timespan", default="90d", help="Lookback window")
    parser.add_argument("--sleep-seconds", type=float, default=1.0, help="Delay between API calls")
    parser.add_argument("--limit-countries", type=int, default=0, help="Optional: only pull first N countries")
    main(parser.parse_args())
