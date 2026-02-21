import React, { useState } from 'react';
import { COLORS } from '../utils/constants';
import { parseTariffInput } from '../utils/parseTariff';

export default function TariffSimulator({ onSimulate, onClear, isActive }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSimulate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);

    const result = await parseTariffInput(input.trim());

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    onSimulate(result);
    setLoading(false);
  };

  const handleClear = () => {
    setInput('');
    setError(null);
    onClear();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading) handleSimulate();
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. 25% tariff on Chinese electronics"
        disabled={loading}
        className="text-xs font-mono px-2 py-1 rounded border outline-none"
        style={{
          width: '280px',
          borderColor: error ? COLORS.riskHigh : COLORS.separator,
          color: COLORS.textPrimary,
          background: COLORS.panelBg,
        }}
      />
      <button
        onClick={handleSimulate}
        disabled={loading || !input.trim()}
        className="text-xs font-mono px-2 py-1 rounded border cursor-pointer hover:opacity-80 disabled:opacity-40"
        style={{
          borderColor: COLORS.electricBlue,
          color: COLORS.electricBlue,
          background: 'transparent',
        }}
      >
        {loading ? 'Parsing...' : 'Simulate'}
      </button>
      {isActive && (
        <button
          onClick={handleClear}
          className="text-xs font-mono px-2 py-1 rounded border cursor-pointer hover:opacity-80"
          style={{
            borderColor: COLORS.riskHigh,
            color: COLORS.riskHigh,
            background: 'transparent',
          }}
        >
          Clear Tariff
        </button>
      )}
      {error && (
        <span className="text-xs font-mono" style={{ color: COLORS.riskHigh }}>
          {error}
        </span>
      )}
    </div>
  );
}
