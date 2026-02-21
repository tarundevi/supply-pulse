"""Build country/category tariff matrix for company facilities."""

from __future__ import annotations

import argparse
import csv

from company_common import CATEGORY_MAP_APPLE, DATA_MANUAL_DIR, DATA_RAW_DIR, TARIFF_BASELINES, ensure_dirs, json_dump, today_iso

FACILITIES_FILE = f"{DATA_MANUAL_DIR}/facility_locations.csv"
OUTPUT_FILE = f"{DATA_RAW_DIR}/tariff_country_matrix.json"

CATEGORY_MULTIPLIER = {
    "chips": 1.2,
    "displays": 1.05,
    "batteries": 1.15,
    "assembly": 1.0,
    "sensors": 1.1,
}


def read_rows(path: str):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def main(_args):
    ensure_dirs()
    facilities = [r for r in read_rows(FACILITIES_FILE) if r.get("entity_type") != "anchor_company"]
    unique_countries = sorted({r["country_iso3"] for r in facilities})

    matrix = {}
    for iso3 in unique_countries:
        base = TARIFF_BASELINES.get(iso3, 0.04)
        matrix[iso3] = {}
        for category in CATEGORY_MAP_APPLE:
            matrix[iso3][category] = round(min(base * CATEGORY_MULTIPLIER.get(category, 1.0), 0.35), 4)

    payload = {
        "metadata": {
            "source": "hybrid",
            "tariff_year": "2025-proxy",
            "pulled_on": today_iso(),
            "note": "Deterministic country/category tariff proxy for company-mode MVP",
        },
        "tariff_by_country": matrix,
    }

    json_dump(OUTPUT_FILE, payload)
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pull/build country tariff matrix")
    main(parser.parse_args())
