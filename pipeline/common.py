"""
Shared pipeline constants and utility helpers.
"""

from __future__ import annotations

import json
import math
import os
from datetime import date
from typing import Any, Dict

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

PIPELINE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(PIPELINE_DIR, "data")
OUTPUT_GRAPH = os.path.join(PIPELINE_DIR, "..", "public", "data", "supplier_graph.json")

COMMODITY_CODES: Dict[str, str] = {
    "electronics": "85",
    "textiles": "61",
    "chemicals": "28",
    "machinery": "84",
    "vehicles": "87",
}

DESTINATION_MARKETS = {
    "USA": {"code": "842", "lat": 33.75, "lng": -118.19},
    "EU": {"code": "918", "lat": 51.90, "lng": 4.50},
    "JPN": {"code": "392", "lat": 35.44, "lng": 139.64},
}

# Rough shipping distance proxy to USA destination.
DISTANCE_COST_FACTOR = {
    "CHN": 0.08,
    "VNM": 0.09,
    "KOR": 0.07,
    "MEX": 0.03,
    "IND": 0.10,
    "DEU": 0.06,
    "JPN": 0.07,
    "THA": 0.09,
    "MYS": 0.10,
    "BRA": 0.11,
    "POL": 0.07,
    "SWE": 0.07,
    "NLD": 0.06,
    "ESP": 0.06,
    "ITA": 0.06,
}

# Fallback tariffs when WITS cannot be reached.
DEFAULT_TARIFF_BY_CATEGORY = {
    "electronics": 0.02,
    "textiles": 0.09,
    "chemicals": 0.03,
    "machinery": 0.02,
    "vehicles": 0.03,
}

# Country metadata used in graph nodes.
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
    "616": {"id": "POL", "country": "Poland", "lat": 54.35, "lng": 18.65, "hub": "Port of Gdansk"},
    "752": {"id": "SWE", "country": "Sweden", "lat": 57.71, "lng": 11.97, "hub": "Port of Gothenburg"},
    "528": {"id": "NLD", "country": "Netherlands", "lat": 51.90, "lng": 4.50, "hub": "Port of Rotterdam"},
    "724": {"id": "ESP", "country": "Spain", "lat": 39.45, "lng": -0.32, "hub": "Port of Valencia"},
    "380": {"id": "ITA", "country": "Italy", "lat": 44.41, "lng": 8.93, "hub": "Port of Genoa"},
}


def ensure_data_dir() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)


def json_dump(filepath: str, payload: Dict[str, Any]) -> None:
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def json_load(filepath: str, default: Dict[str, Any] | None = None) -> Dict[str, Any]:
    if not os.path.exists(filepath):
        return default or {}
    with open(filepath, encoding="utf-8") as f:
        return json.load(f)


def today_iso() -> str:
    return date.today().isoformat()


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(value, max_value))


def safe_log_volume(value: float) -> float:
    # Stabilize huge volume scales for scoring/weights.
    return math.log10(max(value, 0.0) + 1.0)


def requests_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=4,
        connect=4,
        read=4,
        backoff_factor=1.2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(
        {
            "User-Agent": "SourceShift-Pipeline/0.1 (datathon build)",
            "Accept": "application/json, text/plain, */*",
        }
    )
    return session
