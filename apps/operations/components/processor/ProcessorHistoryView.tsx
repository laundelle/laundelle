'use client';
import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Package,
  Star,
  Search
} from 'lucide-react';

import { api } from '@laundelle/api-client';

interface CompletedOrder {
  id: string;
  customerName: string;
  customerPhone?: string;
  serviceType: string;
  itemCount: number;
  completedAt: string;
  bagQr?: string;
  total: number;
  rating?: number;
}

export const ProcessorHistoryView: React.FC = () => {
  const [orders, setOrders] = useState<CompletedOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchCompletedFromBackend = async () => {
    try {
      const data: any = await api.processor.getJobs();
      if (data && data.completed) {
        const mapped: CompletedOrder[] = data.completed.map((o: any) => ({
          id: o.id || o._id?.toString(),
          customerName: (o.customerName && o.customerName !== 'Valued Customer' && o.customerName !== 'Customer')
            ? o.customerName
            : (o.customer_name && o.customer_name !== 'Valued Customer' && o.customer_name !== 'Customer')
            ? o.customer_name
            : (o.contactDetails ? `${o.contactDetails.firstName || ''} ${o.contactDetails.lastName || ''}`.trim() : '')
            || o.customer?.full_name
            || o.customer?.name
            || o.user_name
            || (o.customerEmail ? o.customerEmail.split('@')[0] : '')
            || 'Customer',
          customerPhone: o.customerPhone || o.customer_phone || o.contactDetails?.phone || '',
          serviceType: o.items?.[0]?.name || o.service || 'Laundry Service',
          itemCount: o.items?.length || 1,
          completedAt: o.updated_at ? new Date(o.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Today',
          bagQr: o.package?.qr_code || o.qr_code || o.id,
          total: Number(o.total || o.total_price || 0),
          rating: 5
        }));
        setOrders(mapped);
      }
    } catch { }
  };

  useEffect(() => {
    fetchCompletedFromBackend();
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.serviceType.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  return (
    <div className="w-full space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search completed jobs..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Showing {filtered.length} of {orders.length} jobs
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                <th className="py-3 px-5">Order ID & QR</th>
                <th className="py-3 px-5">Customer</th>
                <th className="py-3 px-5">Service</th>
                <th className="py-3 px-5">Items</th>
                <th className="py-3 px-5">Completed</th>
                <th className="py-3 px-5">Rating</th>
                <th className="py-3 px-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No completed jobs found.
                  </td>
                </tr>
              ) : (
                filtered.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <span className="font-mono font-bold text-sm text-slate-900 block">{order.id}</span>
                      <span className="font-mono text-[10px] text-slate-400">{order.bagQr || 'QR-SEALED'}</span>
                    </td>
                    <td className="py-3.5 px-5 font-semibold text-slate-900">
                      {order.customerName}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600">
                      {order.serviceType}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 text-[11px]">
                        <Package className="w-3 h-3 text-slate-400" /> {order.itemCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" /> {order.completedAt}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      {order.rating ? (
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: order.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" />
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Verified</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold font-mono text-xs text-slate-900">
                      £{order.total.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
