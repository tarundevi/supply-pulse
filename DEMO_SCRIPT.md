# 🎬 SUPPL.AI — Hackathon Demo Recording Script

**Target Length:** ~60 seconds (speed up sections marked ⏩)
**App Name:** `<suppl.ai>` (SourceShift)

---

## PRE-RECORDING SETUP (Do Before Hitting Record)

1. **Clear localStorage** — Open browser DevTools → Application → Local Storage → clear all `supplyPulse*` keys so there are no previous custom uploads cluttering the UI.
2. **Have the app running** at `localhost:5173` (or wherever `npm run dev` is serving).
3. **Pre-generate the fake company file** — Before recording, go to ChatGPT/Gemini and paste the template (below). Have the generated `.txt`    file saved on your Desktop and ready to drag-and-drop. You'll show this step in the video but can speed it up.
4. **Browser window**: Fullscreen or maximize the window. Hide bookmarks bar.
5. **Close the Terminal sidebar's clutter** — make sure the sidebar says "Click a node on the globe to simulate an outage…" (clean/idle state).

---

## LLM PROMPT TO GENERATE FAKE COMPANY DATA

Copy-paste the **SUPPLY_CHAIN_TEMPLATE.txt** file into ChatGPT / Gemini with this prefix:

> **Prompt:**
> "Fill out this supply chain template for a fictional company called **'NovaStar Aerospace'**, a mid-size aerospace & defense company headquartered in Seattle, WA that builds next-gen commercial drones and satellite communication modules. Make up realistic-sounding suppliers across at least 5 countries (USA, Germany, Japan, Taiwan, South Korea). Include financial data: $4.2B annual revenue, 180K units shipped, $23,000 avg unit price. Make the data detailed and realistic. Output as plain text matching this exact template format:"
>
> *(then paste the full SUPPLY_CHAIN_TEMPLATE.txt)*

Save the output as **`novastar_aerospace_supply_chain.txt`** on your Desktop.

---

## 🎥 RECORDING SCRIPT — STEP BY STEP

### PART 1: THE HOOK — Pre-loaded Data Showcase (~20 sec)

> *Goal: Show the app looks incredible out of the box with real-world companies.*

| # | Action | What to Show | Timing |
|---|--------|-------------|--------|
| **1.1** | **Open the app.** The globe is spinning with supply chain arcs glowing. | The 3D globe with animated supply chain arcs is visible. The `<suppl.ai>` brand & TERMINAL sidebar are showing. | 2 sec |
| **1.2** | **Industry dropdown → "Technology"** is already selected. **Company dropdown → select "Apple".** | Globe reloads with Apple's global supply chain. Arcs show semiconductor, display, assembly routes across Asia → USA. Nodes labeled on the globe. | 3 sec |
| **1.3** | **Click on a supplier node** (e.g., the Taiwan semiconductor node — TSMC or similar). | The node turns **red** (disrupted). The sidebar populates with: **SUPPLIER OUTAGE** banner, Disrupted Volume, Location, Dependency %, Risk Signal bar, **Consumer Impact Forecast** (revenue at risk, price increase, shortage), and **Alternative Suppliers** ranked with cost delta, lead time, risk bars. | 5 sec |
| **1.4** | **Pause briefly to let the viewer read the sidebar data.** Point out the Consumer Impact Forecast with revenue at risk, the alternative suppliers list, and the green recommendation lines on the globe. | Sidebar data is rich and detailed. Green arcs show rerouting on the globe. | 3 sec |
| **1.5** | **Click "Reset" button.** Switch industry to **"Automotive"** → select **"Tesla"**. | Globe animates to Tesla's supply chain — battery, motors, chassis routes. | 3 sec |
| **1.6** | **Switch to "Energy"** → select **"Saudi Aramco"** briefly. | Shows oil & gas supply chains spanning Middle East → global. Demonstrates cross-industry versatility. | 2 sec |
| **1.7** | **Click "Reset"** to clear. | Clean state. | 1 sec |

---

### PART 2: CUSTOM DATA — LLM Generation & Upload (~25 sec)

> *Goal: Show the full pipeline — template → LLM → file → upload → AI parsing → live on globe.*

| # | Action | What to Show | Timing |
|---|--------|-------------|--------|
| **2.1** | ⏩ **Show the template file briefly** — switch to a text editor or terminal tab showing `SUPPLY_CHAIN_TEMPLATE.txt`. | Viewer sees the blank template structure with placeholders like `[Enter Company Name]`, Tier 1/Tier 2 fields. | 2 sec (speed up) |
| **2.2** | ⏩ **Show pasting the template into an LLM** (ChatGPT/Gemini). Show the prompt + template being sent. | The LLM prompt is visible: "Fill this out for NovaStar Aerospace…" | 2 sec (speed up) |
| **2.3** | ⏩ **Show the LLM generating the response** — the filled-out supply chain data streams in. | Realistic-looking data with suppliers in Taiwan, Germany, Japan, etc. Financial data visible. | 2 sec (speed up) |
| **2.4** | ⏩ **Show saving the file** as `novastar_aerospace_supply_chain.txt`. | File saved on Desktop. | 1 sec (speed up) |
| **2.5** | **Switch back to suppl.ai in the browser.** Click the **"⊕ Supply Chain Data Upload"** button (top-left of the globe). | The upload panel slides open showing "Upload Company Data" with the drag-and-drop zone. | 2 sec |
| **2.6** | **Drag-and-drop** (or click to select) the `novastar_aerospace_supply_chain.txt` file into the upload zone. | Upload zone shows **"Processing with AI..."** as Gemini parses the document. | 1 sec |
| **2.7** | ⏩ **Wait for AI parsing to complete** (typically 3-8 sec). | The spinner/processing state is visible. Speed this part up in editing. | 2 sec (speed up) |
| **2.8** | **The globe auto-switches to show NovaStar Aerospace's supply chain!** Industry dropdown now shows **"Custom Uploads"** with NovaStar selected. | Arcs appear across the globe connecting Seattle → Taiwan, Germany, Japan, South Korea, etc. Nodes are labeled. Different colored arcs per component category. | 4 sec |
| **2.9** | **Let the globe rotate for a beat** — admire the custom supply chain rendered live. | The viewer realizes: any company, any data, instantly visualized. | 2 sec |

---

### PART 3: SIMULATE DISRUPTIONS ON CUSTOM DATA (~15 sec)

> *Goal: Prove the simulation engine works on custom-uploaded data, not just pre-loaded.*

| # | Action | What to Show | Timing |
|---|--------|-------------|--------|
| **3.1** | **Click on a supplier node** on the NovaStar map (e.g., the Taiwan chip supplier). | The node turns **red**. Sidebar populates with **SUPPLIER OUTAGE: [Supplier Name]**. Disrupted Volume, Consumer Impact Forecast (revenue at risk from the $4.2B baseline), and Alternative Suppliers all appear. | 5 sec |
| **3.2** | **Point out the Consumer Impact Forecast** — show the revenue at risk, price increase %, shortage duration, and the formulas section. | The math is transparent — it shows symbolic formulas, substituted values, and calculated results. | 3 sec |
| **3.3** | **Click an alternative supplier** recommendation in the sidebar. | A **green arc** appears on the globe showing the proposed reroute. The Consumer Impact "with mitigation" numbers update. | 3 sec |
| **3.4** | **Click "Reset"** to clear the outage. | Clean state with NovaStar still selected. | 1 sec |

---

### PART 4: MACROECONOMIC EVENT SIMULATION (~10 sec)

> *Goal: Show the natural language macro event input — the "wow" feature.*

| # | Action | What to Show | Timing |
|---|--------|-------------|--------|
| **4.1** | **Click into the Macro Event Simulator** text input (in the header bar). Type: **`25% tariff on Taiwan chips`** and press Enter or click **"Simulate"**. | The system parses the natural language → the globe highlights affected suppliers in Taiwan. The sidebar shows **TARIFF** banner with the %, affected nodes, cost impact analysis, and re-ranked alternative suppliers factoring in the tariff. | 5 sec |
| **4.2** | **Glance at the sidebar** — Tariff Impact Summary shows per-node tariff cost, volume affected, and alternatives from non-tariffed countries are prioritized higher. | The recommendation engine adapts in real-time to geopolitical events. | 3 sec |
| **4.3** | **Click "Clear"** on the macro event. Final wide shot of the globe spinning with the custom data. | Clean, polished ending. | 2 sec |

---

## 🏁 END — Total: ~60 seconds

---

## KEY TALKING POINTS (if doing voiceover)

- **"We built suppl.ai — a real-time supply chain risk intelligence platform."**
- **"It ships with 25+ companies across 5 industries — tech, energy, automotive, luxury, consumer electronics."**
- **"But the real power is custom data ingestion. Take any company, describe its supply chain in plain text, and our AI-powered pipeline parses it into a live, interactive 3D map."**
- **"Click any supplier to simulate an outage — instantly see revenue at risk, shortage forecasts, and ranked alternative suppliers with rerouting visualized on the globe."**
- **"Type any macroeconomic event in natural language — tariffs, sanctions, currency devaluations, export controls — and the system stress-tests your supply chain in real time."**
- **"This is procurement decision-making for the AI era."**

---

## TIMING BREAKDOWN

| Section | Real Time | After Speed-Up |
|---------|-----------|----------------|
| Part 1: Pre-loaded companies | ~19 sec | ~19 sec |
| Part 2: LLM + Upload flow | ~18 sec real + speed = | ~16 sec |
| Part 3: Custom data simulation | ~12 sec | ~12 sec |
| Part 4: Macro event | ~10 sec | ~10 sec |
| **TOTAL** | | **~57 sec** |

---

## RECORDING TIPS

- 🖱️ **Move the mouse deliberately** — no jittery movements. Smooth, confident clicks.
- 🌍 **Let the globe animate** between transitions — the 3D arcs are the visual hook.
- ⏩ **Speed up (2-4x)**: LLM generation, file saving, AI parsing/processing.
- 🎵 **Add background music**: Something techy/ambient. No lyrics.
- 📐 **Resolution**: Record at 1920×1080 minimum.
- 🔇 **If no voiceover**: Add text callouts/captions at key moments.
