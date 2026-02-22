import React from 'react';
import { COLORS, MODE_CATEGORY_MAP, getNodeVolume } from '../utils/constants';
import { formatPercent, formatVolume } from '../utils/formatters';

export default function TariffImpactSummary({ affectedNodes, category, macroEvent, mode = 'company' }) {
  if (!affectedNodes || affectedNodes.length === 0 || !macroEvent) return null;

  const categoryLabel = MODE_CATEGORY_MAP[mode]?.[category]?.label || category;
  const eventType = macroEvent.eventType;

  const renderContent = () => {
    switch (eventType) {
      case 'tariff': {
        const totalAffectedVolume = affectedNodes.reduce(
          (sum, n) => sum + (getNodeVolume(n, category)),
          0
        );

        return (
          <>
            <div className="text-xs tracking-widest uppercase mt-3 mb-1" style={{ color: COLORS.textMuted }}>
              Tariff Simulation ({categoryLabel})
            </div>
            <div className="border-t mb-2" style={{ borderColor: COLORS.separator }} />

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Simulated Tariff:</span>
                <span className="font-bold text-amber-400">
                  {Math.round(macroEvent.tariffRate * 100)}%{macroEvent.isIncrement ? ' additional' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Countries Affected:</span>
                <span>{macroEvent.countries.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Total Exposed Volume:</span>
                <span className="font-bold">{formatVolume(totalAffectedVolume)} units / cycle</span>
              </div>
            </div>

            <div className="border-t mt-2 pt-2" style={{ borderColor: COLORS.separator }} />

            <div className="space-y-1 text-xs">
              {affectedNodes.map((node) => (
                <div key={node.id} className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>{node.name} ({node.country_iso3})</span>
                  <span className="text-amber-400">
                    {formatVolume(getNodeVolume(node, category))} @ {formatPercent(node.tariff_rate_by_category?.[category] || 0)}
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      }

      case 'sanction': {
        const totalBlockedVolume = affectedNodes.reduce(
          (sum, n) => sum + (getNodeVolume(n, category)),
          0
        );

        return (
          <>
            <div className="text-xs tracking-widest uppercase mt-3 mb-1" style={{ color: COLORS.textMuted }}>
              Supply Blocked ({categoryLabel})
            </div>
            <div className="border-t mb-2" style={{ borderColor: COLORS.separator }} />

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Sanctioned Countries:</span>
                <span className="font-bold text-red-400">{macroEvent.countries.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Categories Affected:</span>
                <span>{macroEvent.categories.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Total Blocked Volume:</span>
                <span className="font-bold text-red-400">{formatVolume(totalBlockedVolume)} units / cycle</span>
              </div>
            </div>

            <div className="border-t mt-2 pt-2" style={{ borderColor: COLORS.separator }} />

            <div className="space-y-1 text-xs">
              {affectedNodes.map((node) => (
                <div key={node.id} className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>{node.name} ({node.country_iso3})</span>
                  <span className="text-red-400">
                    BLOCKED - {formatVolume(getNodeVolume(node, category))}
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      }

      case 'currency': {
        const totalAffectedVolume = affectedNodes.reduce(
          (sum, n) => sum + (getNodeVolume(n, category)),
          0
        );
        const changeDir = macroEvent.currencyChangePct < 0 ? 'Devaluation' : 'Appreciation';

        return (
          <>
            <div className="text-xs tracking-widest uppercase mt-3 mb-1" style={{ color: COLORS.textMuted }}>
              FX Impact ({categoryLabel})
            </div>
            <div className="border-t mb-2" style={{ borderColor: COLORS.separator }} />

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Currency Change:</span>
                <span className={`font-bold ${macroEvent.currencyChangePct < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {macroEvent.currencyChangePct < 0 ? '' : '+'}{Math.round(macroEvent.currencyChangePct * 100)}% ({changeDir})
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Countries Affected:</span>
                <span>{macroEvent.countries.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Total Exposed Volume:</span>
                <span className="font-bold">{formatVolume(totalAffectedVolume)} units / cycle</span>
              </div>
            </div>

            <div className="border-t mt-2 pt-2" style={{ borderColor: COLORS.separator }} />

            <div className="space-y-1 text-xs">
              {affectedNodes.map((node) => (
                <div key={node.id} className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>{node.name} ({node.country_iso3})</span>
                  <span className={macroEvent.currencyChangePct < 0 ? 'text-green-400' : 'text-red-400'}>
                    {macroEvent.currencyChangePct < 0 ? '-' : '+'}{Math.round(Math.abs(macroEvent.currencyChangePct) * 100)}% cost
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      }

      case 'export_control': {
        const totalAffectedVolume = affectedNodes.reduce(
          (sum, n) => sum + (getNodeVolume(n, category)),
          0
        );
        const capacityReduction = Math.round(macroEvent.restrictionLevel * 100);

        return (
          <>
            <div className="text-xs tracking-widest uppercase mt-3 mb-1" style={{ color: COLORS.textMuted }}>
              Export Restriction ({categoryLabel})
            </div>
            <div className="border-t mb-2" style={{ borderColor: COLORS.separator }} />

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Restriction Level:</span>
                <span className="font-bold text-amber-400">{capacityReduction}% capacity reduction</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Countries Affected:</span>
                <span>{macroEvent.countries.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Categories Affected:</span>
                <span>{macroEvent.categories.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: COLORS.textMuted }}>Total Affected Volume:</span>
                <span className="font-bold">{formatVolume(totalAffectedVolume)} units / cycle</span>
              </div>
            </div>

            <div className="border-t mt-2 pt-2" style={{ borderColor: COLORS.separator }} />

            <div className="space-y-1 text-xs">
              {affectedNodes.map((node) => (
                <div key={node.id} className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>{node.name} ({node.country_iso3})</span>
                  <span className="text-amber-400">
                    {capacityReduction}% capacity cut
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  const getHeader = () => {
    switch (eventType) {
      case 'tariff':
        return 'TARIFF IMPACT DETECTED';
      case 'sanction':
        return 'SUPPLY BLOCKED';
      case 'currency':
        return 'FX IMPACT';
      case 'export_control':
        return 'EXPORT RESTRICTION';
      default:
        return 'MACRO EVENT DETECTED';
    }
  };

  const getIcon = () => {
    switch (eventType) {
      case 'sanction':
        return <span className="text-red-500 text-lg">&#10060;</span>;
      default:
        return <span className="text-amber-500 text-lg">&#9888;</span>;
    }
  };

  const getHeaderColor = () => {
    switch (eventType) {
      case 'sanction':
        return 'text-red-400';
      default:
        return 'text-amber-400';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className={`font-bold text-sm tracking-wide ${getHeaderColor()}`}>
          {getHeader()}
        </span>
      </div>
      {renderContent()}
    </div>
  );
}
