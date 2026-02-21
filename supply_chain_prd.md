# SourceShift — Product Requirements Document
### Supply Chain Procurement Decision Tool | Hackathon Build

---

## 1. Vision & Problem Statement

When a region goes offline — a port closes, a country faces sanctions, a natural disaster hits a manufacturing hub — procurement teams have hours, not days, to find alternative suppliers. Today they do this manually: spreadsheets, phone calls, and institutional memory. There is no interactive tool that lets a non-technical procurement manager visualize their exposure and get a ranked alternative supplier recommendation in real time.

**SourceShift** solves this. It is a 3D globe-based procurement decision tool where a user can mark any region as disrupted and immediately receive re-routed supplier recommendations with cost, lead time, and risk tradeoffs surfaced in a financial terminal sidebar.

The demo-able pitch in one sentence: *"Click a country, watch your supply chain re-route itself in 3 seconds."*

---

## 2. Target User

**Primary:** Procurement manager or sourcing analyst at a mid-to-large manufacturer. Technically literate but not an engineer. Makes $50K–$500K sourcing decisions under time pressure. Currently uses Excel and email to manage supplier networks.

**Hackathon proxy user:** A non-technical judge who needs to understand the value proposition in under 60 seconds.

---

## 3. Core Problem Loop

This is the one flow that must work flawlessly for the demo:

```
User selects a country/region on the globe
        ↓
Region is marked "disrupted" (visual red pulse)
        ↓
Tool identifies which active supplier nodes are in that region
        ↓
Optimization engine re-routes to next best available nodes
        ↓
Globe animates new supply routes
        ↓
Terminal sidebar updates with cost delta, lead time delta,
capacity coverage %, and top 3 alternative supplier recommendations
```

Everything else in the product is polish around this loop.

---

## 4. Feature Scope

### 4.1 Core Features (Must Ship)

**Globe Visualization**
- Interactive 3D globe rendered with Globe.gl or Three.js
- 25–30 hardcoded supplier nodes displayed as colored dots
- Node color encodes supplier health: green (healthy), amber (at-risk), red (disrupted)
- Animated arc lines showing active supply routes between nodes
- Click any country to trigger disruption mode
- Disrupted region pulses red with a radial highlight
- New recommended routes animate in a distinct color (e.g. electric blue) after disruption

**Supplier Node Data (Hardcoded)**
Each node has the following fields:
- Name, Country, Region
- Product categories supplied (e.g. electronics components, textiles, raw materials)
- Unit cost index (1–100 relative scale)
- Lead time in days
- Monthly capacity (units)
- Geopolitical risk score (1–10, mocked)
- Weather/climate exposure score (1–10, mocked)
- Single-source dependency flag (boolean — is this the only node for this category?)
- Coordinates (lat/lng)

Suggested node locations: Shenzhen, Ho Chi Minh City, Monterrey, Lodz, Chennai, Penang, Guadalajara, Istanbul, Dhaka, Jakarta, Taipei, Osaka, Pune, Casablanca, Nairobi, São Paulo, Detroit, Rotterdam, Dubai, Bangalore, Manila, Warsaw, Chengdu, Colombo, Tijuana

**Optimization Engine**
- On disruption trigger, filter out all nodes in the affected country/region
- Score remaining nodes by: `(unit_cost × 0.4) + (lead_time_normalized × 0.35) + (risk_score × 0.25)`
- Return top 3 alternative nodes for each disrupted node's product category
- Weight parameters adjustable via sliders in the sidebar (see Terminal Sidebar below)

**Terminal Sidebar**
Displayed alongside the globe. Updates in real time when a disruption is triggered. Shows:

```
⚠ DISRUPTION DETECTED: [Country Name]

IMPACT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Affected Nodes:           4
Categories at Risk:       Electronics, Textiles
Capacity at Risk:         840,000 units/mo
Est. Cost Increase:       +12.4%
Est. Lead Time Increase:  +18 days

TOP ALTERNATIVE SUPPLIERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Penang, Malaysia
   Cost Index: 42  |  Lead Time: 28 days
   Capacity: 600,000 units/mo
   Risk Score: ●●●○○○○○○○ (3/10)

2. Lodz, Poland
   Cost Index: 55  |  Lead Time: 22 days
   Capacity: 400,000 units/mo
   Risk Score: ●●○○○○○○○○ (2/10)

3. Bangalore, India
   Cost Index: 38  |  Lead Time: 31 days
   Capacity: 750,000 units/mo
   Risk Score: ●●●●○○○○○○ (4/10)

RECOMMENDED ACTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Shift 60% volume to Penang
→ Shift 40% volume to Bangalore
→ Preserves 94% of current margins
```

**Optimization Weight Sliders**
Three sliders in the sidebar that let the user adjust re-ranking priority in real time:
- Cost Weight (default 40%)
- Speed Weight (default 35%)
- Risk Weight (default 25%)

Dragging a slider immediately re-ranks the alternatives list and updates the recommended action.

---

### 4.2 Differentiating Feature (Should Ship)

**Supplier Health Ring**
Each globe node renders with a colored outer ring that encodes a composite health score (geopolitical risk + weather exposure + single-source dependency). Rings are visible before any disruption is triggered. This lets users proactively see vulnerable nodes — when a judge asks "but what if Vietnam also has problems?" the amber ring is already there as an answer.

Health score formula: `(geo_risk × 0.5) + (weather_risk × 0.3) + (single_source_flag × 20)`
- Score 0–25: Green ring
- Score 26–50: Amber ring  
- Score 51+: Red ring

---

### 4.3 Stretch Features (Nice to Have)

- **Multi-region disruption:** Allow user to mark multiple countries simultaneously and see compounded impact
- **Reset button:** Clear all disruptions and animate routes back to baseline
- **Category filter:** Filter globe to show only nodes relevant to a specific product category (electronics, textiles, etc.)
- **Export summary:** Download the terminal sidebar output as a one-page PDF brief

---

## 5. UI Layout & Visual Design

```
┌─────────────────────────────────────────────────────────────┐
│  SourceShift          [Category Filter ▾]    [Reset Globe]  │
├───────────────────────────────────┬─────────────────────────┤
│                                   │  TERMINAL SIDEBAR        │
│                                   │                          │
│         3D GLOBE                  │  [Disruption Summary]    │
│                                   │                          │
│    (nodes, arcs, disruption       │  [Alternative Suppliers] │
│     highlights, animations)       │                          │
│                                   │  [Recommended Action]    │
│                                   │                          │
│                                   │  ── Optimize By ──       │
│                                   │  Cost    [====|──] 40%   │
│                                   │  Speed   [===|───] 35%   │
│                                   │  Risk    [==|────] 25%   │
└───────────────────────────────────┴─────────────────────────┘
```

**Visual Language**
- Dark background (#0a0f1e) — space/geospatial aesthetic
- Globe: deep navy ocean, subtle continent outlines in slate
- Node colors: green (#00ff9d), amber (#ffb300), red (#ff3d3d)
- Route arcs: default white/silver, recommended routes electric blue (#00c8ff)
- Terminal sidebar: dark panel (#111827) with monospace font, thin separator lines
- Typography: Inter or IBM Plex Sans for UI, IBM Plex Mono for terminal data
- Disruption animation: red radial pulse emanating from affected country, 2–3 pulses then steady glow

---

## 6. Technical Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React (Vite) | Fast setup, component model fits globe + sidebar split |
| Globe | Globe.gl | Significantly faster to implement than raw Three.js; built-in arc and point layers |
| Styling | Tailwind CSS | Utility-first, no design system setup needed in a hackathon |
| Data | Hardcoded JSON | No backend, no API keys, no deployment risk |
| Optimization | Client-side JS | Runs instantly, no latency |
| Charts (optional) | Recharts | If adding sparklines or cost comparison bars to sidebar |

No backend. No database. Everything runs in the browser.

---

## 7. Data Model

```json
// supplier_nodes.json
{
  "nodes": [
    {
      "id": "node_01",
      "name": "Shenzhen Electronics Hub",
      "city": "Shenzhen",
      "country": "China",
      "region": "East Asia",
      "lat": 22.5431,
      "lng": 114.0579,
      "categories": ["electronics", "components"],
      "cost_index": 35,
      "lead_time_days": 21,
      "monthly_capacity": 1200000,
      "geo_risk": 6,
      "weather_risk": 3,
      "single_source": false
    }
    // ... 24 more nodes
  ]
}
```

```json
// supply_routes.json
{
  "routes": [
    {
      "id": "route_01",
      "from_node": "node_01",
      "to_node": "destination_us_west",
      "volume_share": 0.45,
      "category": "electronics"
    }
  ]
}
```

---

## 8. Optimization Logic

```javascript
function rerouteSupply(disruptedCountry, nodes, weights) {
  const available = nodes.filter(n => n.country !== disruptedCountry);
  
  const scored = available.map(node => {
    const costScore = node.cost_index / 100;
    const speedScore = node.lead_time_days / 60; // normalize to 0-1
    const riskScore = (node.geo_risk + node.weather_risk) / 20;
    
    const compositeScore = 
      (costScore * weights.cost) +
      (speedScore * weights.speed) +
      (riskScore * weights.risk);
    
    return { ...node, score: compositeScore };
  });
  
  return scored.sort((a, b) => a.score - b.score).slice(0, 3);
}
```

---

## 9. Build Plan — Step by Step

### Day 1 — Foundation (Hours 1–8)

**Step 1: Project Setup (1 hour)**
- Scaffold React + Vite project
- Install dependencies: `globe.gl`, `tailwindcss`, `react-slider` (for weight sliders)
- Set up two-column layout: globe container (left, 65% width) + terminal sidebar (right, 35%)
- Apply dark color scheme globally

**Step 2: Build the Supplier Node Dataset (1.5 hours)**
- Write `supplier_nodes.json` with all 25–30 nodes
- Fill in all fields: coordinates, cost_index, lead_time, capacity, geo_risk, weather_risk, categories
- Write `supply_routes.json` connecting nodes to destination hubs (US West, EU, etc.)
- This is the most important asset in the product — spend real time making the data feel realistic

**Step 3: Render the Globe (2 hours)**
- Initialize Globe.gl with dark ocean, subtle land texture
- Render supplier nodes as points colored by health score
- Render supply route arcs in silver/white
- Implement health ring color logic (green/amber/red) based on composite risk score
- Make globe auto-rotate slowly on load

**Step 4: Click-to-Disrupt Interaction (1.5 hours)**
- Add click handler on country polygons
- On click: set `disruptedCountry` state
- Filter affected nodes, apply red pulse animation to that region
- Fade out arcs originating from disrupted nodes

**Step 5: Wire Optimization Engine (2 hours)**
- Implement `rerouteSupply()` function
- On disruption trigger: run optimization, get top 3 alternatives
- Render new recommended route arcs in electric blue from alternative nodes to destinations
- Store results in state for terminal sidebar to consume

---

### Day 2 — Terminal & Polish (Hours 9–16)

**Step 6: Build Terminal Sidebar (2.5 hours)**
- Build static terminal layout first (hardcoded placeholder data)
- Wire to disruption state: populate impact summary, alternative supplier cards
- Animate terminal content in on disruption (fade-in or typewriter effect)
- Show baseline "no disruption detected" state when globe is clean

**Step 7: Optimization Weight Sliders (1.5 hours)**
- Add three sliders (cost/speed/risk) that sum to 100%
- On slider change: re-run `rerouteSupply()` with new weights
- Update alternative supplier rankings and recommended action text in real time
- This is a key demo moment — show judges that moving the "Risk" slider to 0% changes the recommendation

**Step 8: Supplier Health Rings (1 hour)**
- Render outer ring around each globe node
- Color-code by composite health score
- Add tooltip on node hover: show node name, city, health breakdown
- Pre-disruption, the amber rings on high-risk nodes should be obviously visible

**Step 9: Animations & Visual Polish (2 hours)**
- Disruption pulse animation (CSS keyframe radial expand + fade)
- Arc draw animation on new recommended routes (Globe.gl supports animated dashes)
- Terminal counter animation for impact numbers (count up from 0)
- Add thin top navbar with logo, category filter dropdown, reset button
- Reset button: clears disruption state, re-animates back to baseline routes

**Step 10: Demo Flow Rehearsal & Bug Fixes (1 hour)**
- Walk through the complete demo loop 5+ times
- Fix any state bugs or visual glitches
- Ensure the "recommended action" text is always coherent and impressive-sounding
- Test on a projector or external screen if possible (globe colors may need adjusting)

---

## 10. Demo Script (For Judges)

> "Supply chain disruptions cost companies $184 billion annually. When a region goes offline, procurement teams have hours to react — and today they do it with spreadsheets."

> *[Click China on the globe]*

> "SourceShift instantly identifies every supplier node in that region, re-runs our optimization model across 30 global alternatives, and surfaces the three best re-routing options — ranked by cost, speed, and geopolitical risk."

> *[Point to terminal sidebar — metrics are updating]*

> "But here's what makes it a decision tool rather than a dashboard. Watch what happens when I tell it I can't afford any lead time increase."

> *[Drag Speed slider to 60%]*

> "The entire recommendation set re-ranks in real time. Different supplier, different tradeoff, same 3 seconds."

> "And notice these amber rings — those are nodes our model already flagged as at-risk before any disruption occurred. This isn't just reactive. It's proactive sourcing intelligence."

---

## 11. What to Explicitly Not Build

- No user authentication
- No real supplier database or API connections
- No backend server
- No actual pricing data
- No multi-user collaboration
- No mobile responsiveness (desktop demo only)
- No data persistence between sessions

Every hour spent on the above is an hour not spent on the core demo loop. Keep scope ruthlessly tight.

---

## 12. Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Globe.gl performance issues with 30 nodes | Low | Pre-test on Day 1; fallback to Leaflet.js 2D map if needed |
| Optimization produces nonsensical recommendations | Medium | Hardcode at least 2 "known good" disruption scenarios (China, Vietnam) and verify outputs manually |
| Demo WiFi blocks CDN for Globe.gl | Low | Bundle all dependencies locally via npm, don't rely on CDN links |
| Slider weights don't sum to 100% cleanly | Medium | Lock two sliders and derive the third automatically |
| Data looks fake to a domain expert judge | Medium | Use real city names, realistic lead times (18–45 days), and plausible cost relationships |

---

*SourceShift — Built for hackathon. Designed for procurement.*
