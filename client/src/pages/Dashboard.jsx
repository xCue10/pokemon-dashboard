import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats, getDashboardCharts, updateSettings } from '../utils/api';
import { formatCurrency, formatPct, formatDate, profitClass } from '../utils/format';
import StatCard from '../components/StatCard';
import PortfolioBySet from '../components/charts/PortfolioBySet';
import PriceComparison from '../components/charts/PriceComparison';
import MonthlySales from '../components/charts/MonthlySales';
import toast from 'react-hot-toast';

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="spinner w-10 h-10 border-4 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading dashboard…</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [feeRate, setFeeRate] = useState('0.1325');
  const [feeFixed, setFeeFixed] = useState('0.30');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([getDashboardStats(), getDashboardCharts()]);
      setStats(s);
      setCharts(c);
    } catch (err) {
      toast.error('Failed to load dashboard: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSettings = async () => {
    try {
      await updateSettings({ ebay_fee_rate: parseFloat(feeRate), ebay_fee_fixed: parseFloat(feeFixed) });
      toast.success('Settings saved!');
      setShowSettings(false);
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  if (loading) return <Loading />;
  if (!stats) return null;

  const { collection, ebay, best_performers, worst_performers, recent_sales } = stats;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your Pokémon collection at a glance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-sm px-3">↻ Refresh</button>
          <button onClick={() => setShowSettings(true)} className="btn-secondary text-sm px-3">⚙ Settings</button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Collection Value"
          value={formatCurrency(collection.total_market_value)}
          subtitle={`${collection.total_quantity} items across ${collection.total_cards} entries`}
          icon="💎"
          color="red"
        />
        <StatCard
          title="Total Invested"
          value={formatCurrency(collection.total_invested)}
          subtitle="Sum of purchase prices"
          icon="💰"
          color="yellow"
        />
        <StatCard
          title="Unrealized ROI"
          value={formatPct(collection.unrealized_roi_pct)}
          subtitle={`${formatCurrency(collection.unrealized_profit)} unrealized gain`}
          icon="📈"
          color={collection.unrealized_roi_pct >= 0 ? 'green' : 'red'}
          trend={collection.unrealized_roi_pct}
        />
        <StatCard
          title="Realized Profit"
          value={formatCurrency(ebay.total_realized_profit)}
          subtitle={`${ebay.total_sold} eBay sales`}
          icon="🏷️"
          color="blue"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-pokemon-red">{collection.total_cards}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Unique Cards</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-pokemon-blue">{ebay.active_listings}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Active Listings</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{ebay.total_sold}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Items Sold</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-yellow-600">{formatCurrency(ebay.total_fees)}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">eBay Fees Paid</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4">Portfolio by Category</h3>
          <PortfolioBySet data={charts?.portfolio_by_set || []} />
        </div>
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4">Purchase vs Market Price</h3>
          <PriceComparison data={charts?.price_comparison || []} />
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4">Monthly Sales Profit (Last 12 Months)</h3>
        <MonthlySales data={charts?.monthly_sales || []} />
      </div>

      {/* Performers row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformersTable title="🏆 Best Performers" cards={best_performers} />
        <PerformersTable title="📉 Worst Performers" cards={worst_performers} worst />
      </div>

      {/* Recent Sales */}
      {recent_sales?.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4">Recent Sales</h3>
          <div className="space-y-3">
            {recent_sales.map(sale => (
              <div key={sale.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{sale.card_name || 'Unknown Card'}</p>
                  <p className="text-xs text-gray-400">{formatDate(sale.sold_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{formatCurrency(sale.sold_price)}</p>
                  <p className={`text-xs font-semibold ${profitClass(sale.net_profit)}`}>
                    Net: {formatCurrency(sale.net_profit)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h2 className="text-lg font-bold">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-sm text-gray-500">Default eBay fee settings applied to new listings.</p>
              <div>
                <label className="label">eBay Fee Rate (e.g. 0.1325 = 13.25%)</label>
                <input className="input" type="number" step="0.001" min="0" max="1" value={feeRate} onChange={e => setFeeRate(e.target.value)} />
              </div>
              <div>
                <label className="label">Fixed Fee per Sale ($)</label>
                <input className="input" type="number" step="0.01" min="0" value={feeFixed} onChange={e => setFeeFixed(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowSettings(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={saveSettings} className="btn-primary flex-1">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PerformersTable({ title, cards = [], worst = false }) {
  return (
    <div className="card">
      <h3 className="font-bold text-gray-900 mb-4">{title}</h3>
      {cards.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No data yet — add cards with purchase & market prices</p>
      ) : (
        <div className="space-y-3">
          {cards.map((card, i) => {
            const roi = parseFloat(card.roi_pct);
            return (
              <div key={card.id} className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-300 w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{card.name}</p>
                  <p className="text-xs text-gray-400 truncate">{card.set_name}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatCurrency(card.purchase_price)} → {formatCurrency(card.market_price)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
