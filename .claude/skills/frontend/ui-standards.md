# UI Standards — ByteAI

A living reference guide for all visual and UX patterns across the app. Apply these consistently to every screen.

---

## Typography

| Element | Before | After |
|---|---|---|
| Body / description copy | `font-mono text-[10px]` or smaller | `text-xs` (12px), default sans font |
| Labels / tags / metadata | `font-mono text-[8px]–text-[9px]` | `font-mono text-[10px]` minimum |
| Usernames / handles | `font-mono text-[10px]` | `font-mono text-[11px]` |
| Section headers | `font-mono text-[11px]` | `font-mono text-xs font-bold` |
| Inline inputs (role, company) | `text-[11px]` | `text-xs font-medium` |

**Rule:** nothing smaller than `text-[10px]` for any visible label. Body copy always uses the default sans font, not mono. Mono is reserved for labels, tags, metadata, counts, and code-style elements.

---

## Color — Text Contrast

| Usage | Before | After |
|---|---|---|
| Secondary labels | `text-[var(--t3)]` | `text-[var(--t2)]` |
| Tertiary / decorative (line numbers) | `text-[var(--border-h)]` | `text-[var(--t3)]` |
| Input placeholders | `placeholder:text-[var(--border-h)]` | `placeholder:text-[var(--t2)]` |
| Unfocused inline input placeholders | `placeholder:text-[var(--t2)]` | `placeholder:text-[var(--t3)]` |

**Rule:** `--t3` is only for truly decorative elements (line numbers, separators). Never use it for readable content. Placeholders should be dim enough to distinguish from filled content but not invisible.

---

## Color — Accent System

| Element | Before | After |
|---|---|---|
| Role title input | `--purple` | `--accent` (blue) |
| Company input | `--cyan` | `--green` |
| Domain step buttons | `--cyan` | `--accent` (blue) |
| Tech stack step buttons | `--green` | `--accent` (blue) |
| Word count tick `✓ N words` | `--green` | `--accent` (blue) |

**Rule:** Use `--accent` (blue) as the primary interactive color throughout. `--green` is used only for the company field. `--cyan`, `--purple` are not used for primary actions.

---

## Buttons — Selected vs Unselected

### Before
```
Unselected: dark bg, --border-m border, --t2 text  (no color signal)
Selected:   --accent border, --accent-d bg, --accent text
```

### After
```
Unselected: rgba(59,130,246,0.2) border + rgba(59,130,246,0.03) bg, --t1 text
Hover:      rgba(59,130,246,0.45) border + rgba(59,130,246,0.07) bg
Selected:   --accent border + --accent-d bg + --accent text + glow shadow
```

**Rule:** Unselected buttons carry a faint blue tint so selecting one feels like "magnifying" an existing signal rather than creating color from nothing.

---

## Card CTA Button — VIEW_FULL_* Pattern

The primary call-to-action at the bottom-right of a feed card (e.g. `VIEW_FULL_BYTE →`, `VIEW_FULL_INTERVIEW →`) sits between unselected and selected — darker than a filter pill, lighter than a fully filled button:

```jsx
<button className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.1em]
                   text-[var(--accent)]
                   bg-[rgba(59,130,246,0.22)]
                   border border-[rgba(59,130,246,0.6)]
                   shadow-[0_0_10px_rgba(59,130,246,0.18)]
                   transition-all hover:border-[var(--accent)] hover:shadow-[0_0_14px_rgba(59,130,246,0.25)] hover:-translate-y-0.5">
  VIEW_FULL_BYTE <span>→</span>
</button>
```

| Property | Value |
|---|---|
| Text | `text-[var(--accent)] font-mono text-[10px] font-bold tracking-[0.1em]` |
| Background | `rgba(59,130,246,0.22)` — darker than unselected (`0.03`), lighter than solid fill |
| Border | `rgba(59,130,246,0.6)` — stronger than unselected (`0.2`), just under full accent |
| Glow | `shadow-[0_0_10px_rgba(59,130,246,0.18)]` at rest, `0_0_14px_rgba(59,130,246,0.25)` on hover |
| Position | `ml-auto` — always right-aligned in the action row |

**Rule:** Never use a fully solid gradient fill (`from-accent to-#2563eb`) — it reads as too dominant against dark card backgrounds. The semi-transparent fill + accent text + border glow gives the CTA visual weight without overpowering the card content.

---

## Inline Inputs (role / company)

| Property | Before | After |
|---|---|---|
| Border at rest | `border-dashed --border-m` (invisible) | `border-dashed --border-h` (visible) |
| Border on focus | `border-dashed` colored | `border-solid` colored |
| Separator `@` | `--t3` | `--t2 opacity-60` |

**Rule:** Dashed border = editable field hint. Switches to solid on focus to signal active editing.

---

## Section Headers

### Before
```jsx
<div className="font-mono text-[11px] tracking-[0.1em] text-[var(--t3)]">
  // SELECT_SENIORITY
</div>
```

### After
```jsx
<div className="flex items-center gap-2.5">
  <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">
    SENIORITY
  </span>
</div>
```

**Rule:** No `//` comment-style labels. Use an accent-colored vertical bar + bold `--t1` mono text. The bar color can match the step's accent (e.g., blue for seniority/domain/tech).

---

## Domain Selection — UX Change

| Behaviour | Before | After |
|---|---|---|
| Selection type | Single domain, auto-advances | Multi-select toggle |
| Navigation | Click = select + advance | Click = toggle, Continue button to advance |
| Tech stacks | Loaded for one domain | Loaded lazily for all selected domains via `Promise.all` |
| Deselect domain | N/A | Auto-removes that domain's tech stacks from selection |
| Continue button label | Static | Dynamic: `Continue with 2 domains →` |

---

## Review Step

**Rule:** The review step must mirror the exact pill/chip styles used in each selection step — not invent its own. Section labels use the same accent-bar header pattern.

| Section | Chip style |
|---|---|
| Seniority | `border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]` |
| Domains | `border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]` |
| Tech Stack | `border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]` |

---

## Cards / Containers

| Property | Before | After |
|---|---|---|
| Card border radius | `rounded-lg` | `rounded-xl` |
| Tag/chip spacing | Magic pixel values (`gap-[5px]`) | Tailwind spacing (`gap-1.5`, `gap-2`) |

---

## Nav Buttons (Sidebar)

All sidebar navigation buttons — including primary nav items, Alerts, and Admin — follow the same faint-blue-tint pattern as action buttons:

```
Unselected: border-[rgba(59,130,246,0.2)]  bg-[rgba(59,130,246,0.03)]  text-[var(--t1)]  rounded-lg
Hover:      border-[rgba(59,130,246,0.45)]  bg-[rgba(59,130,246,0.07)]
Active:     border-[var(--accent)]  bg-[rgba(59,130,246,0.15)]  text-[var(--accent)]
            shadow-[0_0_12px_rgba(59,130,246,0.15)]
```

Sidebar container border: `border-r border-[var(--border-h)]`

**Rule:** No borderless nav items. Every nav element carries the faint blue tint at rest — selecting one feels like magnifying an existing signal, not switching color from nothing. Active state adds glow. Text is `--t1` (not `--t2`) on all states since nav labels are primary UI chrome.

### Notification Panel — Open / Close Behaviour

The notification panel closes on: (1) clicking the backdrop, (2) clicking the Alerts button again, (3) clicking anywhere else on the sidebar.

```jsx
{/* Nav closes the panel on any click */}
<nav ... onClick={() => notifOpen && setNotifOpen(false)}>

  {/* Alerts button toggles independently — stopPropagation prevents double-fire */}
  <button onClick={(e) => { e.stopPropagation(); setNotifOpen((v) => !v) }}>
    ...
  </button>

</nav>

{/* Backdrop already calls onClose on click outside */}
<NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} ... />
```

**Rule:** The sidebar sits at `z-50`, above the backdrop's `z-40`, so the backdrop alone does not catch sidebar clicks. The `onClick` on `<nav>` bridges this gap. The Alerts button must call `e.stopPropagation()` so the nav's handler doesn't interfere with its own toggle.

---

## Feed Header — Floating Card Pattern

The feed header is not a full-width bar. It floats as a rounded card. The background and border tint match the feature's identity color.

```jsx
{/* Bytes */}
<header className="... border border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.07)] backdrop-blur-md rounded-xl mx-3 mt-3">

{/* Interviews */}
<header className="... border border-[rgba(167,139,250,0.35)] bg-[rgba(167,139,250,0.07)] backdrop-blur-md rounded-xl mx-3 mt-3">
```

| Property | Bytes | Interviews |
|---|---|---|
| Border | `rgba(59,130,246,0.35)` | `rgba(167,139,250,0.35)` |
| Background | `rgba(59,130,246,0.07)` | `rgba(167,139,250,0.07)` |
| Shape | `rounded-xl` | `rounded-xl` |
| Margin | `mx-3 mt-3` | `mx-3 mt-3` |

**Rule:** Text/title left-aligned at `px-4`. Actions (bell, avatar) right-aligned via `justify-between`. Never wrap content in a `max-w-*` centering div inside the header — it defeats the flush alignment. Never use `bg-[var(--bg-o95)]` on feature headers — the identity-colored tint replaces it. `backdrop-blur-md` is always retained so scrolled content bleeds through naturally.

### Header Title & Subtitle

```jsx
<h1 className="font-mono text-sm md:text-base lg:text-lg font-bold tracking-[0.07em] flex items-center gap-2">
  <Icon size={16} className="text-[var(--accent)]" /> SCREEN_NAME
</h1>
<div className="font-mono text-[10px] md:text-xs tracking-[0.08em] text-[var(--t1)] mt-0.5">
  SUBTITLE COPY HERE
</div>
```

| Element | Rule |
|---|---|
| Title | `font-mono text-sm md:text-base lg:text-lg font-bold tracking-[0.07em]` |
| Title icon | `size={16}` `text-[var(--accent)]` |
| Subtitle | `font-mono text-[10px] md:text-xs tracking-[0.08em]` — always `text-[var(--t1)]`, never `--t2` |
| Actions gap | `gap-3` between bell and avatar |

**Rule:** Subtitle uses `--t1` (not `--t2`) — it is readable metadata, not a decorative label.

---

## Header — Bell / Notification Button

The notification bell uses an accent ring + glow, matching the avatar's ring treatment:

```jsx
<button
  onClick={openNotifications}
  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] flex items-center justify-center relative transition-all
             ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)]
             shadow-[0_0_10px_rgba(59,130,246,0.35)] hover:shadow-[0_0_16px_rgba(59,130,246,0.55)]"
>
  <Bell size={16} className="text-[var(--accent)]" />
  {unreadCount > 0 && (
    <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg)] shadow-[0_0_5px_var(--accent)]" />
  )}
</button>
```

| Element | Rule |
|---|---|
| Ring | `ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)]` — same as avatar |
| Glow | `shadow-[0_0_10px_rgba(59,130,246,0.35)]` at rest, `hover:shadow-[0_0_16px_rgba(59,130,246,0.55)]` on hover |
| Icon color | `text-[var(--accent)]` — not `--t2` |
| Unread dot | `w-2 h-2 top-1 right-1` with `shadow-[0_0_5px_var(--accent)]` glow |
| Size | `w-9 h-9 md:w-10 md:h-10` — matches avatar sizing |

**Rule:** No border on the bell button — use ring only. Bell and avatar should feel like a matched pair at the same visual weight.

---

## Feed Layout — Full-Width Cards with Gap Separation

Feed cards span the full available width with no horizontal margins. Separation between cards is achieved via vertical gap on the container, not borders-only or margins on the card.

```jsx
{/* Container */}
<div className="flex flex-col gap-2 p-2">

{/* Each card */}
<article className="border border-[var(--border-h)] rounded-xl bg-[var(--bg-card)] px-4 md:px-8 py-5 md:py-6">
```

| Property | Rule |
|---|---|
| Horizontal fill | Cards take full container width — no `mx-*` on the article |
| Vertical spacing | `gap-2` on the flex container, `p-2` outer padding |
| Border | `border-[var(--border-h)]` — high-contrast, all 4 sides |
| Shape | `rounded-xl` — corners visible because of `p-2` container padding |
| Background | `bg-[var(--bg-card)]` — distinct from the page `--bg` |

**Rule:** Never use `border-b` only for card separation — it prevents rounded corners from showing. Always use full `border` + `rounded-xl` + gap-based spacing.

---

## Tab Pills — Navigation Variant

Tabs that switch between feed views (e.g. FOR_YOU / TRENDING) use a bordered pill style, not an underline style:

```
Unselected: border-[rgba(59,130,246,0.2)]  bg-[rgba(59,130,246,0.03)]  text-[var(--t1)]
            hover: border-[rgba(59,130,246,0.45)]  bg-[rgba(59,130,246,0.07)]  text-[var(--accent)]
Selected:   border-[var(--accent)]  bg-[var(--accent-d)]  text-[var(--accent)]
            shadow-[0_0_12px_rgba(59,130,246,0.2)]
Shape:      rounded-lg  py-1.5  px-4
```

**Rule:** Tab pills follow the same faint-blue-tint unselected pattern as action buttons (see Buttons section). No underline / `border-b` tabs. Selecting a tab feels like magnifying an existing blue signal, not switching color from nothing.

---

## Section Labels (Filter Rows)

Labels like `TECH_STACK` that precede a filter control use the accent-bar pattern:

```jsx
<div className="flex items-center gap-2">
  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)]" />
  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">
    LABEL
  </span>
</div>
```

**Rule:** No plain `text-[var(--t3)]` labels. Always pair the accent bar with bold `--t1` mono text. The bar height should match the text cap-height (~`h-3.5`).

---

## Content Cards — Accent Gradient Top Line

Cards that display primary content (post detail, comment, post summary) use a high-contrast border with an accent gradient line at the top:

```jsx
<div className="rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden">
  <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
  <div className="p-4 lg:p-5 flex flex-col gap-4">
    {/* content */}
  </div>
</div>
```

**Rule:** `overflow-hidden` is required on the card for the top line to respect rounded corners. The gradient fades right so it doesn't frame the full width — it signals entry, not enclosure. Use `border-[var(--border-h)]` (not `--border`) for visibility.

---

## Empty State Pattern

Empty states (no comments, no results) use a faint blue tinted container with a centered icon, mono headline, and sans body:

```jsx
<div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8 text-center flex flex-col items-center gap-2">
  <Icon size={20} className="text-[var(--accent)] opacity-50" />
  <p className="font-mono text-xs font-bold text-[var(--t1)]">NO COMMENTS YET</p>
  <p className="text-xs text-[var(--t2)]">Be the first to add a comment.</p>
</div>
```

| Element | Rule |
|---|---|
| Container | Faint blue tint — same unselected button palette |
| Icon | `--accent` at `opacity-50` — present but not loud |
| Headline | `font-mono text-xs font-bold text-[var(--t1)]` — SCREAMING_CASE |
| Body | `text-xs text-[var(--t2)]` — default sans, secondary color |

---

## Destructive Action — Inline Confirmation (rm pattern)

Destructive actions never fire immediately. The trigger shows `rm`, clicking reveals an inline `DELETE? · YES · NO` row. No modals.

```
rm button (idle):
  font-mono text-xs font-bold px-3 py-1.5 rounded-lg
  border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)]
  hover: border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.08)] text-[var(--red)]

Confirming state:
  "DELETE?" label: font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.05em]
  YES: border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.08)] text-[var(--red)]
       hover: border-[rgba(244,63,94,0.7)] bg-[rgba(244,63,94,0.15)]
  NO:  standard faint blue tint unselected button (see Buttons section)
```

**Rule:** `rm` starts neutral (blue tint) and only reveals red intent on hover — avoiding alarming UI at rest. `DELETE?` label uses `--t1` so it reads clearly. YES/NO both use `px-2.5 py-1 rounded-lg font-bold` for consistent pill sizing. Applied to: comment cards, Q cards in compose interview. Never use a `Trash2` icon for destructive actions — always use this pattern.

---

## Comment Compose Bar

The comment input at the bottom of detail/comments screens uses a pill-shaped faint blue input + icon-only circular send button:

```jsx
<div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border-h)] bg-[var(--bg-o95)]">
  <Avatar ... size="xs" />
  <div className="flex-1 flex items-center bg-[rgba(59,130,246,0.04)] border border-[rgba(59,130,246,0.2)] rounded-full px-4 py-2.5
                  focus-within:border-[var(--accent)] focus-within:bg-[rgba(59,130,246,0.07)]">
    <input placeholder="Add a comment..." className="... placeholder:text-[var(--t2)]" />
  </div>
  <button className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8]
                     shadow-[0_4px_16px_var(--accent-glow)] hover:shadow-[0_6px_24px_var(--accent-glow)]">
    <Send size={14} />
  </button>
</div>
```

| Element | Rule |
|---|---|
| Avatar | Always shown left of input — user's own avatar |
| Input container | `rounded-full` pill, faint blue tint, lights up on focus |
| Placeholder | `"Add a comment..."` — `placeholder:text-[var(--t2)]` |
| Send button | Icon-only `rounded-full`, gradient + glow — no text label |
| Bar border | `border-t border-[var(--border-h)]` — high contrast separator |

---

## Profile Avatar — Accent Ring

Profile images in headers use a visible accent ring, not a plain border:

```jsx
{isEmoji
  ? <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] flex items-center justify-center text-xl ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] transition-all">{avatarSrc}</div>
  : avatarSrc
    ? <img src={avatarSrc} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] hover:ring-[var(--accent-h,#60a5fa)] transition-all" />
    : <Avatar initials={initials} size="sm" />
}
```

| Property | Rule |
|---|---|
| Size | `w-9 h-9 md:w-10 md:h-10` — matches bell button sizing |
| Ring | `ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)]` |
| Hover | `hover:ring-[var(--accent-h,#60a5fa)]` — subtle brightening |

**Rule:** `ring-2` + `ring-offset-2` creates a visible gap between the image and the ring. `ring-offset-[var(--bg-card)]` matches the card background so the gap reads as breathing room, not a white flash. Do not use `border-*` on circular images — use `ring-*`. Avatar and bell button are a matched pair — same size, same ring weight.

---

## Input & Textarea Borders

All inputs, textareas, and dropdown triggers use `border-[var(--border-h)]` at rest — never `border-[var(--border-m)]`. `--border-m` is too faint to communicate that a field is interactive.

| State | Border |
|---|---|
| Rest | `border-[var(--border-h)]` |
| Focus (blue feature) | `border-[var(--accent)]` + `shadow-[0_0_0_3px_rgba(59,130,246,0.14)]` |
| Focus (purple feature) | `border-[var(--purple)]` + `shadow-[0_0_0_3px_rgba(167,139,250,0.14)]` |
| Focus (green — ANSWER) | `border-[var(--green)]` + `shadow-[0_0_0_2px_rgba(16,217,160,0.12)]` |

**Rule:** The focus ring color matches the sub-label bar color for that field, so the visual language is consistent — the bar and the ring are the same accent.

---

## CreatableDropdown Component

The `CreatableDropdown` component is used for COMPANY, ROLE, LOCATION fields in compose interview. Key style rules:

### Trigger (closed state)
```jsx
<button className="... bg-[var(--bg-el)] border border-[var(--border-h)] rounded-lg px-3 py-2.5">
  {/* Value filled */}
  <span className="font-mono text-[11px] font-medium text-[var(--t1)]">{value}</span>
  <X size={12} className="text-[var(--t2)]" />

  {/* Empty / placeholder */}
  <span className="font-mono text-[11px] text-[var(--t2)]">{placeholder}</span>
  <ChevronDown size={12} className="text-[var(--t2)]" />
</button>
```

### Dropdown panel
```jsx
<div className="... bg-[var(--bg-card)] border border-[var(--border-h)] rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
  {/* Search row */}
  <div className="... border-b border-[var(--border-h)]">
    <Search size={11} className="text-[var(--t2)]" />
    <input className="... placeholder:text-[var(--t2)]" />
  </div>
```

### Option rows
```
Unselected: text-[var(--t1)]  hover:bg-[rgba(167,139,250,0.1)]
Selected:   accent-color text  bg-[rgba(167,139,250,0.15)]  font-bold
No results: font-mono text-xs text-[var(--t2)]
```

**Rules:**
- All placeholder and icon text uses `--t2`, never `--t3`
- Trigger border is always `border-h` (same as other inputs)
- Option hover and selected backgrounds use the purple tint regardless of `accentColor` — the list is always purple-themed since it's a shared component used in the interviews feature
- `accentColor` only controls the trigger's focused border and the selected option's text color

---

## FAB (Floating Action Button)

FABs have been **removed** from the bytes feed and interviews screens. Post creation is accessed via the compose type-selection screen instead.

**Rule:** No `fixed bottom-* right-*` compose buttons on feed or listing screens. Navigation to compose always goes through `/compose` (type selection landing).

---

## Required Field Markers

Required fields in compose forms show a red `*` inline with the label:

```jsx
<span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">
  COMPANY <span className="text-[var(--red)]">*</span>
</span>
```

**Rule:** The `*` is inside the label span, not a separate element. Color is `--red`. Required fields also disable the submit button until filled — the button `disabled` condition must include all required fields.

### Compose Interview — required fields
| Field | Required | Validated |
|---|---|---|
| COMPANY | Yes | `!company.trim()` |
| ROLE | Yes | `!role.trim()` |
| LOCATION | Yes | `!location.trim()` |
| Q&A pair | At least one | `validQuestions.length === 0` |

Validation fires sequentially with individual `toast.error()` per field so the user knows exactly what's missing.

---

## Feature Identity Colors

Each major feature has a fixed identity color. All accent bars, input focus rings, card gradient top lines, faint-tint button hovers, and submit button gradients use that feature's color — not the global `--accent` (blue). The structural patterns (accent-bar headers, faint-tint buttons, glow shadows, no `//` labels) remain the same across all features; only the color token changes.

| Feature | Identity color | CSS token | rgba base |
|---|---|---|---|
| Bytes (posts, feed, compose) | Blue | `--accent` | `rgba(59,130,246,…)` |
| Interviews | Purple | `--purple` | `rgba(167,139,250,…)` |

**Rule:** Never mix identity colors within a feature screen. A Compose Byte screen is all blue. A Compose Interview screen is all purple. Shared chrome (CANCEL button, sidebar nav, notification bell) always uses the global blue `--accent` regardless of which feature screen it appears on.

---

### Bytes — Blue Accent Tokens

```jsx
{/* Section header bar */}
<span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />

{/* Input focus ring */}
focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]

{/* Card accent gradient top line */}
<div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />

{/* Faint-tint button (unselected / ADD) */}
border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)]
hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]

{/* Submit button */}
bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8]
shadow-[0_4px_24px_rgba(59,130,246,0.4)]
hover:shadow-[0_8px_36px_rgba(59,130,246,0.5)]
```

---

### Interviews — Purple Accent Tokens

```jsx
{/* Section header bar */}
<span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />

{/* QUESTION sub-label bar — blue (--accent) */}
<span className="w-[3px] h-3 rounded-full bg-[var(--accent)]" />

{/* ANSWER sub-label bar — green (--green) */}
<span className="w-[3px] h-3 rounded-full bg-[var(--green)]" />

{/* Input focus ring — purple for section inputs, accent for QUESTION, green for ANSWER */}
focus:border-[var(--purple)] focus:shadow-[0_0_0_2px_rgba(167,139,250,0.15)]
focus:border-[var(--accent)] focus:shadow-[0_0_0_2px_rgba(59,130,246,0.15)]   /* QUESTION textarea */
focus:border-[var(--green)]  focus:shadow-[0_0_0_2px_rgba(16,217,160,0.12)]   /* ANSWER textarea */

{/* Card accent gradient top line */}
<div className="h-px bg-gradient-to-r from-[var(--purple)] via-[rgba(167,139,250,0.3)] to-transparent" />

{/* Faint-tint button (unselected / ADD QUESTION) */}
border-[rgba(167,139,250,0.25)] bg-[rgba(167,139,250,0.03)]
hover:border-[var(--purple)] hover:bg-[rgba(167,139,250,0.07)] hover:text-[var(--purple)]

{/* Submit button */}
bg-gradient-to-br from-[var(--purple)] to-[#5b21b6]
shadow-[0_4px_24px_rgba(167,139,250,0.4)]
hover:shadow-[0_8px_36px_rgba(167,139,250,0.5)]
```

**Additional rules for interviews:**
- QUESTION bar uses `--accent` (blue) — identifies the prompt.
- ANSWER bar uses `--green` — creates immediate question/answer contrast, both highly legible.
- Section-level inputs (TITLE, COMPANY, ROLE) use purple focus ring; Q/A textareas use their own bar color as focus ring.
- All input borders at rest use `border-[var(--border-h)]` — never `--border-m` (too faint to see field boundaries).
- No `//` comment-style labels anywhere — use the accent-bar pattern with the purple token.
- CANCEL / back buttons stay blue-tinted (global chrome default).
