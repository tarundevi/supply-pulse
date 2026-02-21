import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getClient() {
  if (!genAI) {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error('VITE_GEMINI_API_KEY is not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

function regexFallback(userInput, config) {
  const text = userInput.toLowerCase();
  const countries = new Set();
  Object.entries(config.countryAliases || {}).forEach(([alias, iso]) => {
    if (text.includes(alias)) countries.add(iso);
  });

  const categories = new Set();
  Object.entries(config.categoryAliases || {}).forEach(([alias, cat]) => {
    if (text.includes(alias)) categories.add(cat);
  });

  const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const tariffRate = pctMatch ? Number(pctMatch[1]) / 100 : null;
  const isIncrement = /additional|increase by|raise by|add/.test(text);

  return {
    countries: Array.from(countries),
    categories: categories.size > 0 ? Array.from(categories) : (config.validCategories || []),
    tariffRate,
    isIncrement,
  };
}

function buildSystemPrompt(config) {
  return `You are a tariff scenario parser.
Return ONLY valid JSON in this format:
{
  "countries": ["CHN"],
  "categories": ["electronics"],
  "tariffRate": 0.25,
  "isIncrement": false
}
Rules:
- countries must be from: ${(config.validCountries || []).join(', ')}
- categories must be from: ${(config.validCategories || []).join(', ')}
- tariffRate: decimal percentage (25% -> 0.25)
- isIncrement true for phrases like "additional" or "increase by"
- if user is vague on category, return all categories`;
}

export async function parseTariffInput(userInput, config) {
  const validCountries = config?.validCountries || [];
  const validCategories = config?.validCategories || [];

  try {
    let parsed;
    try {
      const client = getClient();
      const model = client.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: buildSystemPrompt(config) + '\n\nUser input: ' + userInput }] }],
      });

      let text = result.response.text().trim();
      text = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      parsed = JSON.parse(text);
    } catch {
      parsed = regexFallback(userInput, config || {});
    }

    const countries = (parsed.countries || []).filter((c) => validCountries.includes(c));
    const categories = (parsed.categories || []).filter((c) => validCategories.includes(c));

    if (countries.length === 0) return { error: 'Could not identify target country' };
    if (categories.length === 0) return { error: 'Could not identify product category' };
    if (typeof parsed.tariffRate !== 'number' || parsed.tariffRate <= 0 || parsed.tariffRate > 1) {
      return { error: 'Invalid tariff rate - use a percentage like "25%"' };
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
