import React, { useState, useEffect } from 'react';
import { AdminRole, AdminViewTab } from '@laundelle/types';
import { Order } from '@laundelle/types';

import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';

import { AdminDashboard } from './AdminDashboard';
import { ManagerPortalView } from './ManagerPortalView';
import { AdminOrdersView } from './AdminOrdersView';
import { AdminCustomersView } from './AdminCustomersView';
import { ManagerStaffView } from './ManagerStaffView';
import { ManagerDriversView } from './ManagerDriversView';
import { ManagerProcessorsView } from './ManagerProcessorsView';
import { AdminStaffView } from './AdminStaffView';
import { AdminServicesView } from './AdminServicesView';
import { AdminAreasView } from './AdminAreasView';
import { AdminFinanceView } from './AdminFinanceView';
import { AdminComplaintsView } from './AdminComplaintsView';
import { ManagerIncidentsView } from './ManagerIncidentsView';
import { AdminReportsView } from './AdminReportsView';
import { AdminSettingsView } from './AdminSettingsView';


import { Search, X, QrCode, User, ShoppingBag, LayoutDashboard, Users, Settings, Truck, Package } from 'lucide-react';
import { dbAdminFetchOrders, dbFetchManagerOrders, dbAdminFetchCustomers, dbFetchManagerStaff } from '@laundelle/api-client';

interface AdminPortalProps {
  orders: Order[]; // Left for backwards compatibility, but not used for actual display anymore
  onExitAdmin: () => void;
  userRole?: string;
  userName?: string;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  orders: _propOrders,
  onExitAdmin,
  userRole,
  userName,
}) => {
  const [currentRole, setCurrentRole] = useState<AdminRole>((userRole as AdminRole) || 'super_admin');
  const [activeTab, setActiveTab] = useState<AdminViewTab>(
    userRole === 'processor' ? 'qr_scan' : 'dashboard'
  );
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [dateFilter, setDateFilter] = useState('Today');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  const fetchOrders = async () => {
    const data = currentRole === 'manager'
      ? await dbFetchManagerOrders()
      : await dbAdminFetchOrders();
    setOrders(data);

    const custData = await dbAdminFetchCustomers();
    setCustomers(custData.customers || []);

    const staffData = await dbFetchManagerStaff();
    setStaffList(Array.isArray(staffData) ? staffData : (staffData as any)?.staff || []);
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, currentRole]); // Refetch when hitting the tab or switching role

  React.useEffect(() => {
    if (userRole) {
      setCurrentRole(userRole as AdminRole);
      if (userRole === 'processor') {
        setActiveTab('qr_scan');
      }
    }
  }, [userRole]);

  // Global search modal state
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');

  // Perform global search lookup against real datasets
  const searchResults = {
    orders: orders.filter((o) => {
      const addrStr = typeof o.address === 'string'
        ? o.address
        : (o.address && typeof o.address === 'object' ? Object.values(o.address).filter(Boolean).join(', ') : '');
      return (
        (o.id || '').toLowerCase().includes(globalQuery.toLowerCase()) ||
        addrStr.toLowerCase().includes(globalQuery.toLowerCase())
      );
    }),
    customers: customers.filter(
      (c) =>
        (c.fullName || '').toLowerCase().includes(globalQuery.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(globalQuery.toLowerCase()) ||
        (c.phone || '').includes(globalQuery)
    ),
    bags: orders
      .filter((o) => (o.package?.qr_code || o.qr_code || '').toLowerCase().includes(globalQuery.toLowerCase()))
      .map((o) => ({
        id: o.id,
        qrCode: o.package?.qr_code || o.qr_code || o.id,
        bagNumber: o.bagNumber || o.id,
        status: o.status,
      })),
    staff: staffList.filter(
      (s) =>
        (s.fullName || s.name || '').toLowerCase().includes(globalQuery.toLowerCase()) ||
        (s.employeeNumber || s.email || '').toLowerCase().includes(globalQuery.toLowerCase())
    ),
  };

  const hasGlobalResults =
    globalQuery.trim().length > 0 &&
    (searchResults.orders.length > 0 ||
      searchResults.customers.length > 0 ||
      searchResults.bags.length > 0 ||
      searchResults.staff.length > 0);



  // ── Standard Admin / Manager Shell ────────────────────────────────────────
  return (
    <div className="w-full h-screen overflow-hidden bg-[#f8fafc] flex flex-row font-sans text-gray-900">
      {/* Persistent Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        unresolvedAlertsCount={3}
        currentRole={currentRole}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          {/* Topbar */}
          <AdminTopbar
            currentRole={currentRole}
            onChangeRole={(newRole) => {
              if (userRole === 'manager') {
                alert('Access Denied: Plant Managers are locked to their operational portal.');
                return;
              }
              if (userRole === 'admin' && newRole === 'super_admin') {
                alert('Access Denied: Standard Administrators cannot switch to Super Admin.');
                return;
              }
              setCurrentRole(newRole);
              // Auto-navigate to the correct landing tab for each role
              if (newRole === 'processor') {
                setActiveTab('qr_scan');
              } else {
                setActiveTab('dashboard');
              }
            }}
            selectedLocation={selectedLocation}
            onChangeLocation={setSelectedLocation}
            dateFilter={dateFilter}
            onChangeDateFilter={setDateFilter}
            onOpenGlobalSearch={() => setGlobalSearchOpen(true)}
            onExitAdmin={onExitAdmin}
          />

          {/* Active View Renderer */}
          <main className="flex-1 overflow-y-auto">
            {activeTab === 'dashboard' && (
              currentRole === 'manager' ? (
                <ManagerPortalView onNavigateTab={setActiveTab} />
              ) : (
                <AdminDashboard onNavigateTab={setActiveTab} selectedLocation={selectedLocation} />
              )
            )}

            {/* Standard/Manager Views */}
            {activeTab === 'orders' && <AdminOrdersView orders={orders} onRefresh={fetchOrders} />}
            {activeTab === 'drivers' && <ManagerDriversView />}
            {activeTab === 'processors' && <ManagerProcessorsView />}
            {activeTab === 'customers' && <AdminCustomersView />}
            {activeTab === 'staff' && (
              currentRole === 'manager' ? <ManagerStaffView /> : <AdminStaffView />
            )}
            {activeTab === 'services' && <AdminServicesView />}
            {activeTab === 'areas' && <AdminAreasView />}
            {activeTab === 'finance' && <AdminFinanceView />}
            {activeTab === 'complaints' && <ManagerIncidentsView />}
            {activeTab === 'reports' && <AdminReportsView />}
            {activeTab === 'settings' && <AdminSettingsView />}
          </main>
        </div>



      {/* Global Admin Search Modal */}
      {globalSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setGlobalSearchOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <Search className="w-5 h-5 text-[#0077B6]" />
              <input
                type="text"
                autoFocus
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                placeholder="Type customer name, email, order #, QR bag ID, driver name, postcode..."
                className="w-full text-sm font-medium focus:outline-hidden pr-8"
              />
            </div>

            {/* Results Grouping */}
            <div className="max-h-96 overflow-y-auto space-y-4">
              {globalQuery.trim().length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Search className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs font-bold text-gray-500">Global Operational Search</p>
                  <p className="text-[11px] text-gray-400">Search across Orders, Customers, QR Bags, Drivers & Machinery.</p>
                </div>
              ) : !hasGlobalResults ? (
                <div className="py-8 text-center text-xs text-gray-500 font-bold">
                  No matching record found for "{globalQuery}"
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Orders */}
                  {searchResults.orders.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Orders ({searchResults.orders.length})
                      </span>
                      {searchResults.orders.map((o) => (
                        <div
                          key={o.id}
                          onClick={() => {
                            setActiveTab('orders');
                            setGlobalSearchOpen(false);
                          }}
                          className="p-3 bg-gray-50 hover:bg-[#CAF0F8]/40 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-[#0077B6]" />
                            <span className="font-mono font-bold text-[#03045E]">{o.id}</span>
                            <span className="text-gray-600 truncate max-w-xs">{o.address}</span>
                          </div>
                          <span className="font-extrabold text-gray-900">£{o.total.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Customers */}
                  {searchResults.customers.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Customers CRM ({searchResults.customers.length})
                      </span>
                      {searchResults.customers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setActiveTab('customers');
                            setGlobalSearchOpen(false);
                          }}
                          className="p-3 bg-gray-50 hover:bg-[#CAF0F8]/40 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[#0077B6]" />
                            <span className="font-bold text-gray-900">{c.fullName}</span>
                            <span className="text-gray-500">({c.email})</span>
                          </div>
                          <span className="font-bold text-[#03045E]">{c.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bags */}
                  {searchResults.bags.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        QR Bags ({searchResults.bags.length})
                      </span>
                      {searchResults.bags.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setActiveTab('orders');
                            setGlobalSearchOpen(false);
                          }}
                          className="p-3 bg-gray-50 hover:bg-[#CAF0F8]/40 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-[#0077B6]" />
                            <span className="font-mono font-bold text-[#03045E]">{b.qrCode}</span>
                          </div>
                          <span className="font-bold text-emerald-600">{b.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Manager Only) */}
      {currentRole === 'manager' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 px-1 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] flex justify-between shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.12)]">
          {[
            { id: 'dashboard' as AdminViewTab, label: 'Dashboard', icon: LayoutDashboard },
            { id: 'orders' as AdminViewTab, label: 'Orders', icon: ShoppingBag },
            { id: 'drivers' as AdminViewTab, label: 'Drivers', icon: Truck },
            { id: 'processors' as AdminViewTab, label: 'Processors', icon: Package },
            { id: 'staff' as AdminViewTab, label: 'Staff', icon: Users },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex flex-col items-center justify-center flex-1 py-1 relative ${isActive ? 'text-[#03045E]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-[#CAF0F8]' : 'bg-transparent'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#0077B6]' : ''}`} />
                </div>
                <span className={`text-[9px] font-bold mt-1 ${isActive ? 'text-[#03045E]' : ''}`}>{label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  );
};
