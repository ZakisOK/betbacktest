# BetBacktest — Design Audit

**Audited branch:** `sleepy-joliot` worktree  
**Date:** 2026-04-09  
**Auditor:** Design audit agent  
**Standards applied:** impeccable, emil-design-eng, high-end-visual-design, redesign-existing-projects, stitch-design-taste

---

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 1/4 | No ARIA labels, no skip link, form inputs lack visible labels, keyboard traps in modals |
| 2 | Performance | 2/4 | `transition: all` on multiple components, backdrop-blur on scrolling containers, no `prefers-reduced-motion` |
| 3 | Responsive Design | 2/4 | `h-screen` used (iOS jump bug), touch targets below 44px, rule-card actions hidden on hover only |
| 4 | Theming | 1/4 | Inter hardcoded everywhere, zero design tokens, colors all inline rgba strings, no semantic token layer |
| 5 | Anti-Patterns | 0/4 | AI color palette, gradient text on brand name, blue-to-violet gradient throughout, glassmorphism used decoratively, glow effects, 3-column identical card grid, emoji in UI |
| **Total** | | **6/20** | **Poor — major overhaul needed** |

---

## Anti-Patterns Verdict

**This looks AI-generated.** The interface is a textbook example of the 2024-2025 AI dark-mode aesthetic. Anyone shown this would correctly guess it came from an AI code generator on the first try.

Specific tells present:

1. **Blue-to-violet gradient as brand identity** — `bg-gradient-to-r from-blue-400 to-violet-400` is the single most identifiable AI design fingerprint. It appears on the logo text, hero headline, and the "BetBacktest" name in every header and modal.
2. **Glassmorphism as the design system** — The entire UI is built on `.glass`, `.glass-elevated`, `.glass-panel`, `.glass-metric` — decorative blur/opacity surfaces with no structural purpose. This is the #2 AI aesthetic tell.
3. **Three identical cards in a feature row** — The HIGHLIGHTS section in LandingPage.tsx renders 6 features in a `grid-cols-3` equal grid. Each card has an icon, a heading, and body copy. Pure AI template.
4. **Glow effects** — `pulseGlow` animation on buttons, `glow-blue`, `glow-green`, `glow-red` utility classes, and `boxShadow` glows throughout. These draw attention to themselves instead of the content.
5. **Emoji in core UI** — The `🎴` emoji is used as the logo/favicon in every header, modal header, and the coming-soon page. Emoji in UI is an absolute ban per all skill standards.
6. **Gradient text on brand name** — `bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400` on "BetBacktest" in `App.tsx` line 157 and `LandingPage.tsx` line 60. This is explicitly banned.
7. **Neon outer glows on buttons** — `.btn-primary` has `box-shadow: 0 4px 20px rgba(59,130,246,0.3)` that intensifies to `0 8px 32px rgba(59,130,246,0.5)` on hover. Neon glows are banned.
8. **Arbitrary inline `rgba()` strings everywhere** — No design token system exists. Every color is a hardcoded `rgba()` value spread across hundreds of inline style attributes.

---

## P0 — Critical Issues

---

### P0-01: Gradient text on brand name (absolute ban violation)

**File:** `src/components/LandingPage.tsx` line 60-62, `src/App.tsx` lines 156-158, `src/components/AuthModal.tsx` lines 91-93, `src/components/ComingSoon.tsx` (implicit via shared pattern)

**Issue:** The "BetBacktest" brand name is rendered with `bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent` in every location it appears. Gradient text on brand names is one of the top three AI design tells (impeccable absolute ban #2). It also fails at small sizes when anti-aliased because the gradient wash-out reduces effective contrast. This pattern appears at least 4 times across the codebase.

**Fix:** Replace with a single solid color. Given the dark background, `text-white` or a slightly off-white like `text-slate-100` works best. Differentiate the brand mark through weight and tracking instead: `font-bold tracking-tight text-white`. If color is needed for brand identity, pick one solid accent — the existing blue (`#3b82f6`) works as a solid.

---

### P0-02: Inter used as primary font (banned)

**File:** `src/index.css` line 14, `index.html` line 21, `tailwind.config.js` line 21

**Issue:** `Inter` is explicitly banned by every design skill in this project's stack (impeccable, high-end-visual-design, stitch-design-taste, redesign-existing-projects). The body font is `'Inter', system-ui, -apple-system, sans-serif`. Inter is the most common AI-tool default and makes every interface look like every other AI-tool interface. The `tailwind.config.js` also sets `sans: ['Inter', 'system-ui', 'sans-serif']` in the font family extension.

**Fix:** Replace Inter with a distinctive sans-serif. For a data-heavy backtesting tool with a "precise, honest, technical" personality: `Geist` pairs extremely well with the existing `JetBrains Mono` (already in the stack). Update `index.html` Google Fonts link, `tailwind.config.js` sans font family, and `src/index.css` body font-family. Geist is available via `npm i geist` or via Google Fonts alternative.

---

### P0-03: No accessible labels on form inputs

**File:** `src/components/AuthModal.tsx` lines 120-131, `src/components/ComingSoon.tsx` lines 36-49, `src/components/StrategyBuilder/index.tsx` lines 155-163

**Issue:** Every input in the application uses only placeholder text for labels. Placeholder text disappears when the user types, making the input label invisible during editing. This fails WCAG 2.1 Success Criterion 1.3.1 (Info and Relationships) and 3.3.2 (Labels or Instructions). Screen readers read placeholder text as the accessible name, which is considered a label anti-pattern.

**Fix:** Add visible `<label>` elements with `htmlFor` matching each input's `id`. For the compact dashboard inputs (base unit, bankroll), use the existing `.section-label` styled `<label>` elements already present as `<div>` text — replace with proper `<label htmlFor="...">` elements.

---

### P0-04: Modal has no focus trap

**File:** `src/components/AuthModal.tsx`, `src/components/UpgradeModal.tsx`

**Issue:** Both modals render via a fixed overlay but do not trap keyboard focus. A keyboard user can Tab out of the modal and interact with background content. This is a WCAG 2.1 SC 2.1.2 (No Keyboard Trap) failure — ironically the inverse: a missing trap that should exist. The close button (`X`) has no `aria-label`. The modal containers have no `role="dialog"` or `aria-modal="true"` or `aria-labelledby` pointing to the heading.

**Fix:** Add `role="dialog" aria-modal="true" aria-labelledby="modal-title"`. Add `id="modal-title"` to the `<h2>` inside each modal. Implement focus trap: on mount, move focus to the first interactive element; on unmount, return focus to the trigger element. Use a library like `focus-trap-react` or implement manually with `useEffect`.

---

### P0-05: `alert()` used for informational content

**File:** `src/App.tsx` line 239

**Issue:** The Info button (ⓘ) calls `window.alert('BetBacktest\n\nMathematical research tool only...')`. Native browser `alert()` is inaccessible (not announced by screen readers consistently), blocks the main thread, looks like a scam popup, breaks the dark theme, and is universally considered an anti-pattern in production UIs.

**Fix:** Replace with a small popover or toast message. The `Toast.tsx` system already exists — use `showToast()` from the store. Alternatively, render a small `<dialog>` element or use an inline tooltip.

---

### P0-06: `h-screen` used causing iOS Safari viewport jump

**File:** `src/App.tsx` line 132 (`h-screen` on the dashboard root)

**Issue:** `height: 100vh` on mobile browsers (iOS Safari specifically) does not account for the address bar, causing content to be hidden behind it on initial load, then jumping when the address bar collapses. The `high-end-visual-design` and `stitch-design-taste` skills explicitly ban this pattern. The mobile experience will show content cut off below the fold.

**Fix:** Replace `h-screen` with `min-h-[100dvh]`. The `dvh` unit is the dynamic viewport height that accounts for collapsible browser chrome. Also verify `overflow-hidden` on the same element doesn't clip content unexpectedly at the new height.

---

## P1 — Important Issues

---

### P1-01: Glassmorphism used decoratively as the entire design system

**File:** `src/index.css` lines 42-188 (`.glass`, `.glass-elevated`, `.glass-panel`, `.glass-metric`)

**Issue:** The entire design system is built on glass morphism: semi-transparent backgrounds with `backdrop-filter: blur()`. This is an AI aesthetic tell and is explicitly banned "unless purposeful." More critically, `backdrop-filter: blur` applied to scrolling containers (`.glass-panel` is used inside `flex flex-col h-full overflow-hidden` panels) causes continuous GPU repaints and severe mobile frame drops. The `high-end-visual-design` skill explicitly states: "Apply `backdrop-blur` only to fixed or sticky elements (navbars, overlays). Never apply blur filters to scrolling containers or large content areas."

**Fix:** Keep `backdrop-filter: blur` on the sticky header and modals (which are fixed). Replace glass effects on panel content and metric tiles with opaque surface colors. Use the existing `surface-900`/`surface-950` palette or similar dark surfaces with subtle 1px borders. This both eliminates the AI aesthetic tell and fixes the performance issue.

---

### P1-02: Three-column equal card grid on landing page

**File:** `src/components/LandingPage.tsx` lines 113-123 (HIGHLIGHTS section)

**Issue:** Six identical cards in a `grid-cols-3` layout, each with an icon + title + body copy. This is the most generic AI feature-section layout — explicitly banned by all design skills in this stack. The cards are also rendered with `.glass-panel rounded-xl p-5` which applies the decorative glassmorphism banned in P1-01.

**Fix:** Replace with a 2-column zig-zag layout where features alternate left/right with a subtle icon illustration. Or use a horizontal scroll gallery at mobile scale with a 2-column stacked layout at desktop. Alternatively, a simple numbered list with generous whitespace has more editorial character. No icons-in-boxes.

---

### P1-03: Three-column equal pricing card grid

**File:** `src/components/LandingPage.tsx` lines 130-196

**Issue:** Three identical pricing cards in `grid-cols-3`. The "Pro" card uses the standard highlighted-center-card pattern (gradient background, `Most popular` badge). This is the second most generic AI layout pattern. The `Most popular` badge floats at `-top-3 left-1/2` which will clip on some containers.

**Fix:** Break the three-card symmetry. Consider a 2-tier layout where Free is listed as a simple text-block comparison and Pro/Lab are the actual cards. Or use a horizontal toggle that shows Pro/Lab as a single card that morphs. The `Most popular` badge works but the styling should be solid, not gradient.

---

### P1-04: Neon outer glow on primary button (banned)

**File:** `src/index.css` lines 113-125 (`.btn-primary`)

**Issue:** `.btn-primary` has `box-shadow: 0 4px 20px rgba(59,130,246,0.3)` at rest, intensifying to `0 8px 32px rgba(59,130,246,0.5)` on hover. This is the "neon outer glow" pattern explicitly banned by stitch-design-taste and high-end-visual-design. The button also uses a gradient background `linear-gradient(135deg, rgba(59,130,246,0.9), rgba(99,102,241,0.9))` which adds to the AI aesthetic.

**Fix:** Remove the box-shadow glow. Replace with a solid, desaturated blue (`#2563eb` or similar) for the button background. On hover, increase lightness by 5-8% rather than adding a glow. Add `transform: scale(0.97)` on `:active` for tactile press feedback (Emil Kowalski principle). The transition should specify exact properties: `transition: background-color 150ms ease-out, transform 100ms ease-out` — not `transition: all 0.2s ease`.

---

### P1-05: `transition: all` on multiple components

**File:** `src/index.css` lines 79, 94, 107, 134 (`.glass-metric`, `.btn-glass`, `.btn-primary`, `.input-glass`)

**Issue:** `transition: all 0.2s ease` is used on every interactive component. The `transition: all` pattern is explicitly banned by emil-design-eng because it animates every CSS property including layout properties (width, height, padding), which causes layout thrashing. It also animates things that shouldn't animate (border-radius, font properties) and creates subtle visual artifacts.

**Fix:** Specify exact transition properties on each component:
- `.glass-metric`: `transition: background-color 150ms ease-out, border-color 150ms ease-out, transform 150ms ease-out`
- `.btn-glass`: `transition: background-color 150ms ease-out, border-color 150ms ease-out`
- `.btn-primary`: `transition: background-color 150ms ease-out, transform 100ms ease-out`
- `.input-glass`: `transition: border-color 150ms ease-out, background-color 150ms ease-out, box-shadow 150ms ease-out`

---

### P1-06: Zero design token system — all colors are inline `rgba()` strings

**File:** `src/components/StrategyBuilder/index.tsx`, `src/components/Results/index.tsx`, `src/App.tsx`, and every other component file

**Issue:** There are no design tokens. Every color value is an inline `rgba()` string hardcoded directly in JSX `style={{}}` attributes. The Tailwind config defines only 4 custom colors (`banker`, `player`, `tie`, `surface`). The result: `rgba(99,102,241,0.2)` appears in at least 15 different places with slightly different opacity values that are impossible to maintain consistently. When the brand color needs to change, every file must be updated manually.

**Fix:** Define a semantic CSS variable system in `src/index.css`:
```css
:root {
  --color-accent: oklch(57% 0.18 265);
  --color-accent-subtle: oklch(57% 0.18 265 / 0.12);
  --color-accent-border: oklch(57% 0.18 265 / 0.25);
  --color-surface-1: oklch(12% 0.02 265);
  --color-surface-2: oklch(15% 0.02 265);
  --color-surface-3: oklch(18% 0.02 265);
  --color-text-primary: oklch(95% 0.01 265);
  --color-text-secondary: oklch(65% 0.01 265);
  --color-text-muted: oklch(45% 0.01 265);
  --color-border: oklch(25% 0.01 265 / 0.6);
}
```
Then use these variables consistently instead of hardcoded rgba strings.

---

### P1-07: Emoji used as the application logo

**File:** `src/components/LandingPage.tsx` line 58, `src/App.tsx` line 151, `src/components/AuthModal.tsx` line 88, `src/components/ComingSoon.tsx` line 15

**Issue:** A `🎴` (flower playing cards) emoji renders as the logo in the header, modal branding, and coming-soon page. Emoji rendering is inconsistent across operating systems (renders differently on Windows vs macOS vs iOS vs Android). Emoji are explicitly banned by stitch-design-taste ("No emojis — anywhere in UI, code, or alt text"). The emoji also lacks an `aria-label` or `aria-hidden="true"` making it announce as "flower playing cards" to screen readers.

**Fix:** Replace with a proper SVG logo or icon. A simple geometric mark using the brand's blue color would be more distinctive and consistent. Even a text-based monogram "BB" in a rounded square with the brand's blue would be more professional. Add `aria-hidden="true"` to any decorative icon elements.

---

### P1-08: Emoji used in Results panel heatmap legend

**File:** `src/components/Results/index.tsx` lines 181-183

**Issue:** The shoe heatmap legend uses `🟥 Loss` and `🟩 Win` emoji as visual indicators. This fails the emoji ban and also creates accessibility problems: screen readers announce these as "red square" and "green square" which is confusing in context.

**Fix:** Replace with CSS-styled `<span>` elements:
```tsx
<span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(239,68,68,0.6)' }} /> Loss
<span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(34,197,94,0.6)' }} /> Win
```

---

### P1-09: Rule card actions are hover-only with no mobile equivalent

**File:** `src/components/StrategyBuilder/RuleCard.tsx` lines 80-96

**Issue:** The rule card action buttons (Enable/Disable, Move Up/Down, Edit, Duplicate, Delete) are hidden by default and only appear on `group-hover`. On touch devices this hover state is unreliable — the CSS in `index.css` line 237 attempts a fix with `@media (hover: none) { .rule-card-actions { opacity: 1 !important; } }` but this makes the buttons always visible on mobile, creating visual density issues and accessibility problems since there's no indication of available actions before hovering.

**Fix:** Replace the hover-only pattern with a persistent "more" menu per rule (the `MoreHorizontal` icon already exists in the strategy builder header — bring it into each rule card). Show Edit and Delete as always-visible icon buttons. Put Move Up/Down in the expanded menu. This follows standard mobile interaction patterns and doesn't rely on hover.

---

### P1-10: Missing `prefers-reduced-motion` support

**File:** `src/index.css`, `tailwind.config.js` (animation definitions)

**Issue:** The app defines `animate-slide-in`, `animate-pulse-glow`, `animate-fade-in` keyframe animations with no reduced-motion alternative. The `pulseGlow` animation (a repeating glow pulse) runs indefinitely and directly violates WCAG 2.1 SC 2.3.3 (Animation from Interactions). Per the motion-design reference: "vestibular disorders affect ~35% of adults over 40."

**Fix:** Add to `src/index.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
The `pulseGlow` animation specifically should be removed or replaced with a static glow state.

---

### P1-11: Typography scale too flat — excessive use of tiny font sizes

**File:** `src/components/StrategyBuilder/index.tsx`, `src/components/Results/index.tsx`, `src/components/MathAgent/index.tsx`

**Issue:** The application uses font sizes below the accessible minimum throughout: `text-[9px]`, `text-[8px]`, `text-[7px]` appear repeatedly across strategy builder rule cards, results metadata, and AI message timestamps. WCAG requires a minimum of 14px for mobile (12px for desktop with caveats). These tiny sizes also create a visually cramped aesthetic that makes the tool feel like it was designed for 27-inch monitors only.

**Fix:** Establish a minimum floor of `text-xs` (12px) for all visible content, and `text-[10px]` only for non-essential metadata labels that are supplementary to larger primary values. Eliminate `text-[8px]` and `text-[7px]` entirely. The rule card index numbers at `text-[7px]` are invisible in practice.

---

### P1-12: No active/pressed state on buttons

**File:** `src/index.css` lines 88-125 (`.btn-glass`, `.btn-primary`)

**Issue:** Neither button variant has a `:active` state. Per Emil Kowalski's principles, every pressable element needs `transform: scale(0.97)` on `:active` to give tactile feedback. Without this, the interface feels unresponsive — users click and see no confirmation that the system received their input until the async action completes.

**Fix:** Add to both button classes:
```css
.btn-primary:active:not(:disabled) {
  transform: scale(0.97);
  transition: transform 100ms ease-out;
}
.btn-glass:active {
  transform: scale(0.97);
  transition: transform 100ms ease-out;
}
```

---

### P1-13: EquityCurve uses slate color tokens that don't exist in dark theme

**File:** `src/components/Results/EquityCurve.tsx` lines 28-29, 67-76, 143-158

**Issue:** The EquityCurve component uses Tailwind classes `text-slate-400`, `text-slate-600`, `text-green-400`, `text-slate-200` — these are Tailwind's default slate palette, not the project's custom dark surface palette. The chart tooltip uses `bg-surface-900 border border-surface-700` which are defined in Tailwind config, but the chart labels use `fill: '#475569'` (hardcoded hex) and text uses `text-slate-600` which renders as barely visible dark-on-dark text. The stat labels below the chart use `text-slate-600` which on a near-black background approaches 1.5:1 contrast (fails WCAG).

**Fix:** Replace all `text-slate-*` classes in EquityCurve with the project's surface/text token values. The label color `#475569` (slate-600) should be `rgba(255,255,255,0.4)` or equivalent for legibility on the dark background. Apply `font-variant-numeric: tabular-nums` to all number display in the chart stats.

---

### P1-14: Pricing cards have misaligned feature list starting positions

**File:** `src/components/LandingPage.tsx` lines 132-196

**Issue:** Each pricing tier card (`Free`, `Pro`, `Lab`) has a different number of lines before the feature list (the Pro card has a "7-day free trial" label AND a "Most popular" badge, adding visual height before the list). The feature lists (`<ul>`) start at different vertical positions across the three cards, making the tiers visually misaligned and harder to scan horizontally. The redesign-existing-projects skill explicitly flags this: "Feature lists starting at different vertical positions."

**Fix:** Use a fixed-height header block for each tier (title, price, billing period, trial badge) with a consistent `min-height` value. Then start the feature list from a consistent Y position. Alternatively, use CSS grid with named rows: title-row, price-row, badge-row, list-row.

---

### P1-15: Input labels missing on strategy builder core fields

**File:** `src/components/StrategyBuilder/index.tsx` lines 150-163

**Issue:** "Base Unit ($)" and "Bankroll ($)" inputs use a `<div className="section-label">` as the visual label, but these are `<div>` elements, not `<label>` elements, and they have no `htmlFor` association with the `<input>`. Screen readers will announce the input without any label context. This also violates WCAG 1.3.1.

**Fix:** Replace `<div className="section-label mb-1 block">` with `<label htmlFor={key} className="section-label mb-1 block">`. Add matching `id={key}` to the `<input>`.

---

## P2 — Polish Issues

---

### P2-01: No entry animation on strategy builder rules

**File:** `src/components/StrategyBuilder/index.tsx` line 265-274 (rules list)

**Issue:** When a new rule is added via the NL input or "Add Rule" button, it appears instantly with no entrance animation. The `animate-slide-in` class exists and is used for AI message bubbles — it should also be applied to newly added rule cards. Per Emil Kowalski's stagger animation principle: elements entering a list should cascade in with 30-80ms delays.

**Fix:** Apply `animate-slide-in` to each `<RuleCard>` and use a CSS `animation-delay: calc(index * 50ms)` via inline style to create a subtle cascade when rules are loaded.

---

### P2-02: Progress bar animation uses gradient background

**File:** `src/components/StrategyBuilder/index.tsx` line 322-323

**Issue:** The backtest progress bar uses `background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)'` — another blue-to-violet gradient. Consistent with all other anti-pattern instances. The bar width transitions via `transition-all duration-300` (banned `all` property).

**Fix:** Replace the gradient with a solid `#3b82f6`. Change `transition: all 300ms` to `transition: width 300ms ease-out`. Use `will-change: width` on the filling element only during active simulation.

---

### P2-03: Toast position overlaps mobile bottom nav

**File:** `src/components/Toast.tsx` line 10

**Issue:** Toasts render at `bottom-20` on mobile (`lg:bottom-6` on desktop). The mobile bottom nav sits at the bottom of the screen. `bottom-20` (80px) is a rough guess at the nav height but may overlap on certain screen sizes or when the keyboard is open.

**Fix:** Calculate the actual bottom nav height (approximately 64px + safe-area-inset-bottom) and set a precise offset. Use CSS environment variables: `padding-bottom: max(5rem, env(safe-area-inset-bottom))`. Also add `aria-live="polite"` to the toast container for screen reader announcements.

---

### P2-04: `pulseGlow` animation runs on `.btn-primary` via `.animate-pulse-glow`

**File:** `src/index.css` lines 231-234, `tailwind.config.js` lines 42-45

**Issue:** The `pulseGlow` keyframe cycles a blue box-shadow between `rgba(59,130,246,0.3)` and `rgba(59,130,246,0.6)` over 2 seconds, infinitely. This is a constant, indefinitely looping animation. Per Emil Kowalski's animation decision framework: "100+ times/day elements — No animation. Ever." Buttons are interacted with constantly. Perpetual glow animations are also specifically banned by the stitch-design-taste skill.

**Fix:** Remove the `pulseGlow` animation from all production buttons. Reserve perpetual animations for status indicators (like a "live" simulation dot), not primary CTAs.

---

### P2-05: Upgrade banner uses a hard side-stripe accent

**File:** `src/components/Results/index.tsx` lines 86-99

**Issue:** The free-tier upgrade banner uses `background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.2)'` to create a tinted top section. While this is a full-border (not a side stripe), the visual effect creates an implicit left-stripe accent pattern when combined with the upgrade text layout. This pattern is used again on the progress bar section in the strategy builder.

**Fix:** Replace the banner with an inline callout inside the metrics area, or use the existing upgrade modal trigger. If the banner must persist, make it a clean, full-width strip with solid background `rgba(99,102,241,0.08)` and no border — the background tint alone communicates the upsell zone.

---

### P2-06: No skeleton loaders — circular spinner used for loading state

**File:** `src/components/StrategyBuilder/index.tsx` line 319, `src/App.tsx` line 341

**Issue:** Loading states use `<Loader2 className="animate-spin"/>` (a circular spinner) and a simple `border-t-transparent rounded-full animate-spin` circle. Circular spinners are explicitly banned by stitch-design-taste ("No circular loading spinners — skeletal shimmer only"). The app-level loading state (auth check) shows a pure spinner on a full dark screen with no context.

**Fix:** For the auth loading state, replace the spinner with a skeleton of the dashboard layout — even a simple 3-column skeleton with surface backgrounds. For the strategy run progress, the existing progress bar is actually better than a spinner — keep it, remove the spinner from inline.

---

### P2-07: Upgrade modal "Lab" plan card has no background, blends into modal

**File:** `src/components/UpgradeModal.tsx` lines 119-140

**Issue:** The Lab plan card has only `border: '1px solid rgba(167,139,250,0.3)'` with no background — making it render as a floating border with no visual weight on the `glass-elevated` modal background. The Pro card has a gradient background that gives it visual presence; the Lab card appears as though it's less important despite being the premium tier. The Lab CTA button also uses an inline style rather than a proper button variant class.

**Fix:** Give the Lab card a subtle background: `background: 'rgba(167,139,250,0.07)'`. Style the Lab CTA with a proper `.btn-glass` class modified by the violet border instead of a fully inlined style. Create visual parity between Pro and Lab cards while differentiating them through color — violet for Lab, blue for Pro.

---

### P2-08: Missing `og:image` and social sharing meta tags

**File:** `index.html`

**Issue:** The `<head>` has a `<title>` and `<meta name="description">` but is missing Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`) and Twitter/X card tags. When the URL is shared on social platforms, it will render without a preview image. Given this is a paid SaaS product, social sharing previews are a real acquisition channel.

**Fix:** Add to `index.html`:
```html
<meta property="og:title" content="BetBacktest — Backtest Baccarat Strategies with AI" />
<meta property="og:description" content="Build a strategy. Run it against 1,000,000 simulated shoes. Let AI tell you what's wrong." />
<meta property="og:image" content="https://betbacktest.com/og-image.png" />
<meta property="og:url" content="https://betbacktest.com" />
<meta name="twitter:card" content="summary_large_image" />
```
Create a 1200x630 OG image asset.

---

### P2-09: No skip-to-content link

**File:** `index.html`, `src/App.tsx`

**Issue:** There is no "skip to main content" link. This is required for keyboard accessibility. Without it, keyboard users must Tab through the entire header navigation on every page load before reaching the main content.

**Fix:** Add as the first child of `<body>` in `index.html` or as the first rendered element in `App.tsx`:
```html
<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg">
  Skip to main content
</a>
```
Add `id="main-content"` to the main panel area.

---

### P2-10: Dashboard Info button uses `window.alert()` and has no `aria-label`

**File:** `src/App.tsx` line 237-242

**Issue:** Beyond the P0 alert issue, the Info button (`<Info size={15}/>`) has no `aria-label`. Screen readers will announce it as "button" with no context. The button also has a `p-1.5` tap target, making it approximately 28x28px — below the 44x44px minimum touch target requirement.

**Fix:** Add `aria-label="About BetBacktest"` to the button. Increase padding: `p-2.5` gives approximately 44x44px. Replace the `window.alert` with the Toast system (P0-05 fix covers this).

---

### P2-11: Pricing comparison table uses a checkmark emoji `✓` for display

**File:** `src/components/LandingPage.tsx` line 31

**Issue:** The `TIER_CHECK` component returns `<span className="text-emerald-400 font-bold">✓</span>` for `true` values. This uses a plain Unicode checkmark character rather than the `Check` icon from lucide-react (which is already imported in `UpgradeModal.tsx`). The character renders inconsistently across fonts and may display as a hollow or malformed symbol in some environments.

**Fix:** Import and use `<Check size={14} className="text-emerald-400 mx-auto" />` from lucide-react, matching the `UpgradeModal.tsx` implementation. This ensures consistent, styled rendering.

---

### P2-12: Rule card index number has a negative left margin creating off-grid element

**File:** `src/components/StrategyBuilder/RuleCard.tsx` lines 56-59

**Issue:** The rule priority index number renders as `absolute -left-1.5 top-1/2 -translate-y-1/2` — a small circle that bleeds outside the card bounds on the left. This creates a visual gap between cards that's hard to understand, and the element clips on mobile when the container has `overflow-hidden`. The `text-[7px]` text inside is below any accessible minimum size.

**Fix:** Remove the negative-margin absolute positioning. Place the rule number inline as part of the card layout — a left-aligned `text-[10px] font-mono text-white/30` counter that takes up `w-5` before the rule content. This keeps everything within the grid and readable.

---

### P2-13: Popover/overlay menu in StrategyBuilder lacks `transform-origin`

**File:** `src/components/StrategyBuilder/index.tsx` lines 131-148 (utility overflow menu)

**Issue:** The utility menu popover (Save/Import/Export/Library) appears at `absolute right-0 top-8` but has no entrance animation and no `transform-origin` set to the trigger point. Per Emil Kowalski's popover principle: "Popovers should scale in from their trigger, not from center." The menu appears instantly with no visual connection to the trigger button.

**Fix:** Add CSS transition with `transform-origin: top right` (since it opens from the top-right trigger):
```css
.util-menu {
  transform-origin: top right;
  animation: popoverIn 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes popoverIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

---

### P2-14: `text-gradient-blue/green/red` utility classes are gradient text (banned)

**File:** `src/index.css` lines 198-217

**Issue:** Three utility classes `text-gradient-blue`, `text-gradient-green`, `text-gradient-red` all use `background-clip: text` with a gradient fill — exactly the pattern banned by impeccable's absolute ban #2. These classes exist in the global stylesheet and may be applied to text elements.

**Fix:** Remove these utility classes. Replace usages with solid color classes: `.text-blue-400`, `.text-emerald-400`, `.text-red-400`. If subtle emphasis on metric values is needed, use `font-weight: 700` or increase the text size instead of gradient fills.

---

### P2-15: AuthModal shows OAuth separator "or" without the OAuth buttons

**File:** `src/components/AuthModal.tsx` lines 105-109

**Issue:** The modal renders an `or` divider with horizontal rules on both sides, as a spacer between what should be OAuth buttons (Google, Apple, Facebook) and the email/password form. But there are no OAuth buttons rendered in the current code — only the divider and the email form. This leaves a visual "or" separator that leads to nothing, creating confusion about what the "or" alternative is.

**Fix:** Either implement the OAuth buttons (the `handleOAuth` function is already written — it just needs the UI buttons), or remove the "or" divider entirely. The `or` separator is meaningless without both options present.

---

## Patterns and Systemic Issues

1. **Blue-violet gradient is used for emphasis everywhere.** It appears on the brand name, hero headline, pricing badges, progress bars, AI message bubbles, and button backgrounds. When the same decorative treatment is used everywhere, it loses all meaning and emphasis. Choose one or two places where it matters and remove it from everything else.

2. **All colors are hardcoded inline `rgba()` strings.** No token system exists. This makes every color relationship impossible to maintain and ensures visual drift over time. Approximately 60+ distinct `rgba()` strings are scattered across 10+ component files.

3. **Every interactive element uses `transition: all`.** This is a systemic pattern across all button and card classes in `index.css`. It should be globally replaced with specific property transitions.

4. **Font sizes below 12px are used throughout.** The dashboard uses `text-[9px]`, `text-[8px]`, and `text-[7px]` in at least 12 places across the codebase. This is a systemic typography problem, not isolated to individual components.

5. **Glassmorphism applied to scrolling content.** The `backdrop-filter: blur` on `.glass-panel` is used inside scrolling panel containers across Strategy Builder, Results, and MathAgent — all three main panels. This is a systemic GPU performance problem.

6. **Emoji used as UI elements throughout.** The `🎴` logo emoji appears at minimum 4 times. Emoji in the heatmap legend appears in Results. This needs systematic removal and replacement.

---

## Positive Findings

1. **Honest, clear product copy.** The landing page doesn't use AI copywriting clichés. "Banker −1.06% · Player −1.24% · Tie −14.36%" is shown prominently and repeated throughout. The value proposition is clear and specific. The "AI tells you the truth" and "Honest about the math" highlights are genuinely differentiating.

2. **JetBrains Mono for data.** Using JetBrains Mono for monospace values (metrics, timestamps, badge text) is excellent. Tabular numeric alignment in a financial tool is the right call.

3. **Semantic color system for outcomes.** Using blue for Banker, red for Player, and green for Tie consistently across all metric tiles, chart colors, and badges creates a coherent data language that's easy to internalize.

4. **Empty state design.** The `ResultsPanel` empty state includes a 3-step flow guide (`Build rules → Run backtest → Analyse`) with numbered steps. This is a solid empty state pattern that teaches the interface.

5. **Progress feedback during backtest.** The running state shows a progress bar with percentage and a cancel button. This covers the interaction state gap that many tools miss.

6. **Mobile bottom navigation.** The app correctly collapses the three-panel desktop layout to a bottom tab bar on mobile, rather than hiding content. The tab icons and labels are correct.

---

## Recommended Actions (Priority Order)

1. **[P0] `/colorize`** — Replace gradient text on "BetBacktest" brand name with solid white across all 4 instances.
2. **[P0] `/typeset`** — Swap Inter for Geist. Update `index.html`, `tailwind.config.js`, and `src/index.css`.
3. **[P0] `/harden`** — Add ARIA labels, `role="dialog"`, `aria-modal="true"`, focus trap to AuthModal and UpgradeModal. Fix all form input labels.
4. **[P0] `/adapt`** — Replace `h-screen` with `min-h-[100dvh]` on dashboard root.
5. **[P0] `/clarify`** — Remove `window.alert()` from Info button; replace with toast.
6. **[P1] `/extract`** — Build semantic CSS variable token system; replace all inline `rgba()` strings.
7. **[P1] `/quieter`** — Remove neon glows from `.btn-primary`, remove `pulseGlow` animation, remove glassmorphism from scrolling content panels.
8. **[P1] `/arrange`** — Fix landing page feature grid (3-col → zig-zag), fix pricing card feature list alignment, remove emoji logo.
9. **[P1] `/animate`** — Replace all `transition: all` with specific properties. Add `:active` scale to buttons. Add `prefers-reduced-motion` media query.
10. **[P2] `/polish`** — Fix toast position, skeleton loader for auth, og:image tags, skip-to-content link, gradient utility class removal, popover animation.

> You can ask me to run these one at a time, all at once, or in any order you prefer.
>
> Re-run `/audit` after fixes to see your score improve.
