import React, { useState } from 'react';
import { COLORS } from '../utils/constants';

export default function TariffInput() {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        // For now, this just logs to the console as it will be used in the future
        console.log('Tariff query submitted:', query);
        setQuery('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="absolute bottom-4 right-4 w-80 p-3 flex flex-col gap-2 rounded-lg border shadow-xl backdrop-blur-md pointer-events-auto font-mono z-10 bg-slate-900/85"
            style={{
                borderColor: COLORS.separator
            }}
        >
            <div className="text-sm font-bold tracking-wide" style={{ color: COLORS.electricBlue }}>
                TARIFF SIMULATION
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., Apply 25% tariff on electronics from China..."
                    className="flex-1 bg-black/50 border rounded px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#00c8ff]"
                    style={{ borderColor: COLORS.separator }}
                />
                <button
                    type="submit"
                    className="px-3 py-2 rounded text-xs font-bold transition-colors"
                    style={{
                        background: COLORS.electricBlue,
                        color: '#000'
                    }}
                >
                    GO
                </button>
            </div>
        </form>
    );
}
