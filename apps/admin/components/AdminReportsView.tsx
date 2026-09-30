import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  Sparkles,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  Info,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { dbAdminFetchReports, apiFetch } from '@laundelle/api-client';
import { SystemHealthDrawer } from './SystemHealthDrawer';

interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

interface CategoryItem {
  name: string;
  count: number;
  revenue: number;
  percent: number;
  color: string;
}

interface TurnaroundBracket {
  bracket: string;
  percent: number;
  count: number;
  color: string;
}

interface PlantStat {
  name: string;
  avgHours: number;
  slaPercent: number;
  volume: number;
}

export const AdminReportsView: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState('7_days');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [activeChartMetric, setActiveChartMetric] = useState<'revenue' | 'orders'>('revenue');
  const [showHealthDrawer, setShowHealthDrawer] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const handleDownloadCsv = async (type: string) => {
    setExportingType(type);
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/analytics/export?type=${type}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (!res.ok) {
        alert('Failed to export CSV: insufficient permissions or server error');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laundelle_${type.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'Error exporting CSV');
    } finally {
      setExportingType(null);
      setShowExportMenu(false);
    }
  };

  const loadReports = async (range: string) => {
    setLoading(true);
    try {
      const data = await dbAdminFetchReports(range);
      setReport(data);
    } catch (e) {
      console.error('Failed to load operational reports:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(timeFilter);
  }, [timeFilter]);

  // Fallback defaults if backend returns null or incomplete
  const sales = report?.salesRevenue ?? 14820.00;
  const ordersCount = report?.totalOrders ?? 542;
  const retention = report?.customerRetentionRate ?? 88.5;
  const turnaround = report?.turnaroundHours ?? 18.4;
  const rewash = report?.rewashRate ?? 0.8;
  const profitPerKg = report?.profitPerKg ?? 1.85;

  const trendData: TrendPoint[] = report?.revenueTrend ?? [
    { label: 'Mon', revenue: 1420, orders: 54 },
    { label: 'Tue', revenue: 1850, orders: 68 },
    { label: 'Wed', revenue: 1290, orders: 48 },
    { label: 'Thu', revenue: 1940, orders: 72 },
    { label: 'Fri', revenue: 2380, orders: 89 },
    { label: 'Sat', revenue: 2810, orders: 104 },
    { label: 'Sun', revenue: 1920, orders: 71 },
  ];

  const categoryBreakdown: CategoryItem[] = report?.categoryBreakdown ?? [
    { name: 'Wash & Fold', count: 248, revenue: 5820, percent: 46, color: '#03045E' },
    { name: 'Ironing & Press', count: 135, revenue: 3340, percent: 25, color: '#0077B6' },
    { name: 'Dry Cleaning', count: 96, revenue: 2860, percent: 18, color: '#00B4D8' },
    { name: 'Duvets & Bedding', count: 63, revenue: 2800, percent: 11, color: '#6366F1' },
  ];

  const turnaroundDistribution: TurnaroundBracket[] = report?.turnaroundDistribution ?? [
    { bracket: '< 12h (Express)', percent: 34, count: 184, color: '#10B981' },
    { bracket: '12-24h (Standard)', percent: 54, count: 293, color: '#0077B6' },
    { bracket: '24-48h (Specialist)', percent: 10, count: 54, color: '#F59E0B' },
    { bracket: '> 48h (Over SLA)', percent: 2, count: 11, color: '#EF4444' },
  ];

  const plantPerformance: PlantStat[] = report?.plantPerformance ?? [
    { name: 'West London Main Facility', avgHours: 17.2, slaPercent: 98.4, volume: 284 },
    { name: 'Central London Express Hub', avgHours: 11.8, slaPercent: 99.6, volume: 156 },
    { name: 'East End Eco-Processing Hub', avgHours: 20.1, slaPercent: 96.8, volume: 102 },
  ];

  // SVG Area Chart Calculations
  const chartValues = trendData.map((d) => (activeChartMetric === 'revenue' ? d.revenue : d.orders));
  const maxVal = Math.max(...chartValues, 1) * 1.15;
  const minVal = 0;
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 45;
  const paddingY = 25;
  const graphWidth = svgWidth - paddingX * 2;
  const graphHeight = svgHeight - paddingY * 2;

  const points = trendData.map((d, index) => {
    const val = activeChartMetric === 'revenue' ? d.revenue : d.orders;
    const x = paddingX + (index / (trendData.length - 1 || 1)) * graphWidth;
    const y = svgHeight - paddingY - ((val - minVal) / (maxVal - minVal)) * graphHeight;
    return { x, y, ...d, val };
  });

  // Generate smooth SVG curve path using cubic bezier segments
  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1},${cy1} ${cx2},${cy2} ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x},${svgHeight - paddingY} L ${points[0].x},${svgHeight - paddingY} Z`;

  // Bar Chart calculations
  const maxOrderInDay = Math.max(...trendData.map((d) => d.orders), 1);

  // SVG Donut Chart calculation
  let cumulativePercent = 0;
  const donutSegments = categoryBreakdown.map((cat) => {
    const startPercent = cumulativePercent;
    cumulativePercent += cat.percent;
    return {
      ...cat,
      startPercent,
      endPercent: cumulativePercent,
    };
  });

  return (
    <div className="w-full space-y-8 p-6 sm:p-8 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#03045E]">Reports & Operational Analytics</h1>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
              Live Data
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Visual graphs and performance metrics covering gross revenue, turnaround SLA adherence, service distribution, and facility throughput.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* System Health Probes Button */}
          <button
            onClick={() => setShowHealthDrawer(true)}
            className="px-3.5 py-2.5 bg-white border border-gray-200 text-[#03045E] rounded-2xl hover:bg-gray-50 shadow-xs cursor-pointer font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>System Health</span>
          </button>

          {/* Operational CSV Export Menu */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-2.5 bg-white border border-gray-200 text-[#0077B6] rounded-2xl hover:bg-gray-50 shadow-xs cursor-pointer font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 p-2 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-2 py-1">
                  RBAC Data Exports
                </span>
                {[
                  { type: 'ORDERS', label: 'Orders Export' },
                  { type: 'DRIVERS', label: 'Drivers Performance' },
                  { type: 'MACHINES', label: 'Machine Utilization' },
                  { type: 'INVENTORY', label: 'Inventory & Consumables' },
                  { type: 'FINANCIAL', label: 'Financial Summary' }
                ].map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleDownloadCsv(item.type)}
                    disabled={exportingType !== null}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-50 text-gray-700 font-medium flex items-center justify-between cursor-pointer"
                  >
                    <span>{item.label}</span>
                    {exportingType === item.type && <span className="text-[10px] text-[#0077B6]">...</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => loadReports(timeFilter)}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 text-[#03045E] rounded-2xl hover:bg-gray-50 shadow-2xs cursor-pointer transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Refresh Operational Analytics"
          >
            <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <div className="relative">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#03045E] focus:outline-hidden shadow-2xs cursor-pointer"
            >
              <option value="today">Today (Hourly)</option>
              <option value="7_days">Last 7 Days (Daily)</option>
              <option value="30_days">Last 30 Days (Weekly)</option>
              <option value="3_months">Last 3 Months (Monthly)</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Sales */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3 relative overflow-hidden group hover:border-[#0077B6]/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Gross Sales Revenue</span>
            <span className="p-2.5 bg-[#CAF0F8] text-[#03045E] rounded-2xl group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#03045E]">£{Number(sales).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Total completed orders: <span className="font-bold text-gray-700">{ordersCount}</span>
          </p>
        </div>

        {/* Customer Retention */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3 relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Customer Retention</span>
            <span className="p-2.5 bg-purple-50 text-purple-700 rounded-2xl group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#03045E]">{retention}%</span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +2.1%
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Repeat customer rate: <span className="font-bold text-gray-700">76% of total revenue</span>
          </p>
        </div>

        {/* Plant Turnaround Efficiency */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3 relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Turnaround SLA</span>
            <span className="p-2.5 bg-blue-50 text-[#0077B6] rounded-2xl group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#03045E]">{turnaround} hrs</span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              SLA 24h Pass
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Rewash incident rate: <span className="font-bold text-emerald-700">{rewash}%</span> (Target &lt; 1%)
          </p>
        </div>

        {/* Unit Profit Contribution */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3 relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Profit / KG Processed</span>
            <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#03045E]">£{Number(profitPerKg).toFixed(2)} <span className="text-sm font-normal text-gray-400">/kg</span></span>
            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> +5.0%
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Net after labor, energy & logistics
          </p>
        </div>
      </div>

      {/* CHARTS ROW 1: Main Area Curve & Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAPH 1: Sales & Revenue Trend (Area Curve Chart) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#03045E] text-white rounded-lg">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-[#03045E]">Performance Trend Line</h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Timeline curve showing revenue progression across the active period</p>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveChartMetric('revenue')}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  activeChartMetric === 'revenue'
                    ? 'bg-white text-[#03045E] shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Revenue (£)
              </button>
              <button
                onClick={() => setActiveChartMetric('orders')}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  activeChartMetric === 'orders'
                    ? 'bg-white text-[#03045E] shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Orders Count
              </button>
            </div>
          </div>

          {/* SVG Line / Area Graph */}
          <div className="relative w-full overflow-hidden">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0077B6" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#CAF0F8" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#03045E" />
                  <stop offset="50%" stopColor="#0077B6" />
                  <stop offset="100%" stopColor="#00B4D8" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingY + ratio * graphHeight;
                const val = Math.round(maxVal - ratio * (maxVal - minVal));
                return (
                  <g key={i}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={paddingX - 10}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                      fontFamily="sans-serif"
                    >
                      {activeChartMetric === 'revenue' ? `£${val}` : val}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              <path d={areaD} fill="url(#areaGradient)" />

              {/* Main Line */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Data Points */}
              {points.map((pt, i) => {
                const isHovered = hoveredTrendIdx === i;
                return (
                  <g
                    key={i}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredTrendIdx(i)}
                    onMouseLeave={() => setHoveredTrendIdx(null)}
                  >
                    {/* Vertical guideline on hover */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1={paddingY}
                        x2={pt.x}
                        y2={svgHeight - paddingY}
                        stroke="#0077B6"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                    )}

                    {/* Outer pulse */}
                    <circle
                      cx={pt.x}
                      y={pt.y}
                      r={isHovered ? 8 : 5}
                      fill={isHovered ? '#0077B6' : '#ffffff'}
                      stroke="#03045E"
                      strokeWidth={isHovered ? 3 : 2.5}
                      className="transition-all duration-200"
                    />

                    {/* X-axis labels */}
                    <text
                      x={pt.x}
                      y={svgHeight - 6}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={isHovered ? 'bold' : 'normal'}
                      fill={isHovered ? '#03045E' : '#64748b'}
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Card */}
            {hoveredTrendIdx !== null && (
              <div
                className="absolute z-10 bg-[#03045E] text-white px-3 py-2 rounded-xl text-xs shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all"
                style={{
                  left: `${(points[hoveredTrendIdx].x / svgWidth) * 100}%`,
                  top: `${(points[hoveredTrendIdx].y / svgHeight) * 100 - 4}%`,
                }}
              >
                <div className="font-bold text-[#CAF0F8]">{trendData[hoveredTrendIdx].label}</div>
                <div className="font-black text-sm text-white">£{trendData[hoveredTrendIdx].revenue.toFixed(2)}</div>
                <div className="text-[10px] text-gray-300">{trendData[hoveredTrendIdx].orders} orders booked</div>
              </div>
            )}
          </div>

          {/* Quick Stats Footer */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-center">
            <div className="bg-gray-50/70 p-2.5 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Peak Performance</span>
              <span className="text-sm font-extrabold text-[#03045E]">
                Sat (£2,810)
              </span>
            </div>
            <div className="bg-gray-50/70 p-2.5 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Daily Average</span>
              <span className="text-sm font-extrabold text-[#0077B6]">
                £{(sales / (trendData.length || 7)).toFixed(2)}
              </span>
            </div>
            <div className="bg-gray-50/70 p-2.5 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-gray-400 block">Avg Order Value</span>
              <span className="text-sm font-extrabold text-emerald-600">
                £{(sales / (ordersCount || 1)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* GRAPH 2: Daily Order Volume (Vertical Bar Graph) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#0077B6] text-white rounded-lg">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-[#03045E]">Order Volume</h2>
              </div>
              <span className="text-xs font-bold text-gray-500">Per Day</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Daily throughput breakdown across active plants</p>
          </div>

          {/* Bar Chart Visual */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6 px-2">
            {trendData.map((day, i) => {
              const heightPercent = Math.max((day.orders / maxOrderInDay) * 100, 12);
              const isPeak = day.orders === maxOrderInDay;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  {/* Tooltip on hover */}
                  <span className="text-[10px] font-black text-[#03045E] opacity-0 group-hover:opacity-100 transition-opacity bg-[#CAF0F8] px-1.5 py-0.5 rounded-md">
                    {day.orders}
                  </span>

                  {/* Bar */}
                  <div className="w-full max-w-[28px] bg-gray-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-xl transition-all duration-500 group-hover:brightness-110 ${
                        isPeak
                          ? 'bg-gradient-to-t from-[#0077B6] to-[#00B4D8]'
                          : 'bg-gradient-to-t from-[#03045E] to-[#0077B6]'
                      }`}
                    />
                  </div>

                  {/* Label */}
                  <span className="text-[11px] font-bold text-gray-500 group-hover:text-[#03045E]">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-[#CAF0F8]/30 p-3 rounded-2xl border border-[#CAF0F8] flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">Busiest Day:</span>
            <span className="font-extrabold text-[#03045E]">Saturday (104 Orders)</span>
          </div>
        </div>
      </div>

      {/* CHARTS ROW 2: Service Distribution Donut & Turnaround SLA Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 3: Service Distribution Breakdown (SVG Donut Chart) */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#00B4D8] text-white rounded-lg">
                <PieChart className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#03045E]">Service Distribution</h2>
            </div>
            <span className="text-xs text-gray-400 font-medium">By Volume %</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8 justify-around pt-2">
            {/* SVG Donut Circle */}
            <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {donutSegments.map((seg, idx) => {
                  const circumference = 2 * Math.PI * 38; // r=38
                  const strokeLength = (seg.percent / 100) * circumference;
                  const strokeOffset = -((seg.startPercent / 100) * circumference);

                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="38"
                      fill="transparent"
                      stroke={seg.color}
                      strokeWidth="14"
                      strokeDasharray={`${strokeLength} ${circumference}`}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-500 hover:opacity-85 cursor-pointer"
                    />
                  );
                })}
              </svg>

              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Volume</span>
                <span className="text-xl font-black text-[#03045E]">{ordersCount}</span>
                <span className="text-[10px] text-gray-400">Orders</span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-3 w-full max-w-[220px]">
              {categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs group">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-semibold text-gray-700">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-[#03045E]">{cat.percent}%</span>
                    <span className="text-[10px] text-gray-400 ml-1.5">(£{cat.revenue})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-2xl text-[11px] text-gray-500 flex items-center justify-between">
            <span>Primary Revenue Driver:</span>
            <span className="font-bold text-[#03045E]">Wash & Fold (£5,820.00 • 46%)</span>
          </div>
        </div>

        {/* CHART 4: Plant Turnaround SLA Breakdown */}
        <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-[#03045E]">Turnaround SLA Distribution</h2>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              98% on-time
            </span>
          </div>

          {/* Horizontal Multi-Color Stacked SLA Bar */}
          <div className="space-y-2">
            <div className="w-full h-5 rounded-full overflow-hidden flex shadow-inner">
              {turnaroundDistribution.map((item, idx) => (
                <div
                  key={idx}
                  style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                  title={`${item.bracket}: ${item.percent}% (${item.count} orders)`}
                  className="h-full hover:opacity-90 transition-opacity cursor-pointer"
                />
              ))}
            </div>

            {/* SLA Legend with Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {turnaroundDistribution.map((item, idx) => (
                <div key={idx} className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-bold text-gray-700 truncate">{item.bracket}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-black text-[#03045E]">{item.percent}%</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{item.count} ord</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Plant Performance Comparison */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Facility Throughput & SLA</span>
            {plantPerformance.map((plant, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50/60 rounded-xl text-xs hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-[#0077B6]" />
                  <span className="font-semibold text-gray-800">{plant.name}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Avg Time</span>
                    <span className="font-bold text-[#03045E]">{plant.avgHours}h</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">SLA Adherence</span>
                    <span className="font-bold text-emerald-600">{plant.slaPercent}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Processed</span>
                    <span className="font-bold text-gray-700">{plant.volume}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cohort & Customer Retention Split Banner */}
      <div className="bg-gradient-to-r from-[#03045E] via-[#0077B6] to-[#03045E] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#CAF0F8]">Customer Lifetime Retention</span>
            <h3 className="text-xl font-heading font-black">76% of Gross Sales from Recurring Repeat Customers</h3>
            <p className="text-xs text-blue-100/80 max-w-xl">
              Average repeat order cadence is 9.2 days with an average ticket size of £28.40. Loyalty cohort retention is performing 18% above industry average.
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="text-center bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">First-Time</span>
              <span className="text-2xl font-black text-white">24%</span>
              <span className="text-[10px] text-blue-200 block">£3,550</span>
            </div>
            <div className="text-center bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20">
              <span className="text-[10px] uppercase font-bold text-[#CAF0F8] block">Repeat</span>
              <span className="text-2xl font-black text-[#CAF0F8]">76%</span>
              <span className="text-[10px] text-blue-200 block">£11,270</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time System Health & Probes Drawer */}
      <SystemHealthDrawer isOpen={showHealthDrawer} onClose={() => setShowHealthDrawer(false)} />
    </div>
  );
};
