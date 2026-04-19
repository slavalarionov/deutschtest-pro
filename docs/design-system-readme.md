# deutschtest.pro — Design System

A design system for **deutschtest.pro**, a KI-powered exam-prep platform for German language certifications (Goethe, telc, ÖSD; A1–C1). The system covers a marketing site, a desktop web app (dashboard, exam runner, progress, recommendations, settings, admin) and a mobile app surface.

The system is designed to feel **editorial, calm, and high-stakes** — tight typography, generous whitespace, single accent hue, restrained iconography. The Tweaks panel in `Redesign.html` lets users live-tune `accentHue`, `radius`, and `theme` — these are first-class system inputs, not throwaways.

## Sources

| Source | Path |
| --- | --- |
| Original prototype | `Redesign.html` (full clickable demo, 12 screens + landing + mobile + admin) |
| Component source | `screens/common.jsx` (Icon, Logo, Chip, Button, Card, BrowserFrame, PhoneFrame) |
| Per-screen JSX | `screens/{landing,auth,dashboard,exam,progress,history,recommendations,settings,pricing,admin,mobile}.jsx` |
| Tokens | `colors_and_type.css` (CSS vars; consumable by any project) |

The original prototype runs in-browser via Babel + Tailwind CDN; the design tokens are hand-written CSS variables (no Tailwind-only values).

---

## Content Fundamentals

**Language.** German throughout the product surface (UI labels, copy, eyebrows). Marketing copy is German with English allowed for code labels (`U+00DF`, `LATIN SMALL LETTER SHARP S`). The interface is intentionally **du-form** (informal "you") — friendly but not cute: *"auf gehts"*, *"Was hast du heute vor?"*, *"Beim ersten Versuch."*

**Tone.**
- **Concrete over aspirational.** *"24 481 absolvierte Module"* not *"Trusted by thousands"*.
- **Cadenced, declarative.** Short sentences punctuated by periods used as design elements: *"Bestehen. Beim ersten Versuch."*, *"Vier Module. Eine Plattform."*, *"Drei Schritte. Eine Prüfung."*
- **Quietly technical.** Format-aware copy (*"Lesen · B1 · Teil 2"*, *"Konjunktiv II"*) signals expertise without lecturing.
- **No exclamation marks. No emoji.** The voice is composed.

**Casing.**
- Headings: **sentence case**, German rules (nouns capitalized).
- Eyebrows / metadata / section numbers: **UPPERCASE MONO** with em-dash separators (`01 — MODULE`, `EMPFOHLEN · KI-LERNPFAD`).
- Buttons: sentence case (*"Kostenlos starten"*, *"Credits kaufen"*).
- Unicode codepoints used as decoration (`U+00DF · LATIN SMALL LETTER SHARP S`).

**Numbers.** Locale-formatted with thin space (`24 481`, never `24,481` or `24.481`). Ratings shown with greyed denominator: `4.8/5`.

---

## Visual Foundations

### Color
- **Single hue accent** driven by `--accent-h` (default `255` — a calm cobalt). The Tweaks panel exposes this as a slider; everything from focus rings to chip tints inherits.
- **OKLCH everywhere** — perceptually-uniform lightness across light/dark themes.
- **Three surface levels**: `--bg` (page) → `--surface` (rails, footer, recessed) → `--card` (raised). No drop shadows used to differentiate surfaces; surface color does the work.
- **Three ink levels**: `--ink` (primary) → `--ink-soft` (body) → `--muted` (captions, eyebrows). Used consistently — never invent a new grey.
- **Two line weights**: `--line` (visible borders, dividers) and `--line-soft` (hairlines inside cards, dotline patterns).
- **Brand secondary `--gelb`** (`#ffd400`) used **only** for the highest-stakes CTA (e.g. landing nav "Kostenlos testen") and for the `ß`-glyph fill in hero. Never as a background fill on body, never as link color.

### Typography
- **One family**: `Inter Tight` for everything (display + body), with `JetBrains Mono` for eyebrows and metadata. No serif. No third family.
- **Tight tracking** at display sizes (`-0.045em` at 96px). This is signature.
- **Hairline weights** at display sizes — `font-weight: 400` at 96px reads as fashion-mag, not heavy.
- **Italic for emphasis** in display headings (`*ersten*` in *"Beim ersten Versuch"*) — sparingly, one word per heading.
- **Body** at `--ink-soft`, never pure `--ink`. Pure `--ink` is reserved for headings + key numbers.

### Spacing
- Card padding: `24px` (`p-6`) typical; `40px` (`p-10`) for marketing sections.
- Page horizontal padding: `40px` (`px-10`) on landing/dashboard, `24px` on mobile.
- Section vertical rhythm: `128px` (`py-32`) between marketing sections, `40–80px` inside the app.
- Stat blocks separated by 1px vertical line + `40px` horizontal gap.

### Backgrounds & decoration
- **Background is solid `var(--bg)`** — never gradients, never images.
- **Letter-as-graphic.** Oversized characters (`ß`, `ü`, `ä`, `ö`, `M`) at 160–560px serve as visual anchors. Either filled (`--ink`) or outlined (`-webkit-text-stroke: 1.5px var(--line); color: transparent`). One per section, max.
- **Drift marquee** of letter pairs (`ä ö ü ß ei ch sch`) on the landing — slow, hypnotic, pure typography.
- **Dotline** (`radial-gradient(var(--line) 1px, transparent 1px)` at `12px`) for subtle texture in empty regions.
- **Gridline** (`40px` square grid in `--line-soft`) for technical contexts (admin, charts).

### Borders & corners
- **One radius token** (`--radius`, default `20px`, tweakable). All cards/inputs use it. Buttons use `calc(var(--radius) * 0.6)`. Pills use `999px`. **No mixed radii** within one card.
- **1px borders** in `--line`. Card = `background: var(--card); border: 1px solid var(--line);`. No double borders, no inset shadows for depth.
- **Hairline dividers** between rows use `--line-soft`.

### Shadows
- **Two shadow tokens only.**
  - `--shadow-lift` — soft, low, for raised cards on light bg (`0 8px 28px -10px rgba(0,0,0,.08)`).
  - `--shadow-pop` — large, dramatic, only for the device frames in marketing (`0 30px 80px -30px rgba(0,0,0,.25)`).
- **No shadows in the app interior** — separation is done with surface ladder + borders.

### Animation
- **Almost none.** This is the rule.
- Buttons lift 1px on hover (`transform: translateY(-1px)`); transition `all .15s ease`.
- The landing letter-strip drifts horizontally (`60s linear infinite`) — the only continuous motion in the system.
- No bounces, no springs, no fade-ins on scroll.

### States
- **Hover.** Ghost buttons gain `--surface` background. Cards do not lift. Rail items get `--card` background.
- **Active rail item.** Inverted: `background: var(--ink); color: var(--bg);` — the strongest state in the system.
- **Focus.** `outline: 2px solid var(--accent); outline-offset: 2px;` on `:focus-visible` only.
- **Selected option** (e.g. exam answer): `background: var(--accent-soft); border-color: var(--accent); color: var(--accent-ink);`
- **Press.** No transform on press. The system is calm.

### Layout rules
- **Editorial grids.** Marketing uses 12-col with section eyebrows (`01 — MODULE`) at top-left. Asymmetric splits (7/5, 8/4) preferred over balanced halves.
- **Left-aligned everything.** Center alignment is reserved for stat numerals and modal dialogs.
- **Generous top-of-fold whitespace.** Hero copy starts ~80px from top; first content card ~200px down.

### Transparency & blur
- Effectively unused. The system is opaque on purpose. The single exception: `color-mix` for the phone-bezel halo.

---

## Iconography

- **Custom inline SVG set** in `screens/common.jsx` → `Icon` component. ~45 glyphs.
- **Stroke-only**, `stroke-width: 1.5`, `stroke-linecap: round`, `stroke-linejoin: round`. No fills (except `play`, `pause`, `dot`).
- **24×24 viewBox**, rendered at 12–18px in the app, 14px inside buttons.
- **No emoji. No icon font. No third-party set.** Adding an icon = add a path to the `paths` map in `common.jsx`. This is intentional; it keeps visual weight uniform.
- **Glyphs as iconography.** German letters (`ß`, `ä`, `ö`, `ü`) used at small sizes also serve as iconography — see the logo (`ß` in a black square) and the module cards (oversized `L`, `H`, `S`).

See `assets/icons.svg` for the extracted sprite (mirror of the `Icon` paths map).

---

## Index

```
Redesign.html              Full clickable prototype — every screen, all states, Tweaks panel
colors_and_type.css        Design tokens (CSS vars) — copy into any project
README.md                  This file
SKILL.md                   Agent skill manifest (download → drop into Claude Code)

screens/                   Per-screen JSX (source of truth for component composition)
  common.jsx               Icon, Logo, Chip, Button, Card, BrowserFrame, PhoneFrame
  landing.jsx              Marketing site
  auth.jsx                 Login / register
  dashboard.jsx            Main app home
  exam.jsx                 Exam runner
  progress.jsx             Stats + charts
  history.jsx              Past attempts
  recommendations.jsx      KI suggestions
  settings.jsx             Account + preferences
  pricing.jsx              Plans
  admin.jsx                Internal admin
  mobile.jsx               Mobile app screens

assets/
  icons.svg                Sprite of the 45 custom icons
  logo.svg                 Logo mark (ß in square)

preview/                   Design-system documentation cards
  *.html                   Each card = one section of the system, registered to the Design System tab

ui_kits/web/               UI kit — hi-fi reusable components
  index.html               Kit overview / live composition
  *.jsx                    Component source
```

---

## How to use

**Live preview & Tweaks.** Open `Redesign.html`. Toggle Tweaks (toolbar) to live-edit `accentHue`, `radius`, `theme` and see every screen update.

**In a new project.** Copy `colors_and_type.css` and the bits of `screens/common.jsx` you need (Icon, Button, Chip, Card). The CSS is framework-free; the JSX assumes React 18.

**As a Claude skill.** This project ships with `SKILL.md` so it can be downloaded and used as an Agent Skill in Claude Code.

> ⚠️ **Set the project's File Type to "Design System"** in the Share menu so others in your org can browse it.
