import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
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

export default function ValueHistory({ data = [] }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        {data.length === 0
          ? 'No history yet — visit the dashboard daily to build your chart'
          : 'Come back tomorrow to see your value trend'}
      </div>
    );
  }

  const chartData = data.map(d => ({
    date: d.snapshot_date?.slice(0, 10) ?? d.snapshot_date,
    invested: parseFloat(d.total_invested) || 0,
    market: parseFloat(d.total_market_value) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="colorMarket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#CC0000" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#CC0000" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B4CCA" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3B4CCA" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Area type="monotone" dataKey="market" name="Market Value" stroke="#CC0000" strokeWidth={2} fill="url(#colorMarket)" dot={false} />
        <Area type="monotone" dataKey="invested" name="Invested" stroke="#3B4CCA" strokeWidth={2} fill="url(#colorInvested)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
