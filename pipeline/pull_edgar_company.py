"""Pull basic anchor company metadata from SEC EDGAR endpoints."""

from __future__ import annotations

import argparse

from company_common import DATA_RAW_DIR, ensure_dirs, json_dump, requests_session, today_iso

SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json"
OUTPUT_FILE = f"{DATA_RAW_DIR}/edgar_company.json"


def main(args):
    ensure_dirs()
    session = requests_session()
    session.headers.update({"Accept": "application/json"})

    payload = {
        "anchor_company": args.anchor_company,
        "ticker": args.ticker,
        "cik": None,
        "title": args.anchor_company,
        "source": "fallback",
        "pulled_on": today_iso(),
        "notes": "Using fallback metadata; SEC call unavailable.",
    }

    try:
        resp = session.get(SEC_TICKERS_URL, timeout=45)
        resp.raise_for_status()
        data = resp.json()
        for _, item in data.items():
            if str(item.get("ticker", "")).upper() == args.ticker.upper():
                payload.update(
                    {
                        "cik": str(item.get("cik_str", "")).zfill(10),
                        "title": item.get("title", args.anchor_company),
                        "source": "free_api",
                        "notes": "Pulled from SEC company_tickers.json",
                    }
                )
                break
    except Exception as exc:
        payload["error"] = str(exc)

    json_dump(OUTPUT_FILE, payload)
    print(f"Wrote {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pull anchor company metadata from SEC")
    parser.add_argument("--anchor-company", default="Apple Inc.")
    parser.add_argument("--ticker", default="AAPL")
    main(parser.parse_args())
