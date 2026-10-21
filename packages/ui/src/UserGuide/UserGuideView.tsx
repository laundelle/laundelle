'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  BookOpen,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Sparkles,
  ArrowRight,
  Filter,
  Layers,
  Building2,
  ShoppingBag,
  UserCheck,
  MapPin,
  Tag,
  DollarSign,
  AlertOctagon,
  BarChart3,
  Settings,
  X
} from 'lucide-react';
import { USER_GUIDE_ARTICLES } from './articles';
import { UserGuideArticle, UserGuideCategory, PortalTarget } from './types';
import { AdminViewTab } from '@laundelle/types';

interface UserGuideViewProps {
  portalRole?: 'super_admin' | 'admin' | 'manager' | string;
  initialArticleId?: string;
  initialTab?: AdminViewTab;
  onNavigateTab?: (tab: AdminViewTab) => void;
}

export const UserGuideView: React.FC<UserGuideViewProps> = ({
  portalRole = 'admin',
  initialArticleId,
  initialTab,
  onNavigateTab,
}) => {
  const isManager = portalRole === 'manager' || portalRole === 'plant_manager';
  const targetPortal: PortalTarget = isManager ? 'manager' : 'admin';

  // Available categories
  const categories: UserGuideCategory[] = [
    'Getting Started',
    'Core Operations',
    'Staff & Plants',
    'Catalog & Pricing',
    'Finance & Revenue',
    'Exceptions & Complaints',
    'System & Audit',
    'End-to-End Workflows',
    'Troubleshooting',
  ];

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Filter articles by portal applicability
  const portalArticles = useMemo(() => {
    return USER_GUIDE_ARTICLES.filter((article) => {
      // If viewing from manager portal, only show articles that apply to manager or both
      if (isManager) {
        return article.portals.includes('manager') || article.portals.includes('both');
      }
      // If viewing from admin portal, show admin or both
      return article.portals.includes('admin') || article.portals.includes('both');
    });
  }, [isManager]);

  // Determine initial active article
  const defaultArticleId = useMemo(() => {
    if (initialArticleId) {
      const match = portalArticles.find((a) => a.id === initialArticleId);
      if (match) return match.id;
    }
    if (initialTab) {
      const match = portalArticles.find((a) => a.relatedTab === initialTab);
      if (match) return match.id;
    }
    return isManager ? 'quick-start-manager' : 'quick-start-admin';
  }, [initialArticleId, initialTab, portalArticles, isManager]);

  const [activeArticleId, setActiveArticleId] = useState<string>(defaultArticleId);

  // Update active article if initial props change
  useEffect(() => {
    if (initialArticleId && portalArticles.some((a) => a.id === initialArticleId)) {
      setActiveArticleId(initialArticleId);
    } else if (initialTab) {
      const match = portalArticles.find((a) => a.relatedTab === initialTab);
      if (match) setActiveArticleId(match.id);
    }
  }, [initialArticleId, initialTab, portalArticles]);

  // Filter articles by search query and category
  const filteredArticles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return portalArticles.filter((article) => {
      const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;

      if (!q) return matchesCategory;

      const titleMatch = article.title.toLowerCase().includes(q);
      const descMatch = article.description.toLowerCase().includes(q);
      const purposeMatch = article.purpose.toLowerCase().includes(q);
      const keywordMatch = article.keywords.some((k) => k.toLowerCase().includes(q));
      const stepMatch = article.steps.some(
        (s) => s.title.toLowerCase().includes(q) || s.instruction.toLowerCase().includes(q)
      );
      const errorMatch = (article.commonErrors || []).some(
        (e) => e.error.toLowerCase().includes(q) || e.cause.toLowerCase().includes(q) || e.resolution.toLowerCase().includes(q)
      );
      const fieldMatch = (article.fields || []).some(
        (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
      );

      return matchesCategory && (titleMatch || descMatch || purposeMatch || keywordMatch || stepMatch || errorMatch || fieldMatch);
    });
  }, [portalArticles, selectedCategory, searchQuery]);

  // Active article data
  const currentArticle = useMemo(() => {
    return portalArticles.find((a) => a.id === activeArticleId) || filteredArticles[0] || portalArticles[0];
  }, [activeArticleId, portalArticles, filteredArticles]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && currentArticle) {
      const url = `${window.location.origin}${window.location.pathname}?guide=${currentArticle.id}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] overflow-hidden font-sans">
      {/* ── Top Header Bar ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">LAUNDELLE Help Centre & User Guide</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                isManager ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {isManager ? 'Plant Operations Manager' : 'Administrator'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Production-ready operational manual and step-by-step workflow documentation.
            </p>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search pages, actions, error codes, workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ── Category Chips Filter ────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
        <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" /> Category:
        </span>
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
            selectedCategory === 'All'
              ? 'bg-blue-600 text-white shadow-2xs font-semibold'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Articles ({portalArticles.length})
        </button>
        {categories.map((cat) => {
          const count = portalArticles.filter((a) => a.category === cat).length;
          if (count === 0) return null;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main Two-Column Workspace ────────────────────────────────────── */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
        {/* Left Sidebar: Article Index */}
        <aside className="w-80 md:w-96 bg-white border-r border-slate-200/80 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Documentation Index</span>
            <span>{filteredArticles.length} found</span>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No matching articles</p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching for broader keywords such as &quot;orders&quot;, &quot;staff&quot;, &quot;auth0&quot;, or &quot;slots&quot;.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-4 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredArticles.map((article) => {
                const isActive = article.id === currentArticle?.id;
                return (
                  <button
                    key={article.id}
                    onClick={() => setActiveArticleId(article.id)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/70 border-l-4 border-blue-600 pl-3.5'
                        : 'hover:bg-slate-50/80 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        {article.category}
                      </span>
                      {article.badge && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          article.badge === 'Security Critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : article.badge === 'Essential'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {article.badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-sm font-bold leading-tight ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                      {article.title}
                    </span>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right Reader Area: Full Comprehensive Article View */}
        <main className="flex-1 overflow-y-auto bg-white p-6 sm:p-10 space-y-8">
          {currentArticle ? (
            <div className="max-w-4xl mx-auto space-y-8 pb-16">
              {/* Breadcrumb & Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="hover:text-slate-800 cursor-pointer" onClick={() => setSelectedCategory('All')}>Help Centre</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hover:text-slate-800 cursor-pointer" onClick={() => setSelectedCategory(currentArticle.category)}>
                    {currentArticle.category}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-blue-600 font-semibold truncate max-w-[200px]">{currentArticle.title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Copy Article Link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Share'}</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Print / Save as PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>

                  {/* Jump directly to feature in portal */}
                  {currentArticle.relatedTab && onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab(currentArticle.relatedTab!)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Open in Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Badge Metadata */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wider">
                    {currentArticle.category}
                  </span>
                  {currentArticle.roles.map((r) => (
                    <span key={r} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {r === 'super_admin' ? 'Super Admin' : r === 'admin' ? 'Administrator' : 'Plant Manager'}
                    </span>
                  ))}
                  {currentArticle.badge && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {currentArticle.badge}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {currentArticle.title}
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  {currentArticle.description}
                </p>
              </div>

              {/* Quick Purpose & Access Box */}
              <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Operational Purpose</span>
                  <p className="text-xs text-slate-700 leading-relaxed">{currentArticle.purpose}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Access Requirements</span>
                  <p className="text-xs text-slate-700 leading-relaxed">{currentArticle.accessRequirements}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Portal Navigation Path</span>
                  <p className="text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700">
                    {currentArticle.navigationPath}
                  </p>
                </div>
              </div>

              {/* Prerequisites Checklist */}
              {currentArticle.prerequisites.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Required Prerequisites
                  </h3>
                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-2">
                    {currentArticle.prerequisites.map((req, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-emerald-950 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{req}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-Step Instructions */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Step-by-Step Operational Instructions
                </h3>

                <div className="space-y-4">
                  {currentArticle.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors shadow-2xs space-y-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                          {step.stepNumber}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed pl-10">
                        {step.instruction}
                      </p>
                      {step.tip && (
                        <div className="ml-10 mt-2 bg-blue-50/80 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span><strong>Pro-Tip:</strong> {step.tip}</span>
                        </div>
                      )}
                      {step.caution && (
                        <div className="ml-10 mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span><strong>Caution:</strong> {step.caution}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Fields Dictionary */}
              {currentArticle.fields && currentArticle.fields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Form Fields Reference</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Field Name</th>
                          <th className="px-4 py-3">Required</th>
                          <th className="px-4 py-3">Type & Format</th>
                          <th className="px-4 py-3">Purpose & Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {currentArticle.fields.map((f, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-bold text-slate-900">{f.name}</td>
                            <td className="px-4 py-2.5">
                              {f.required ? (
                                <span className="text-rose-600 font-semibold">Required</span>
                              ) : (
                                <span className="text-slate-400">Optional</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600">{f.format}</td>
                            <td className="px-4 py-2.5">{f.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Buttons & Actions Reference */}
              {currentArticle.actions && currentArticle.actions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Actions & Buttons Reference</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentArticle.actions.map((act, i) => (
                      <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            act.style === 'primary'
                              ? 'bg-blue-600 text-white'
                              : act.style === 'danger'
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {act.button}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800">{act.effect}</p>
                        <p className="text-[11px] text-slate-500"><strong>When to use:</strong> {act.whenToUse}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Outcomes & Lifecycle */}
              {currentArticle.statuses && currentArticle.statuses.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">Status Lifecycle & State Transitions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentArticle.statuses.map((st, i) => (
                      <div key={i} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                            {st.status}
                          </span>
                          <span className="text-xs font-semibold text-slate-600">{st.label}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{st.meaning}</p>
                        {st.allowedTransitions && st.allowedTransitions.length > 0 && (
                          <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1.5">
                            <span>Next valid states:</span>
                            <span className="font-mono text-blue-600">{st.allowedTransitions.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success Verification */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  How to Verify Successful Completion
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  {currentArticle.successVerification}
                </p>
              </div>

              {/* Common Errors & Troubleshooting */}
              {currentArticle.commonErrors && currentArticle.commonErrors.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    Common Errors & Recovery Steps
                  </h3>
                  <div className="space-y-3">
                    {currentArticle.commonErrors.map((err, i) => (
                      <div key={i} className="border border-amber-200/80 bg-amber-50/40 rounded-xl p-4 space-y-1 text-xs">
                        <span className="font-bold text-amber-950 block">{err.error}</span>
                        <p className="text-slate-700"><strong>Root Cause:</strong> {err.cause}</p>
                        <p className="text-slate-700"><strong>Recovery Action:</strong> {err.resolution}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security & RBAC Notes */}
              {currentArticle.securityNotes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Security, Authorization & Plant Isolation Notes
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                    {currentArticle.securityNotes.map((note, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Workflows & Articles */}
              {currentArticle.relatedArticleIds.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Connected Articles & Next Workflows</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentArticle.relatedArticleIds.map((relId) => {
                      const rel = portalArticles.find((a) => a.id === relId);
                      if (!rel) return null;
                      return (
                        <button
                          key={rel.id}
                          onClick={() => setActiveArticleId(rel.id)}
                          className="border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl p-3.5 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
                        >
                          <div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase">{rel.category}</span>
                            <h5 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {rel.title}
                            </h5>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              Select an article from the index to begin reading.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
