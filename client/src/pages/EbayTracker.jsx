import { useState, useEffect, useCallback } from 'react';
import { getEbayListings, createEbayListing, updateEbayListing, markEbaySold, deleteEbayListing, exportEbay, exportEbaySold, importEbayOrders } from '../utils/api';
import { formatCurrency, formatDate, profitClass, statusBadgeClass } from '../utils/format';
import EbayForm from '../components/EbayForm';
import SoldForm from '../components/SoldForm';
import PokeBallSpinner from '../components/PokeBallSpinner';
import EmptyPokeBall from '../components/EmptyPokeBall';
import toast from 'react-hot-toast';

export default function EbayTracker() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editListing, setEditListing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [soldListing, setSoldListing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('DESC');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { sort, order };
      if (filterStatus) params.status = filterStatus;
      const data = await getEbayListings(params);
      setListings(data);
    } catch (err) {
      toast.error('Failed to load listings: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, sort, order]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditListing(null); setShowForm(true); };
  const openEdit = (l) => { setEditListing(l); setShowForm(true); };

  const handleSave = async (data) => {
    try {
      if (editListing) {
        await updateEbayListing(editListing.id, data);
        toast.success('Listing updated!');
      } else {
        await createEbayListing(data);
        toast.success('Listing created!');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSold = async (data) => {
    try {
      await markEbaySold(soldListing.id, data);
      toast.success('Marked as sold!');
      setSoldListing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteEbayListing(id);
      toast.success('Listing deleted');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleImportEbay = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const result = await importEbayOrders(file);
      toast.success(`Imported ${result.imported} Pokémon sale${result.imported !== 1 ? 's' : ''} (${result.skipped} non-Pokémon skipped)`);
      load();
    } catch (err) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleSort = (field) => {
    if (sort === field) setOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSort(field); setOrder('DESC'); }
  };
  const sortIcon = (field) => {
    if (sort !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-pokemon-red ml-1">{order === 'ASC' ? '↑' : '↓'}</span>;
  };

  // Aggregate stats
  const activeSales = listings.filter(l => l.status === 'active');
  const soldSales = listings.filter(l => l.status === 'sold');
  const totalProfit = soldSales.reduce((s, l) => s + (parseFloat(l.net_profit) || 0), 0);
  const totalRevenue = soldSales.reduce((s, l) => s + (parseFloat(l.sold_price) || 0), 0);
  const totalFees = soldSales.reduce((s, l) => s + (parseFloat(l.ebay_fees_total) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">eBay Tracker</h1>
          <p className="text-sm text-gray-500">{listings.length} listing{listings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportEbay} className="btn-secondary text-sm">📤 Export All</button>
          <button onClick={exportEbaySold} className="btn-secondary text-sm">📤 Export Sold</button>
          <label className={`btn-secondary text-sm cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? <><span className="spinner mr-1" style={{ width: 12, height: 12, borderWidth: 2 }} />Importing…</> : '📥 Import eBay Orders'}
            <input type="file" accept=".csv" className="hidden" onChange={handleImportEbay} disabled={importing} />
          </label>
          <button onClick={openAdd} className="btn-primary text-sm">+ New Listing</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card py-3 text-center">
          <p className="text-3xl font-bold text-pokemon-blue">{activeSales.length}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">Active</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-3xl font-bold text-green-600">{soldSales.length}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">Sold</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">Revenue</p>
        </div>
        <div className="card py-3 text-center">
          <p className={`text-2xl font-bold ${profitClass(totalProfit)}`}>{formatCurrency(totalProfit)}</p>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-medium">Net Profit</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select className="input w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="sold">Sold</option>
            <option value="unsold">Unsold</option>
          </select>
          <button onClick={load} className="btn-secondary text-sm px-3">↻ Refresh</button>
          {totalFees > 0 && (
            <span className="text-xs text-gray-400 ml-auto">
              Total eBay fees paid: <strong className="text-gray-600">{formatCurrency(totalFees)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="table-th w-14">Card</th>
                <th className="table-th min-w-36">Card Name</th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('listing_price')}>
                  List Price{sortIcon('listing_price')}
                </th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('listing_date')}>
                  Listed{sortIcon('listing_date')}
                </th>
                <th className="table-th">Status</th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('sold_price')}>
                  Sold Price{sortIcon('sold_price')}
                </th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('sold_date')}>
                  Sold Date{sortIcon('sold_date')}
                </th>
                <th className="table-th">eBay Fees</th>
                <th className="table-th">Ship Cost</th>
                <th className="table-th cursor-pointer" onClick={() => handleSort('net_profit')}>
                  Net Profit{sortIcon('net_profit')}
                </th>
                <th className="table-th w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={11}>
                  <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
                    <PokeBallSpinner size={44} />
                    <span className="text-sm">Loading…</span>
                  </div>
                </td></tr>
              ) : listings.length === 0 ? (
                <tr><td colSpan={11}>
                  <EmptyPokeBall message="No listings yet" sub="Click + New Listing to track an eBay sale" />
                </td></tr>
              ) : listings.map(listing => (
                <tr key={listing.id} className="table-row-hover">
                  <td className="table-td">
                    {listing.image_url ? (
                      <img src={listing.image_url} alt={listing.card_name} className="h-12 w-9 object-contain rounded shadow-sm" />
                    ) : (
                      <div className="h-12 w-9 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">?</div>
                    )}
                  </td>
                  <td className="table-td">
                    <p className="font-medium text-gray-900 whitespace-nowrap">{listing.card_name || <span className="text-gray-400 italic">No card linked</span>}</p>
                    {listing.set_name && <p className="text-xs text-gray-400">{listing.set_name}</p>}
                    {listing.listing_url && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" className="text-xs text-pokemon-blue hover:underline">
                          View listing ↗
                        </a>
                        <button
                          onClick={() => { navigator.clipboard.writeText(listing.listing_url); toast.success('Link copied!'); }}
                          className="text-xs text-gray-400 hover:text-gray-600 px-1"
                          title="Copy link"
                        >📋</button>
                      </div>
                    )}
                  </td>
                  <td className="table-td font-semibold">{formatCurrency(listing.listing_price)}</td>
                  <td className="table-td text-gray-500 whitespace-nowrap">{formatDate(listing.listing_date)}</td>
                  <td className="table-td">
                    <span className={statusBadgeClass(listing.status)}>
                      {listing.status}
                    </span>
                  </td>
                  <td className="table-td font-semibold">
                    {listing.sold_price ? formatCurrency(listing.sold_price) : '—'}
                  </td>
                  <td className="table-td text-gray-500 whitespace-nowrap">
                    {formatDate(listing.sold_date)}
                  </td>
                  <td className="table-td text-red-500">
                    {listing.ebay_fees_total ? `− ${formatCurrency(listing.ebay_fees_total)}` : '—'}
                  </td>
                  <td className="table-td text-gray-500">
                    {listing.shipping_cost && parseFloat(listing.shipping_cost) > 0
                      ? `− ${formatCurrency(listing.shipping_cost)}` : '—'}
                  </td>
                  <td className={`table-td font-bold ${profitClass(listing.net_profit)}`}>
                    {listing.net_profit != null
                      ? (parseFloat(listing.net_profit) >= 0 ? '+' : '') + formatCurrency(listing.net_profit)
                      : '—'}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      {listing.status !== 'sold' && (
                        <button
                          onClick={() => setSoldListing(listing)}
                          className="p-1.5 rounded hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors"
                          title="Mark as Sold"
                        >💵</button>
                      )}
                      <button
                        onClick={() => openEdit(listing)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                        title="Edit"
                      >✏️</button>
                      <button
                        onClick={() => setDeleteConfirm(listing)}
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

      {/* Modals */}
      {showForm && (
        <EbayForm
          listing={editListing}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}
      {soldListing && (
        <SoldForm
          listing={soldListing}
          onSave={handleSold}
          onClose={() => setSoldListing(null)}
        />
      )}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal-content max-w-sm">
            <div className="modal-body text-center">
              <p className="text-5xl mb-4">🗑️</p>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Listing?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Remove this listing{deleteConfirm.card_name ? ` for <strong>${deleteConfirm.card_name}</strong>` : ''}? This can't be undone.
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
