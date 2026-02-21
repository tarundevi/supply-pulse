"""Fetch bilateral trade flow data from UN Comtrade and cache normalized output."""

from __future__ import annotations

import argparse
import time
from collections import defaultdict
from typing import Dict, List

from common import (
    COMMODITY_CODES,
    COUNTRY_META,
    DESTINATION_MARKETS,
    DATA_DIR,
    ensure_data_dir,
    json_dump,
    requests_session,
    today_iso,
)

API_BASE = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
OUTPUT_FILE = f"{DATA_DIR}/trade_flows.json"


def _sum_partner_values(rows: List[dict]) -> Dict[str, float]:
    partner_values: Dict[str, float] = defaultdict(float)
    for row in rows:
        partner_code = str(row.get("partnerCode") or "").strip()
        value = float(row.get("primaryValue") or 0.0)
        if not partner_code or partner_code in {"0", "all", "ALL"}:
            continue
        if value > 0:
            partner_values[partner_code] += value
    return dict(partner_values)


def fetch_exports(session, reporter_code: str, hs_code: str, period: str = "2023") -> List[dict]:
    params = {
        "reporterCode": reporter_code,
        "cmdCode": hs_code,
        "flowCode": "X",
        "period": period,
    }
    response = session.get(API_BASE, params=params, timeout=60)
    response.raise_for_status()
    payload = response.json()
    return payload.get("data", []) if isinstance(payload, dict) else []


def main(args):
    ensure_data_dir()
    session = requests_session()
    by_reporter = {}
    pulls = []

    country_items = list(COUNTRY_META.items())
    if args.limit_countries:
        country_items = country_items[: args.limit_countries]

    for reporter_code, meta in country_items:
        reporter_item = {
            "country_code": reporter_code,
            "country_iso3": meta["id"],
            "country_name": meta["country"],
            "categories": {},
        }

        for category, hs_code in COMMODITY_CODES.items():
            key = f"{reporter_code}_{category}"
            print(f"Comtrade fetch: {key}")
            try:
                rows = fetch_exports(session, reporter_code, hs_code, args.period)
            except Exception as exc:
                rows = []
                print(f"  warning: failed {key}: {exc}")

            partner_values = _sum_partner_values(rows)
            destination_exports = {}
            for market_name, market in DESTINATION_MARKETS.items():
                destination_exports[market_name] = float(partner_values.get(market["code"], 0.0))

            sorted_partners = sorted(partner_values.items(), key=lambda x: x[1], reverse=True)
            total_export_value = float(sum(partner_values.values()))

            reporter_item["categories"][category] = {
                "hs_code": hs_code,
                "total_export_value": total_export_value,
                "destination_exports": destination_exports,
                "top_partners": [{"partner_code": p, "value": v} for p, v in sorted_partners[:15]],
                "row_count": len(rows),
            }

            pulls.append(
                {
                    "reporter_code": reporter_code,
                    "country_iso3": meta["id"],
                    "category": category,
                    "hs_code": hs_code,
                    "total_export_value": total_export_value,
                    "destination_exports": destination_exports,
                    "row_count": len(rows),
                }
            )
            time.sleep(args.sleep_seconds)

        by_reporter[reporter_code] = reporter_item

    payload = {
        "metadata": {
            "source": "UN Comtrade preview API",
            "period": str(args.period),
            "pulled_on": today_iso(),
            "rows": len(pulls),
        },
        "by_reporter": by_reporter,
        "pulls": pulls,
    }
    json_dump(OUTPUT_FILE, payload)
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pull bilateral trade flow data from UN Comtrade API.")
    parser.add_argument("--period", default="2023", help="Trade data year")
    parser.add_argument("--sleep-seconds", type=float, default=1.0, help="Delay between API calls")
    parser.add_argument("--limit-countries", type=int, default=0, help="Optional: only pull first N countries")
    main(parser.parse_args())
