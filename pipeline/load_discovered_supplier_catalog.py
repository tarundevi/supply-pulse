"""Normalize curated discovered supplier catalog into staged JSON."""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

from company_common import CATEGORY_MAP_APPLE, DATA_MANUAL_DIR, DATA_STAGED_DIR, ensure_dirs, json_dump, today_iso

INPUT_FILE = f"{DATA_MANUAL_DIR}/discovered_suppliers.csv"
OUTPUT_FILE = f"{DATA_STAGED_DIR}/discovered_suppliers.json"
MAX_SUPPLIERS_PER_CATEGORY = 20
DEFAULT_CONFIDENCE = 0.7


def read_rows(path: str):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def as_float(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return default


def parse_categories(raw: str, supplier_id: str) -> list[str]:
    categories = [c.strip() for c in (raw or "").split("|") if c.strip()]
    if not categories:
        raise SystemExit(f"Discovery catalog error: supplier {supplier_id} has no categories")
    invalid = [c for c in categories if c not in CATEGORY_MAP_APPLE]
    if invalid:
        raise SystemExit(
            f"Discovery catalog error: supplier {supplier_id} has invalid categories {invalid}. "
            f"Allowed: {sorted(CATEGORY_MAP_APPLE.keys())}"
        )
    return categories


def parse_max_volume(raw: str, supplier_id: str) -> dict:
    try:
        payload = json.loads(raw or "{}")
    except Exception as exc:
        raise SystemExit(
            f"Discovery catalog error: supplier {supplier_id} has invalid max_volume_by_category JSON"
        ) from exc

    if not isinstance(payload, dict):
        raise SystemExit(
            f"Discovery catalog error: supplier {supplier_id} max_volume_by_category must be an object"
        )
    result = {}
    for category, value in payload.items():
        vol = as_float(value, 0.0)
        if vol < 0:
            raise SystemExit(
                f"Discovery catalog error: supplier {supplier_id} max volume is negative for {category}"
            )
        result[category] = vol
    return result


def main(_args):
    ensure_dirs()
    if not Path(INPUT_FILE).exists():
        json_dump(
            OUTPUT_FILE,
            {
                "metadata": {
                    "source": "manual_catalog",
                    "pulled_on": today_iso(),
                    "build_version": "discovery-v1",
                    "supplier_count": 0,
                    "category_counts": {c: 0 for c in CATEGORY_MAP_APPLE},
                    "note": "No discovery catalog file found; using empty discovered supplier list.",
                },
                "suppliers": [],
            },
        )
        print(f"Wrote {OUTPUT_FILE}")
        return

    counts = defaultdict(int)
    suppliers = []
    skipped_rows = 0

    for row in read_rows(INPUT_FILE):
        supplier_id = (row.get("supplier_id") or "").strip()
        if not supplier_id:
            raise SystemExit("Discovery catalog error: missing supplier_id")

        categories = parse_categories(row.get("categories", ""), supplier_id)
        max_volume_raw = parse_max_volume(row.get("max_volume_by_category", "{}"), supplier_id)

        allowed_categories = [c for c in categories if counts[c] < MAX_SUPPLIERS_PER_CATEGORY]
        if not allowed_categories:
            skipped_rows += 1
            continue

        max_volume_by_category = {}
        for category in allowed_categories:
            max_volume_by_category[category] = as_float(max_volume_raw.get(category), 0.0)

        confidence = as_float(row.get("confidence"), DEFAULT_CONFIDENCE)
        if not (0 <= confidence <= 1):
            raise SystemExit(
                f"Discovery catalog error: supplier {supplier_id} confidence must be in [0,1], got {confidence}"
            )

        capacity_index = as_float(row.get("capacity_index"), 0.5)
        lead_time_days = as_float(row.get("lead_time_days"), 25.0)
        unit_cost_index = as_float(row.get("unit_cost_index"), 1.0)
        concentration_share = as_float(row.get("concentration_share"), 0.0)
        if capacity_index < 0 or lead_time_days < 0 or unit_cost_index < 0:
            raise SystemExit(
                f"Discovery catalog error: supplier {supplier_id} has negative numeric fields"
            )

        for category in allowed_categories:
            counts[category] += 1

        suppliers.append(
            {
                "supplier_id": supplier_id,
                "facility_name": (row.get("facility_name") or supplier_id).strip(),
                "parent_company": (row.get("parent_company") or "Unknown").strip(),
                "country_iso3": (row.get("country_iso3") or "").strip().upper(),
                "lat": as_float(row.get("lat"), 0.0),
                "lng": as_float(row.get("lng"), 0.0),
                "categories": allowed_categories,
                "max_volume_by_category": max_volume_by_category,
                "capacity_index": capacity_index,
                "lead_time_days": lead_time_days,
                "unit_cost_index": unit_cost_index,
                "concentration_share": concentration_share,
                "confidence": confidence,
                "source_type": (row.get("source_type") or "manual_catalog").strip(),
                "notes": (row.get("notes") or "").strip(),
            }
        )

    payload = {
        "metadata": {
            "source": "manual_catalog",
            "pulled_on": today_iso(),
            "build_version": "discovery-v1",
            "supplier_count": len(suppliers),
            "category_counts": {c: int(counts[c]) for c in CATEGORY_MAP_APPLE},
            "max_suppliers_per_category": MAX_SUPPLIERS_PER_CATEGORY,
            "skipped_rows": skipped_rows,
        },
        "suppliers": suppliers,
    }
    json_dump(OUTPUT_FILE, payload)
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize discovered supplier catalog")
    main(parser.parse_args())
