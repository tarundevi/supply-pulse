import React, { useState } from 'react';
import { COLORS } from '../utils/constants';
import { parseMacroEvent } from '../utils/parseMacroEvent';

const EVENT_TYPES = [
  { type: 'tariff', example: '25% tariff on China chips', desc: 'Apply import tariffs to specific countries/categories' },
  { type: 'sanction', example: 'Sanction China', desc: 'Block trade with specific countries' },
  { type: 'currency', example: '15% currency devaluation in China', desc: 'Exchange rate changes' },
  { type: 'export_control', example: '80% export restriction on China chips', desc: 'Trade quotas and restrictions' },
];

export default function MacroEventSimulator({ onSimulate, onClear, isActive, parserConfig, placeholder }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const handleSimulate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);

    const result = await parseMacroEvent(input.trim(), parserConfig);

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
    <div className="flex items-center gap-2 relative">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'e.g. 25% tariff on China chips'}
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
          Clear
        </button>
      )}
      <span className="text-[10px] font-mono" style={{ color: COLORS.textMuted }}>
        One event per simulation.
      </span>
      <div className="relative">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs font-mono px-2 py-1 rounded border cursor-pointer hover:opacity-80"
          style={{
            borderColor: COLORS.textMuted,
            color: COLORS.textMuted,
            background: 'transparent',
          }}
        >
          ?
        </button>
        {showHelp && (
          <div
            className="absolute top-full right-0 mt-1 p-3 rounded border shadow-xl z-50 font-mono text-xs"
            style={{
              width: '320px',
              background: COLORS.panelBg,
              borderColor: COLORS.separator,
              color: COLORS.textPrimary,
            }}
          >
            <div className="font-bold mb-2" style={{ color: COLORS.electricBlue }}>
              Event Types
            </div>
            {EVENT_TYPES.map((event) => (
              <div key={event.type} className="mb-2 pb-2" style={{ borderBottom: '1px solid ' + COLORS.separator }}>
                <div className="font-bold" style={{ color: COLORS.riskMedium }}>
                  {event.type.replace('_', ' ').toUpperCase()}
                </div>
                <div style={{ color: COLORS.textMuted }}>{event.desc}</div>
                <div style={{ color: COLORS.electricBlue, marginTop: '2px' }}>
                  e.g. "{event.example}"
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && (
        <span className="text-xs font-mono" style={{ color: COLORS.riskHigh }}>
          {error}
        </span>
      )}
    </div>
  );
}
