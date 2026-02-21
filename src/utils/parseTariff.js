import { GoogleGenerativeAI } from '@google/generative-ai';

const VALID_COUNTRIES = ['CHN', 'VNM', 'KOR', 'MEX', 'IND', 'DEU', 'JPN', 'THA', 'MYS', 'BRA'];
const VALID_CATEGORIES = ['electronics', 'textiles', 'chemicals', 'machinery', 'vehicles'];

const SYSTEM_PROMPT = `You are a trade policy parser. Given a natural language tariff scenario, extract structured data.

Return ONLY valid JSON (no markdown fences, no explanation) in this exact format:
{
  "countries": ["CHN"],
  "categories": ["electronics"],
  "tariffRate": 0.25,
  "isIncrement": false
}

Rules:
- countries: array of ISO 3166-1 alpha-3 codes. Valid values: ${VALID_COUNTRIES.join(', ')}
- categories: array from [${VALID_CATEGORIES.join(', ')}]. If the user says "all goods" or is vague, include all categories.
- tariffRate: decimal (e.g. 25% → 0.25)
- isIncrement: true if the user says "additional" or "increase by", false if they state an absolute rate
- Map common names: China→CHN, Vietnam→VNM, South Korea→KOR, Mexico→MEX, India→IND, Germany→DEU, Japan→JPN, Thailand→THA, Malaysia→MYS, Brazil→BRA`;

let genAI = null;

function getClient() {
  if (!genAI) {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error('VITE_GEMINI_API_KEY is not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

export async function parseTariffInput(userInput) {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\nUser input: ' + userInput }] },
      ],
    });

    let text = result.response.text().trim();
    // Strip markdown fences if present
    text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');

    const parsed = JSON.parse(text);

    // Validate
    const countries = (parsed.countries || []).filter((c) => VALID_COUNTRIES.includes(c));
    const categories = (parsed.categories || []).filter((c) => VALID_CATEGORIES.includes(c));

    if (countries.length === 0) return { error: 'Could not identify target country' };
    if (categories.length === 0) return { error: 'Could not identify product category' };
    if (typeof parsed.tariffRate !== 'number' || parsed.tariffRate <= 0 || parsed.tariffRate > 1) {
      return { error: 'Invalid tariff rate — use a percentage like "25%"' };
    }

    return {
      countries,
      categories,
      tariffRate: parsed.tariffRate,
      isIncrement: !!parsed.isIncrement,
    };
  } catch (err) {
    return { error: err.message || 'Failed to parse tariff input' };
  }
}
