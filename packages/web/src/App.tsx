import { useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Trophy, Users, Home, FileSpreadsheet,
  Swords, Medal, FileText, Search, Bell, PanelLeftClose,
  PanelLeft, Sun, Moon,
} from 'lucide-react';
import { useAppSettings } from './settings';
import Dashboard from './pages/Dashboard';
import ClubsPage from './pages/Clubs';
import AthletesPage from './pages/Athletes';
import ImportExportPage from './pages/ImportExport';
import TemplatesPage from './pages/Templates';
import CompetitionsPage from './pages/Competitions';
import CompetitionDetailPage from './pages/CompetitionDetail';

const NAV = [
  { key: '/',              icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { key: '/competitions',  icon: Trophy,          labelKey: 'nav.competitions' },
  { key: '/athletes',      icon: Users,           labelKey: 'nav.athletes' },
  { key: '/clubs',         icon: Home,            labelKey: 'nav.clubs' },
  { key: '/templates',     icon: FileText,        labelKey: 'nav.templates' },
  { key: '/import',        icon: FileSpreadsheet, labelKey: 'nav.importExport' },
];

export default function App() {
  const { t } = useTranslation();
  const { lang, setLang, dark, toggleTheme, rtl } = useAppSettings();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (key: string) =>
    key === '/' ? location.pathname === '/' : location.pathname.startsWith(key);

  return (
    <div className="flex h-screen overflow-hidden" dir={rtl ? 'rtl' : 'ltr'}>
      {/* ── Sidebar ──────────────────────────────── */}
      <aside
        className={`dark-gradient fixed inset-y-0 z-30 flex flex-col transition-all duration-300 ${
          collapsed ? 'w-[76px]' : 'w-64'
        } ${rtl ? 'right-0' : 'left-0'}`}
      >
        {/* Brand */}
        <div className={`flex h-16 items-center gap-2.5 border-b border-white/8 px-4 ${collapsed ? 'justify-center' : ''}`}>
          <span className="brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
            SC
          </span>
          {!collapsed && (
            <span className="text-sm font-semibold text-white truncate">
              Sport Compétition
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
          {NAV.map((item) => {
            const active = isActive(item.key);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.key}
                className={`mx-2 mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-white/12 text-white shadow-sm'
                    : 'text-white/55 hover:bg-white/7 hover:text-white/85'
                } ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? t(item.labelKey) : undefined}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Version */}
        <div className="border-t border-white/8 px-4 py-3">
          <span className="text-[11px] text-white/35 block text-center">
            {collapsed ? 'v0.1' : 'Sport Compétition · v0.1'}
          </span>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          collapsed ? (rtl ? 'mr-[76px]' : 'ml-[76px]') : (rtl ? 'mr-64' : 'ml-64')
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-5 backdrop-blur-md">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors"
          >
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>

          {/* Search bar */}
          <div className="relative ml-2 hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              placeholder={t('common.search')}
              className="h-9 w-64 rounded-lg border border-border bg-bg-subtle pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="flex-1" />

          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-ink-muted hover:bg-bg-subtle transition-colors"
          >
            {lang === 'fr' ? 'عربي' : 'FR'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notification bell */}
          <button className="relative flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-bg-subtle hover:text-ink transition-colors">
            <Bell size={16} />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
          </button>

          {/* User badge */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-subtle text-xs font-bold text-primary">
              {lang === 'ar' ? 'م' : 'AD'}
            </span>
            <span className="text-sm font-medium text-ink hidden md:block">Admin</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1120px] px-5 py-6" style={{ animation: 'fadeUp 0.25s ease' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clubs" element={<ClubsPage />} />
              <Route path="/athletes" element={<AthletesPage />} />
              <Route path="/import" element={<ImportExportPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/competitions" element={<CompetitionsPage />} />
              <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
