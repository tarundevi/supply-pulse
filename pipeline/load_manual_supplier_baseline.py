"""Normalize manual CSV datasets into staged JSON tables."""

from __future__ import annotations

import argparse
import csv

from company_common import DATA_MANUAL_DIR, DATA_STAGED_DIR, ensure_dirs, json_dump, today_iso

SUPPLIERS_FILE = f"{DATA_MANUAL_DIR}/apple_suppliers.csv"
ALLOCATIONS_FILE = f"{DATA_MANUAL_DIR}/apple_baseline_allocations.csv"
FACILITIES_FILE = f"{DATA_MANUAL_DIR}/facility_locations.csv"
OUTPUT_FILE = f"{DATA_STAGED_DIR}/manual_supplier_baseline.json"


def read_rows(path: str):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def as_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return default


def main(_args):
    ensure_dirs()
    suppliers = read_rows(SUPPLIERS_FILE)
    allocations = read_rows(ALLOCATIONS_FILE)
    facilities = read_rows(FACILITIES_FILE)

    supplier_map = {}
    for row in suppliers:
        supplier_map[row["supplier_id"]] = {
            "supplier_id": row["supplier_id"],
            "parent_company": row["parent_company"],
            "categories": [c.strip() for c in row["categories"].split("|") if c.strip()],
            "capacity_index": as_float(row.get("capacity_index"), 0.5),
            "lead_time_days": as_float(row.get("lead_time_days"), 25.0),
            "unit_cost_index": as_float(row.get("unit_cost_index"), 1.0),
            "concentration_share": as_float(row.get("concentration_share"), 0.0),
            "confidence": as_float(row.get("confidence"), 0.7),
            "source_type": row.get("source_type", "manual"),
        }

    facility_map = {row["facility_id"]: row for row in facilities}

    norm_allocations = []
    for row in allocations:
        norm_allocations.append(
            {
                "supplier_id": row["supplier_id"],
                "category": row["category"],
                "baseline_volume": as_float(row.get("baseline_volume"), 0.0),
                "baseline_share": as_float(row.get("baseline_share"), 0.0),
                "target_market": row.get("target_market", "USA"),
            }
        )

    payload = {
        "metadata": {
            "anchor_company": "Apple Inc.",
            "pulled_on": today_iso(),
            "source": "manual_csv",
        },
        "suppliers": supplier_map,
        "facilities": facility_map,
        "allocations": norm_allocations,
    }

    json_dump(OUTPUT_FILE, payload)
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize manual supplier baseline CSV files")
    main(parser.parse_args())
