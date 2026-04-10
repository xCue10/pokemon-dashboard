import { useState, useEffect, useCallback } from 'react';
import { getSoldItems, restoreCard, restoreSealed } from '../utils/api';
import { formatCurrency, formatDate, profitClass } from '../utils/format';
import toast from 'react-hot-toast';

export default function Sold() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoreConfirm, setRestoreConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSoldItems();
      setItems(data);
    } catch (err) {
      toast.error('Failed to load sold items: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRestore = async (item) => {
    try {
      if (item.source === 'card') {
        await restoreCard(item.id);
      } else {
        await restoreSealed(item.id);
      }
      toast.success(`${item.name} restored to ${item.source === 'card' ? 'Collection' : 'Sealed'}!`);
      setRestoreConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = items.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.set_name && item.set_name.toLowerCase().includes(search.toLowerCase()));
    const matchSource = !filterSource || item.source === filterSource;
    return matchSearch && matchSource;
  });

  // Summary stats
  const totalSold = items.length;
  const totalRevenue = items.reduce((s, i) => s + (parseFloat(i.sold_price) || 0), 0);
  const totalPaid = items.reduce((s, i) => s + (parseFloat(i.purchase_price) || 0), 0);
  const totalNet = items.reduce((s, i) => s + (parseFloat(i.net_profit) ?? ((parseFloat(i.sold_price) - parseFloat(i.purchase_price)) || 0)), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sold</h1>
          <p className="text-sm text-gray-500">{totalSold} item{totalSold !== 1 ? 's' : ''} sold</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm px-3">↻ Refresh</button>
      </div>

      {/* Summary stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Items Sold</p>
            <p className="text-2xl font-bold text-gray-800">{totalSold}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Paid</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Profit</p>
            <p className={`text-2xl font-bold ${profitClass(totalNet)}`}>
              {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input
            className="input w-52"
            placeholder="🔍 Search name or set…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input w-36" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="">All Types</option>
            <option value="card">Singles</option>
            <option value="sealed">Sealed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="table-th">Name</th>
                <th className="table-th">Set</th>
                <th className="table-th">Type</th>
                <th className="table-th">Condition</th>
                <th className="table-th">Paid</th>
                <th className="table-th">Sold For</th>
                <th className="table-th">eBay Fees</th>
                <th className="table-th">Shipping</th>
                <th className="table-th">Net Profit</th>
                <th className="table-th">ROI</th>
                <th className="table-th">Date Sold</th>
                <th className="table-th w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">
                  <div className="spinner mx-auto mb-2" />Loading…
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">🏷️</p>
                  <p className="font-medium">{items.length === 0 ? 'No sold items yet' : 'No results match your filter'}</p>
                  <p className="text-sm mt-1">
                    {items.length === 0 ? 'Click the 💵 button on any card or sealed product to mark it as sold' : ''}
                  </p>
                </td></tr>
              ) : filtered.map(item => {
                const net = item.net_profit != null
                  ? parseFloat(item.net_profit)
                  : (parseFloat(item.sold_price) || 0) - (parseFloat(item.purchase_price) || 0);
                const roi = item.purchase_price && parseFloat(item.purchase_price) > 0
                  ? (net / parseFloat(item.purchase_price) * 100)
                  : null;
                return (
                  <tr key={`${item.source}-${item.id}`} className="table-row-hover">
                    <td className="table-td font-medium text-gray-900 max-w-xs">
                      <p className="truncate">{item.name}</p>
                    </td>
                    <td className="table-td text-gray-500 whitespace-nowrap">{item.set_name || '—'}</td>
                    <td className="table-td">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                        item.source === 'sealed'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {item.source === 'sealed' ? 'Sealed' : 'Single'}
                      </span>
                    </td>
                    <td className="table-td text-gray-500 text-sm">{item.condition || '—'}</td>
                    <td className="table-td text-gray-600">{item.purchase_price ? formatCurrency(item.purchase_price) : '—'}</td>
                    <td className="table-td font-semibold text-gray-800">{item.sold_price ? formatCurrency(item.sold_price) : '—'}</td>
                    <td className="table-td text-red-500 text-sm">
                      {item.ebay_fees_total ? `−${formatCurrency(item.ebay_fees_total)}` : '—'}
                    </td>
                    <td className="table-td text-gray-500 text-sm">
                      {item.shipping_cost && parseFloat(item.shipping_cost) > 0 ? `−${formatCurrency(item.shipping_cost)}` : '—'}
                    </td>
                    <td className={`table-td font-bold ${profitClass(net)}`}>
                      {(net >= 0 ? '+' : '') + formatCurrency(net)}
                    </td>
                    <td className={`table-td text-sm font-semibold ${profitClass(roi)}`}>
                      {roi != null ? `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%` : '—'}
                    </td>
                    <td className="table-td text-gray-500 whitespace-nowrap">{formatDate(item.sold_date)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        {item.listing_url && (
                          <a
                            href={item.listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-pokemon-blue transition-colors"
                            title="View eBay listing"
                          >🔗</a>
                        )}
                        <button
                          onClick={() => setRestoreConfirm(item)}
                          className="p-1.5 rounded hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors"
                          title="Restore to collection"
                        >↩️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore confirm modal */}
      {restoreConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRestoreConfirm(null)}>
          <div className="modal-content max-w-sm">
            <div className="modal-body text-center">
              <p className="text-5xl mb-4">↩️</p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Restore Item?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Move <strong>{restoreConfirm.name}</strong> back to your {restoreConfirm.source === 'card' ? 'Collection' : 'Sealed'} as active?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setRestoreConfirm(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => handleRestore(restoreConfirm)} className="btn-primary flex-1">Restore</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
