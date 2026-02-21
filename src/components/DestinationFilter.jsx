import React from 'react';
import { DESTINATION_MARKETS, COLORS } from '../utils/constants';

export default function DestinationFilter({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs font-mono px-2 py-1 rounded border cursor-pointer"
      style={{
        background: COLORS.panelBg,
        borderColor: COLORS.separator,
        color: COLORS.textPrimary,
      }}
    >
      {Object.entries(DESTINATION_MARKETS).map(([key, { label }]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
