"""Run the full data pipeline in sequence."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run_step(step_name: str, cmd: list[str]) -> None:
    print(f"\n=== {step_name} ===")
    print("$", " ".join(cmd))
    result = subprocess.run(cmd, cwd=ROOT)
    if result.returncode != 0:
        raise SystemExit(f"Step failed: {step_name} (exit {result.returncode})")


def main(args):
    python = sys.executable
    comtrade_cmd = [python, "pull_comtrade.py", "--period", args.comtrade_period]
    gdelt_cmd = [python, "pull_gdelt.py", "--timespan", args.gdelt_timespan]
    wits_cmd = [python, "pull_wits.py", "--year", args.wits_year]

    if args.limit_countries:
        limit_str = str(args.limit_countries)
        comtrade_cmd += ["--limit-countries", limit_str]
        gdelt_cmd += ["--limit-countries", limit_str]
        wits_cmd += ["--limit-countries", limit_str]

    run_step("Pull Comtrade", comtrade_cmd)
    run_step("Pull GDELT", gdelt_cmd)
    run_step("Pull WITS", wits_cmd)
    run_step("Build Graph", [python, "build_graph.py"])
    print("\nPipeline complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run all pipeline steps")
    parser.add_argument("--comtrade-period", default="2023")
    parser.add_argument("--gdelt-timespan", default="90d")
    parser.add_argument("--wits-year", default="2022")
    parser.add_argument("--limit-countries", type=int, default=0, help="Optional: run on first N countries")
    main(parser.parse_args())
