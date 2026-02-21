"""Run full company-mode pipeline."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run_step(name: str, cmd: list[str]) -> None:
    print(f"\n=== {name} ===")
    print("$", " ".join(cmd))
    result = subprocess.run(cmd, cwd=ROOT)
    if result.returncode != 0:
        raise SystemExit(f"Step failed: {name} ({result.returncode})")


def main(args):
    python = sys.executable
    run_step("Load manual baseline", [python, "load_manual_supplier_baseline.py"])
    run_step("Pull EDGAR company", [python, "pull_edgar_company.py", "--anchor-company", args.anchor_company, "--ticker", args.ticker])
    run_step("Pull GDELT risk", [python, "pull_gdelt_company_risk.py", "--timespan", args.gdelt_timespan])
    run_step("Pull country tariffs", [python, "pull_country_tariffs.py"])
    run_step("Build company graph", [python, "build_company_graph.py"])
    run_step("Validate company graph", [python, "validate_company_graph.py"])
    print("\nCompany pipeline complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run all company-mode pipeline steps")
    parser.add_argument("--anchor-company", default="Apple Inc.")
    parser.add_argument("--ticker", default="AAPL")
    parser.add_argument("--gdelt-timespan", default="90d")
    main(parser.parse_args())
