#!/usr/bin/env bash
set -euo pipefail

DB="supply_pulse"
DATA_DIR="$(cd "$(dirname "$0")/../public/data" && pwd)"

# --- Pre-flight: check mongosh is available and MongoDB is running ---
if ! command -v mongosh &>/dev/null; then
  echo "ERROR: mongosh not found. Install MongoDB Community (brew install mongodb-community)."
  exit 1
fi

if ! mongosh --quiet --eval "db.runCommand({ping:1})" &>/dev/null; then
  echo "ERROR: Cannot connect to MongoDB. Is mongod running?"
  exit 1
fi

echo "==> Connected to MongoDB"

# --- Drop existing database for a clean import ---
echo "==> Dropping database '$DB'..."
mongosh --quiet "$DB" --eval "db.dropDatabase()"

# --- Helper: insert a JSON file as a single document ---
insert_doc() {
  local collection="$1"
  local file="$2"
  mongosh --quiet "$DB" --eval "
    const fs = require('fs');
    const doc = JSON.parse(fs.readFileSync('$file', 'utf8'));
    db.${collection}.insertOne(doc);
  "
}

# --- Import root-level graph files ---
echo "==> Loading supplier_graph..."
insert_doc "supplier_graph" "$DATA_DIR/supplier_graph.json"

echo "==> Loading company_graph..."
insert_doc "company_graph" "$DATA_DIR/company_graph.json"

# --- Import all supply chain files ---
echo "==> Loading supply_chains..."
count=0
for file in "$DATA_DIR"/supply_chains/*.json; do
  name=$(basename "$file" .json)
  echo "    - $name"
  insert_doc "supply_chains" "$file"
  ((count++))
done

# --- Summary ---
echo ""
echo "=== Import complete ==="
mongosh --quiet "$DB" --eval "
  const cols = db.getCollectionNames();
  print('Collections: ' + cols.join(', '));
  cols.forEach(c => print('  ' + c + ': ' + db[c].countDocuments() + ' doc(s)'));
"
echo ""
echo "Try: mongosh $DB --eval \"db.supply_chains.find({'metadata.company_key':'tesla'}).pretty()\""
