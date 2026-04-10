import { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboardStats, getDashboardCharts, updateSettings, postSnapshot, getValueHistory } from '../utils/api';
import { formatCurrency, formatPct, formatDate, profitClass } from '../utils/format';
import StatCard from '../components/StatCard';
import { useCountUp } from '../hooks/useCountUp';
import confetti from 'canvas-confetti';
import PokeBallSpinner from '../components/PokeBallSpinner';
import PortfolioBySet from '../components/charts/PortfolioBySet';
import PriceComparison from '../components/charts/PriceComparison';
import MonthlySales from '../components/charts/MonthlySales';
import ValueHistory from '../components/charts/ValueHistory';
import toast from 'react-hot-toast';

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <PokeBallSpinner size={56} />
      <p className="text-gray-400 text-sm">Loading dashboard…</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [valueHistory, setValueHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [feeRate, setFeeRate] = useState('0.1325');
  const [feeFixed, setFeeFixed] = useState('0.30');
  const [roiThreshold, setRoiThreshold] = useState(() => localStorage.getItem('roi_threshold') || '50');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, h] = await Promise.all([getDashboardStats(), getDashboardCharts(), getValueHistory()]);
      setStats(s);
      setCharts(c);
      setValueHistory(h);
      // Take a snapshot for today (server deduplicates per day)
      postSnapshot().catch(() => {});
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
      localStorage.setItem('roi_threshold', roiThreshold);
      toast.success('Settings saved!');
      setShowSettings(false);
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  if (loading) return <Loading />;
  if (!stats) return null;

  const { collection, ebay, best_performers, worst_performers, recent_sales } = stats;

  // Confetti on profit milestones (once per milestone, tracked in localStorage)
  const MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
  const profit = parseFloat(ebay.total_realized_profit) || 0;
  const lastMilestone = parseFloat(localStorage.getItem('confetti_milestone') || '0');
  const newMilestone = MILESTONES.filter(m => profit >= m && m > lastMilestone).pop();
  if (newMilestone) {
    localStorage.setItem('confetti_milestone', String(newMilestone));
    setTimeout(() => {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#CC0000', '#FFCB05', '#3D5A80', '#ffffff', '#ff6b6b'],
        scalar: 1.1,
      });
    }, 600);
  }

  // Reusable inline Pokéball for floating bg
  const FloatBall = ({ cls, style }) => (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={`absolute pointer-events-none select-none ${cls}`} style={style}>
      <circle cx="50" cy="50" r="46" fill="#CC0000" stroke="#333" strokeWidth="4" />
      <rect x="4" y="46" width="92" height="8" fill="#333" />
      <path d="M4 50 Q4 96 50 96 Q96 96 96 50 Z" fill="white" />
      <circle cx="50" cy="50" r="14" fill="white" stroke="#333" strokeWidth="3" />
      <circle cx="50" cy="50" r="7" fill="#CC0000" stroke="#333" strokeWidth="2" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#333" strokeWidth="4" />
    </svg>
  );

  return (
    <div className="space-y-6 relative">
      {/* Floating decorative Pokéballs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <FloatBall cls="pb-bg-1" style={{ top: '2%',  right: '1%',  width: 110, opacity: 0.045 }} />
        <FloatBall cls="pb-bg-2" style={{ top: '28%', right: '9%',  width: 70,  opacity: 0.032 }} />
        <FloatBall cls="pb-bg-3" style={{ top: '62%', right: '18%', width: 48,  opacity: 0.025 }} />
      </div>

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
          rawValue={parseFloat(collection.total_market_value) || 0}
          formatter={formatCurrency}
          subtitle={`${collection.total_quantity} items across ${collection.total_cards} entries`}
          icon="💎"
          color="red"
        />
        <StatCard
          title="Total Invested"
          rawValue={parseFloat(collection.total_invested) || 0}
          formatter={formatCurrency}
          subtitle="Sum of purchase prices"
          icon="💰"
          color="yellow"
        />
        <StatCard
          title="Unrealized ROI"
          rawValue={parseFloat(collection.unrealized_roi_pct) || 0}
          formatter={formatPct}
          subtitle={`${formatCurrency(collection.unrealized_profit)} unrealized gain`}
          icon="📈"
          color={collection.unrealized_roi_pct >= 0 ? 'green' : 'red'}
          trend={collection.unrealized_roi_pct}
        />
        <StatCard
          title="Realized Profit"
          rawValue={parseFloat(ebay.total_realized_profit) || 0}
          formatter={formatCurrency}
          subtitle={`${ebay.total_sold} eBay sales`}
          icon="🏷️"
          color="blue"
        />
      </div>

      {/* Secondary stats */}
      <SecondaryStats collection={collection} ebay={ebay} />


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

      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4">Collection Value Over Time</h3>
        <ValueHistory data={valueHistory} />
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
              <div>
                <label className="label">ROI Alert Threshold (%)</label>
                <input className="input" type="number" step="1" min="0" value={roiThreshold} onChange={e => setRoiThreshold(e.target.value)} placeholder="e.g. 50" />
                <p className="text-xs text-gray-400 mt-1">Cards in Collection with ROI ≥ this value will be flagged.</p>
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

function SecondaryStats({ collection, ebay }) {
  const cards = useCountUp(collection.total_cards, 900);
  const active = useCountUp(ebay.active_listings, 900);
  const sold = useCountUp(ebay.total_sold, 900);
  const fees = useCountUp(parseFloat(ebay.total_fees) || 0, 1000);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card text-center">
        <p className="text-2xl sm:text-3xl font-bold text-pokemon-red">{Math.round(cards)}</p>
        <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Unique Cards</p>
      </div>
      <div className="card text-center relative">
        {ebay.active_listings > 0 && (
          <span className="absolute top-3 right-3 flex h-2.5 w-2.5" title="Live listings">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        )}
        <p className="text-2xl sm:text-3xl font-bold text-pokemon-blue">{Math.round(active)}</p>
        <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Active Listings</p>
      </div>
      <div className="card text-center">
        <p className="text-2xl sm:text-3xl font-bold text-green-600">{Math.round(sold)}</p>
        <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Items Sold</p>
      </div>
      <div className="card text-center">
        <p className="text-xl sm:text-3xl font-bold text-yellow-600 truncate">{formatCurrency(fees)}</p>
        <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">eBay Fees Paid</p>
      </div>
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
                  <p className="text-xs text-gray-400 truncate">
                    {card.set_name}
                    {card.source === 'sealed' && <span className="ml-1 text-blue-400 font-medium">· Sealed</span>}
                  </p>
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
