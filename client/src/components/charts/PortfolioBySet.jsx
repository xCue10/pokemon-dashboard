import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../utils/format';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function PortfolioBySet({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No set data available yet
      </div>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    market_value: parseFloat(d.market_value) || 0,
    invested: parseFloat(d.invested) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="set_name"
          tick={{ fontSize: 11 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
        <Bar dataKey="market_value" name="Market Value" fill="#CC0000" radius={[4, 4, 0, 0]} />
        <Bar dataKey="invested" name="Invested" fill="#FFCC00" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
