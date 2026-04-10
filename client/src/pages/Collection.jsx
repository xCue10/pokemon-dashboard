import { useState, useEffect, useCallback } from 'react';
import { getCards, createCard, updateCard, deleteCard, exportCards, bulkDeleteCards, sellCard } from '../utils/api';
import { formatCurrency, formatPct, formatDate, profitClass, conditionBadgeClass } from '../utils/format';
import CardForm from '../components/CardForm';
import CSVImport from '../components/CSVImport';
import SoldForm from '../components/SoldForm';
import PokeBallSpinner from '../components/PokeBallSpinner';
import EmptyPokeBall from '../components/EmptyPokeBall';
import TableSkeleton from '../components/TableSkeleton';
import { catchToast } from '../utils/catchToast';
import toast from 'react-hot-toast';

const SORT_FIELDS = {
  name: 'Name',
  set_name: 'Set',
  card_number: 'Number',
  purchase_price: 'Purchase',
  purchase_date: 'Date',
  quantity: 'Qty',
};

export default function Collection() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCard, setEditCard] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSet, setFilterSet] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sellCard, setSellCard] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const roiThreshold = parseFloat(localStorage.getItem('roi_threshold') || '0');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort, order };
      if (search) params.search = search;
      if (filterSet) params.set = filterSet;
      if (filterCondition) params.condition = filterCondition;
      const data = await getCards(params);
      setCards(data);
    } catch (err) {
      toast.error('Failed to load cards: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filterSet, filterCondition, sort, order]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters/sort change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, filterSet, filterCondition, sort, order]);

  // Keyboard shortcut: N = Add Card
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

  const sets = [...new Set(cards.map(c => c.set_name).filter(Boolean))].sort();

  const handleSort = (field) => {
    if (sort === field) setOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSort(field); setOrder('DESC'); }
  };

  const openAdd = () => { setEditCard(null); setShowForm(true); };
  const openEdit = (card) => { setEditCard(card); setShowForm(true); };

  const handleSave = async (data) => {
    try {
      if (editCard) {
        await updateCard(editCard.id, data);
        toast.success('Card updated!');
      } else {
        await createCard(data);
        toast.success('Card added!');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSell = async (soldData) => {
    try {
      await sellCard(sellCard.id, soldData);
      catchToast(`${sellCard.name} moved to Sold!`);
      setSellCard(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteCard(id);
      toast.success('Card deleted');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = [...selected];
      await bulkDeleteCards(ids);
      toast.success(`Deleted ${ids.length} card${ids.length !== 1 ? 's' : ''}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === displayedCards.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(displayedCards.map(c => c.id)));
    }
  };

  const sortIcon = (field) => {
    if (sort !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-pokemon-red ml-1">{order === 'ASC' ? '↑' : '↓'}</span>;
  };

  const totalInvested = cards.reduce((s, c) => s + (parseFloat(c.purchase_price) || 0) * c.quantity, 0);
  const totalMarket = cards.reduce((s, c) => s + (parseFloat(c.market_price) || 0) * c.quantity, 0);
  const totalProfit = totalMarket - totalInvested;

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(cards.length / pageSize);
  const displayedCards = pageSize === 'all' ? cards : cards.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collection</h1>
          <p className="text-sm text-gray-500">{cards.length} card{cards.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {formatCurrency(totalMarket)} market value</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary text-sm hidden sm:inline-flex">📥 Import CSV</button>
          <button onClick={exportCards} className="btn-secondary text-sm hidden sm:inline-flex">📤 Export CSV</button>
          <button onClick={openAdd} className="btn-primary text-sm">+ Add Card</button>
        </div>
      </div>

      {/* Summary bar — desktop only */}
      {cards.length > 0 && (
        <div className="hidden sm:grid grid-cols-3 gap-3">
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

      {/* Search bar (shared mobile + desktop) */}
      <div className="card p-4">
        {/* Desktop filters */}
        <div className="hidden sm:flex flex-wrap gap-3">
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
          <select className="input w-44" value={filterCondition} onChange={e => setFilterCondition(e.target.value)}>
            <option value="">All Conditions</option>
            <option value="PSA">PSA Graded</option>
            <option value="Raw">Raw</option>
          </select>
          <button onClick={load} className="btn-secondary text-sm px-3">↻</button>
        </div>
        {/* Mobile search only */}
        <div className="flex sm:hidden gap-2">
          <input
            className="input flex-1"
            placeholder="🔍 Search name or set…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button onClick={load} className="btn-secondary text-sm px-3">↻</button>
        </div>
      </div>

      {/* ── MOBILE card list (dupe-check view) ── */}
      <div className="sm:hidden space-y-2">
        {loading ? (
          <div className="card flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
            <PokeBallSpinner size={40} />
            <span className="text-sm">Loading…</span>
          </div>
        ) : cards.length === 0 ? (
          <EmptyPokeBall
            message="No cards yet"
            sub={<>Tap <strong>+ Add Card</strong> to start your collection</>}
          />
        ) : (
          displayedCards.map(card => {
            const isHot = roiThreshold > 0 && parseFloat(card.roi_pct) >= roiThreshold;
            return (
              <div key={card.id} className="card flex items-center gap-3 py-3 px-4">
                {/* Qty badge */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pokemon-red flex items-center justify-center">
                  <span className="text-white text-sm font-bold">{card.quantity}</span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900 truncate text-sm leading-tight">{card.name}</p>
                    {isHot && <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded px-1 font-medium flex-shrink-0 hot-glow">🔥</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {[card.set_name, card.card_number].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>

                {/* Condition badge */}
                <div className="flex-shrink-0">
                  {card.condition ? (
                    <span className={conditionBadgeClass(card.condition)}>{card.condition}</span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Mobile pagination */}
        {!loading && cards.length > 0 && pageSize !== 'all' && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm disabled:opacity-30 dark:bg-gray-800 dark:border-gray-700">← Prev</button>
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm disabled:opacity-30 dark:bg-gray-800 dark:border-gray-700">Next →</button>
          </div>
        )}
      </div>

      {/* ── DESKTOP table ── */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="table-th w-8">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={displayedCards.length > 0 && selected.size === displayedCards.length}
                    onChange={toggleSelectAll}
                    title="Select all"
                  />
                </th>
                {Object.entries(SORT_FIELDS).map(([field, label]) => (
                  <th key={field} className="table-th cursor-pointer" onClick={() => handleSort(field)}>
                    {label}{sortIcon(field)}
                  </th>
                ))}
                <th className="table-th">Condition</th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('total_market_value')}>
                  Market ${sortIcon('total_market_value')}
                </th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('unrealized_profit')}>
                  P/L{sortIcon('unrealized_profit')}
                </th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('roi_pct')}>
                  ROI{sortIcon('roi_pct')}
                </th>
                <th className="table-th w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <TableSkeleton cols={12} rows={6} />
              ) : cards.length === 0 ? (
                <tr><td colSpan={12}>
                  <EmptyPokeBall
                    message="No cards yet"
                    sub={<>Press <kbd className="bg-gray-100 px-1 rounded text-xs">N</kbd> or click <strong>+ Add Card</strong> to start your collection</>}
                  />
                </td></tr>
              ) : displayedCards.map(card => {
                const isHot = roiThreshold > 0 && parseFloat(card.roi_pct) >= roiThreshold;
                return (
                <tr key={card.id} className={`table-row-hover ${selected.has(card.id) ? 'bg-blue-50' : ''}`}>
                  <td className="table-td">
                    <input type="checkbox" className="rounded" checked={selected.has(card.id)} onChange={() => toggleSelect(card.id)} />
                  </td>
                  <td className="table-td font-medium text-gray-900 max-w-xs">
                    <div className="flex items-center gap-1">
                      <p className="truncate">{card.name}</p>
                      {isHot && <span className="text-xs bg-green-100 text-green-700 border border-green-200 rounded px-1 font-medium flex-shrink-0 hot-glow">🔥 HOT</span>}
                      {card.notes && <span className="text-gray-400 flex-shrink-0" title={card.notes}>📝</span>}
                    </div>
                  </td>
                  <td className="table-td text-gray-500 whitespace-nowrap">{card.set_name || '—'}</td>
                  <td className="table-td text-gray-500">{card.card_number || '—'}</td>
                  <td className="table-td">
                    {card.purchase_price ? (
                      <>
                        {formatCurrency(card.total_purchase_value)}
                        {card.quantity > 1 && (
                          <span className="block text-xs text-gray-400">{formatCurrency(card.purchase_price)} ea</span>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  <td className="table-td text-gray-500">{formatDate(card.purchase_date)}</td>
                  <td className="table-td text-center">{card.quantity}</td>
                  <td className="table-td">
                    {card.condition ? (
                      <span className={conditionBadgeClass(card.condition)}>
                        {card.condition}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="table-td font-semibold">
                    {card.market_price ? (
                      <span className="text-pokemon-red">
                        {formatCurrency(card.total_market_value)}
                        {card.quantity > 1 && (
                          <span className="block text-xs font-normal text-gray-400">{formatCurrency(card.market_price)} ea</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className={`table-td ${profitClass(card.unrealized_profit)}`}>
                    {card.unrealized_profit != null && card.purchase_price
                      ? (parseFloat(card.unrealized_profit) >= 0 ? '+' : '') + formatCurrency(card.unrealized_profit)
                      : '—'}
                  </td>
                  <td className={`table-td text-sm ${profitClass(card.roi_pct)}`}>
                    {card.roi_pct != null && card.purchase_price ? formatPct(card.roi_pct) : '—'}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSellCard(card)}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors"
                        title="Mark as Sold on eBay"
                      >💵</button>
                      <button
                        onClick={() => openEdit(card)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                        title="Edit"
                      >✏️</button>
                      <button
                        onClick={() => setDeleteConfirm(card)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >🗑️</button>
                    </div>
                  </td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {cards.length > 0 && (
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
            <span className="text-xs text-gray-400">{cards.length} total</span>
          </div>
        )}
      </div>

      {/* Bulk action bar — desktop only (no bulk select on mobile) */}
      {selected.size > 0 && (
        <div className="hidden sm:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-3 items-center gap-4">
          <span className="text-sm font-medium">{selected.size} card{selected.size !== 1 ? 's' : ''} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-400 hover:text-white transition-colors">Clear</button>
          <button
            onClick={handleBulkDelete}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
          >
            Delete selected
          </button>
        </div>
      )}

      {/* Modals */}
      {sellCard && (
        <SoldForm
          listing={{ card_name: sellCard.name, purchase_price: sellCard.purchase_price }}
          onSave={handleSell}
          onClose={() => setSellCard(null)}
        />
      )}
      {showForm && (
        <CardForm
          card={editCard}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
      {showImport && (
        <CSVImport
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal-content max-w-sm">
            <div className="modal-body text-center">
              <p className="text-5xl mb-4">🗑️</p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Card?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Remove <strong>{deleteConfirm.name}</strong> from your collection? This can't be undone.
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
