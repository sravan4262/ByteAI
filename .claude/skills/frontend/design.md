---
name: byteai-design
description: ByteAI design guide — visual language (dark cyber theme), Tailwind token system, design philosophy, visual audit workflow, and anti-patterns to avoid.
---

# Design — ByteAI Frontend

ByteAI's visual direction: **dark cyber terminal**. Developer-native, dense information, glowing accent colors on deep dark backgrounds.

---

## ByteAI Visual Language

### Color System (CSS custom properties)

```css
/* app/globals.css — ByteAI palette */
:root {
  --bg: #05050e;          /* page background */
  --bg-1: #0a0a18;        /* card surface */
  --bg-2: #0e0e22;        /* elevated surface */

  --accent: #3b82f6;      /* primary action (blue) */
  --accent-glow: rgba(59,130,246,0.4);

  --cyan: #22d3ee;         /* tag highlight, code badge */
  --purple: #a78bfa;       /* secondary accent, keywords */
  --green: #4ade80;        /* success, string literals */
  --orange: #fb923c;       /* warning, numeric literals */

  --t1: #f0f0f8;           /* primary text */
  --t2: #8b8ba8;           /* secondary text */
  --t3: #4a4a6a;           /* muted text / comments */

  --border: rgba(255,255,255,0.06);
  --border-h: rgba(255,255,255,0.12);  /* hover border */
  --border-m: rgba(255,255,255,0.04);  /* minimal border */

  --code-bg: #0a0a1a;      /* CodeBlock background */
}
```

### Typography

- **Display / Headings:** `Bricolage Grotesque` — `var(--font-sans)` — expressive, editorial
- **Code / Mono:** `JetBrains Mono` — `var(--font-mono)` — developer identity
- **Font sizes:** minimum `text-[10px]` for labels, `text-sm` for inputs, `text-base` for body
- **Tracking:** mono labels use `tracking-[0.1em]` to `tracking-widest`

### Shadows & Glows

```css
/* Glow on active elements */
shadow-[0_0_10px_var(--cyan),0_0_20px_rgba(34,211,238,0.3)]

/* Card hover glow */
hover:shadow-[0_0_16px_rgba(34,211,238,0.2)]

/* Active nav indicator */
shadow-[0_0_8px_var(--accent-glow)]
```

### Motion Rules

- Use animation to **reveal hierarchy** and **reinforce user action**
- Feed cards: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
- Modal: scale + fade (0.9 → 1 scale, opacity 0 → 1)
- Nav indicator: CSS transition only — no JS animation
- **No** scattered hover micro-interactions everywhere. One load sequence > twenty random hover effects.

---

## Tailwind Conventions

```
text-[10px]        minimum for labels
text-sm            inputs, secondary UI
text-base          body content
font-mono          all code, badges, identifiers

z-20               filter bars (above post cards)
relative           filter container (backdrop-filter creates stacking context)

dark:              all color variants — dark-first
```

**Spacing rhythm:** 4px base (`gap-1`, `p-1`) → 8px (`gap-2`, `p-2`) → 16px → 24px. No arbitrary `px-[13px]` unless matching a design spec exactly.

**Avoid:**
- Arbitrary colors (`bg-[#abc123]`) — use CSS variables
- `!important` overrides
- Inline `style=` for anything that can be a Tailwind class

---

## Composing New Screens

### 1. Frame first

Before coding any new screen, settle:
- **Purpose** — what task does the user complete here?
- **Density** — information dense (feed, search) or focused (compose, onboarding)?
- **Dominant surface** — full-bleed dark, card grid, or split layout?

ByteAI is a developer-native app. Prefer **density + clarity** over decorative whitespace.

### 2. Structural pattern

```tsx
// Standard authenticated screen layout
export function FeatureScreen() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Fixed header */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[rgba(5,5,14,0.92)] backdrop-blur-md px-4 py-3">
        ...
      </header>

      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto">
        ...
      </main>
    </div>
  )
}
```

### 3. Cards / post surfaces

```tsx
<div className="bg-[var(--bg-1)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-h)] transition-colors">
  ...
</div>
```

### 4. Accent badges / tags

```tsx
<span className="font-mono text-[10px] text-[var(--cyan)] bg-[rgba(34,211,238,0.08)] border border-[rgba(34,211,238,0.18)] px-2 py-0.5 rounded-sm tracking-wider uppercase">
  typescript
</span>
```

---

## Design Anti-Patterns (Never Do This)

| Anti-Pattern | ByteAI Fix |
|---|---|
| Generic SaaS card grid with equal-weight white cards | Dark surface cards with border glow, dense layout |
| Purple-to-blue gradient on everything | Selective cyan/purple accents — not backgrounds |
| Centered hero with stock gradient | Full-bleed dark with structural nav |
| Rounded everything (`rounded-full` on containers) | `rounded-xl` on cards, `rounded-lg` on inputs, `rounded-sm` on badges |
| Light mode default | Dark-first — `dark:` class on `<html>` always |
| Emoji-heavy UI | Lucide icons only — no emojis in product UI |
| Generic sans-serif stack | Bricolage Grotesque (display) + JetBrains Mono (code) |
| Over-animated scroll effects | Purposeful animations: load sequences and action feedback only |

---

## Visual Audit Checklist

Run this before shipping any new screen:

### Color
- [ ] All colors use CSS variables or Tailwind scale — no raw hex except in `globals.css`
- [ ] Text passes WCAG AA contrast against its background
- [ ] Accent colors used selectively (not on every element)

### Typography
- [ ] Body text is `text-[var(--t1)]` on dark surfaces
- [ ] Secondary text is `text-[var(--t2)]`
- [ ] Code/labels use `font-mono`
- [ ] No text smaller than `text-[10px]`

### Spacing
- [ ] Consistent rhythm — no arbitrary spacing values
- [ ] Touch targets ≥ 44×44px (mobile-first)

### Dark Mode
- [ ] All backgrounds use `--bg`, `--bg-1`, `--bg-2` variables — not `bg-white` or `bg-gray-*`
- [ ] No `light:` variants needed (app ships dark-only)

### Motion
- [ ] Animations are purposeful — not decorative
- [ ] No animation on every scroll event
- [ ] Transitions use `transition-colors` / `transition-all` with `duration-150` to `duration-200`

### Consistency
- [ ] New screen matches existing screens (same header height, border style, card treatment)
- [ ] Icons are Lucide only
- [ ] Font sizes stay within established scale

---

## Design System Audit Workflow

When auditing a full screen or component for visual consistency:

```
1. Color consistency    — using palette vars or random hex?
2. Typography hierarchy — clear t1 > t2 > t3 progression?
3. Spacing rhythm       — consistent 4/8/16/24px scale?
4. Component consistency — similar elements look similar?
5. Responsive behavior  — mobile + desktop breakpoints correct?
6. Dark mode            — complete, no light mode bleed?
7. Animation            — purposeful or gratuitous?
8. Accessibility        — contrast, focus states, touch targets
9. Information density  — cluttered or appropriately dense?
10. Polish              — hover states, transitions, empty states present?
```

Score each 0–10. Any dimension below 6 → fix before shipping.
