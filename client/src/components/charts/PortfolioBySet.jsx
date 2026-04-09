import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../utils/format';

const COLORS = {
  'Singles (Graded)': '#CC0000',
  'Singles (Raw)': '#FFCC00',
  'Sealed': '#3B82F6',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      <p style={{ color: COLORS[label] || '#CC0000' }}>Market Value: {formatCurrency(d?.market_value)}</p>
      <p className="text-gray-500">Invested: {formatCurrency(d?.invested)}</p>
      {d?.market_value && d?.invested && (
        <p className={`font-semibold mt-1 ${d.market_value >= d.invested ? 'text-green-600' : 'text-red-600'}`}>
          {d.market_value >= d.invested ? '+' : ''}{formatCurrency(d.market_value - d.invested)}
        </p>
      )}
    </div>
  );
};

export default function PortfolioBySet({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No portfolio data yet
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    category: d.category || d.set_name,
    market_value: parseFloat(d.market_value) || 0,
    invested: parseFloat(d.invested) || 0,
  }));

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="category" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="market_value" name="Market Value" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.category} fill={COLORS[entry.category] || '#CC0000'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Summary rows */}
      <div className="space-y-2">
        {chartData.map(d => {
          const gain = d.market_value - d.invested;
          return (
            <div key={d.category} className="flex items-center gap-3 text-sm">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: COLORS[d.category] || '#CC0000' }}
              />
              <span className="flex-1 font-medium text-gray-700">{d.category}</span>
              <span className="text-gray-500">{formatCurrency(d.invested)}</span>
              <span className="text-gray-400">→</span>
              <span className="font-semibold" style={{ color: COLORS[d.category] || '#CC0000' }}>
                {formatCurrency(d.market_value)}
              </span>
              <span className={`text-xs font-semibold w-16 text-right ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {gain >= 0 ? '+' : ''}{formatCurrency(gain)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
