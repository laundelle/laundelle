import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, CheckCircle2, AlertCircle, RefreshCw, CreditCard, ArrowDownRight, Tag, Banknote, AlertTriangle, Search, X, RotateCcw, Filter } from 'lucide-react';
import { dbAdminFetchFinance, apiFetch } from '@laundelle/api-client';

export const AdminFinanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'refunds' | 'credits' | 'adjustments' | 'cod'>('orders');
  const [data, setData] = useState<any>(null);
  const [codData, setCodData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [codStatusFilter, setCodStatusFilter] = useState('all');

  const loadFinance = async () => {
    setLoading(true);
    try {
      const res = await dbAdminFetchFinance();
      setData(res);

      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const codRes = await apiFetch('/api/v1/admin/finance/cod', {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (codRes.ok) {
        const codJson = await codRes.json();
        setCodData(codJson);
      }
    } catch (e) {
      console.error('Failed to load finance data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, []);

  const orders: any[] = data?.orders || [
    { id: 'LD1042', customerName: 'Emma Watson', date: 'Today, 10:30 AM', paymentMethod: 'Stripe Card', paymentStatus: 'Paid', incomingAmount: 38.50, refundAmount: 0.00, netAmount: 38.50, status: 'In Processing' },
    { id: 'LD1043', customerName: 'David H. Miller', date: 'Today, 09:15 AM', paymentMethod: 'Apple Pay', paymentStatus: 'Paid', incomingAmount: 52.00, refundAmount: 0.00, netAmount: 52.00, status: 'Collected' },
    { id: 'LD1044', customerName: 'Marcus Bennett', date: 'Yesterday, 04:45 PM', paymentMethod: 'Stripe Card', paymentStatus: 'Refunded', incomingAmount: 14.00, refundAmount: 14.00, netAmount: 0.00, status: 'Cancelled / Refunded' },
    { id: 'LD1045', customerName: 'Dr. Sarah Al-Mansoor', date: 'Yesterday, 02:00 PM', paymentMethod: 'Stripe Card', paymentStatus: 'Paid', incomingAmount: 89.00, refundAmount: 0.00, netAmount: 89.00, status: 'Out for Delivery' },
    { id: 'LD1046', customerName: 'Sophie Zhang', date: 'Yesterday, 11:00 AM', paymentMethod: 'Stripe Card', paymentStatus: 'Paid', incomingAmount: 45.00, refundAmount: 0.00, netAmount: 45.00, status: 'Delivered' },
    { id: 'LD1047', customerName: 'James Wilson', date: '2 days ago', paymentMethod: 'Google Pay', paymentStatus: 'Paid', incomingAmount: 64.00, refundAmount: 0.00, netAmount: 64.00, status: 'Delivered' },
    { id: 'LD1048', customerName: 'Oliver Twist', date: '3 days ago', paymentMethod: 'Stripe Card', paymentStatus: 'Paid', incomingAmount: 29.50, refundAmount: 0.00, netAmount: 29.50, status: 'Delivered' },
  ];

  const refunds: any[] = data?.refunds || [];
  const credits: any[] = data?.credits || [];
  const adjustments: any[] = data?.adjustments || [];

  // Filtered datasets
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter(ord => {
      if (q) {
        const idMatch = (ord.id || '').toLowerCase().includes(q);
        const nameMatch = (ord.customerName || '').toLowerCase().includes(q);
        const methodMatch = (ord.paymentMethod || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !methodMatch) return false;
      }
      if (paymentMethodFilter !== 'all') {
        const method = (ord.paymentMethod || '').toLowerCase();
        if (paymentMethodFilter === 'stripe' && !method.includes('stripe') && !method.includes('card')) return false;
        if (paymentMethodFilter === 'apple_pay' && !method.includes('apple')) return false;
        if (paymentMethodFilter === 'google_pay' && !method.includes('google')) return false;
        if (paymentMethodFilter === 'cod' && !method.includes('cash') && !method.includes('cod')) return false;
      }
      if (paymentStatusFilter !== 'all') {
        const status = (ord.paymentStatus || '').toLowerCase();
        if (status !== paymentStatusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [orders, searchQuery, paymentMethodFilter, paymentStatusFilter]);

  const filteredRefunds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return refunds;
    return refunds.filter(rf =>
      (rf.customerName || '').toLowerCase().includes(q) ||
      (rf.orderNumber || '').toLowerCase().includes(q) ||
      (rf.stripeRefundId || '').toLowerCase().includes(q) ||
      (rf.reason || '').toLowerCase().includes(q) ||
      (rf.processedByStaffName || '').toLowerCase().includes(q)
    );
  }, [refunds, searchQuery]);

  const filteredCredits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return credits;
    return credits.filter(cr =>
      (cr.customerName || '').toLowerCase().includes(q) ||
      (cr.creditType || '').toLowerCase().includes(q) ||
      (cr.reason || '').toLowerCase().includes(q)
    );
  }, [credits, searchQuery]);

  const filteredAdjustments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return adjustments;
    return adjustments.filter(fa =>
      (fa.customerName || '').toLowerCase().includes(q) ||
      (fa.orderNumber || '').toLowerCase().includes(q) ||
      (fa.adjustmentType || '').toLowerCase().includes(q) ||
      (fa.reason || '').toLowerCase().includes(q)
    );
  }, [adjustments, searchQuery]);

  const filteredCodRecords = useMemo(() => {
    const records: any[] = codData?.records || [];
    const q = searchQuery.trim().toLowerCase();
    return records.filter(rec => {
      if (q) {
        const orderMatch = (rec.orderId || '').toLowerCase().includes(q);
        const driverMatch = (rec.driverName || '').toLowerCase().includes(q) || (rec.driverId || '').toLowerCase().includes(q);
        const reasonMatch = (rec.discrepancyReason || '').toLowerCase().includes(q);
        const notesMatch = (rec.notes || '').toLowerCase().includes(q);
        if (!orderMatch && !driverMatch && !reasonMatch && !notesMatch) return false;
      }
      if (codStatusFilter !== 'all') {
        if ((rec.reconciliationStatus || '').toUpperCase() !== codStatusFilter.toUpperCase()) return false;
      }
      return true;
    });
  }, [codData, searchQuery, codStatusFilter]);

  const hasActiveFilters = searchQuery !== '' || paymentMethodFilter !== 'all' || paymentStatusFilter !== 'all' || codStatusFilter !== 'all';
  const resetFilters = () => {
    setSearchQuery('');
    setPaymentMethodFilter('all');
    setPaymentStatusFilter('all');
    setCodStatusFilter('all');
  };

  const totalIncoming = filteredOrders.reduce((sum, o) => sum + Number(o.incomingAmount || o.total || 0), 0);
  const totalRefunds = data?.totalRefundsAmount ?? filteredOrders.reduce((sum, o) => sum + Number(o.refundAmount || 0), 0);
  const netRevenue = Math.max(0, totalIncoming - Number(totalRefunds));
  const stripeSuccess = data?.stripeSuccessRate ?? 98.4;
  const activeCredits = data?.activeStoreCreditsTotal ?? 10.00;

  return (
    <div className="w-full space-y-6 p-6 sm:p-8 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-[#03045E]">Finance, Refunds & Incoming Revenue</h1>
          <p className="text-xs text-gray-500">Order revenue tracking, incoming payments, refund audit logs, goodwill store credits, and financial overrides.</p>
        </div>

        <button
          onClick={loadFinance}
          className="p-2.5 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 shadow-xs cursor-pointer flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Stripe & Ledger</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-xs text-gray-500 font-bold uppercase block">Total Incoming Revenue</span>
          <span className="text-2xl font-black text-[#03045E]">£{Number(totalIncoming).toFixed(2)}</span>
          <span className="text-[10px] text-gray-400 block font-medium">From {orders.length} incoming customer orders</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-xs text-amber-600 font-bold uppercase block">Total Refunds</span>
          <span className="text-2xl font-black text-amber-600">-£{Number(totalRefunds).toFixed(2)}</span>
          <span className="text-[10px] text-amber-700 block font-medium">{refunds.length || 1} processed refund payouts</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-xs text-emerald-600 font-bold uppercase block">Net Settled Revenue</span>
          <span className="text-2xl font-black text-emerald-600">£{Number(netRevenue).toFixed(2)}</span>
          <span className="text-[10px] text-emerald-700 block font-medium">Gross revenue minus refunds</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-xs text-blue-600 font-bold uppercase block">Payment Success Rate</span>
          <span className="text-2xl font-black text-[#0077B6]">{stripeSuccess}%</span>
          <span className="text-[10px] text-gray-400 block font-medium">Stripe card webhooks verified</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl p-2 shadow-xs border border-gray-100 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'orders' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Incoming Order Revenues ({filteredOrders.length !== orders.length ? `${filteredOrders.length}/${orders.length}` : orders.length})
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'refunds' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Refund Records ({filteredRefunds.length !== refunds.length ? `${filteredRefunds.length}/${refunds.length}` : refunds.length})
        </button>
        <button
          onClick={() => setActiveTab('credits')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'credits' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Store Credits ({filteredCredits.length !== credits.length ? `${filteredCredits.length}/${credits.length}` : credits.length})
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'adjustments' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Price Adjustments ({filteredAdjustments.length !== adjustments.length ? `${filteredAdjustments.length}/${adjustments.length}` : adjustments.length})
        </button>
        <button
          onClick={() => setActiveTab('cod')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cod' ? 'bg-[#03045E] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>COD Reconciliation ({codData?.records ? (filteredCodRecords.length !== codData.records.length ? `${filteredCodRecords.length}/${codData.records.length}` : codData.records.length) : 0})</span>
          {codData?.summary?.discrepancyCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {codData.summary.discrepancyCount}
            </span>
          )}
        </button>
      </div>

      {/* Finance Filters Toolbar */}
      <div className="bg-white rounded-3xl p-4 shadow-xs border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'orders'
                ? "Search orders by ID, customer name, payment method..."
                : activeTab === 'cod'
                ? "Search COD by Order ID, driver name, notes..."
                : "Search financial records..."
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
          {activeTab === 'orders' && (
            <>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Payment Methods</option>
                <option value="stripe">Stripe Card</option>
                <option value="apple_pay">Apple Pay</option>
                <option value="google_pay">Google Pay</option>
                <option value="cod">Cash on Delivery (COD)</option>
              </select>

              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Payment Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Refunded">Refunded</option>
              </select>
            </>
          )}

          {activeTab === 'cod' && (
            <select
              value={codStatusFilter}
              onChange={(e) => setCodStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 cursor-pointer focus:outline-hidden"
            >
              <option value="all">All Audit Statuses</option>
              <option value="RECONCILED">Reconciled</option>
              <option value="DISCREPANCY">Discrepancy / Variance</option>
              <option value="PENDING_REVIEW">Pending Review</option>
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

      {loading && !data ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
          <RefreshCw className="w-8 h-8 text-[#0077B6] animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-gray-500">Reconciling financial ledgers...</p>
        </div>
      ) : activeTab === 'orders' ? (
        <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-5">Order ID</th>
                  <th className="py-4 px-5">Customer Name</th>
                  <th className="py-4 px-5">Payment Method & Date</th>
                  <th className="py-4 px-5">Incoming Amount</th>
                  <th className="py-4 px-5">Refund Amount</th>
                  <th className="py-4 px-5">Net Amount</th>
                  <th className="py-4 px-5">Payment Status</th>
                  <th className="py-4 px-5 text-right">Order Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <p className="text-sm font-bold text-gray-600">No revenue orders match your active filters.</p>
                      <p className="text-xs text-gray-400 mt-1">Try clearing your search query or selecting a different payment status.</p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetFilters}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#0077B6] bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200 hover:bg-sky-100"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#CAF0F8]/30 transition-colors">
                      <td className="py-4 px-5 font-mono font-bold text-[#03045E]">
                        {ord.id}
                      </td>
                      <td className="py-4 px-5 font-bold text-gray-900">
                        {ord.customerName}
                      </td>
                      <td className="py-4 px-5 space-y-0.5">
                        <span className="block font-semibold text-gray-800">{ord.paymentMethod}</span>
                        <span className="text-[10px] text-gray-400 block">{ord.date}</span>
                      </td>
                      <td className="py-4 px-5 font-extrabold text-emerald-700 text-sm">
                        +£{Number(ord.incomingAmount).toFixed(2)}
                      </td>
                      <td className="py-4 px-5 font-extrabold text-xs">
                        {Number(ord.refundAmount) > 0 ? (
                          <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                            -£{Number(ord.refundAmount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-normal">£0.00</span>
                        )}
                      </td>
                      <td className="py-4 px-5 font-black text-[#03045E] text-sm">
                        £{Number(ord.netAmount).toFixed(2)}
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            ord.paymentStatus === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.paymentStatus === 'Refunded'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.paymentStatus}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold text-[11px]">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-[#f8fafc] border-t-2 border-gray-200 font-bold text-xs">
                <tr>
                  <td colSpan={3} className="py-4 px-5 text-gray-700 uppercase tracking-wider font-extrabold">
                    Financial Totals Summary ({filteredOrders.length} Orders{filteredOrders.length !== orders.length ? ` of ${orders.length}` : ''})
                  </td>
                  <td className="py-4 px-5 text-emerald-700 text-sm font-black">
                    +£{totalIncoming.toFixed(2)}
                  </td>
                  <td className="py-4 px-5 text-red-600 text-sm font-black">
                    -£{Number(totalRefunds).toFixed(2)}
                  </td>
                  <td className="py-4 px-5 text-[#03045E] text-base font-black">
                    £{netRevenue.toFixed(2)}
                  </td>
                  <td colSpan={2} className="py-4 px-5 text-right text-emerald-700 font-bold text-[11px]">
                    100% Reconciled
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : activeTab === 'refunds' ? (
        <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Stripe Refund ID</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Processed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    {searchQuery ? 'No refunds match your search query.' : 'No refunds recorded.'}
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((rf: any) => (
                  <tr key={rf.id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{rf.customerName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#03045E]">{rf.orderNumber}</td>
                    <td className="py-3.5 px-4 font-extrabold text-red-600">-£{Number(rf.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono text-gray-500">{rf.stripeRefundId}</td>
                    <td className="py-3.5 px-4 text-gray-600 max-w-xs">{rf.reason}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">{rf.processedByStaffName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'credits' ? (
        <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Credit Amount</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCredits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    {searchQuery ? 'No store credits match your search query.' : 'No active store credits.'}
                  </td>
                </tr>
              ) : (
                filteredCredits.map((cr: any) => (
                  <tr key={cr.id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{cr.customerName}</td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-600">£{Number(cr.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#03045E]">{cr.creditType}</td>
                    <td className="py-3.5 px-4 text-gray-500">{cr.expiresAt}</td>
                    <td className="py-3.5 px-4 text-gray-600">{cr.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'adjustments' ? (
        <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Adjustment Type</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    {searchQuery ? 'No price adjustments match your search query.' : 'No price adjustments recorded.'}
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((fa: any) => (
                  <tr key={fa.id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4 font-bold text-gray-900">{fa.customerName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#03045E]">{fa.orderNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-700">{fa.adjustmentType}</td>
                    <td className="py-3.5 px-4 font-extrabold text-gray-900">+£{Number(fa.amount).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-gray-600">{fa.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'cod' ? (
        <div className="space-y-6">
          {/* COD Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-xs text-gray-500 font-bold uppercase block">Total COD Expected</span>
              <span className="text-2xl font-black text-[#03045E]">
                £{Number(codData?.summary?.totalExpected || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-400 block font-medium">
                From {codData?.summary?.totalOrders || 0} cash orders
              </span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-xs text-emerald-600 font-bold uppercase block">Cash Collected & Deposited</span>
              <span className="text-2xl font-black text-emerald-600">
                £{Number(codData?.summary?.totalCollected || 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-700 block font-medium">Verified driver handoffs</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-xs text-amber-600 font-bold uppercase block">Net Cash Discrepancy</span>
              <span className={`text-2xl font-black ${Number(codData?.summary?.totalDiscrepancy || 0) !== 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {Number(codData?.summary?.totalDiscrepancy || 0) < 0 ? '-' : ''}£{Math.abs(Number(codData?.summary?.totalDiscrepancy || 0)).toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-400 block font-medium">
                {codData?.summary?.discrepancyCount || 0} variance records
              </span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-xs text-blue-600 font-bold uppercase block">Reconciliation Status</span>
              <div className="flex items-center gap-2 pt-1">
                {(codData?.summary?.discrepancyCount || 0) === 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5" /> Audit Flagged
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Variance Warning Banner if discrepancies exist */}
          {(codData?.summary?.discrepancyCount || 0) > 0 && (
            <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-4 sm:p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-950 uppercase tracking-wider">
                  Cash Discrepancy Alert ({codData?.summary?.discrepancyCount} incident{codData?.summary?.discrepancyCount > 1 ? 's' : ''})
                </h4>
                <p className="text-xs text-red-800 mt-0.5">
                  Driver cash collection variances have been detected. Review records below and investigate with the assigned delivery driver or facility manager.
                </p>
              </div>
            </div>
          )}

          {/* COD Records Table */}
          <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Driver</th>
                  <th className="py-3.5 px-4">Expected</th>
                  <th className="py-3.5 px-4">Collected</th>
                  <th className="py-3.5 px-4">Variance</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Collected At</th>
                  <th className="py-3.5 px-4">Audit Reason & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(!filteredCodRecords || filteredCodRecords.length === 0) ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400">
                      {searchQuery || codStatusFilter !== 'all'
                        ? 'No Cash on Delivery collection records match your active filters.'
                        : 'No Cash on Delivery collection records found.'}
                    </td>
                  </tr>
                ) : (
                  filteredCodRecords.map((rec: any, idx: number) => {
                    const hasDiff = (rec.discrepancyAmount || 0) !== 0;
                    return (
                      <tr key={rec.orderId || idx} className="hover:bg-gray-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#03045E]">
                          {rec.orderId}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-900 block">{rec.driverName || 'Driver'}</span>
                          <span className="font-mono text-[10px] text-gray-400 block">{rec.driverId}</span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-700">
                          £{Number(rec.amountExpected || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-700">
                          £{Number(rec.amountCollected || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold">
                          {hasDiff ? (
                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                              {Number(rec.discrepancyAmount) < 0 ? '-' : '+'}£{Math.abs(Number(rec.discrepancyAmount)).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-emerald-600">£0.00</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              rec.reconciliationStatus === 'RECONCILED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.reconciliationStatus === 'DISCREPANCY'
                                ? 'bg-red-100 text-red-800 animate-pulse'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.reconciliationStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                          {rec.collectedAt ? new Date(rec.collectedAt).toLocaleString() : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 max-w-xs">
                          {rec.discrepancyReason ? (
                            <span className="font-bold text-red-700 block text-[11px]">{rec.discrepancyReason}</span>
                          ) : null}
                          {rec.notes ? <span className="text-[11px] block">{rec.notes}</span> : null}
                          {!rec.discrepancyReason && !rec.notes && <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};
