import React from 'react';
import { COLORS } from '../utils/constants';

const SLIDER_LABELS = [
  { key: 'cost', label: 'Cost' },
  { key: 'speed', label: 'Speed' },
  { key: 'risk', label: 'Risk' },
];

export default function OptimizationSliders({ weights, onWeightsChange }) {
  const handleChange = (key, rawValue) => {
    const value = parseFloat(rawValue);
    // Adjust other weights proportionally so they still sum to 1
    const remaining = 1 - value;
    const otherKeys = SLIDER_LABELS.map((s) => s.key).filter((k) => k !== key);
    const otherSum = otherKeys.reduce((sum, k) => sum + weights[k], 0);

    const next = { ...weights, [key]: value };
    otherKeys.forEach((k) => {
      next[k] = otherSum > 0 ? (weights[k] / otherSum) * remaining : remaining / otherKeys.length;
    });
    onWeightsChange(next);
  };

  return (
    <div className="space-y-2">
      <div
        className="text-[10px] tracking-widest uppercase mb-1"
        style={{ color: COLORS.textMuted }}
      >
        Optimize By
      </div>
      {SLIDER_LABELS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-10 text-[10px]" style={{ color: COLORS.textMuted }}>
            {label}
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={weights[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            className="flex-1 accent-[#00c8ff] h-1"
          />
          <span className="w-8 text-right text-[10px] font-mono">
            {Math.round(weights[key] * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}
