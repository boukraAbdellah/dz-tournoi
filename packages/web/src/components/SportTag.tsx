interface SportTagProps {
  sport: string;
}

const SPORT_STYLES: Record<string, string> = {
  Karate: 'bg-primary/10 text-primary border-primary/20',
  MMA: 'bg-danger/10 text-danger border-danger/20',
  JKD: 'bg-info/10 text-info border-info/20',
  'Jeet Kune Do': 'bg-info/10 text-info border-info/20',
};

export default function SportTag({ sport }: SportTagProps) {
  const style = SPORT_STYLES[sport] ?? 'bg-bg-subtle text-ink-muted border-border';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}>
      {sport}
    </span>
  );
}
