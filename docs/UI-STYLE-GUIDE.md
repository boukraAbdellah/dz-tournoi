# TatamiPro — UI / Style Documentation

Complete reference of the design system, layout shell and the markup of every main page.
All JSX below is copied from the source with logic (state, filters, loaders, i18n calls,
data mapping) removed or replaced by static placeholder text, so it can be pasted into any
Tailwind v4 environment as pure presentation.

---

## 1. Design tokens (`src/styles.css`)

Tailwind v4, tokens declared in `@theme inline` + `:root`. **All colors are `oklch`.**
Never hardcode `text-white` / `bg-[#hex]` — always use the semantic token utilities.

### 1.1 Radii

| Token | Value |
| --- | --- |
| `--radius` | `0.625rem` (base) |
| `--radius-sm` | `calc(var(--radius) - 4px)` |
| `--radius-md` | `calc(var(--radius) - 2px)` |
| `--radius-lg` | `var(--radius)` |
| `--radius-xl` | `calc(var(--radius) + 4px)` |
| `--radius-2xl` … `--radius-4xl` | `+8px`, `+12px`, `+16px` |

### 1.2 Light palette (`:root`)

| Token | oklch | Role |
| --- | --- | --- |
| `--background` | `0.977 0.004 250` | app canvas (cool off-white) |
| `--foreground` | `0.21 0.03 260` | near-black navy text |
| `--card` / `--popover` | `1 0 0` | white surfaces |
| `--primary` | `0.53 0.2 25` | **crimson** brand |
| `--primary-foreground` | `0.99 0.01 90` | on-crimson |
| `--secondary` | `0.955 0.008 250` | subtle fills, chips, table heads |
| `--secondary-foreground` | `0.28 0.04 262` | |
| `--muted` | `0.962 0.006 250` | |
| `--muted-foreground` | `0.53 0.03 258` | secondary text |
| `--accent` | `0.94 0.02 250` | |
| `--gold` | `0.79 0.15 85` | 🥇 medals / seeds |
| `--silver` | `0.76 0.01 250` | 🥈 |
| `--bronze` | `0.63 0.11 55` | 🥉 + gold text tone |
| `--success` | `0.62 0.14 155` | positive deltas, confirmed draw |
| `--warning` | `0.76 0.15 75` | |
| `--info` | `0.58 0.13 250` | blue accents / charts |
| `--destructive` | `0.577 0.245 27.325` | |
| `--border` / `--input` | `0.912 0.011 255` | hairlines |
| `--ring` | `0.53 0.2 25` | focus = brand crimson |
| `--chart-1..5` | see file | recharts fallbacks |

### 1.3 Sidebar palette (always dark, both themes)

| Token | oklch |
| --- | --- |
| `--sidebar` | `0.22 0.032 264` |
| `--sidebar-foreground` | `0.86 0.015 258` |
| `--sidebar-primary` | `0.53 0.2 25` (crimson active pill) |
| `--sidebar-primary-foreground` | `0.99 0.01 90` |
| `--sidebar-accent` | `0.28 0.035 264` (hover) |
| `--sidebar-accent-foreground` | `0.98 0.005 250` |
| `--sidebar-border` | `0.32 0.03 264` |
| `--sidebar-ring` | `0.53 0.2 25` |

### 1.4 Elevation & gradients

```css
--shadow-card: 0 1px 2px oklch(0.21 0.03 260 / 6%),
               0 8px 24px -12px oklch(0.21 0.03 260 / 18%);
--gradient-brand: linear-gradient(135deg, oklch(0.53 0.2 25), oklch(0.44 0.16 20));
--gradient-dark:  linear-gradient(160deg, oklch(0.24 0.035 264), oklch(0.18 0.03 264));
```

### 1.5 Typography

```css
--font-sans:    "Outfit", "Cairo", ui-sans-serif, system-ui, sans-serif;
--font-display: "Outfit", "Cairo", ui-sans-serif, sans-serif;
```

Loaded in `__root.tsx` via a Google Fonts `<link>` (never `@import` in CSS):
`Outfit:300..800` + `Cairo:400,600,700,800`. Cairo covers the Arabic RTL mode.

Scale used across the app:

| Usage | Classes |
| --- | --- |
| Page title (H1) | `font-display text-2xl font-bold tracking-tight` |
| Hero title (detail pages) | `font-display text-2xl sm:text-3xl font-bold` |
| Section title (H2) | `font-display text-sm font-bold uppercase tracking-wide` |
| Stat value | `font-display text-3xl font-bold tabular-nums` |
| Body | `text-sm` |
| Meta / helper | `text-xs text-muted-foreground` |
| Micro labels | `text-[10px]` / `text-[11px]` uppercase tracking-wide |

All numeric columns use `tabular-nums`.

### 1.6 Base layer

```css
@layer base {
  * { border-color: var(--color-border); }
  body {
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
  }
}
```

### 1.7 Custom utilities

```css
@utility card-elevated {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
}
@utility brand-gradient { background-image: var(--gradient-brand); }
@utility dark-gradient  { background-image: var(--gradient-dark); }
@utility scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: oklch(0.75 0.02 258) transparent;
}
```

### 1.8 RTL rules

- The shell sets `dir="rtl"` on the root wrapper when `lang === "ar"`.
- **Always use logical properties**: `ps-*/pe-*`, `ms-*/me-*`, `start-*/end-*`,
  `border-s/border-e`, `text-start/text-end`. No `pl/pr/left/right` in app code.
- Directional icons flip with `rtl:rotate-180` (e.g. the back arrows).

---

## 2. Layout shell — `src/components/layout/AppShell.tsx`

Structure: `dir` wrapper → fixed dark sidebar (`md:` and up) → column with sticky header + main.

- Sidebar: `dark-gradient`, `sticky top-0 h-screen`, width `w-64` ↔ `w-[76px]` collapsed,
  `transition-all duration-300`, hidden below `md`.
- Nav item active state: `bg-sidebar-primary text-sidebar-primary-foreground shadow-sm`;
  idle: `text-sidebar-foreground/80 hover:bg-sidebar-accent`.
- Header: `sticky top-0 z-30`, `bg-card/85 backdrop-blur-md`, bottom hairline.
- Main: `px-4 py-6 sm:px-6 lg:px-8`.
- Nav items: Dashboard, Competitions, Athletes, Clubs, Templates, Draws, Rankings,
  Documents, Settings (lucide icons `h-[18px] w-[18px]`).

```jsx
<div dir="ltr" className="flex min-h-screen bg-background">
  <aside className="dark-gradient sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-sidebar-border text-sidebar-foreground transition-all duration-300 md:flex">
    <div className="flex h-16 items-center gap-3 px-4">
      <div className="brand-gradient grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-black text-primary-foreground shadow-lg">
        ⌁
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-base font-bold text-sidebar-accent-foreground">TatamiPro</p>
        <p className="truncate text-[11px] text-sidebar-foreground/60">Gestion de compétitions</p>
      </div>
    </div>

    <nav className="scrollbar-thin mt-2 flex-1 space-y-1 overflow-y-auto px-3 pb-6">
      {/* active */}
      <a className="group flex items-center gap-3 rounded-lg bg-sidebar-primary px-3 py-2.5 text-sm font-medium text-sidebar-primary-foreground shadow-sm transition-colors">
        <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">Tableau de bord</span>
      </a>
      {/* idle */}
      <a className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
        <Trophy className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">Compétitions</span>
      </a>
    </nav>

    <div className="border-t border-sidebar-border p-3">
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
        <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
        <span>◂ ▸</span>
      </button>
    </div>
  </aside>

  <div className="flex min-w-0 flex-1 flex-col">
    <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/85 px-4 py-3 backdrop-blur-md sm:flex sm:justify-between sm:px-6">
      <div className="relative min-w-0 max-w-md flex-1">
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
        <input
          placeholder="Rechercher…"
          className="h-10 w-full rounded-lg border border-input bg-secondary/60 ps-9 pe-3 text-sm outline-none transition focus:border-ring focus:bg-card"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-secondary/60 p-0.5">
          <Languages className="mx-1.5 h-4 w-4 text-muted-foreground" />
          <button className="rounded-md bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm">FR</button>
          <button className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">عربية</button>
        </div>

        <button className="relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-primary" />
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/60 py-1 ps-1 pe-3">
          <div className="brand-gradient grid h-8 w-8 place-items-center rounded-md text-xs font-bold text-primary-foreground">HA</div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-semibold">Hocine Amrani</p>
            <p className="text-[10px] text-muted-foreground">Organisateur</p>
          </div>
        </div>
      </div>
    </header>

    <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
  </div>
</div>
```

---

## 3. Shared components — `src/components/app/common.tsx`

### 3.1 PageHeader

```jsx
<header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
  <div className="min-w-0">
    <h1 className="truncate font-display text-2xl font-bold tracking-tight">Titre de la page</h1>
    <p className="mt-1 text-sm text-muted-foreground">Sous-titre contextuel</p>
  </div>
  {/* action slot: primary button */}
</header>
```

### 3.2 StatusBadge (7 states)

```jsx
<span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold bg-primary/12 text-primary">
  <span className="h-1.5 w-1.5 rounded-full bg-current" />
  En cours
</span>
```

Tone map:

| Status | Classes |
| --- | --- |
| `draft` | `bg-muted text-muted-foreground` |
| `registration_open` | `bg-success/12 text-success` |
| `registration_closed` | `bg-warning/15 text-bronze` |
| `draw_generated` | `bg-info/12 text-info` |
| `draw_confirmed` | `bg-info/20 text-info` |
| `in_progress` | `bg-primary/12 text-primary` |
| `completed` | `bg-secondary text-secondary-foreground` |

### 3.3 StatCard

Tones: `primary → bg-primary/10 text-primary`, `info → bg-info/10 text-info`,
`success → bg-success/10 text-success`, `gold → bg-gold/15 text-bronze`.

```jsx
<div className="card-elevated p-5">
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">Compétitions actives</p>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">6</p>
      <p className="mt-1 text-xs font-medium text-success">+2 vs 2025</p>
    </div>
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
      <Trophy className="h-5 w-5" />
    </div>
  </div>
</div>
```

### 3.4 MedalPill

```jsx
<div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
  <span className="inline-flex items-center gap-1 rounded-md bg-gold/20 px-1.5 py-0.5 text-bronze">
    <span className="h-2 w-2 rounded-full bg-gold" />3
  </span>
  <span className="inline-flex items-center gap-1 rounded-md bg-silver/25 px-1.5 py-0.5 text-muted-foreground">
    <span className="h-2 w-2 rounded-full bg-silver" />1
  </span>
  <span className="inline-flex items-center gap-1 rounded-md bg-bronze/15 px-1.5 py-0.5 text-bronze">
    <span className="h-2 w-2 rounded-full bg-bronze" />2
  </span>
</div>
```

### 3.5 SportTag

```jsx
<span className="whitespace-nowrap rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
  Karaté
</span>
```

### 3.6 Section (card with header bar)

```jsx
<section className="card-elevated overflow-hidden">
  <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
    <h2 className="truncate font-display text-sm font-bold uppercase tracking-wide">Titre de section</h2>
    {/* action slot: small link/button */}
  </div>
  {children}
</section>
```

### 3.7 Button recipes

| Variant | Classes |
| --- | --- |
| Primary | `brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90` |
| Secondary / outline | `inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold` |
| Ghost row action | `rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50 hover:text-primary` |
| Soft accent | `rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary` |
| Inline text link | `text-xs font-semibold text-primary hover:underline` |

### 3.8 Form controls

```jsx
<input className="h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 text-sm outline-none focus:border-ring focus:bg-card" />
<select className="h-10 rounded-lg border border-input bg-secondary/50 px-3 text-sm outline-none focus:border-ring" />
```
Search variant adds an absolutely positioned icon and `ps-9 pe-3`.

### 3.9 Data table recipe

```jsx
<div className="card-elevated overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[820px] text-sm">
      <thead className="border-b border-border bg-secondary/50 text-xs uppercase text-muted-foreground">
        <tr>
          <th className="px-5 py-3 text-start font-semibold">Nom</th>
          <th className="px-5 py-3 text-end font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        <tr className="transition-colors hover:bg-secondary/40">
          <td className="px-5 py-4">Cellule</td>
          <td className="px-5 py-4 text-end">…</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### 3.10 Tab bar recipe

```jsx
<div className="scrollbar-thin flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
  <button className="whitespace-nowrap rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-primary-foreground">Général</button>
  <button className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary">Participants</button>
</div>
```

---

## 4. Bracket components — `src/components/app/bracket.tsx`

### 4.1 FighterRow

```jsx
<div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-2 transition-colors">
  {/* seed badge — seeded: bg-gold/25 text-bronze · unseeded: bg-secondary text-muted-foreground */}
  <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-gold/25 text-[10px] font-bold text-bronze">1</span>
  <div className="min-w-0 flex-1">
    {/* winner: font-bold · loser: font-medium text-muted-foreground */}
    <p className="truncate text-[13px] font-bold">Yacine Belkacem</p>
    <p className="truncate text-[10px] text-muted-foreground">NR Alger Centre</p>
  </div>
  {/* winner score: brand-gradient text-primary-foreground · else bg-secondary text-muted-foreground */}
  <span className="brand-gradient grid h-6 w-7 shrink-0 place-items-center rounded-md text-xs font-bold tabular-nums text-primary-foreground">7</span>
</div>
```

### 4.2 MatchCard (fixed 220px)

```jsx
<div className="w-[220px] overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md">
  {/* final highlight swaps border for: border-gold ring-2 ring-gold/30 */}
  <div className="flex items-center justify-between bg-secondary/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
    <span>QF1</span>
    <span>Tatami 1</span>
  </div>
  <FighterRow top />
  <FighterRow />
</div>
```

### 4.3 BracketBoard

Horizontal scroller; each round is a column, matches spread with `justify-around`;
champion card closes the board; optional bronze match below a dashed divider.

```jsx
<div className="scrollbar-thin overflow-x-auto p-5">
  <div className="flex min-w-max items-stretch gap-8">
    <div className="flex flex-col">
      <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">8èmes de finale</p>
      <div className="flex flex-1 flex-col justify-around gap-4">
        <MatchCard />
        <MatchCard />
      </div>
    </div>

    <div className="flex flex-col justify-center">
      <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Champion</p>
      <div className="dark-gradient w-[220px] rounded-xl p-5 text-center shadow-lg">
        <Trophy className="mx-auto h-7 w-7 text-gold" />
        <p className="mt-2 font-display text-base font-bold text-sidebar-accent-foreground">Yacine Belkacem</p>
        <p className="text-xs text-sidebar-foreground/70">NR Alger Centre</p>
        <p className="mt-2 inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">-67 kg · Seniors</p>
      </div>
    </div>
  </div>

  <div className="mt-8 border-t border-dashed border-border pt-6">
    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Match pour le bronze</p>
    <MatchCard />
  </div>
</div>
```

---

## 5. Root layout — `src/routes/__root.tsx`

Providers order: `QueryClientProvider → I18nProvider → AppShell → <Outlet />`.
Head: charset, viewport, FR title/description, `og:*`, `twitter:card`,
stylesheet link + Google Fonts preconnect/stylesheet + favicon.

### 5.1 404 page

```jsx
<div className="flex min-h-screen items-center justify-center bg-background px-4">
  <div className="max-w-md text-center">
    <h1 className="text-7xl font-bold text-foreground">404</h1>
    <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
    <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
    <div className="mt-6">
      <a className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Go home</a>
    </div>
  </div>
</div>
```

### 5.2 Error boundary

```jsx
<div className="flex min-h-screen items-center justify-center bg-background px-4">
  <div className="max-w-md text-center">
    <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
    <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p>
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Try again</button>
      <a className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">Go home</a>
    </div>
  </div>
</div>
```

---

## 6. Dashboard — `src/routes/index.tsx`

Layout: header → 4 stat cards (`sm:grid-cols-2 xl:grid-cols-4`) → charts row
(`xl:grid-cols-3`, bar chart spans 2) → lists row (recent competitions spans 2 + activity
timeline) → upcoming grid (4 cards). Vertical rhythm `space-y-6`, gaps `gap-4` / `gap-6`.

Recharts colors come from CSS vars: `var(--color-gold|silver|bronze|primary|info)`;
grid stroke `var(--color-border)`; tooltip `borderRadius: 12, fontSize: 12`.

```jsx
<div className="space-y-6">
  <PageHeader
    title="Tableau de bord"
    subtitle="Saison 2026 · Fédération Algérienne des Sports de Combat"
    action={
      <a className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
        <Trophy className="h-4 w-4" />
        Compétitions
      </a>
    }
  />

  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Compétitions actives" value="6" delta="+2 vs 2025" tone="primary" />
    <StatCard label="Athlètes inscrits" value="1 248" delta="+184" tone="info" />
    <StatCard label="Clubs" value="86" delta="+7" tone="success" />
    <StatCard label="Combats aujourd'hui" value="42" tone="gold" />
  </div>

  <div className="grid gap-6 xl:grid-cols-3">
    <Section className="xl:col-span-2" title="Médailles" action={<span className="text-xs text-muted-foreground">2026</span>}>
      <div className="h-72 w-full p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey="wilaya" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="gold" fill="var(--color-gold)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="silver" fill="var(--color-silver)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="bronze" fill="var(--color-bronze)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>

    <Section title="Combats par discipline">
      <div className="h-72 w-full p-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
              <Cell fill="var(--color-primary)" />
              <Cell fill="var(--color-info)" />
              <Cell fill="var(--color-gold)" />
            </Pie>
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Section>
  </div>

  <div className="grid gap-6 xl:grid-cols-3">
    <Section className="xl:col-span-2" title="Compétitions récentes"
      action={<a className="text-xs font-semibold text-primary hover:underline">Voir tout</a>}>
      <ul className="divide-y divide-border">
        <li>
          <a className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/60">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-lg">🥋</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Championnat National de Karaté 2026</p>
              <p className="truncate text-xs text-muted-foreground">Alger · 248 athlètes</p>
            </div>
            <StatusBadge status="in_progress" />
            <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </a>
        </li>
      </ul>
    </Section>

    <Section title="Activité">
      <ol className="relative space-y-5 p-5 ps-8">
        <span className="absolute inset-y-5 start-[18px] w-px bg-border" />
        <li className="relative">
          <span className="absolute -start-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
          <p className="text-sm font-medium leading-snug">Tirage confirmé · -67 kg Seniors</p>
          <p className="mt-0.5 text-xs text-muted-foreground">il y a 2 h</p>
        </li>
      </ol>
    </Section>
  </div>

  <Section title="À venir">
    <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4">
      <a className="rounded-xl border border-border p-4 transition hover:border-primary/40 hover:shadow-md">
        <div className="flex items-center justify-between gap-2">
          <SportTag sport="MMA" />
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />12/09/2026
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-sm font-semibold">Open MMA d'Oran</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">Oran</p>
        <div className="mt-3"><StatusBadge status="registration_open" /></div>
      </a>
    </div>
  </Section>
</div>
```

---

## 7. Competitions list — `src/routes/competitions.index.tsx`

Header + filter bar (`card-elevated flex flex-wrap items-center gap-3 p-4`) + table
(`min-w-[820px]`, 6 columns: name, sport, date, location, status, actions).

```jsx
<div className="space-y-6">
  <PageHeader
    title="Compétitions"
    subtitle="12 compétitions · saison 2026"
    action={
      <button className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">
        <Plus className="h-4 w-4" />Nouvelle compétition
      </button>
    }
  />

  <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
    <div className="relative min-w-[220px] flex-1">
      <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
      <input placeholder="Rechercher…" className="h-10 w-full rounded-lg border border-input bg-secondary/50 ps-9 pe-3 text-sm outline-none focus:border-ring focus:bg-card" />
    </div>
    <div className="flex items-center gap-2 text-muted-foreground"><Filter className="h-4 w-4" /></div>
    <select className="h-10 rounded-lg border border-input bg-secondary/50 px-3 text-sm outline-none focus:border-ring">
      <option>Sport</option>
    </select>
    <select className="h-10 rounded-lg border border-input bg-secondary/50 px-3 text-sm outline-none focus:border-ring">
      <option>Statut</option>
    </select>
  </div>

  <div className="card-elevated overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50 text-start text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-3 text-start font-semibold">Nom</th>
            <th className="px-5 py-3 text-start font-semibold">Sport</th>
            <th className="px-5 py-3 text-start font-semibold">Date</th>
            <th className="px-5 py-3 text-start font-semibold">Lieu</th>
            <th className="px-5 py-3 text-start font-semibold">Statut</th>
            <th className="px-5 py-3 text-end font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr className="transition-colors hover:bg-secondary/40">
            <td className="px-5 py-4">
              <p className="font-semibold">Championnat National de Karaté 2026</p>
              <p className="text-xs text-muted-foreground">248 athlètes · 42 clubs</p>
            </td>
            <td className="px-5 py-4"><SportTag sport="Karaté" /></td>
            <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />14/03/2026</span>
            </td>
            <td className="px-5 py-4 text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />Alger</span>
            </td>
            <td className="px-5 py-4"><StatusBadge status="completed" /></td>
            <td className="px-5 py-4 text-end">
              <a className="inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/50 hover:text-primary">Voir</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

---

## 8. Competition workspace — `src/routes/competitions.$id.tsx`

Back link → dark hero banner → tab bar (6 tabs) → tab panels.
Tabs: `general`, `participants`, `categories`, `draws`, `results`, `rankings`.

### 8.1 Back link + hero

```jsx
<a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />Retour
</a>

<div className="dark-gradient card-elevated overflow-hidden border-0 p-6 text-sidebar-foreground">
  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <SportTag sport="Karaté" />
        <StatusBadge status="in_progress" />
      </div>
      <h1 className="mt-3 font-display text-2xl font-bold text-sidebar-accent-foreground sm:text-3xl">
        Championnat National de Karaté 2026
      </h1>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-sidebar-foreground/80">
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />14/03/2026 – 16/03/2026</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />Alger</span>
        <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />248 · 42 clubs</span>
      </div>
    </div>
    <button className="brand-gradient inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground">
      <Shuffle className="h-4 w-4" />Générer le tirage
    </button>
  </div>
</div>
```

### 8.2 Tabs

```jsx
<div className="scrollbar-thin flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
  <button className="brand-gradient whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">Général</button>
  <button className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary">Participants</button>
</div>
```

### 8.3 Tab · Général (definition grid + top-5 list)

```jsx
<div className="grid gap-6 lg:grid-cols-3">
  <Section className="lg:col-span-2" title="Général">
    <dl className="grid gap-4 p-5 sm:grid-cols-2">
      <div className="rounded-lg border border-border p-3">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Nom</dt>
        <dd className="mt-1 text-sm font-semibold">Championnat National de Karaté 2026</dd>
      </div>
      <div className="rounded-lg border border-border p-3 sm:col-span-2">
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">Description</dt>
        <dd className="mt-1 text-sm leading-relaxed">Texte descriptif…</dd>
      </div>
    </dl>
  </Section>

  <Section title="Résultats">
    <ul className="divide-y divide-border">
      <li className="flex items-center gap-3 px-5 py-3">
        <span className="w-5 text-sm font-bold text-muted-foreground">1</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Yacine Belkacem</p>
          <p className="truncate text-xs text-muted-foreground">NR Alger Centre</p>
        </div>
        <MedalPill g={3} s={1} b={2} />
      </li>
    </ul>
  </Section>
</div>
```

### 8.4 Tab · Participants

```jsx
<Section title="Participants">
  <div className="overflow-x-auto">
    <table className="w-full min-w-[640px] text-sm">
      <thead className="border-b border-border bg-secondary/50 text-xs uppercase text-muted-foreground">
        <tr>
          <th className="px-5 py-3 text-start font-semibold">Nom</th>
          <th className="px-5 py-3 text-start font-semibold">Club</th>
          <th className="px-5 py-3 text-start font-semibold">Wilaya</th>
          <th className="px-5 py-3 text-start font-semibold">Poids</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        <tr className="hover:bg-secondary/40">
          <td className="px-5 py-3 font-medium">Yacine Belkacem</td>
          <td className="px-5 py-3 text-muted-foreground">NR Alger Centre</td>
          <td className="px-5 py-3 text-muted-foreground">Alger</td>
          <td className="px-5 py-3 tabular-nums">67 kg</td>
        </tr>
      </tbody>
    </table>
  </div>
</Section>
```

### 8.5 Tab · Catégories

```jsx
<div className="grid gap-6 lg:grid-cols-2">
  <Section title="Catégories d'âge">
    <ul className="grid gap-2 p-5 sm:grid-cols-2">
      <li className="rounded-lg border border-border px-3 py-2">
        <p className="text-sm font-semibold">Seniors</p>
        <p className="text-xs text-muted-foreground">18 ans +</p>
      </li>
    </ul>
  </Section>

  <Section title="Divisions de poids">
    <div className="space-y-4 p-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Hommes</p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold">-67 kg</span>
        </div>
      </div>
    </div>
  </Section>
</div>
```

### 8.6 Tab · Tirages / Résultats / Classements

```jsx
<Section title="Tirages · -67 kg Seniors" action={<a className="text-xs font-semibold text-primary hover:underline">Voir tout</a>}>
  <BracketBoard />
</Section>

<Section title="Résultats" action={
  <button className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
    <Download className="h-3.5 w-3.5" />PDF
  </button>
}>
  <ul className="divide-y divide-border">
    <li className="flex flex-wrap items-center gap-3 px-5 py-4">
      <span className="rounded-md bg-secondary px-2 py-1 text-xs font-bold">-67 kg</span>
      <span className="text-sm font-semibold">Yacine Belkacem</span>
      <span className="text-xs text-muted-foreground">vs Riad Lounis</span>
      <span className="ms-auto rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">7 – 6</span>
    </li>
  </ul>
</Section>

<Section title="Classements">
  <ul className="divide-y divide-border">
    <li className="flex items-center gap-3 px-5 py-3">
      {/* 1st bg-gold/25 text-bronze · 2nd bg-silver/30 · 3rd bg-bronze/20 text-bronze · else bg-secondary text-muted-foreground */}
      <span className="grid h-7 w-7 place-items-center rounded-full bg-gold/25 text-xs font-bold text-bronze">1</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">Yacine Belkacem</p>
        <p className="truncate text-xs text-muted-foreground">NR Alger Centre · Alger</p>
      </div>
      <MedalPill g={3} s={1} b={2} />
    </li>
  </ul>
</Section>
```

---

## 9. Athletes list — `src/routes/athletes.index.tsx`

Header + single search card + table `min-w-[880px]` with avatar initials cell and a
three-button action group.

```jsx
<div className="space-y-6">
  <PageHeader title="Athlètes" subtitle="1 248 athlètes licenciés"
    action={
      <button className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground">
        <Plus className="h-4 w-4" />Nouvel athlète
      </button>
    } />

  <div className="card-elevated p-4">
    <div className="relative">
      <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
      <input placeholder="Rechercher…" className="h-10 w-full rounded-lg border border-input bg-secondary/50 ps-9 pe-3 text-sm outline-none focus:border-ring focus:bg-card" />
    </div>
  </div>

  <div className="card-elevated overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead className="border-b border-border bg-secondary/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-3 text-start font-semibold">Nom</th>
            <th className="px-5 py-3 text-start font-semibold">Club</th>
            <th className="px-5 py-3 text-start font-semibold">Wilaya</th>
            <th className="px-5 py-3 text-start font-semibold">Naissance</th>
            <th className="px-5 py-3 text-start font-semibold">Poids</th>
            <th className="px-5 py-3 text-start font-semibold">Sport</th>
            <th className="px-5 py-3 text-end font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr className="hover:bg-secondary/40">
            <td className="px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">YB</div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">Yacine Belkacem</p>
                  <p className="truncate text-xs text-muted-foreground">Ceinture noire 2e dan</p>
                </div>
              </div>
            </td>
            <td className="px-5 py-3 text-muted-foreground">NR Alger Centre</td>
            <td className="px-5 py-3 text-muted-foreground">Alger</td>
            <td className="px-5 py-3 tabular-nums text-muted-foreground">1998-04-12</td>
            <td className="px-5 py-3 tabular-nums font-semibold">67 kg</td>
            <td className="px-5 py-3"><SportTag sport="Karaté" /></td>
            <td className="px-5 py-3">
              <div className="flex justify-end gap-2">
                <a className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50 hover:text-primary">Voir</a>
                <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">Modifier</button>
                <button className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">Inscrire</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

---

## 10. Athlete profile — `src/routes/athletes.$id.tsx`

Back link → white identity card (80px avatar tile + meta row + MedalPill) →
`lg:grid-cols-3`: history list (span 2) + club card.

```jsx
<div className="space-y-6">
  <a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />Retour
  </a>

  <div className="card-elevated flex flex-wrap items-center gap-5 p-6">
    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-secondary text-2xl font-black text-muted-foreground">YB</div>
    <div className="min-w-0 flex-1">
      <h1 className="font-display text-2xl font-bold">Yacine Belkacem</h1>
      <p className="mt-1 text-sm text-muted-foreground">Karaté · Ceinture noire 2e dan</p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" />NR Alger Centre</span>
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />Alger</span>
        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />1998-04-12</span>
        <span className="inline-flex items-center gap-1.5"><Weight className="h-4 w-4" />67 kg</span>
      </div>
    </div>
    <MedalPill g={3} s={1} b={2} />
  </div>

  <div className="grid gap-6 lg:grid-cols-3">
    <Section className="lg:col-span-2" title="Historique">
      <ul className="divide-y divide-border">
        <li className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Championnat National de Karaté 2026</p>
            <p className="truncate text-xs text-muted-foreground">2026-03-14 · Alger</p>
          </div>
          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold">🥇 Or</span>
        </li>
      </ul>
    </Section>

    <Section title="Club">
      <div className="space-y-3 p-5 text-sm">
        <p className="font-display text-lg font-bold">NR Alger Centre</p>
        <p className="text-muted-foreground">Alger · Alger</p>
        <p className="text-muted-foreground">Président : Mourad Hamdi</p>
        <p className="text-muted-foreground">Fondé en 1994</p>
        <a className="inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary/50 hover:text-primary">Voir</a>
      </div>
    </Section>
  </div>
</div>
```

---

## 11. Clubs grid — `src/routes/clubs.index.tsx`

Cards `sm:grid-cols-2 xl:grid-cols-3`, lift on hover (`hover:-translate-y-0.5 hover:shadow-lg`),
dark gradient monogram tile.

```jsx
<div className="space-y-6">
  <PageHeader title="Clubs" subtitle="86 clubs affiliés dans 34 wilayas"
    action={
      <button className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground">
        <Plus className="h-4 w-4" />Nouveau club
      </button>
    } />

  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <a className="card-elevated p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-3">
        <div className="dark-gradient grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-black text-sidebar-accent-foreground">NR</div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold">NR Alger Centre</p>
          <p className="truncate text-xs text-muted-foreground">Alger · Alger</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm font-semibold tabular-nums">
          64 <span className="text-xs font-normal text-muted-foreground">athlètes</span>
        </span>
        <MedalPill g={12} s={7} b={9} />
      </div>
    </a>
  </div>
</div>
```

---

## 12. Club detail — `src/routes/clubs.$id.tsx`

Dark stat banner + roster list (span 2) + palmarès list.

```jsx
<div className="space-y-6">
  <a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
    <ArrowLeft className="h-4 w-4 rtl:rotate-180" />Retour
  </a>

  <div className="dark-gradient card-elevated border-0 p-6">
    <h1 className="font-display text-2xl font-bold text-sidebar-accent-foreground">NR Alger Centre</h1>
    <p className="mt-1 text-sm text-sidebar-foreground/75">Alger · Alger · fondé en 1994</p>
    <div className="mt-4 flex flex-wrap gap-6 text-sidebar-foreground/85">
      <div>
        <p className="font-display text-2xl font-bold text-sidebar-accent-foreground">64</p>
        <p className="text-xs">athlètes</p>
      </div>
      <div>
        <p className="font-display text-2xl font-bold text-sidebar-accent-foreground">28</p>
        <p className="text-xs">Médailles</p>
      </div>
      <div>
        <p className="text-sm font-semibold text-sidebar-accent-foreground">Mourad Hamdi</p>
        <p className="text-xs">Président</p>
      </div>
    </div>
  </div>

  <div className="grid gap-6 lg:grid-cols-3">
    <Section className="lg:col-span-2" title="Athlètes">
      <ul className="divide-y divide-border">
        <li className="flex items-center gap-3 px-5 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">YB</div>
          <div className="min-w-0 flex-1">
            <a className="truncate text-sm font-semibold hover:text-primary">Yacine Belkacem</a>
            <p className="truncate text-xs text-muted-foreground">Karaté · 67 kg</p>
          </div>
          <MedalPill g={3} s={1} b={2} />
        </li>
      </ul>
    </Section>

    <Section title="Résultats">
      <ul className="divide-y divide-border text-sm">
        <li className="flex items-center justify-between gap-3 px-5 py-3">
          <span className="truncate text-muted-foreground">Championnat National 2026</span>
          <span className="shrink-0 font-semibold">🥇 1er</span>
        </li>
      </ul>
    </Section>
  </div>
</div>
```

---

## 13. Sport templates — `src/routes/templates.tsx`

Three cards (`lg:grid-cols-3`) with dark gradient header, chips for age categories and
weight divisions, plus a centered modal for a new template.

```jsx
<div className="space-y-6">
  <PageHeader title="Modèles" subtitle="Configurations réutilisables par discipline"
    action={
      <button className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground">
        <Plus className="h-4 w-4" />Nouveau modèle
      </button>
    } />

  <div className="grid gap-6 lg:grid-cols-3">
    <article className="card-elevated overflow-hidden">
      <div className="dark-gradient flex items-center gap-3 p-5">
        <span className="text-2xl">🥋</span>
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-bold text-sidebar-accent-foreground">Karaté</p>
          <p className="truncate text-xs text-sidebar-foreground/70">WKF Kumite · 3 min</p>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Catégories d'âge</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
              Seniors <span className="text-muted-foreground">18+</span>
            </span>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Divisions de poids</p>
          <div className="mb-2">
            <p className="text-[11px] font-semibold text-muted-foreground">Hommes</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded-md border border-border px-2 py-0.5 text-xs font-semibold tabular-nums">-67 kg</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  </div>

  {/* Modal */}
  <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
    <div className="card-elevated w-full max-w-lg">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="font-display text-base font-bold">Nouveau modèle</h2>
        <button className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Nom de la discipline</span>
          <input placeholder="Ex. Taekwondo" className="h-10 w-full rounded-lg border border-input bg-secondary/50 px-3 text-sm outline-none focus:border-ring focus:bg-card" />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
        <button className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Annuler</button>
        <button className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">Enregistrer</button>
      </div>
    </div>
  </div>
</div>
```

---

## 14. Draws — `src/routes/draws.tsx`

Header with 3 actions (Print / PDF / Generate) → format switcher bar → bracket card.

```jsx
<div className="space-y-6">
  <PageHeader
    title="Tirages"
    subtitle="Championnat National de Karaté 2026 · Kumité -67 kg Seniors Hommes · 16 athlètes"
    action={
      <div className="flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold">
          <Printer className="h-4 w-4" />Imprimer
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold">
          <Download className="h-4 w-4" />PDF
        </button>
        <button className="brand-gradient inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground">
          <Shuffle className="h-4 w-4" />Générer le tirage
        </button>
      </div>
    }
  />

  <div className="card-elevated flex flex-wrap items-center gap-3 p-4">
    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Format du tableau</span>
    <button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground">Élimination directe</button>
    <button className="brand-gradient rounded-lg px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors">Élimination directe + petite finale</button>
    <span className="ms-auto rounded-md bg-success/12 px-2.5 py-1 text-xs font-semibold text-success">Tirage confirmé</span>
  </div>

  <div className="card-elevated overflow-hidden">
    <BracketBoard />
  </div>
</div>
```

---

## 15. Rankings — `src/routes/rankings.tsx`

Full-width segmented tabs (`flex-1` buttons) → one table per tab
(individual `min-w-[720px]`, clubs `min-w-[720px]`, wilayas `min-w-[640px]`).

### 15.1 RankBadge

```jsx
{/* 1st */}<span className="grid h-7 w-7 place-items-center rounded-full bg-gold/30 text-xs font-bold text-bronze">1</span>
{/* 2nd */}<span className="grid h-7 w-7 place-items-center rounded-full bg-silver/40 text-xs font-bold text-foreground">2</span>
{/* 3rd */}<span className="grid h-7 w-7 place-items-center rounded-full bg-bronze/20 text-xs font-bold text-bronze">3</span>
{/* 4+  */}<span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-xs font-bold text-muted-foreground">4</span>
```

### 15.2 Page

```jsx
<div className="space-y-6">
  <PageHeader title="Classements" subtitle="Saison 2026 · toutes disciplines" />

  <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
    <button className="brand-gradient flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground">Individuel</button>
    <button className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary">Clubs</button>
    <button className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary">Wilayas</button>
  </div>

  <Section title="Individuel">
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-secondary/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-5 py-3 text-start font-semibold">Rang</th>
            <th className="px-5 py-3 text-start font-semibold">Nom</th>
            <th className="px-5 py-3 text-start font-semibold">Club</th>
            <th className="px-5 py-3 text-start font-semibold">Wilaya</th>
            <th className="px-5 py-3 text-start font-semibold">Médailles</th>
            <th className="px-5 py-3 text-end font-semibold">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr className="hover:bg-secondary/40">
            <td className="px-5 py-3"><RankBadge i={0} /></td>
            <td className="px-5 py-3 font-semibold">Yacine Belkacem</td>
            <td className="px-5 py-3 text-muted-foreground">NR Alger Centre</td>
            <td className="px-5 py-3 text-muted-foreground">Alger</td>
            <td className="px-5 py-3"><MedalPill g={3} s={1} b={2} /></td>
            <td className="px-5 py-3 text-end font-bold tabular-nums">128</td>
          </tr>
        </tbody>
      </table>
    </div>
  </Section>

  {/* Clubs / Wilayas variant: medal columns are centered, gold column is `text-center font-bold tabular-nums text-bronze`,
      total column is `text-end font-bold tabular-nums`. */}
</div>
```

---

## 16. Documents — `src/routes/documents.tsx`

Grid `sm:grid-cols-2 xl:grid-cols-3`; each card has a faux PDF thumbnail (skeleton lines
of varying width) over a `bg-secondary/60` stage, then meta + two actions.

```jsx
<div className="space-y-6">
  <PageHeader title="Documents" subtitle="Championnat National de Karaté 2026 · documents générés" />

  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <article className="card-elevated overflow-hidden">
      <div className="grid h-40 place-items-center bg-secondary/60">
        <div className="relative h-28 w-20 rounded-md border border-border bg-card shadow-md">
          <div className="absolute inset-x-3 top-4 space-y-1.5">
            <div className="h-1 rounded bg-border" style={{ width: "100%" }} />
            <div className="h-1 rounded bg-border" style={{ width: "80%" }} />
            <div className="h-1 rounded bg-border" style={{ width: "90%" }} />
            <div className="h-1 rounded bg-border" style={{ width: "60%" }} />
            <div className="h-1 rounded bg-border" style={{ width: "75%" }} />
          </div>
          <span className="absolute bottom-1 end-1 rounded bg-primary px-1 text-[8px] font-bold text-primary-foreground">PDF</span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Liste des participants</p>
            <p className="text-xs text-muted-foreground">12 p. · 480 Ko · 12/03/2026</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:text-primary">
            <Eye className="h-3.5 w-3.5" />Aperçu
          </button>
          <button className="brand-gradient inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-primary-foreground">
            <Download className="h-3.5 w-3.5" />Télécharger
          </button>
        </div>
      </div>
    </article>
  </div>
</div>
```

---

## 17. Settings — `src/routes/settings.tsx`

`lg:grid-cols-2` of four Sections (language, competition prefs, certificates, templates)
plus a right-aligned save button.

```jsx
<div className="space-y-6">
  <PageHeader title="Paramètres" subtitle="Espace organisateur" />

  <div className="grid gap-6 lg:grid-cols-2">
    <Section title="Langue">
      <div className="flex gap-3 p-5">
        {/* selected */}
        <button className="flex-1 rounded-xl border border-primary bg-primary/5 p-4 text-start transition">
          <p className="text-sm font-bold">Français (LTR)</p>
          <p className="mt-1 text-xs text-muted-foreground">Interface de gauche à droite</p>
        </button>
        {/* idle */}
        <button className="flex-1 rounded-xl border border-border p-4 text-start transition hover:border-primary/40">
          <p className="text-sm font-bold">العربية (RTL)</p>
          <p className="mt-1 text-xs text-muted-foreground">واجهة من اليمين إلى اليسار</p>
        </button>
      </div>
    </Section>

    <Section title="Préférences de compétition">
      <div className="space-y-4 p-5 text-sm">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <span className="text-muted-foreground">Format par défaut</span>
          <span className="font-semibold">Élimination directe + petite finale</span>
        </div>
      </div>
    </Section>

    <Section title="Diplômes">
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        <div className="rounded-xl border border-primary bg-primary/5 p-3 text-center">
          <div className="mb-2 h-20 rounded-md bg-secondary" />
          <p className="text-xs font-semibold">Classique</p>
        </div>
        <div className="rounded-xl border border-border p-3 text-center">
          <div className="mb-2 h-20 rounded-md bg-secondary" />
          <p className="text-xs font-semibold">Moderne</p>
        </div>
      </div>
    </Section>

    <Section title="Modèles">
      <div className="flex items-center justify-between gap-3 p-5">
        <p className="text-sm text-muted-foreground">3 modèles configurés : Karaté, MMA, Jeet Kune Do</p>
        <a className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-primary/50 hover:text-primary">Voir</a>
      </div>
    </Section>
  </div>

  <div className="flex justify-end">
    <button className="brand-gradient rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground">Enregistrer</button>
  </div>
</div>
```

---

## 18. Conventions checklist

1. Page root is always `<div className="space-y-6">` and starts with `PageHeader`.
2. Every surface is `card-elevated`; nested blocks use `rounded-lg border border-border`.
3. Section padding is `p-5`; table cells `px-5 py-3` (lists/tables) or `px-5 py-4` (dense rows).
4. Grid gaps: `gap-4` for card grids, `gap-6` for section grids.
5. Breakpoints used: `sm` (640), `lg` (1024), `xl` (1280); sidebar appears at `md` (768).
6. Only one accent per screen: the crimson `brand-gradient` primary action.
7. Dark surfaces (`dark-gradient`) always pair with `text-sidebar-*` foreground tokens.
8. Hover language: `hover:bg-secondary/40` for rows, `hover:shadow-md` / `hover:-translate-y-0.5` for cards, `hover:border-primary/50 hover:text-primary` for outline buttons.
9. Transitions are short and default-eased: `transition`, `transition-colors`, `duration-300` for the sidebar only.
10. Long text always gets `truncate` / `line-clamp-2` inside `min-w-0` parents.
