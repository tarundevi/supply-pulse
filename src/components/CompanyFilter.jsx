import React from 'react';
import { COLORS } from '../utils/constants';

export default function CompanyFilter({ value, onChange, companies }) {
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
      {companies.map(({ key, label }) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
