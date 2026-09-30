'use client';
import { apiFetch } from '@laundelle/api-client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package, Plus, AlertTriangle, ArrowRightLeft, CheckCircle,
  Truck, ArrowRight, X, RefreshCw, Layers, DollarSign, Search, RotateCcw
} from 'lucide-react';
import { InventoryItem, InventoryTransfer, InventoryCategory, InventoryUnit } from '@laundelle/types';

interface InventoryManagementViewProps {
  plantId: string;
  plantName: string;
  otherPlants?: Array<{ id: string; name: string }>;
}

export const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({
  plantId,
  plantName,
  otherPlants = []
}) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'items' | 'transfers'>('items');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [transferStatusFilter, setTransferStatusFilter] = useState('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const skuMatch = (item.sku || '').toLowerCase().includes(q);
        const catMatch = (item.category || '').toLowerCase().includes(q);
        if (!nameMatch && !skuMatch && !catMatch) return false;
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
        return false;
      }
      if (stockStatusFilter !== 'all') {
        if (stockStatusFilter === 'low_stock' && !item.isLowStock) return false;
        if (stockStatusFilter === 'in_stock' && item.isLowStock) return false;
      }
      return true;
    });
  }, [items, searchQuery, categoryFilter, stockStatusFilter]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((tr) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const itemMatch = (tr.itemName || '').toLowerCase().includes(q);
        const notesMatch = (tr.notes || '').toLowerCase().includes(q);
        if (!itemMatch && !notesMatch) return false;
      }
      if (transferStatusFilter !== 'all' && tr.status !== transferStatusFilter) {
        return false;
      }
      return true;
    });
  }, [transfers, searchQuery, transferStatusFilter]);

  const hasActiveFilters = searchQuery !== '' || categoryFilter !== 'all' || stockStatusFilter !== 'all' || transferStatusFilter !== 'all';
  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setStockStatusFilter('all');
    setTransferStatusFilter('all');
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<'PURCHASE' | 'CONSUMPTION' | 'ADJUSTMENT' | 'WASTE'>('PURCHASE');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // New Item Form
  const [newName, setNewName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategory, setNewCategory] = useState<InventoryCategory>('DETERGENT');
  const [newUnit, setNewUnit] = useState<InventoryUnit>('LITRES');
  const [newQty, setNewQty] = useState('50');
  const [newThreshold, setNewThreshold] = useState('15');
  const [newCost, setNewCost] = useState('12.50');
  const [addLoading, setAddLoading] = useState(false);

  // Transfer Form
  const [targetDestPlantId, setTargetDestPlantId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const [itemsRes, transfersRes] = await Promise.all([
        apiFetch(`/api/v1/inventory/items?plantId=${encodeURIComponent(plantId)}`, { headers }),
        apiFetch(`/api/v1/inventory/transfers?plantId=${encodeURIComponent(plantId)}`, { headers })
      ]);

      const itemsData = await itemsRes.json();
      const transfersData = await transfersRes.json();

      if (itemsData.data?.items) setItems(itemsData.data.items);
      if (transfersData.data?.transfers) setTransfers(transfersData.data.transfers);
    } catch (e) {
      console.error('Failed to load inventory data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [plantId]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem || !adjustQty) return;
    setAdjustLoading(true);

    const qtyNumber = Number(adjustQty);
    const finalQty = adjustType === 'CONSUMPTION' || adjustType === 'WASTE' ? -Math.abs(qtyNumber) : Math.abs(qtyNumber);

    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/inventory/items/${adjustingItem.id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          quantity: finalQty,
          type: adjustType,
          notes: adjustNotes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error?.message || 'Failed to adjust stock');
      } else {
        setAdjustingItem(null);
        setAdjustQty('');
        setAdjustNotes('');
        await fetchData();
      }
    } catch (e: any) {
      alert(e.message || 'Error adjusting stock');
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSku) return;
    setAddLoading(true);

    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch('/api/v1/inventory/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          plantId,
          plantName,
          name: newName.trim(),
          sku: newSku.trim().toUpperCase(),
          category: newCategory,
          unit: newUnit,
          quantityOnHand: Number(newQty),
          minimumThreshold: Number(newThreshold),
          reorderQuantity: Number(newThreshold) * 2,
          unitCost: Number(newCost)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error?.message || 'Failed to create consumable');
      } else {
        setShowAddModal(false);
        setNewName('');
        setNewSku('');
        await fetchData();
      }
    } catch (e: any) {
      alert(e.message || 'Error creating consumable');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !targetDestPlantId || !transferQty) return;
    setTransferLoading(true);

    const destPlant = otherPlants.find((p) => p.id === targetDestPlantId);

    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch('/api/v1/inventory/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sourcePlantId: plantId,
          sourcePlantName: plantName,
          destinationPlantId: targetDestPlantId,
          destinationPlantName: destPlant?.name || 'Destination Plant',
          itemId: selectedItemId,
          quantity: Number(transferQty),
          notes: transferNotes
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error?.message || 'Failed to request transfer');
      } else {
        setShowTransferModal(false);
        setSelectedItemId('');
        setTransferQty('');
        setTransferNotes('');
        await fetchData();
      }
    } catch (e: any) {
      alert(e.message || 'Error requesting transfer');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleUpdateTransferStatus = async (transferId: string, action: 'APPROVE' | 'DISPATCH' | 'RECEIVE') => {
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/inventory/transfers/${transferId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error?.message || `Failed to ${action.toLowerCase()} transfer`);
      } else {
        await fetchData();
      }
    } catch (e: any) {
      alert(e.message || 'Error updating transfer');
    }
  };

  const lowStockCount = items.filter((i) => i.isLowStock).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-heading font-extrabold text-[#03045E]">Plant Consumables & Inventory</h2>
          <p className="text-xs text-gray-500">
            Atomic ledger tracking for detergents, softeners, packaging, and inter-plant transfers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#03045E] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-[#03045E] rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all"
          >
            <ArrowRightLeft className="w-4 h-4 text-[#0077B6]" />
            <span>Transfer Stock</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Consumable</span>
          </button>
        </div>
      </div>

      {/* Sub tabs & KPIs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('items')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'items' ? 'bg-[#03045E] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Consumable Stock List ({items.length})
          </button>
          <button
            onClick={() => setSubTab('transfers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'transfers' ? 'bg-[#03045E] text-white shadow-xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Inter-Plant Transfers ({transfers.length})
          </button>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{lowStockCount} items below minimum safety threshold</span>
          </div>
        )}
      </div>

      {/* Inventory Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              subTab === 'items'
                ? "Search consumables by SKU, name, or category..."
                : "Search transfers by item name or notes..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#0077B6] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {subTab === 'items' && (
            <>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                <option value="DETERGENT">Detergent</option>
                <option value="SOFTENER">Softener</option>
                <option value="PACKAGING">Packaging</option>
                <option value="SOLVENT">Solvent</option>
                <option value="TAGS">Tags / Labels</option>
                <option value="OTHER">Other</option>
              </select>

              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Stock Levels</option>
                <option value="low_stock">Low Stock Only</option>
                <option value="in_stock">Adequate Stock</option>
              </select>
            </>
          )}

          {subTab === 'transfers' && (
            <select
              value={transferStatusFilter}
              onChange={(e) => setTransferStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 cursor-pointer focus:outline-hidden"
            >
              <option value="all">All Transfer Statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-xl text-xs font-bold text-[#0077B6] hover:bg-[#CAF0F8]/50 transition-colors flex items-center gap-1.5 cursor-pointer border border-[#ADE8F4]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: ITEMS */}
      {subTab === 'items' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">SKU & Item Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Quantity On Hand</th>
                  <th className="p-3.5">Min Threshold</th>
                  <th className="p-3.5">Unit Cost</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      Loading inventory items...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      {hasActiveFilters
                        ? 'No consumables match your active filter criteria.'
                        : 'No consumables registered. Click "Add Consumable" to configure your plant detergents, softeners, and packaging.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-[#0077B6] block text-[11px]">{i.sku}</span>
                        <span className="font-extrabold text-[#03045E] text-xs">{i.name}</span>
                      </td>
                      <td className="p-3.5 text-gray-600 font-medium">
                        <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-700">
                          {i.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-sm font-black ${
                            i.isLowStock ? 'text-rose-600 font-mono' : 'text-gray-900 font-mono'
                          }`}
                        >
                          {i.quantityOnHand}
                        </span>
                        <span className="text-gray-500 ml-1 text-[11px] font-medium">{i.unit}</span>
                      </td>
                      <td className="p-3.5 text-gray-500 font-mono">
                        {i.minimumThreshold} {i.unit}
                      </td>
                      <td className="p-3.5 font-mono text-gray-700">£{Number(i.unitCost || 0).toFixed(2)}</td>
                      <td className="p-3.5">
                        {i.isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            LOW STOCK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            ADEQUATE
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setAdjustingItem(i);
                            setAdjustQty('');
                            setAdjustNotes('');
                          }}
                          className="px-3 py-1.5 bg-[#0077B6]/10 hover:bg-[#0077B6]/20 text-[#0077B6] rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Adjust / Restock</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: TRANSFERS */}
      {subTab === 'transfers' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Route (Source → Destination)</th>
                  <th className="p-3.5">Consumable Item</th>
                  <th className="p-3.5">Quantity</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date Requested</th>
                  <th className="p-3.5 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      {hasActiveFilters
                        ? 'No inventory transfers match your active filter criteria.'
                        : 'No inventory transfers logged. Use "Transfer Stock" to shift materials between facilities.'}
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((t) => {
                    const isSource = t.sourcePlantId === plantId;
                    const isDest = t.destinationPlantId === plantId;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 font-bold text-gray-900">
                            <span className={isSource ? 'text-[#0077B6]' : 'text-gray-700'}>{t.sourcePlantName}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                            <span className={isDest ? 'text-[#0077B6]' : 'text-gray-700'}>{t.destinationPlantName}</span>
                          </div>
                        </td>
                        <td className="p-3.5 font-medium text-gray-900">{t.itemName}</td>
                        <td className="p-3.5 font-mono font-bold text-gray-900">
                          {t.quantity} {t.unit}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'RECEIVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'DISPATCHED'
                                ? 'bg-sky-100 text-sky-800'
                                : t.status === 'APPROVED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-500 text-[11px]">
                          {new Date(t.requestedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right space-x-1">
                          {t.status === 'REQUESTED' && (
                            <button
                              onClick={() => handleUpdateTransferStatus(t.id, 'APPROVE')}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold"
                            >
                              Approve
                            </button>
                          )}
                          {t.status === 'APPROVED' && isSource && (
                            <button
                              onClick={() => handleUpdateTransferStatus(t.id, 'DISPATCH')}
                              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-[10px] font-bold"
                            >
                              Dispatch Stock
                            </button>
                          )}
                          {t.status === 'DISPATCHED' && isDest && (
                            <button
                              onClick={() => handleUpdateTransferStatus(t.id, 'RECEIVE')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                            >
                              Confirm Received
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustStock}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-heading font-extrabold text-[#03045E]">Adjust Stock Balance</h3>
                <p className="text-xs text-gray-500">
                  {adjustingItem.name} ({adjustingItem.sku}) • Current: {adjustingItem.quantityOnHand} {adjustingItem.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-bold"
                >
                  <option value="PURCHASE">Stock Purchase / Restock (+)</option>
                  <option value="CONSUMPTION">Manual Consumption (-)</option>
                  <option value="ADJUSTMENT">Audit Reconciliation (+/-)</option>
                  <option value="WASTE">Spill / Damaged Waste (-)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Quantity ({adjustingItem.unit}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 25"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Audit Explanation / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Received weekly chemical delivery"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setAdjustingItem(null)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adjustLoading}
                className="px-4 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {adjustLoading ? 'Recording Ledger...' : 'Apply Stock Change'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Consumable Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-heading font-extrabold text-[#03045E]">Add Consumable Item</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="font-bold text-gray-700 block mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Eco Detergent 25L"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">SKU *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DET-ECO-25L"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-bold"
                >
                  <option value="DETERGENT">Detergent</option>
                  <option value="SOFTENER">Softener</option>
                  <option value="STAIN_REMOVER">Stain Remover</option>
                  <option value="PACKAGING">Packaging & Bags</option>
                  <option value="HANGER">Hangers</option>
                  <option value="SAFETY_PPE">Safety PPE</option>
                  <option value="SPARE_PART">Spare Part</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Unit of Measure</label>
                <select
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value as any)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-bold"
                >
                  <option value="LITRES">Litres (L)</option>
                  <option value="KILOGRAMS">Kilograms (kg)</option>
                  <option value="UNITS">Units (pcs)</option>
                  <option value="BOXES">Boxes</option>
                  <option value="ROLLS">Rolls</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Initial Stock</label>
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Minimum Alert Threshold</label>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Unit Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="px-4 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {addLoading ? 'Adding...' : 'Register Consumable'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer Request Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRequestTransfer}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-heading font-extrabold text-[#03045E]">Request Inter-Plant Transfer</h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Destination Plant *</label>
                <select
                  required
                  value={targetDestPlantId}
                  onChange={(e) => setTargetDestPlantId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-bold"
                >
                  <option value="">-- Choose Facility --</option>
                  {otherPlants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  {otherPlants.length === 0 && (
                    <option value="plant_secondary">Central Operations Hub 2</option>
                  )}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Item to Transfer *</label>
                <select
                  required
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-bold"
                >
                  <option value="">-- Choose Consumable --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.quantityOnHand} {i.unit} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Quantity to Transfer *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 10"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Transfer Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent weekend stock balancing"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full p-2.5 border rounded-xl bg-gray-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={transferLoading || !selectedItemId || !transferQty}
                className="px-4 py-2 bg-[#0077B6] hover:bg-[#023E8A] text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {transferLoading ? 'Submitting...' : 'Submit Transfer Request'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
