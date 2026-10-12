import React, { useState } from 'react';
import {
  Package, Search, Plus, Download, Edit2, Trash2, AlertTriangle,
  ArrowDownLeft, ArrowUpRight, History, CheckCircle, Shield
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import { InventoryItem, InventoryMovement } from '../types';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportToCsv } from '../utils/exportCsv';

export const InventoryPage: React.FC = () => {
  const {
    inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
    recordInventoryMovement, inventoryMovements, buses
  } = useFleetData();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Movement Modal State
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedMovementItem, setSelectedMovementItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'received' | 'issued'>('received');
  const [movementQty, setMovementQty] = useState(1);
  const [movementBus, setMovementBus] = useState('');
  const [movementNotes, setMovementNotes] = useState('');
  const [movementError, setMovementError] = useState('');

  // History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Item Form State
  const initialFormState: Omit<InventoryItem, 'id'> = {
    item_name: '',
    sku: '',
    category: 'engine',
    current_stock: 10,
    minimum_stock: 5,
    purchase_price: 3500,
    vendor: '',
    unit: 'Pcs',
    storage_location: 'Bay A-01',
  };

  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>(initialFormState);

  // Calculations
  const lowStockItems = inventory.filter(i => i.current_stock <= i.minimum_stock);
  const totalValuation = inventory.reduce((acc, i) => acc + (i.current_stock * i.purchase_price), 0);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.vendor.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData(initialFormState);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      sku: item.sku,
      category: item.category,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      purchase_price: item.purchase_price,
      vendor: item.vendor,
      unit: item.unit,
      storage_location: item.storage_location,
    });
    setIsAddEditOpen(true);
  };

  const handleSubmitItemForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name || !formData.sku) {
      alert('Item name and SKU are required.');
      return;
    }
    if (editingItem) {
      updateInventoryItem(editingItem.id, formData);
    } else {
      addInventoryItem(formData);
    }
    setIsAddEditOpen(false);
  };

  const handleOpenMovement = (item: InventoryItem, type: 'received' | 'issued') => {
    setSelectedMovementItem(item);
    setMovementType(type);
    setMovementQty(1);
    setMovementBus(buses[0]?.bus_number || '');
    setMovementNotes('');
    setMovementError('');
    setIsMovementModalOpen(true);
  };

  const handleSubmitMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovementItem) return;

    const res = recordInventoryMovement({
      item_id: selectedMovementItem.id,
      item_name: selectedMovementItem.item_name,
      type: movementType,
      quantity: Number(movementQty),
      bus_number: movementType === 'issued' ? movementBus : undefined,
      date: new Date().toISOString().split('T')[0],
      notes: movementNotes || (movementType === 'received' ? 'Restock order' : `Fitted on ${movementBus}`)
    });

    if (!res.success) {
      setMovementError(res.message);
    } else {
      setIsMovementModalOpen(false);
    }
  };

  const handleExportCsv = () => {
    exportToCsv(inventory, 'FleetMind_SpareParts_Inventory', [
      { key: 'item_name', label: 'Item Name' },
      { key: 'sku', label: 'SKU / Part #' },
      { key: 'category', label: 'Category' },
      { key: 'current_stock', label: 'In Stock' },
      { key: 'unit', label: 'Unit' },
      { key: 'minimum_stock', label: 'Min Level' },
      { key: 'purchase_price', label: 'Unit Cost (₹)' },
      { key: 'vendor', label: 'Supplier' },
      { key: 'storage_location', label: 'Warehouse Bay' },
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-[#00C2FF]" />
            Spare Parts & Inventory Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track spare parts catalogues, automated low-stock reorder thresholds, and workshop issuance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <History className="w-4 h-4 text-[#00C2FF]" />
            Movement History
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-200 border border-white/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg shadow-[#00C2FF]/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add Spare Part
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Inventory Valuation</span>
          <h3 className="text-2xl font-bold text-white mt-1.5 font-heading">{formatCurrency(totalValuation)}</h3>
          <p className="text-xs text-slate-400 mt-1">{inventory.length} distinct spare part SKUs</p>
        </div>

        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Low Stock Alerts</span>
            {lowStockItems.length > 0 && <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />}
          </div>
          <h3 className="text-2xl font-bold text-rose-400 mt-1.5 font-heading">{lowStockItems.length} Parts</h3>
          <p className="text-xs text-rose-300 mt-1">Below required minimum reserve</p>
        </div>

        <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5">
          <span className="text-xs font-semibold text-slate-400 uppercase">Recent Movements</span>
          <h3 className="text-2xl font-bold text-[#00C2FF] mt-1.5 font-heading">{inventoryMovements.length} Logged</h3>
          <p className="text-xs text-slate-400 mt-1">Stock inbound & workshop issues</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#0F2742] rounded-2xl p-4 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search part name, SKU, vendor..."
            className="w-full bg-[#08111F] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-[#08111F] p-1 rounded-xl border border-white/10 overflow-x-auto w-full md:w-auto">
          {['all', 'engine', 'brakes', 'electrical', 'tires', 'fluids'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-[#00C2FF] text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-[#0F2742] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1F3A] text-slate-400 uppercase font-semibold border-b border-white/5">
              <tr>
                <th className="px-5 py-4">Item & SKU</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Stock Level</th>
                <th className="px-5 py-4">Unit Cost</th>
                <th className="px-5 py-4">Supplier & Bay</th>
                <th className="px-5 py-4">Quick Stock Move</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredInventory.map((item) => {
                const isLow = item.current_stock <= item.minimum_stock;

                return (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-white font-heading text-sm">{item.item_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono tracking-wider">{item.sku}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono text-sm ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.current_stock} {item.unit}
                        </span>
                        {isLow && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
                            Low (Min: {item.minimum_stock})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-white font-mono">{formatCurrency(item.purchase_price)}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-200">{item.vendor || 'OEM Direct'}</p>
                      <p className="text-[11px] text-slate-400">{item.storage_location}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenMovement(item, 'received')}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-colors flex items-center gap-1"
                          title="Record Stock Inbound"
                        >
                          <ArrowDownLeft className="w-3 h-3" /> Receive
                        </button>
                        <button
                          onClick={() => handleOpenMovement(item, 'issued')}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-slate-950 transition-colors flex items-center gap-1"
                          title="Record Stock Issue to Vehicle"
                        >
                          <ArrowUpRight className="w-3 h-3" /> Issue
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingItemId(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD MOVEMENT MODAL WITH ZERO-STOCK CHECK */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={movementType === 'received' ? `Receive Stock — ${selectedMovementItem?.item_name}` : `Issue Stock — ${selectedMovementItem?.item_name}`}
        subtitle={movementType === 'received' ? 'Record supplier stock delivery.' : 'Issue spare parts for bus maintenance.'}
      >
        <form onSubmit={handleSubmitMovement} className="space-y-4">
          {movementError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{movementError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-[#08111F] border border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Stock Available:</span>
            <span className="font-bold text-white text-sm">
              {selectedMovementItem?.current_stock} {selectedMovementItem?.unit}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Quantity ({selectedMovementItem?.unit}) *</label>
              <input
                type="number"
                min="1"
                required
                value={movementQty}
                onChange={(e) => setMovementQty(Number(e.target.value))}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>

            {movementType === 'issued' ? (
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Target Vehicle *</label>
                <select
                  value={movementBus}
                  onChange={(e) => setMovementBus(e.target.value)}
                  className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
                >
                  {buses.map(b => (
                    <option key={b.id} value={b.bus_number}>{b.bus_number} — {b.model}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Supplier Invoice / PO #</label>
                <input
                  type="text"
                  placeholder="e.g. PO-88912"
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Movement Notes</label>
            <textarea
              rows={2}
              value={movementNotes}
              onChange={(e) => setMovementNotes(e.target.value)}
              placeholder="Reason for issuance, technician name, or delivery docket..."
              className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg"
            >
              Confirm Stock Movement
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD / EDIT ITEM MODAL */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingItem ? `Edit Part — ${editingItem.sku}` : 'Add Spare Part to Catalogue'}
        subtitle="SKU identifier, minimum inventory warning thresholds, and unit prices."
      >
        <form onSubmit={handleSubmitItemForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Part Name *</label>
              <input
                type="text"
                required
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                placeholder="e.g. Front Disc Brake Pads Set"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">SKU / Part Code *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g. BP-KN-4401"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              >
                <option value="engine">Engine</option>
                <option value="brakes">Brakes</option>
                <option value="electrical">Electrical</option>
                <option value="tires">Tires</option>
                <option value="fluids">Fluids & Oils</option>
                <option value="suspension">Suspension</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">In Stock Quantity</label>
              <input
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Minimum Stock Level</label>
              <input
                type="number"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Unit Cost (₹)</label>
              <input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Unit (e.g. Sets, Pcs)</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Warehouse Bay Location</label>
              <input
                type="text"
                value={formData.storage_location}
                onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                placeholder="e.g. Bay C-02"
                className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#00C2FF]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">Supplier / Vendor</label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g. Knorr-Bremse India Ltd"
              className="w-full bg-[#08111F] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00C2FF]/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsAddEditOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 transition-colors shadow-lg"
            >
              {editingItem ? 'Save Changes' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MOVEMENT HISTORY MODAL */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Inventory Stock Movement Ledger"
        subtitle="Complete chronological trail of parts received from vendors and issued to vehicles."
        maxWidth="max-w-3xl"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {inventoryMovements.map((mov) => (
            <div key={mov.id} className="p-3.5 rounded-xl bg-[#08111F] border border-white/5 flex items-center justify-between text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    mov.type === 'received' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {mov.type}
                  </span>
                  <span className="font-bold text-white">{mov.item_name}</span>
                </div>
                <p className="text-slate-400 mt-1">
                  {mov.notes} {mov.bus_number && `• Vehicle ${mov.bus_number}`}
                </p>
              </div>

              <div className="text-right">
                <span className={`font-bold font-mono text-sm ${mov.type === 'received' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {mov.type === 'received' ? '+' : '-'}{mov.quantity} units
                </span>
                <p className="text-[11px] text-slate-500">{formatDate(mov.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* CONFIRM DELETE */}
      <ConfirmDialog
        isOpen={Boolean(deletingItemId)}
        onClose={() => setDeletingItemId(null)}
        onConfirm={() => {
          if (deletingItemId) deleteInventoryItem(deletingItemId);
        }}
        title="Remove Spare Part"
        message="Are you sure you want to remove this spare part from the active inventory catalogue?"
      />
    </div>
  );
};
