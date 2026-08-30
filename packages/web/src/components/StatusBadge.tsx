import type { ReactNode } from 'react';

interface StatusBadgeProps {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'default';
  dot?: boolean;
  children?: ReactNode;
}

const TONE_MAP: Record<string, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  default: 'bg-bg-subtle text-ink-muted',
};

const DOT_MAP: Record<string, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  default: 'bg-ink-faint',
};

export default function StatusBadge({ label, tone = 'default', dot = true }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_MAP[tone]}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_MAP[tone]}`} />}
      {label}
    </span>
  );
}
