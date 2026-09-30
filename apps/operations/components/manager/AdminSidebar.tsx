import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  UserCheck,
  Sparkles,
  Map,
  DollarSign,
  AlertOctagon,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shirt,
  QrCode,
  ClipboardCheck,
  History,
  User,
  Truck,
  Package,
} from 'lucide-react';
import { AdminViewTab } from '@laundelle/types';

interface AdminSidebarProps {
  activeTab: AdminViewTab;
  onTabChange: (tab: AdminViewTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unresolvedAlertsCount: number;
  currentRole?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  unresolvedAlertsCount,
  currentRole,
}) => {
  const rawNavItems: { id: AdminViewTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'drivers', label: 'Drivers', icon: Truck },
    { id: 'processors', label: 'Processors', icon: Package },
    { id: 'customers', label: 'Customers CRM', icon: Users },
    { id: 'staff', label: 'Administrator Accounts', icon: UserCheck },
    { id: 'services', label: 'Services & Pricing', icon: Sparkles },
    { id: 'areas', label: 'Areas & Slots', icon: Map },
    { id: 'finance', label: 'Finance & Refunds', icon: DollarSign },
    { id: 'complaints', label: 'Complaints Hub', icon: AlertOctagon },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Audit', icon: Settings },
    // Processor specific tabs
    { id: 'qr_scan', label: 'Scan QR Bag', icon: QrCode },
    { id: 'qc', label: 'Quality Check', icon: ClipboardCheck },
    { id: 'history', label: 'Completed Jobs', icon: History },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  let navItems = rawNavItems;

  if (currentRole === 'manager') {
    navItems = rawNavItems
      .filter(item => ['dashboard', 'orders', 'drivers', 'processors', 'staff', 'areas', 'settings'].includes(item.id))
      .map(item => {
        if (item.id === 'staff') return { ...item, label: 'Manage Staff', icon: Users };
        if (item.id === 'areas') return { ...item, label: 'Plant Slots & Areas', icon: Map };
        return item;
      });
  } else if (currentRole === 'processor') {
    navItems = rawNavItems.filter(item => ['qr_scan', 'orders', 'qc', 'history', 'profile'].includes(item.id));
  } else {
    // Hide processor and manager specific tabs from standard admin view to avoid clutter
    navItems = rawNavItems.filter(item => !['qr_scan', 'qc', 'history', 'profile', 'drivers', 'processors'].includes(item.id));
  }

  return (
    <aside
      className={`hidden md:flex bg-[#03045E] text-white flex-col justify-between transition-all duration-300 z-40 relative shadow-xl shrink-0 h-screen sticky top-0 ${collapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <Shirt className="w-5 h-5 text-[#48CAE4]" />
              </div>
              <div>
                <span className="font-heading font-black text-sm block leading-tight tracking-wider uppercase">
                  <span className="text-white">LAUN</span><span className="text-[#48CAE4]">DELLE</span>
                </span>
                <span className="text-[10px] text-[#48CAE4] font-bold tracking-widest uppercase">
                  OPS PORTAL
                </span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mx-auto">
              <Shirt className="w-5 h-5 text-[#48CAE4]" />
            </div>
          )}

          <button
            onClick={onToggleCollapse}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors hidden sm:block cursor-pointer"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-120px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group relative ${isActive
                  ? 'bg-[#023E8A] text-white shadow-sm border-l-4 border-[#00B4D8]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#48CAE4]' : 'text-white/60 group-hover:text-white'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}

                {/* Badge if alerts */}
                {item.badge && item.badge > 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ml-auto shrink-0 ${isActive ? 'bg-red-500 text-white' : 'bg-red-500/80 text-white'
                    }`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10 text-[11px] text-white/50 space-y-1">
          <p className="font-bold text-white/80">Laundelle SaaS v2.6</p>
          <p>Connected to MongoDB Atlas</p>
        </div>
      )}
    </aside>
  );
};
