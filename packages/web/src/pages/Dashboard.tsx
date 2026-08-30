import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, Home, Users, ArrowRight, Rocket } from 'lucide-react';
import { api } from '../api';
import type { Stats } from '../types';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>('/stats').then(setStats).catch((e) => console.error(e));
  }, []);

  const isNew = stats && stats.clubs === 0 && stats.athletes === 0;

  return (
    <div>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        extra={
          <button className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold transition-all">
            {t('dashboard.newCompetition')}
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title={t('dashboard.statsClubs')} value={stats?.clubs ?? 0} icon={<Home size={22} />} tone="info" />
        <StatCard title={t('dashboard.statsAthletes')} value={stats?.athletes ?? 0} icon={<Users size={22} />} tone="success" />
        <StatCard title={t('dashboard.statsCompetitions')} value={stats?.competitions ?? 0} icon={<Trophy size={22} />} tone="primary" />
      </div>

      {/* Onboarding */}
      {isNew && (
        <div className="card-elevated mb-6 flex flex-wrap items-center gap-4 bg-gradient-to-br from-primary-subtle/60 to-info-subtle/40 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Rocket size={28} />
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="text-base font-semibold text-ink">{t('dashboard.welcome')}</div>
            <div className="mt-0.5 text-sm text-ink-muted">{t('dashboard.emptyHint')}</div>
          </div>
          <Link
            to="/clubs"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-bg-subtle transition-colors"
          >
            {t('dashboard.start')} <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <h3 className="mb-3 text-sm font-semibold text-ink">{t('dashboard.quickAccess')}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { to: '/clubs', icon: <Home size={20} />, title: t('nav.clubs'), desc: t('dashboard.quickClubs'), tone: 'info' },
          { to: '/athletes', icon: <Users size={20} />, title: t('nav.athletes'), desc: t('dashboard.quickAthletes'), tone: 'success' },
          { to: '/import', icon: <Trophy size={20} />, title: t('nav.importExport'), desc: t('dashboard.quickImport'), tone: 'warning' },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="card-elevated flex items-center gap-3.5 px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md group"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-${q.tone}/10 text-${q.tone}`}>
              {q.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink group-hover:text-primary transition-colors">{q.title}</div>
              <div className="text-xs text-ink-muted">{q.desc}</div>
            </div>
            <ArrowRight size={16} className="text-ink-faint group-hover:text-primary transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
