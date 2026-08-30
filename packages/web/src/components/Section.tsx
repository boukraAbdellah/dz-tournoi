import type { ReactNode } from 'react';

interface SectionProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Section({ title, description, action, children, className = '' }: SectionProps) {
  return (
    <section className={className}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
