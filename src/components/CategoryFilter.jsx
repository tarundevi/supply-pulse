import React from 'react';
import { COMMODITY_CATEGORIES_COMPANY, COLORS } from '../utils/constants';

export default function CategoryFilter({ value, onChange, categories = COMMODITY_CATEGORIES_COMPANY }) {
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
      {Object.entries(categories).map(([key, { label }]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
