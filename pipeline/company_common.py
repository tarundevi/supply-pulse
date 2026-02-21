"""Shared constants/helpers for company-mode pipeline."""

from __future__ import annotations

import json
import os
from datetime import date
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

PIPELINE_DIR = os.path.dirname(__file__)
DATA_MANUAL_DIR = os.path.join(PIPELINE_DIR, "data_manual")
DATA_RAW_DIR = os.path.join(PIPELINE_DIR, "data_raw")
DATA_STAGED_DIR = os.path.join(PIPELINE_DIR, "data_staged")
OUTPUT_GRAPH = os.path.join(PIPELINE_DIR, "..", "public", "data", "company_graph.json")

CATEGORY_MAP_APPLE = {
    "chips": {"label": "Semiconductors", "code": "chip"},
    "displays": {"label": "Displays", "code": "disp"},
    "batteries": {"label": "Batteries", "code": "batt"},
    "assembly": {"label": "Final Assembly", "code": "assy"},
    "sensors": {"label": "Sensors", "code": "sens"},
}

TARIFF_BASELINES = {
    "CHN": 0.10,
    "TWN": 0.04,
    "KOR": 0.03,
    "JPN": 0.02,
    "IND": 0.05,
    "THA": 0.03,
    "MYS": 0.03,
    "VNM": 0.03,
    "USA": 0.0,
}

COUNTRY_NAME_TO_ISO3 = {
    "china": "CHN",
    "taiwan": "TWN",
    "south korea": "KOR",
    "korea": "KOR",
    "japan": "JPN",
    "india": "IND",
    "thailand": "THA",
    "malaysia": "MYS",
    "vietnam": "VNM",
    "united states": "USA",
    "us": "USA",
}


def ensure_dirs() -> None:
    os.makedirs(DATA_RAW_DIR, exist_ok=True)
    os.makedirs(DATA_STAGED_DIR, exist_ok=True)


def requests_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=1.2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update({"User-Agent": "SourceShift-CompanyPipeline/0.1"})
    return session


def today_iso() -> str:
    return date.today().isoformat()


def json_dump(path: str, payload: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def json_load(path: str, default: Any):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)
