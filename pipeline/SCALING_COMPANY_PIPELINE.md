# Scaling the Company Pipeline to More Companies

This document describes how to evolve the current Apple-first company pipeline into a multi-company pipeline that is reliable, repeatable, and fast enough for larger supplier graphs.

## Current State (Baseline)

Today the company pipeline is centered on one anchor company and one set of manual CSVs:

- `pipeline/data_manual/apple_suppliers.csv`
- `pipeline/data_manual/apple_baseline_allocations.csv`
- `pipeline/data_manual/facility_locations.csv`
- `pipeline/run_company_pipeline.py`

Outputs:

- `public/data/company_graph.json`

This is good for MVP/demo, but does not scale well to many companies or frequent refreshes.

## Scaling Goals

1. Support N anchor companies with isolated configs.
2. Reuse shared facilities/suppliers across companies.
3. Keep deterministic builds (same input -> same output).
4. Preserve provenance/confidence for every metric.
5. Avoid live API dependency at app runtime.

## Recommended Target Architecture

Use a layered model:

1. `data_manual/` for curated ground truth and overrides.
2. `data_raw/` for API snapshots (EDGAR/GDELT/tariffs).
3. `data_staged/` for normalized tables.
4. `data_output/` for per-company graphs and an optional global graph.

Proposed output files:

- `public/data/company_graph_<company_id>.json`
- `public/data/company_graph_index.json` (list of available companies + metadata)

## Directory Layout

Suggested structure:

```txt
pipeline/
  configs/
    companies/
      apple.yaml
      tesla.yaml
      nike.yaml
  data_manual/
    shared/
      facilities.csv
      suppliers.csv
    companies/
      apple_allocations.csv
      tesla_allocations.csv
  data_raw/
    <company_id>/
      edgar_company.json
      gdelt_company_risk.json
      tariff_country_matrix.json
  data_staged/
    <company_id>/
      manual_supplier_baseline.json
      normalized_suppliers.json
      normalized_edges.json
  data_output/
    company_graph_apple.json
    company_graph_tesla.json
```

## Config-Driven Execution

Move company-specific behavior into YAML/JSON config files.

Each company config should include:

- `company_id`
- `display_name`
- `ticker`
- `categories`
- `target_markets`
- `manual_files` paths
- optional country/category overrides

Then run:

```bash
python pipeline/run_company_pipeline.py --company-id apple
python pipeline/run_company_pipeline.py --company-id tesla
```

Add batch mode:

```bash
python pipeline/run_company_pipeline.py --all-companies
```

## Data Model Changes for Scale

Keep current node/edge schema, but add these fields:

### Node additions

- `company_id`: owning anchor company
- `supplier_id`: stable supplier identifier
- `facility_id`: stable facility identifier
- `last_updated`
- `version`

### Edge additions

- `company_id`
- `scenario_tags` (optional; e.g. `tariff_sensitive`, `single_source`)

### Metadata additions

- `build_id`
- `input_hash`
- `data_cutoff_date`

## ID and Dedup Strategy

When multiple companies are added, duplicate names become common. Use strict IDs:

- Supplier ID: canonical slug or LEI-backed ID
- Facility ID: `supplier_id + city + country`
- Anchor ID: stable `company_id`

Never use display names as join keys.

## API Ingestion Strategy

For scale, add caching and rate-control guards:

1. Persist raw API responses by `(endpoint, query, date)`.
2. Skip fetch if cache exists and is fresh.
3. Use retry/backoff and timeout defaults.
4. Keep fallback values, but mark `source_type: fallback`.

## Quality Gates (Must Have)

Add validation checks before writing graph:

1. Required fields present for every node/edge.
2. No orphan edges.
3. Numeric ranges:
   - `confidence` in `[0,1]`
   - no negative costs/lead-time/capacity.
4. Coverage sanity:
   - per-category baseline shares should be near 1.0 (or flagged).

Run:

```bash
python pipeline/validate_company_graph.py --path public/data/company_graph_apple.json
```

## Performance and Runtime

For larger lists of companies:

1. Build per-company graphs in parallel processes.
2. Keep each output graph small (top suppliers per category).
3. Precompute sorted recommendation candidates per category to reduce UI compute.

If graph size grows too much, write:

- `company_graph_<id>_summary.json` for UI
- `company_graph_<id>_full.json` for analysis/debug

## Frontend Integration for Multi-Company

Add company selector and lazy load graph by company:

1. On app start, load `company_graph_index.json`.
2. On company change, fetch `company_graph_<id>.json`.
3. Keep mode toggle (`company`/`country`) independent from company selector.

## Suggested Milestones

1. Config + per-company output naming.
2. Shared/manual table normalization.
3. Batch pipeline runner (`--all-companies`).
4. Validation and data quality report generation.
5. Frontend company selector + lazy loading.

## Quick Checklist

- [ ] Company config file exists.
- [ ] Manual allocations file exists for that company.
- [ ] Raw fetch cache generated.
- [ ] Staged normalized files generated.
- [ ] `company_graph_<id>.json` validated.
- [ ] Added to `company_graph_index.json`.
- [ ] UI can load and simulate tariff/outage scenarios for that company.

