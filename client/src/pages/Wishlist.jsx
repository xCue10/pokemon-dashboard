import { useState, useEffect, useCallback } from 'react';
import { getWishlist, createWishlistItem, updateWishlistItem, deleteWishlistItem, purchaseWishlistItem } from '../utils/api';
import { formatCurrency, formatDate, formatDateInput } from '../utils/format';
import WishlistForm from '../components/WishlistForm';
import PokeBallSpinner from '../components/PokeBallSpinner';
import EmptyPokeBall from '../components/EmptyPokeBall';
import toast from 'react-hot-toast';

const CONDITIONS = [
  'PSA 10', 'PSA 9', 'PSA 8', 'PSA 7', 'PSA 6', 'PSA 5', 'PSA 4', 'PSA 3', 'PSA 2', 'PSA 1',
  'Raw Gem Mint', 'Raw NM/MT', 'Raw NM', 'Raw EX/MT', 'Raw EX', 'Raw VG/EX', 'Raw VG', 'Raw Good', 'Raw Poor',
];

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const priorityBadge = (p) => {
  if (p === 'high') return 'bg-red-100 text-red-700 border border-red-200';
  if (p === 'medium') return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
  return 'bg-gray-100 text-gray-500 border border-gray-200';
};

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [purchasing, setPurchasing] = useState(false);

  // Purchase modal state
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(formatDateInput(new Date()));
  const [purchaseCondition, setPurchaseCondition] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const data = await getWishlist(params);
      // Sort by priority then created_at
      data.sort((a, b) => {
        const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        if (pd !== 0) return pd;
        return new Date(b.created_at) - new Date(a.created_at);
      });
      setItems(data);
    } catch (err) {
      toast.error('Failed to load wishlist: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // Keyboard shortcut: N = Add to Wishlist
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

  const openAdd = () => { setEditItem(null); setShowForm(true); };
  const openEdit = (item) => { setEditItem(item); setShowForm(true); };

  const openPurchase = (item) => {
    setPurchaseItem(item);
    setPurchasePrice(item.target_price || '');
    setPurchaseDate(formatDateInput(new Date()));
    setPurchaseCondition(item.condition || '');
  };

  const handleSave = async (data) => {
    try {
      if (editItem) {
        await updateWishlistItem(editItem.id, data);
        toast.success('Item updated!');
      } else {
        await createWishlistItem(data);
        toast.success('Added to wishlist!');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteWishlistItem(id);
      toast.success('Removed from wishlist');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePurchase = async () => {
    if (!purchasePrice) { toast.error('Enter the purchase price'); return; }
    setPurchasing(true);
    try {
      await purchaseWishlistItem(purchaseItem.id, {
        purchase_price: parseFloat(purchasePrice),
        purchase_date: purchaseDate || null,
        condition: purchaseCondition || purchaseItem.condition || null,
      });
      toast.success(`${purchaseItem.name} moved to your collection!`);
      setPurchaseItem(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPurchasing(false);
    }
  };

  const high = items.filter(i => i.priority === 'high');
  const medium = items.filter(i => i.priority === 'medium');
  const low = items.filter(i => i.priority === 'low');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wishlist</h1>
          <p className="text-sm text-gray-500">{items.length} card{items.length !== 1 ? 's' : ''} on your list</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-sm">+ Add to Wishlist</button>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="flex gap-3">
          <input
            className="input w-60"
            placeholder="🔍 Search name or set…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button onClick={load} className="btn-secondary text-sm px-3">↻</button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <PokeBallSpinner size={44} />
          <span className="text-sm">Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <EmptyPokeBall message="Your wishlist is empty" sub="Click + Add to Wishlist to start tracking cards you want" />
      ) : (
        <div className="space-y-6">
          {[
            { label: 'High Priority', color: 'text-red-600', items: high },
            { label: 'Medium Priority', color: 'text-yellow-600', items: medium },
            { label: 'Low Priority', color: 'text-gray-500', items: low },
          ].filter(g => g.items.length > 0).map(group => (
            <div key={group.label}>
              <h2 className={`text-sm font-bold uppercase tracking-wider mb-3 ${group.color}`}>{group.label}</h2>
              <div className="space-y-2">
                {group.items.map(item => (
                  <div key={item.id} className="card flex items-center gap-4">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-16 w-12 object-contain rounded shadow-sm" />
                      ) : (
                        <div className="h-16 w-12 bg-gray-100 rounded flex items-center justify-center text-lg">🃏</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityBadge(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {[item.set_name, item.card_number, item.condition].filter(Boolean).join(' · ')}
                      </p>
                      {item.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{item.notes}</p>}
                    </div>

                    {/* Prices */}
                    <div className="flex-shrink-0 text-right hidden sm:block">
                      {item.target_price && (
                        <p className="text-sm font-semibold text-gray-800">
                          Target: {formatCurrency(item.target_price)}
                        </p>
                      )}
                      {item.market_price && (
                        <p className="text-xs text-gray-400">Market: {formatCurrency(item.market_price)}</p>
                      )}
                      <p className="text-xs text-gray-300 mt-0.5">Added {formatDate(item.created_at)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => openPurchase(item)}
                        className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-sm font-medium border border-green-200 transition-colors whitespace-nowrap"
                        title="Mark as purchased"
                      >
                        ✓ Bought
                      </button>
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                        title="Edit"
                      >✏️</button>
                      <button
                        onClick={() => setDeleteConfirm(item)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove"
                      >🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <WishlistForm item={editItem} onSave={handleSave} onClose={() => setShowForm(false)} />
      )}

      {/* Purchase modal */}
      {purchaseItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPurchaseItem(null)}>
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Mark as Purchased</h2>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{purchaseItem.name}</p>
              </div>
              <button onClick={() => setPurchaseItem(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-sm text-gray-500">
                This will add <strong>{purchaseItem.name}</strong> to your collection and remove it from your wishlist.
              </p>

              <div>
                <label className="label">Purchase Price ($) *</label>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Purchase Date</label>
                <input
                  className="input"
                  type="date"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Condition</label>
                <select
                  className="input"
                  value={purchaseCondition}
                  onChange={e => setPurchaseCondition(e.target.value)}
                >
                  <option value="">Keep wishlist value ({purchaseItem.condition || 'none'})</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setPurchaseItem(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handlePurchase} disabled={purchasing} className="btn-primary flex-1">
                  {purchasing
                    ? <><span className="spinner mr-2" style={{ borderTopColor: 'white', borderColor: 'rgba(255,255,255,0.3)' }} />Moving…</>
                    : '✓ Add to Collection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal-content max-w-sm">
            <div className="modal-body text-center">
              <p className="text-5xl mb-4">🗑️</p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Remove from Wishlist?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Remove <strong>{deleteConfirm.name}</strong> from your wishlist?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger flex-1">Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
