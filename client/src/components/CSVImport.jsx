import { useState, useRef } from 'react';
import { importCards } from '../utils/api';
import toast from 'react-hot-toast';

export default function CSVImport({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f && f.type !== 'text/csv' && !f.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const res = await importCards(file);
      setResult(res);
      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} card${res.imported !== 1 ? 's' : ''}!`);
        onImported?.();
      }
    } catch (err) {
      toast.error('Import failed: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <h2 className="text-lg font-bold">Import CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="modal-body space-y-4">
          {/* Expected format */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-semibold mb-1">Expected CSV columns:</p>
            <p className="font-mono">name, set_name, card_number, condition, quantity, purchase_price, purchase_date, notes, pokemon_tcg_id, market_price, image_url</p>
            <p className="mt-1 text-blue-600">Only <code>name</code> is required. Dates should be YYYY-MM-DD.</p>
          </div>

          {/* File drop zone */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${file ? 'border-pokemon-red bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <div className="text-3xl mb-2">{file ? '📄' : '📁'}</div>
            {file ? (
              <>
                <p className="font-medium text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-700">Click to choose a CSV file</p>
                <p className="text-sm text-gray-400">or drag and drop</p>
              </>
            )}
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg p-3 text-sm ${result.errors?.length ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
              <p className="font-semibold text-green-700">✓ Imported {result.imported} cards</p>
              {result.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="font-semibold text-yellow-700">{result.errors.length} row(s) had errors:</p>
                  <ul className="mt-1 space-y-1 text-xs text-yellow-800 max-h-32 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i}>Row {e.row}: {e.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Close</button>
            <button onClick={handleImport} disabled={!file || importing} className="btn-primary flex-1">
              {importing ? 'Importing…' : 'Import Cards'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
