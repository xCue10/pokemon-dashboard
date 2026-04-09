import { useState, useEffect, useCallback } from 'react';
import { getCards, createCard, updateCard, deleteCard, exportCards } from '../utils/api';
import { formatCurrency, formatPct, formatDate, profitClass, conditionBadgeClass } from '../utils/format';
import CardForm from '../components/CardForm';
import CSVImport from '../components/CSVImport';
import toast from 'react-hot-toast';

const SORT_FIELDS = {
  name: 'Name',
  set_name: 'Set',
  purchase_price: 'Purchase',
  market_price: 'Market',
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

  const sortIcon = (field) => {
    if (sort !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-pokemon-red ml-1">{order === 'ASC' ? '↑' : '↓'}</span>;
  };

  const totalInvested = cards.reduce((s, c) => s + (parseFloat(c.purchase_price) || 0) * c.quantity, 0);
  const totalMarket = cards.reduce((s, c) => s + (parseFloat(c.market_price) || 0) * c.quantity, 0);
  const totalProfit = totalMarket - totalInvested;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Collection</h1>
          <p className="text-sm text-gray-500">{cards.length} card{cards.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {formatCurrency(totalMarket)} market value</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">📥 Import CSV</button>
          <button onClick={exportCards} className="btn-secondary text-sm">📤 Export CSV</button>
          <button onClick={openAdd} className="btn-primary text-sm">+ Add Card</button>
        </div>
      </div>

      {/* Summary bar */}
      {cards.length > 0 && (
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
          <select className="input w-44" value={filterCondition} onChange={e => setFilterCondition(e.target.value)}>
            <option value="">All Conditions</option>
            <option value="PSA">PSA Graded</option>
            <option value="Raw">Raw</option>
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
                  <th key={field} className="table-th" onClick={() => handleSort(field)}>
                    {label}{sortIcon(field)}
                  </th>
                ))}
                <th className="table-th">Condition</th>
                <th className="table-th">Market $</th>
                <th className="table-th">P/L</th>
                <th className="table-th">ROI</th>
                <th className="table-th w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">
                  <div className="spinner mx-auto mb-2" />Loading…
                </td></tr>
              ) : cards.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-16 text-gray-400">
                  <p className="text-4xl mb-3">🃏</p>
                  <p className="font-medium">No cards yet</p>
                  <p className="text-sm mt-1">Click <strong>+ Add Card</strong> to start your collection</p>
                </td></tr>
              ) : cards.map(card => (
                <tr key={card.id} className="table-row-hover">
                  <td className="table-td">
                    {card.image_url ? (
                      <img src={card.image_url} alt={card.name} className="h-12 w-9 object-contain rounded shadow-sm" />
                    ) : (
                      <div className="h-12 w-9 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">?</div>
                    )}
                  </td>
                  <td className="table-td font-medium text-gray-900 max-w-xs">
                    <p className="truncate">{card.name}</p>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes column tooltip hint */}
      {cards.some(c => c.notes) && (
        <p className="text-xs text-gray-400 text-center">Hover over card name to see notes</p>
      )}

      {/* Modals */}
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
