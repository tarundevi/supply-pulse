"""Fetch tariff rates from WITS, with graceful fallback when endpoint blocks requests."""

from __future__ import annotations

import argparse
import re
import time
from typing import Optional

from common import (
    COMMODITY_CODES,
    COUNTRY_META,
    DATA_DIR,
    DEFAULT_TARIFF_BY_CATEGORY,
    ensure_data_dir,
    json_dump,
    requests_session,
    today_iso,
)

API_BASE = "https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN"
OUTPUT_FILE = f"{DATA_DIR}/tariff_matrix.json"
REPORTER_USA = "840"

COUNTRY_TARIFF_MULTIPLIER = {
    "MEX": 0.2,
    "CAN": 0.2,
    "KOR": 0.5,
    "JPN": 0.5,
    "DEU": 0.7,
    "NLD": 0.7,
    "ESP": 0.7,
    "ITA": 0.7,
    "SWE": 0.7,
    "POL": 0.7,
    "CHN": 1.2,
    "BRA": 1.5,
    "IND": 1.4,
    "THA": 1.0,
    "VNM": 0.9,
    "MYS": 0.9,
}


def _extract_tariff_from_xml(xml_text: str) -> Optional[float]:
    # Most SDMX payloads contain values in attributes like OBS_VALUE="2.5".
    match = re.search(r'OBS_VALUE\s*=\s*"([0-9]+(?:\.[0-9]+)?)"', xml_text)
    if not match:
        return None
    value_pct = float(match.group(1))
    return round(value_pct / 100.0, 4)


def _fallback_tariff(iso3: str, category: str) -> float:
    base = DEFAULT_TARIFF_BY_CATEGORY.get(category, 0.03)
    mult = COUNTRY_TARIFF_MULTIPLIER.get(iso3, 1.0)
    return round(min(base * mult, 0.35), 4)


def fetch_tariff(session, partner_code: str, hs_code: str, year: str) -> Optional[float]:
    url = f"{API_BASE}/reporter/{REPORTER_USA}/partner/{partner_code}/product/{hs_code}/year/{year}"
    response = session.get(url, timeout=60)
    response.raise_for_status()
    return _extract_tariff_from_xml(response.text)


def main(args):
    ensure_data_dir()
    session = requests_session()

    by_partner = {}
    pulls = []

    country_items = list(COUNTRY_META.items())
    if args.limit_countries:
        country_items = country_items[: args.limit_countries]

    for numeric_code, meta in country_items:
        iso3 = meta["id"]
        partner_item = {
            "partner_code": numeric_code,
            "partner_iso3": iso3,
            "partner_name": meta["country"],
            "tariff_rates": {},
        }

        for category, hs_code in COMMODITY_CODES.items():
            key = f"USA_{iso3}_{category}"
            print(f"WITS fetch: {key}")
            try:
                rate = fetch_tariff(session, numeric_code, hs_code, args.year)
                if rate is None:
                    raise ValueError("No OBS_VALUE found in response")
                source = "live"
            except Exception as exc:
                rate = _fallback_tariff(iso3, category)
                source = "fallback"
                print(f"  warning: failed {key}: {exc}; using fallback={rate}")

            partner_item["tariff_rates"][category] = rate
            pulls.append(
                {
                    "reporter": "USA",
                    "partner_code": numeric_code,
                    "partner_iso3": iso3,
                    "category": category,
                    "hs_code": hs_code,
                    "tariff_rate": rate,
                    "source": source,
                }
            )
            time.sleep(args.sleep_seconds)

        by_partner[iso3] = partner_item

    payload = {
        "metadata": {
            "source": "World Bank WITS",
            "year": str(args.year),
            "pulled_on": today_iso(),
            "note": "Falls back to deterministic baseline rates when WITS is unavailable.",
        },
        "by_partner": by_partner,
        "pulls": pulls,
    }

    json_dump(OUTPUT_FILE, payload)
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pull tariff rates from World Bank WITS.")
    parser.add_argument("--year", default="2022", help="Tariff data year")
    parser.add_argument("--sleep-seconds", type=float, default=0.4, help="Delay between API calls")
    parser.add_argument("--limit-countries", type=int, default=0, help="Optional: only pull first N countries")
    main(parser.parse_args())
