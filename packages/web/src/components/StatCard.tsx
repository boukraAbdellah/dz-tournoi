import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const TONE_STYLES = {
  primary: { iconBg: 'bg-primary/10', text: 'text-primary' },
  success: { iconBg: 'bg-success/10', text: 'text-success' },
  warning: { iconBg: 'bg-warning/10', text: 'text-warning' },
  danger:  { iconBg: 'bg-danger/10', text: 'text-danger' },
  info:    { iconBg: 'bg-info/10', text: 'text-info' },
} as const;

export default function StatCard({ title, value, icon, tone = 'primary' }: StatCardProps) {
  const s = TONE_STYLES[tone];
  return (
    <div className="card-elevated flex items-center gap-4 px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${s.iconBg} ${s.text}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm text-ink-muted">{title}</div>
        <div className="mt-0.5 text-2xl font-bold text-ink">{value}</div>
      </div>
    </div>
  );
}
