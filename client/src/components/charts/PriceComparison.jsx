import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { formatCurrency } from '../../utils/format';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const purchase = payload.find(p => p.dataKey === 'purchase_price')?.value;
  const market = payload.find(p => p.dataKey === 'market_price')?.value;
  const diff = market != null && purchase != null ? market - purchase : null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs max-w-xs">
      <p className="font-semibold text-gray-800 mb-1 truncate">{label}</p>
      {purchase != null && <p className="text-yellow-600">Purchased: {formatCurrency(purchase)}</p>}
      {market != null && <p className="text-pokemon-red">Market: {formatCurrency(market)}</p>}
      {diff != null && (
        <p className={`font-semibold mt-1 ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {diff >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(diff))}
        </p>
      )}
    </div>
  );
};

export default function PriceComparison({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No price data available yet
      </div>
    );
  }

  const chartData = data.map(d => ({
    name: d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name,
    fullName: d.name,
    purchase_price: parseFloat(d.purchase_price) || 0,
    market_price: parseFloat(d.market_price) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 10 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
        <Bar dataKey="purchase_price" name="Purchase Price" fill="#FFCC00" radius={[4, 4, 0, 0]} />
        <Bar dataKey="market_price" name="Market Price" fill="#CC0000" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
