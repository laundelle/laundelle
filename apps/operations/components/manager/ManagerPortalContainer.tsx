'use client';

import React, { useState, useEffect } from 'react';
import { AdminViewTab } from '@laundelle/types';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { ManagerPortalView } from './ManagerPortalView';
import { AdminOrdersView } from './AdminOrdersView';
import { ManagerDriversView } from './ManagerDriversView';
import { ManagerProcessorsView } from './ManagerProcessorsView';
import { ManagerStaffView } from './ManagerStaffView';
import { ManagerIncidentsView } from './ManagerIncidentsView';
import { FleetManagementView } from './FleetManagementView';
import { InventoryManagementView } from './InventoryManagementView';
import { AdminAreasView } from './AdminAreasView';
import { AdminComplaintsView } from './AdminComplaintsView';
import { dbFetchManagerOrders } from '@laundelle/api-client';

interface ManagerPortalContainerProps {
  userName?: string;
  onSignOut: () => void;
}

export const ManagerPortalContainer: React.FC<ManagerPortalContainerProps> = ({
  userName,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<AdminViewTab>('dashboard');
  const [selectedLocation, setSelectedLocation] = useState('All Locations');
  const [dateFilter, setDateFilter] = useState('Today');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    const data = await dbFetchManagerOrders();
    setOrders(data || []);
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  return (
    <div className="w-full h-screen overflow-hidden bg-[#f8fafc] flex flex-row font-sans text-gray-900">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        unresolvedAlertsCount={2}
        currentRole="manager"
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <AdminTopbar
          currentRole="manager"
          onChangeRole={() => {}}
          selectedLocation={selectedLocation}
          onChangeLocation={setSelectedLocation}
          dateFilter={dateFilter}
          onChangeDateFilter={setDateFilter}
          onOpenGlobalSearch={() => {}}
          onExitAdmin={onSignOut}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <ManagerPortalView onNavigateTab={setActiveTab} />}
          {activeTab === 'orders' && <AdminOrdersView orders={orders} onRefresh={fetchOrders} />}
          {activeTab === 'drivers' && <ManagerDriversView />}
          {activeTab === 'processors' && <ManagerProcessorsView />}
          {activeTab === 'staff' && <ManagerStaffView />}
          {activeTab === 'complaints' && <ManagerIncidentsView />}
          {activeTab === 'areas' && <AdminAreasView />}
        </main>
      </div>
    </div>
  );
};
