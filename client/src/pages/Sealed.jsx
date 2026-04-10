import { useState, useEffect, useCallback } from 'react';
import { getSealed, createSealed, updateSealed, deleteSealed } from '../utils/api';
import { formatCurrency, formatPct, formatDate, profitClass } from '../utils/format';
import SealedForm from '../components/SealedForm';
import toast from 'react-hot-toast';

const SORT_FIELDS = {
  name: 'Name',
  product_type: 'Type',
  set_name: 'Set',
  purchase_price: 'Purchase',
  purchase_date: 'Date',
  quantity: 'Qty',
};

export default function Sealed() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editProduct, setEditProduct] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSet, setFilterSet] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort, order };
      if (search) params.search = search;
      if (filterSet) params.set = filterSet;
      const data = await getSealed(params);
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load products: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterSet, sort, order]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filterSet, sort, order]);

  // Keyboard shortcut: N = Add Product
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        openAdd();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const sets = [...new Set(products.map(p => p.set_name).filter(Boolean))].sort();

  const handleSort = (field) => {
    if (sort === field) setOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSort(field); setOrder('DESC'); }
  };

  const openAdd = () => { setEditProduct(null); setShowForm(true); };
  const openEdit = (product) => { setEditProduct(product); setShowForm(true); };

  const handleSave = async (data) => {
    try {
      if (editProduct) {
        await updateSealed(editProduct.id, data);
        toast.success('Product updated!');
      } else {
        await createSealed(data);
        toast.success('Product added!');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSealed(id);
      toast.success('Product deleted');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const sortIcon = (field) => {
    if (sort !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-pokemon-red ml-1">{order === 'ASC' ? '↑' : '↓'}</span>;
  };

  const totalInvested = products.reduce((s, p) => s + (parseFloat(p.purchase_price) || 0) * p.quantity, 0);
  const totalMarket = products.reduce((s, p) => s + (parseFloat(p.market_price) || 0) * p.quantity, 0);
  const totalProfit = totalMarket - totalInvested;

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(products.length / pageSize);
  const displayedProducts = pageSize === 'all' ? products : products.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sealed Products</h1>
          <p className="text-sm text-gray-500">{products.length} product{products.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {formatCurrency(totalMarket)} market value</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm">+ Add Product</button>
      </div>

      {/* Summary bar */}
      {products.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Invested</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(totalInvested)}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Market Value</p>
            <p className="text-xl font-bold text-pokemon-red">{formatCurrency(totalMarket)}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gain / Loss</p>
            <p className={`text-xl font-bold ${profitClass(totalProfit)}`}>
              {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input
            className="input w-48"
            placeholder="🔍 Search name or set…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input w-44" value={filterSet} onChange={e => setFilterSet(e.target.value)}>
            <option value="">All Sets</option>
            {sets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="btn-secondary text-sm px-3">↻</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="table-th w-14">Image</th>
                {Object.entries(SORT_FIELDS).map(([field, label]) => (
                  <th key={field} className="table-th cursor-pointer" onClick={() => handleSort(field)}>
                    {label}{sortIcon(field)}
                  </th>
                ))}
                <th className="table-th cursor-pointer" onClick={() => handleSort('total_market_value')}>
                  Market ${sortIcon('total_market_value')}
                </th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('unrealized_profit')}>
                  P/L{sortIcon('unrealized_profit')}
                </th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('roi_pct')}>
                  ROI{sortIcon('roi_pct')}
                </th>
                <th className="table-th w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">
                  <div className="spinner mx-auto mb-2" />Loading…
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">📦</p>
                  <p className="font-medium">No sealed products yet</p>
                  <p className="text-sm mt-1">Click <strong>+ Add Product</strong> to get started</p>
                </td></tr>
              ) : displayedProducts.map(p => (
                <tr key={p.id} className="table-row-hover">
                  <td className="table-td">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-12 w-12 object-contain rounded shadow-sm" />
                    ) : (
                      <div className="h-12 w-12 bg-gray-100 rounded flex items-center justify-center text-lg">📦</div>
                    )}
                  </td>
                  <td className="table-td font-medium text-gray-900 max-w-xs">
                    <p className="truncate">{p.name}</p>
                    {p.notes && <p className="text-xs text-gray-400 truncate">{p.notes}</p>}
                  </td>
                  <td className="table-td text-gray-500 whitespace-nowrap">{p.product_type || '—'}</td>
                  <td className="table-td text-gray-500 whitespace-nowrap">{p.set_name || '—'}</td>
                  <td className="table-td">
                    {p.purchase_price ? (
                      <>
                        {formatCurrency(p.total_purchase_value)}
                        {p.quantity > 1 && (
                          <span className="block text-xs text-gray-400">{formatCurrency(p.purchase_price)} ea</span>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  <td className="table-td text-gray-500">{formatDate(p.purchase_date)}</td>
                  <td className="table-td text-center">{p.quantity}</td>
                  <td className="table-td font-semibold">
                    {p.market_price ? (
                      <span className="text-pokemon-red">
                        {formatCurrency(p.total_market_value)}
                        {p.quantity > 1 && (
                          <span className="block text-xs font-normal text-gray-400">{formatCurrency(p.market_price)} ea</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={`table-td ${profitClass(p.unrealized_profit)}`}>
                    {p.unrealized_profit != null && p.purchase_price
                      ? (parseFloat(p.unrealized_profit) >= 0 ? '+' : '') + formatCurrency(p.unrealized_profit)
                      : '—'}
                  </td>
                  <td className={`table-td text-sm ${profitClass(p.roi_pct)}`}>
                    {p.roi_pct != null && p.purchase_price ? formatPct(p.roi_pct) : '—'}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                        title="Edit"
                      >✏️</button>
                      <button
                        onClick={() => setDeleteConfirm(p)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {products.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 flex-wrap gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="mr-1">Show:</span>
              {[25, 50, 100, 'all'].map(s => (
                <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${pageSize === s ? 'bg-pokemon-red text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 text-sm">←</button>
                <span className="text-sm text-gray-500 px-1">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30 text-sm">→</button>
              </div>
            )}
            <span className="text-xs text-gray-400">{products.length} total</span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <SealedForm
          product={editProduct}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal-content max-w-sm">
            <div className="modal-body text-center">
              <p className="text-5xl mb-4">🗑️</p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Product?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Remove <strong>{deleteConfirm.name}</strong>? This can't be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger flex-1">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
