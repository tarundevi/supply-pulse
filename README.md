# SourceShift

Supply chain procurement decision tool.

## Run

```
npm install
npm run dev
```

## External Supplier Discovery

Out-of-network supplier discovery is now supported for company mode recommendations.

- Runtime (all companies): company graphs are augmented with cross-company discovered candidates sourced from other files in `public/data/supply_chains/`.
- Pipeline (fallback company graph): run the company pipeline to stage manual discovery catalog inputs:

```bash
python pipeline/load_discovered_supplier_catalog.py
python pipeline/build_company_graph.py
python pipeline/validate_company_graph.py
```

Curated discovery input file:

- `pipeline/data_manual/discovered_suppliers.csv`
