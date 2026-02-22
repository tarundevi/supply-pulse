import React, { useState, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { COLORS } from '../utils/constants';
// Use a distinct API key specifically for parsing if available to prevent hitting quota limits, otherwise fallback
const parserApiKey = import.meta.env.VITE_GEMINI_PARSER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(parserApiKey);
const PROMPT = `
You are an expert supply chain data analyst. Your job is to extract supply chain information from the provided document and output it EXACTLY in the following JSON format. Do not include markdown code blocks or any conversational text. ONLY output valid JSON.

The format must match the following schema:
{
  "nodes": [
    {
      "id": "COMPANY_HQ", // Start with Company ticker/abbrev + _HQ
      "name": "Full Company Name HQ",
      "entity_type": "anchor_company",
      "parent_company_id": "Company Name", // MUST EXACTLY MATCH metadata.anchor_company string
      "lat": 0.0, // accurate latitude
      "lng": 0.0, // accurate longitude
      "country_iso3": "USA", // 3 letter ISO
      "country": "United States",
      "categories": ["category1", "category2"],
      "capacity_index": 1.0,
      "lead_time_days": 0,
      "unit_cost_index": 1.0,
      "tariff_rate_by_category": {},
      "risk_score": 0.1,
      "risk_event_count": 0,
      "concentration_share": 0,
      "confidence": 0.95,
      "sources": { "source_type": "extracted" },
      "baseline_volume_by_category": {}
    },
    // Add other facilities (suppliers, manufacturing plants)
    // For non-HQ nodes, entity_type MUST be "facility"
    // CRITICAL: parent_company_id MUST be identical to the "anchor_company" string across ALL nodes, even for 3rd party suppliers!
    // Populate capacity_index (0.0 to 1.0), lead_time_days (integer), risk_score (0-10)
  ],
  "edges": [
    {
      "source_id": "SUPPLIER_NODE_ID",
      "target_id": "COMPANY_HQ",
      "category": "category1",
      "relationship_type": "supplies",
      "baseline_volume": 100.0, // estimated volume (MUST BE BETWEEN 10.0 and 500.0)
      "baseline_share": 0.5, // 0.0 to 1.0
      "effective_cost_index": 1.0,
      "lead_time_days": 30,
      "targetLat": 0.0, // must match target_id lat
      "targetLng": 0.0, // must match target_id lng
      "target_market": "USA"
    }
    // Add other edges connecting suppliers to the HQ or tier 2 to tier 1
  ],
  "metadata": {
    "mode": "company",
    "anchor_company": "Company Name",
    "build_version": "extracted-v1",
    "assumption_notes": "Extracted from custom document.",
    "company_key": "company_name_lowercase",
    "parent_company_id": "Company Name",
    "accent_color": "#4da6ff",
    "category_labels": {
       "category1": "Category 1 Label"
    },
    "arc_colors": {
       "category1": "rgba(77,166,255,0.7)"
    }
  }
}

Guidelines:
1. Extract ALL mentioned facilities, suppliers, and manufacturing locations.
2. Estimate coordinates (lat/lng) for each location based on the city/country provided.
3. Infer the categories of components/products being supplied.
4. If specific volumes/metrics aren't explicitly stated, provide reasonable estimates. 
   - CRITICAL: \`baseline_volume\` on edges MUST be bounded between 10.0 and 500.0. Do not use massive numbers.
5. CRITICAL: \`parent_company_id\` on EVERY SINGLE NODE (including 3rd-party suppliers like Foxconn) MUST exactly match the string used in \`metadata.anchor_company\`. This groups them together.
6. Create edges representing the flow of goods.
7. The output MUST be raw JSON.
`;

export default function DataUploadPanel({ onUploadSuccess }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      const textContext = await extractTextFromFile(file);
      if (!parserApiKey) {
        throw new Error("Missing VITE_GEMINI_PARSER_API_KEY or VITE_GEMINI_API_KEY in .env");
      }

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

      const result = await model.generateContent([
        PROMPT,
        `Document Context:\n${textContext}`
      ]);

      const responseText = result.response.text();
      let jsonStr = responseText;
      if (jsonStr.includes('\`\`\`json')) {
        jsonStr = jsonStr.split('\`\`\`json')[1].split('\`\`\`')[0];
      } else if (jsonStr.includes('\`\`\`')) {
        jsonStr = jsonStr.split('\`\`\`')[1].split('\`\`\`')[0];
      }

      const parsedGraph = JSON.parse(jsonStr.trim());

      onUploadSuccess(parsedGraph);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      setError("Failed to parse document: " + err.message);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const extractTextFromFile = async (file) => {
    // For simplicity, we assume text or JSON for now. 
    // In a real prod environment, we'd add pdf.js for PDF parsing or send the file directly to Gemini 1.5 Pro via File API.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-auto flex flex-col items-start">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs font-mono px-4 py-2 rounded border shadow-lg transition-colors cursor-pointer bg-slate-900/90 hover:bg-slate-800"
        style={{ borderColor: COLORS.separator, color: COLORS.electricBlue }}
      >
        &#8853; Supply Chain Data Upload
      </button>

      {isOpen && (
        <div
          className="mt-2 p-4 rounded border shadow-2xl backdrop-blur-md flex flex-col gap-3 w-80"
          style={{ background: 'rgba(15, 23, 42, 0.95)', borderColor: COLORS.separator }}
        >
          <div className="text-sm font-bold tracking-wide" style={{ color: COLORS.textPrimary }}>
            Upload Company Data
          </div>
          <p className="text-[11px] font-mono leading-relaxed" style={{ color: COLORS.textMuted }}>
            Upload a text or JSON document containing a company's supply chain network. Our AI will automatically parse the locations, suppliers, and connections.
          </p>

          <div className="border border-dashed rounded p-4 text-center cursor-pointer hover:bg-slate-800/50 transition-colors relative"
            style={{ borderColor: COLORS.separator }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.json,.md,.csv"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isProcessing}
            />
            <div className="text-xs font-mono" style={{ color: COLORS.textPrimary }}>
              {isProcessing ? 'Processing with AI...' : 'Click or Drag File Here'}
            </div>
          </div>

          {error && (
            <div className="text-[10px] font-mono text-red-400 mt-1">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
