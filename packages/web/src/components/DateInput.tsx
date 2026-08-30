import { useState } from 'react';

interface DateInputProps {
  label: string;
  value: string;                     // ISO yyyy-MM-dd
  onChange: (iso: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
  className?: string;
}

function toFr(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function toIso(fr: string): string {
  const parts = fr.split('/');
  if (parts.length !== 3) return '';
  const d = parts[0] ?? '';
  const m = parts[1] ?? '';
  const y = parts[2] ?? '';
  if (d.length !== 2 || m.length !== 2 || y.length !== 4) return '';
  return `${y}-${m}-${d}`;
}

export default function DateInput({ label, value, onChange, required, placeholder = 'jj/mm/aaaa', error, className = '' }: DateInputProps) {
  const [display, setDisplay] = useState(() => toFr(value));
  const [dirty, setDirty] = useState(false);

  const handleChange = (raw: string) => {
    // Auto-insert slashes
    let v = raw.replace(/[^\d]/g, '');
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5, 9);
    setDisplay(v);
    setDirty(true);

    const iso = toIso(v);
    if (iso) onChange(iso);
  };

  const handleBlur = () => {
    // Sync display if value changed externally
    setDisplay(toFr(value));
  };

  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-ink-muted">
        {label}{required && ' *'}
      </label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder={placeholder}
        value={dirty ? display : toFr(value)}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className="h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-ink-faint"
      />
      {error && <span className="mt-0.5 text-xs text-danger">{error}</span>}
    </div>
  );
}
