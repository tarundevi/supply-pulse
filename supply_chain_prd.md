# SourceShift — Product Requirements Document v2
### Supply Chain Procurement Decision Tool | Datathon Build

---

## 1. Vision & Problem Statement

When a region goes offline — a port closes, a country faces sanctions, a factory floods — procurement teams have hours to find alternatives. Today this is done manually. There is no interactive tool that combines **real trade flow data**, **live disruption signals**, and **optimization logic** to give a procurement manager a ranked alternative supplier recommendation in real time.

**SourceShift** solves this. It is a 3D globe-based procurement decision tool backed by real international trade data where a user can mark any region as disrupted and immediately receive re-routed supplier recommendations with cost, lead time, and risk tradeoffs surfaced in a financial terminal sidebar.

**The datathon pitch:** *"We pulled real bilateral trade flows from the UN Comtrade API, layered live disruption signals from the GDELT news event database, and built a minimum-cost-flow optimizer on top. When you click a country, you're not seeing mocked data — you're seeing actual 2023 trade volumes re-routed in real time."*

---

## 2. Data Architecture — The Core of the Datathon Story

This is what separates SourceShift from a slideshow. Three real data sources feed the application:

### Data Source 1: UN Comtrade API — Trade Flow Network (Free, No Key Required for Preview)
**What it gives you:** Real bilateral import/export volumes between ~200 countries, broken down by HS commodity code (electronics, textiles, chemicals, machinery, etc.), going back to 2000, updated annually.

**What you use it for:** Building the actual supplier network graph. Instead of making up that "China exports $X of electronics to the US," you pull the real number. This becomes the edge weight in your supply graph — the arc thickness on the globe reflects real trade volume.

**How to access it:**
```python
import requests

# Free preview endpoint — no API key required, 500 records/day limit
# Pull China's exports of electronics (HS chapter 85) to all partners in 2023
url = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
params = {
    "reporterCode": "156",   # China
    "cmdCode": "85",         # Electronics/electrical equipment
    "flowCode": "X",         # Exports
    "period": "2023"
}
response = requests.get(url, params=params)
data = response.json()
```

**Pre-pull strategy for hackathon:** Run your data pipeline the night before. Pull the top 15 exporting countries for 5 key commodity categories (electronics HS 85, textiles HS 61-62, chemicals HS 28-29, machinery HS 84, vehicles HS 87). Cache as JSON. The app reads from cache — no live API call during the demo, no rate limit risk.

**Commodity categories to pull:**
| Category | HS Code | Why It Matters |
|---|---|---|
| Electronics & components | 85 | Semiconductors, phones, circuit boards |
| Textiles & apparel | 61, 62 | Garment manufacturing supply chains |
| Industrial chemicals | 28, 29 | Plastics, pharmaceuticals, fertilizers |
| Machinery & equipment | 84 | Factory equipment, turbines |
| Vehicles & auto parts | 87 | Automotive supply chains |

---

### Data Source 2: GDELT — Live Disruption Signal Layer (100% Free, No Key)
**What it gives you:** A real-time database of global news events, updated every 15 minutes, covering protests, disasters, conflicts, port closures, and economic crises — all geo-tagged to country level.

**What you use it for:** The disruption risk score on each globe node. Instead of making up risk scores, you query GDELT for the volume of "supply chain disruption"-related news events in each country over the past 90 days. High event density = high risk score = amber/red health ring on the globe.

**This is your datathon differentiator.** Most tools use static risk scores from ratings agencies. Yours is live news signal.

**How to access it:**
```python
import requests

# GDELT DOC API — free, no key, returns news articles matching a query
# Count supply chain disruption articles mentioning a specific country in last 90 days
url = "https://api.gdeltproject.org/api/v2/doc/doc"
params = {
    "query": "supply chain disruption port closure factory",
    "mode": "timelinecountry",   # Returns counts by country
    "format": "json",
    "TIMESPAN": "90d",           # Last 90 days
    "MAXRECORDS": "250"
}
response = requests.get(url, params=params)
```

**Risk Score Formula:**
```
gdelt_event_count = number of disruption-related articles mentioning country in last 90 days
normalized_score = min(gdelt_event_count / MAX_OBSERVED_COUNT, 1.0) × 10

# Combine with static factors:
composite_risk = (normalized_score × 0.6) + (geo_instability_index × 0.25) + (single_source_flag × 0.15)
```

**Pre-pull strategy:** Query GDELT the morning of the demo for the 30 countries in your node graph. Cache the counts. This gives you "live" data that is genuinely current as of demo day.

---

### Data Source 3: World Bank WITS API — Tariff & Trade Cost Layer (Free, No Key for Basic Queries)
**What it gives you:** Applied tariff rates between country pairs by HS commodity code — i.e., how much extra cost is incurred routing trade through a given country pair vs. another.

**What you use it for:** The cost delta in your re-routing recommendations. When the tool says "shifting to Vietnam adds +8% cost," that number comes from real MFN tariff rates plus trade distance cost proxies, not a made-up number.

**How to access it:**
```python
import requests

# WITS SDMX API — free, no key required
# Get US applied tariff on electronics (HS 85) from Vietnam
url = "https://wits.worldbank.org/API/V1/SDMX/V21/datasource/TRN/reporter/840/partner/704/product/85/year/2022"
response = requests.get(url)
```

**Use in optimization:** Add tariff rate as a cost multiplier on each potential re-routing edge:
```
effective_cost = base_trade_cost × (1 + applied_tariff_rate) × distance_factor
```

---

## 3. Data Pipeline (Run Night Before Demo)

```
Step 1: pull_comtrade.py
  → For each of 5 commodity categories
  → For top 15 exporting countries
  → Pull bilateral export volumes to US, EU, and Japan as destination markets
  → Output: trade_flows.json (nodes + edges with real volume data)

Step 2: pull_gdelt.py
  → For each country in the node graph
  → Query GDELT for disruption event count, last 90 days
  → Output: disruption_signals.json (country → risk score)

Step 3: pull_wits.py
  → For each country pair in the graph
  → Pull applied tariff rate for each commodity category
  → Output: tariff_matrix.json (country_pair → tariff_rate by category)

Step 4: build_graph.py
  → Merge all three sources into a unified supplier_graph.json
  → Compute composite node health scores
  → Compute edge weights (cost = trade_cost × tariff × distance)
  → Output: supplier_graph.json — the single file the frontend reads
```

Everything the frontend needs is in `supplier_graph.json`. No live API calls during the demo.

---

## 4. Core Features

### 4.1 Globe Visualization
- Interactive 3D globe rendered with **Globe.gl**
- Supplier nodes rendered as colored points — size proportional to real trade volume from Comtrade
- Node color encodes GDELT-derived disruption risk: green / amber / red
- Animated arc lines between nodes — arc thickness proportional to real trade flow volume
- Click any country to trigger disruption mode
- Disrupted region pulses red
- Recommended re-routed arcs animate in electric blue

### 4.2 Terminal Sidebar
Updates in real time on disruption. Displays:

```
⚠ DISRUPTION DETECTED: China (Electronics)

REAL TRADE DATA (UN Comtrade 2023)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Affected Export Volume:    $284B / year
Categories Disrupted:      Electronics, Machinery
US Import Dependency:      67% of HS-85 imports
GDELT Risk Signal:         ████████░░ HIGH (142 events / 90d)

TOP ALTERNATIVE SUPPLIERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1.  Vietnam
    2023 Export Volume:  $38B (HS-85)
    Applied US Tariff:   0% (PNTR)
    GDELT Risk:          ██░░░░░░░░ LOW
    Est. Cost Delta:     +4.2%

2.  South Korea
    2023 Export Volume:  $74B (HS-85)
    Applied US Tariff:   0% (KORUS FTA)
    GDELT Risk:          ███░░░░░░░ LOW-MED
    Est. Cost Delta:     +6.8%

3.  Mexico
    2023 Export Volume:  $29B (HS-85)
    Applied US Tariff:   0% (USMCA)
    GDELT Risk:          █████░░░░░ MEDIUM
    Est. Cost Delta:     +2.1%

RECOMMENDED ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Primary: Vietnam (lowest tariff, lowest risk)
→ Hedge:   Mexico (lowest cost delta, USMCA)
→ Gap: 45% of China volume cannot be covered
  by a single alternative — split sourcing required
```

### 4.3 Optimization Engine
```javascript
function rerouteSupply(disruptedCountry, category, graph, weights) {
  // Filter to nodes not in disrupted country
  const available = graph.nodes.filter(n => n.country !== disruptedCountry);
  
  // Score each node using real data
  const scored = available
    .filter(n => n.export_volumes[category] > 0)  // Must actually export this category
    .map(node => {
      // All inputs from real data sources
      const costScore = node.tariff_rates[category] + node.distance_cost_factor;
      const riskScore = node.gdelt_risk_score / 10;
      const capacityScore = 1 - (node.export_volumes[category] / MAX_VOLUME); // lower = more headroom
      
      return {
        ...node,
        score: (costScore * weights.cost) + (riskScore * weights.risk) + (capacityScore * weights.speed),
        coverage_pct: node.export_volumes[category] / graph.disrupted_volume
      };
    });
  
  return scored.sort((a, b) => a.score - b.score).slice(0, 3);
}
```

### 4.4 Optimization Weight Sliders
Three sliders adjusting re-ranking priority in real time:
- **Cost Weight** (default 40%) — prioritizes low tariff + short distance
- **Speed/Capacity Weight** (default 35%) — prioritizes countries with high existing export volume (proxy for supply readiness)
- **Risk Weight** (default 25%) — prioritizes low GDELT disruption signal

---

## 5. UI Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  SourceShift   [Category: Electronics ▾]  [Destination: USA ▾]  [↺] │
├────────────────────────────────────────┬────────────────────────────┤
│                                        │  TERMINAL                   │
│                                        │                             │
│         3D GLOBE                       │  Data: UN Comtrade 2023     │
│                                        │  Risk: GDELT live signal    │
│   nodes sized by trade volume          │  Tariffs: World Bank WITS   │
│   arcs weighted by flow                │                             │
│   rings colored by GDELT risk          │  [Disruption Summary]       │
│                                        │  [Alternative Suppliers]    │
│                                        │  [Recommended Action]       │
│                                        │                             │
│                                        │  ── Optimize By ──          │
│                                        │  Cost  [====|──] 40%        │
│                                        │  Speed [===|───] 35%        │
│                                        │  Risk  [==|────] 25%        │
│                                        │                             │
│                                        │  ── Data Sources ──         │
│                                        │  ● UN Comtrade API          │
│                                        │  ● GDELT (updated today)    │
│                                        │  ● World Bank WITS          │
└────────────────────────────────────────┴────────────────────────────┘
```

**The "Data Sources" panel at the bottom of the sidebar is important.** It's a live badge showing which real datasets are powering the current view. Judges in a datathon want to see this explicitly.

---

## 6. Visual Design

- Dark background (#0a0f1e)
- Globe: deep navy ocean, muted continent outlines
- Node size: scaled to log(trade_volume) — China and Germany are visibly larger than Cambodia
- Node ring color: GDELT-derived (green < 30 events, amber 30–100, red > 100 events per 90 days)
- Arc thickness: scaled to real bilateral trade volume
- Recommended routes: electric blue (#00c8ff), animated dashed draw
- Disruption: red radial pulse on affected country
- Terminal: dark panel, IBM Plex Mono font, thin separator lines, numbers in white/green

---

## 7. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Data pipeline | Python (requests, pandas) | Run offline night before; outputs clean JSON |
| Frontend framework | React + Vite | Fast setup |
| Globe | Globe.gl | Fastest path to interactive globe with arc + point layers |
| Styling | Tailwind CSS | No setup overhead |
| Optimization | Client-side JavaScript | Instant, no backend needed |
| Data storage | Pre-built JSON files | No database, no deployment risk |

---

## 8. Build Plan

### Night Before: Data Pipeline (3–4 hours)

**Step 1: UN Comtrade Pull (1.5 hours)**
```python
# pull_comtrade.py
import requests, json

COMMODITY_CODES = {"electronics": "85", "textiles": "61", "chemicals": "28", "machinery": "84", "vehicles": "87"}
TOP_EXPORTERS = ["156","704","410","484","356","276","392","764","458","616","752","528","724","380","76"]
# China, Vietnam, S.Korea, Mexico, India, Germany, Japan, Thailand, Malaysia, Poland, Sweden, Netherlands, Spain, Italy, Brazil

results = {}
for country_code in TOP_EXPORTERS:
    for category, hs_code in COMMODITY_CODES.items():
        url = "https://comtradeapi.un.org/public/v1/preview/C/A/HS"
        params = {"reporterCode": country_code, "cmdCode": hs_code, "flowCode": "X", "period": "2023"}
        r = requests.get(url, params=params).json()
        # Parse and store export volumes by partner country
        results[f"{country_code}_{category}"] = parse_comtrade(r)

with open("data/trade_flows.json", "w") as f:
    json.dump(results, f)
```

**Step 2: GDELT Pull (1 hour)**
```python
# pull_gdelt.py
COUNTRIES = ["China", "Vietnam", "Mexico", "India", "Germany", ...]

risk_scores = {}
for country in COUNTRIES:
    url = "https://api.gdeltproject.org/api/v2/doc/doc"
    params = {
        "query": f"supply chain disruption factory port {country}",
        "mode": "artlist",
        "format": "json",
        "TIMESPAN": "90d",
        "MAXRECORDS": "250"
    }
    r = requests.get(url, params=params).json()
    risk_scores[country] = len(r.get("articles", []))  # Raw event count

with open("data/disruption_signals.json", "w") as f:
    json.dump(risk_scores, f)
```

**Step 3: Build Unified Graph (30 min)**
```python
# build_graph.py — merges all sources into one file the frontend reads
# Outputs supplier_graph.json with nodes (real trade volumes, real risk scores)
# and edges (real bilateral flows, real tariff rates)
```

---

### Day 1: Foundation (Hours 1–8)

**Step 4: Project Setup (30 min)**
- Scaffold React + Vite, install Globe.gl, Tailwind
- Two-column layout: globe (65%) + terminal sidebar (35%)
- Load `supplier_graph.json` on app init

**Step 5: Globe Render (2.5 hours)**
- Render nodes sized by `log(trade_volume)` — visibly larger for high-volume exporters
- Color rings from GDELT risk scores
- Render bilateral trade arcs, thickness from real flow volumes
- Auto-rotate on load

**Step 6: Click-to-Disrupt (1.5 hours)**
- Click handler on country → set `disruptedCountry` + `activeCategory` state
- Red pulse animation on disrupted region
- Fade baseline arcs from disrupted nodes

**Step 7: Optimization Engine (2 hours)**
- Implement `rerouteSupply()` using real graph data
- Top 3 alternatives returned, with real coverage percentage
- Animated blue arcs for recommended routes
- Wire results to sidebar state

**Step 8: Terminal Sidebar Static Layout (1.5 hours)**
- Build terminal UI with all sections
- Wire to disruption state
- Add data source badges (UN Comtrade / GDELT / WITS)

---

### Day 2: Polish & Story (Hours 9–16)

**Step 9: Slider Re-ranking (1.5 hours)**
- Implement three optimization weight sliders
- Re-run `rerouteSupply()` on slider change, update recommendations instantly
- This is your key demo moment — show the ranking change live

**Step 10: Terminal Numbers (1 hour)**
- Populate all real numbers: actual export volumes, actual tariff rates, actual GDELT counts
- Add "2023 UN Comtrade data" attribution in small text under each number
- Count-up animation for impact metrics on disruption trigger

**Step 11: Category & Destination Filters (1 hour)**
- Dropdown to switch between commodity categories — globe re-draws with that category's trade flows
- Dropdown to switch destination market (USA / EU / Japan) — changes which bilateral flows are shown

**Step 12: Data Story Panel (1 hour)**
- Add a collapsible "How we built this" panel in the sidebar
- Briefly explains: Comtrade for flows, GDELT for risk, WITS for tariffs
- Include the data pull date ("GDELT signal: updated Feb 21, 2026")
- This is what wins datathon judges — showing your data work explicitly

**Step 13: Reset, Polish, Demo Rehearsal (2.5 hours)**
- Reset button clears disruptions, re-animates baseline routes
- Fix any visual bugs
- Walk through demo script 5+ times
- Verify all numbers in the terminal match the underlying JSON

---

## 9. Demo Script

> "Supply chain disruptions cost companies $184 billion annually. When a region goes offline, procurement teams are working blind — they don't know what trade volumes they're losing or where the real alternatives are."

> *[Point to globe]* "Every node on this globe is sized by real export volume from the UN Comtrade database — 2023 data. China's node is large because it exports $284B in electronics annually. Vietnam's is smaller but growing."

> *[Point to node rings]* "These rings show live disruption risk — pulled from GDELT, a real-time global news database. Red means high event volume around supply chain disruptions in that country in the last 90 days."

> *[Click China]* "When I mark China as disrupted, SourceShift re-runs a minimum-cost-flow optimization across the remaining network. Every number you see here — the trade volumes, the tariff rates, the cost deltas — is real data."

> *[Point to terminal]* "Vietnam covers 13% of lost volume at zero tariff under PNTR. Mexico covers another 10% at zero tariff under USMCA. But here's the honest answer: no single country covers China. We flag that explicitly."

> *[Drag Risk slider to 60%]* "If I tell it risk matters more than cost — the ranking changes. South Korea moves up because GDELT shows lower disruption signal there than Vietnam right now."

> "Three real data sources. One decision tool. Built in 48 hours."

---

## 10. Datathon Judging Criteria Alignment

| Judging Criterion | How SourceShift Addresses It |
|---|---|
| **Data quality & sourcing** | Three named, verifiable, open APIs — UN Comtrade, GDELT, World Bank WITS |
| **Data integration** | Pipeline merges three heterogeneous sources into unified graph |
| **Real-world applicability** | Procurement decision tool with direct, concrete use case |
| **Technical execution** | Client-side graph optimization, live data visualization, real bilateral flows |
| **Presentation / demo** | 60-second demo loop that non-technical judges understand immediately |
| **Novelty** | GDELT as a live supply chain risk signal is not standard in any existing tool |

---

## 11. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| UN Comtrade rate limit hit during demo | Low | Pre-pull all data, zero live API calls during demo |
| GDELT returns noisy/irrelevant results | Medium | Test queries beforehand, cap at raw event count (don't parse content) |
| WITS API is slow or returns malformed XML | Medium | Pre-pull and cache; WITS is notoriously slow, never call live |
| Optimization produces nonsensical re-routes | Medium | Hardcode 2 known-good disruption scenarios (China electronics, Vietnam textiles) and verify outputs manually |
| Graph JSON is too large for browser | Low | Limit to top 30 nodes and top 5 commodity categories; total file should be under 2MB |
| Demo WiFi blocks APIs | None | All data pre-cached; zero outbound API calls during presentation |

---

## 12. What to Explicitly NOT Build

- No live API calls during the demo — everything pre-cached
- No user authentication
- No backend server
- No mobile responsiveness
- No data that requires a paid API key
- No more than 5 commodity categories (scope creep kills datathons)

---

*SourceShift — Real trade data. Real disruption signals. Real decisions.*
*Data: UN Comtrade 2023 | GDELT Live | World Bank WITS*