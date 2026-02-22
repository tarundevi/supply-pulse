import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
const EVENT_MARKERS = [
  /tariff/,
  /sanction|embargo|ban|block trade/,
  /interest rate|rate hike|rate increase|cost of capital/,
  /currency|devaluation|appreciation|exchange rate|forex|fx/,
  /export control|quota|restriction|export limit/,
];

function getClient() {
  if (!genAI) {
    const key = import.meta.env.VITE_GEMINI_API_KEY;
    if (!key) throw new Error('VITE_GEMINI_API_KEY is not set');
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

function countEventTypeMatches(text) {
  return EVENT_MARKERS.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function hasMultiEventInput(userInput) {
  const text = userInput.toLowerCase();
  if (countEventTypeMatches(text) > 1) return true;

  const segments = text
    .split(/,|;|\bthen\b|\band\b/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const segmentHits = segments.filter((segment) => countEventTypeMatches(segment) > 0).length;
  return segmentHits > 1;
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
  const rate = pctMatch ? Number(pctMatch[1]) / 100 : null;

  let eventType = 'tariff';
  
  if (/sanction|embargo|ban|block trade/.test(text)) {
    eventType = 'sanction';
  } else if (/interest rate|rate hike|rate increase|cost of capital/.test(text)) {
    eventType = 'interest_rate';
  } else if (/currency|devaluation|appreciation|exchange rate|forex|fx/.test(text)) {
    eventType = 'currency';
  } else if (/export control|quota|restriction|export limit/.test(text)) {
    eventType = 'export_control';
  }

  const baseResult = {
    countries: Array.from(countries),
    categories: categories.size > 0 ? Array.from(categories) : (config.validCategories || []),
    eventType,
  };

  if (eventType === 'tariff') {
    return {
      ...baseResult,
      tariffRate: rate,
      isIncrement: /additional|increase by|raise by|add/.test(text),
    };
  }

  if (eventType === 'interest_rate') {
    return {
      ...baseResult,
      rateChangePct: rate || 0.01,
    };
  }

  if (eventType === 'currency') {
    return {
      ...baseResult,
      currencyChangePct: rate || 0.1,
    };
  }

  if (eventType === 'export_control') {
    return {
      ...baseResult,
      restrictionLevel: rate || 0.5,
    };
  }

  if (eventType === 'sanction') {
    return baseResult;
  }

  return baseResult;
}

function buildSystemPrompt(config) {
  return `You are a macroeconomic event parser. Detect the event type and return valid JSON.

Available event types:

1. tariff: Applied tariff rates on countries/categories
Format: { "eventType": "tariff", "countries": ["CHN"], "categories": ["electronics"], "tariffRate": 0.25, "isIncrement": false }

2. sanction: Complete trade block
Format: { "eventType": "sanction", "countries": ["RUS"], "categories": ["electronics"] }

3. currency: Currency exchange rate change
Format: { "eventType": "currency", "countries": ["CHN"], "currencyChangePct": -0.15 }

4. export_control: Trade restrictions/quotas
Format: { "eventType": "export_control", "countries": ["CHN"], "categories": ["chips"], "restrictionLevel": 0.8 }

Rules:
- eventType: must be one of [tariff, sanction, currency, export_control]
- countries: array of ISO3 codes from: ${(config.validCountries || []).join(', ')} (required)
- categories: array from: ${(config.validCategories || []).join(', ')} (required)
- tariffRate: decimal percentage (25% -> 0.25)
- currencyChangePct: negative for devaluation, positive for appreciation
- restrictionLevel: 0-1 percentage (80% restriction -> 0.8)
- isIncrement: true for phrases like "additional" or "increase by"
- If user is vague on category, return all categories from appropriate mode

Respond ONLY with valid JSON matching one of the above formats. Detect event type based on keywords like: sanction/embargo, currency/devaluation, export control/quota.`;
}

export async function parseMacroEvent(userInput, config) {
  const validCountries = config?.validCountries || [];
  const validCategories = config?.validCategories || [];

  try {
    if (hasMultiEventInput(userInput)) {
      return { error: 'Please simulate one event at a time.' };
    }

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

    if (!parsed.eventType) {
      return { error: 'Could not identify event type' };
    }

    if (parsed.eventType === 'interest_rate') {
      return { error: 'Interest-rate simulation is currently unavailable. Use tariff, sanction, currency, or export control.' };
    }

    if (countries.length === 0) return { error: 'Could not identify target country' };
    if (categories.length === 0) return { error: 'Could not identify product category' };

    if (parsed.eventType === 'tariff') {
      if (typeof parsed.tariffRate !== 'number' || parsed.tariffRate <= 0 || parsed.tariffRate > 1) {
        return { error: 'Invalid tariff rate - use a percentage like "25%"' };
      }

      return {
        eventType: 'tariff',
        countries,
        categories,
        tariffRate: parsed.tariffRate,
        isIncrement: !!parsed.isIncrement,
      };
    }

    if (parsed.eventType === 'sanction') {
      return {
        eventType: 'sanction',
        countries,
        categories,
      };
    }

    if (parsed.eventType === 'currency') {
      if (typeof parsed.currencyChangePct !== 'number') {
        return { error: 'Invalid currency change value' };
      }

      return {
        eventType: 'currency',
        countries,
        categories,
        currencyChangePct: parsed.currencyChangePct,
      };
    }

    if (parsed.eventType === 'export_control') {
      if (typeof parsed.restrictionLevel !== 'number' || parsed.restrictionLevel < 0 || parsed.restrictionLevel > 1) {
        return { error: 'Restriction level must be 0-100%' };
      }

      return {
        eventType: 'export_control',
        countries,
        categories,
        restrictionLevel: parsed.restrictionLevel,
      };
    }

    return { error: 'Unsupported event type' };
  } catch (err) {
    return { error: err.message || 'Failed to parse event input' };
  }
}

export async function parseTariffInput(userInput, config) {
  const result = await parseMacroEvent(userInput, config);
  if (result.eventType === 'tariff') {
    return {
      countries: result.countries,
      categories: result.categories,
      tariffRate: result.tariffRate,
      isIncrement: result.isIncrement,
    };
  }
  if (result.error) {
    return { error: result.error };
  }
  return { error: 'Not a tariff event' };
}
