import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '../../utils/format';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'sales_count' ? p.value : formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

export default function MonthlySales({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No sales data available yet
      </div>
    );
  }

  const chartData = data.map(d => ({
    month: d.month,
    profit: parseFloat(d.profit) || 0,
    revenue: parseFloat(d.revenue) || 0,
    sales_count: parseInt(d.sales_count) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#3B4CCA" radius={[4, 4, 0, 0]} opacity={0.7} />
        <Bar yAxisId="left" dataKey="profit" name="Net Profit" fill="#CC0000" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="sales_count" name="# Sales" stroke="#FFCC00" strokeWidth={2} dot={{ fill: '#FFCC00', r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
