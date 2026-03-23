# Proposal Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone, public-facing proposal page at `/proposal/hamilton-city-council` for pitching the Movin' Martin animated series to Hamilton City Council.

**Architecture:** Single static React page (`ProposalPage.jsx`) with no auth, no API calls, no sub-components. 8 scrollable sections with fade-in animations via IntersectionObserver. Dark premium visual design.

**Tech Stack:** React 18, Tailwind CSS (inline classes), inline SVG logo, `<video>` elements with placeholder URLs.

**Spec:** `docs/superpowers/specs/2026-03-24-proposal-page-design.md`

---

### Task 1: Route Registration

**Files:**
- Modify: `src/App.jsx` (add imports + 2 public routes)
- Create: `src/pages/ProposalsIndexPage.jsx`

- [ ] **Step 1: Create ProposalsIndexPage.jsx**

Create `src/pages/ProposalsIndexPage.jsx` — a public landing page at `/proposals` that:

- Uses the same dark theme as the proposal page (`bg-[#0f172a] text-white min-h-screen`)
- Shows the Stitch Studios logo (inline SVG — same needle & thread S mark from the proposal page) centered at top
- Heading: "Proposals"
- Lists available proposals as cards — for now, one card:
  - "Hamilton City Council" — "Movin' Martin — Animated Road Safety & Active Travel Series" — "March 2026"
  - Links to `/proposal/hamilton-city-council`
  - Card style: `bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-[#2C666E]/50 transition-colors`
- Footer: "© 2026 Stitch Studios LLC"
- **No navigation to the rest of the app** — no links to /studio, /campaigns, /login, etc. Completely isolated.
- Keep it simple — this is a directory page, not a marketing site

- [ ] **Step 2: Add imports and routes to App.jsx**

In `src/App.jsx`, after the `ShortsDraftPage` import (near the top of the file), add:

```jsx
import ProposalPage from './pages/ProposalPage';
import ProposalsIndexPage from './pages/ProposalsIndexPage';
```

After the `/setup` redirect route and before the first `ProtectedRoute` (`/studio`), add:

```jsx
{/* Public proposal pages — no auth, isolated from app */}
<Route path="/proposals" element={<ProposalsIndexPage />} />
<Route path="/proposal/hamilton-city-council" element={<ProposalPage />} />
```

No `ProtectedRoute` or `GuestRoute` wrapper — fully public. No way to reach the authenticated app from these pages.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx src/pages/ProposalsIndexPage.jsx
git commit -m "feat: add public proposal routes and proposals index page"
```

---

### Task 2: Page Scaffold with Hero Section

**Files:**
- Create: `src/pages/ProposalPage.jsx`

- [ ] **Step 1: Create ProposalPage.jsx with scroll animation hook and Hero section**

Create `src/pages/ProposalPage.jsx` with:

1. A page-level wrapper `div` with `className="bg-[#0f172a] text-white font-[Inter]"` — this ensures the dark background covers the entire page, not just individual sections.

2. A `useScrollAnimation` custom hook using `IntersectionObserver` that adds a `visible` class to elements with `data-animate` when they enter the viewport (threshold 0.1).

3. CSS keyframes injected via a `<style>` tag in the component:

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}
[data-animate] { opacity: 0; }
[data-animate].visible { animation: fadeInUp 0.6s ease-out forwards; }
```

4. **Section container pattern** — every section (Tasks 3–8) uses this wrapper:
```jsx
<section className="py-24 px-6 max-w-6xl mx-auto" data-animate>
```
This ensures consistent spacing, centered max-width, and fade-in animation across all sections.

5. The Hero section (Section 1):
   - Full viewport height (`min-h-screen`), centered content
   - Dark gradient overlay (`bg-gradient-to-b from-[#0f172a] to-[#1e293b]`)
   - Inline SVG logo: dashed stitch S-curve with needle at top (teal `#2C666E` path, cyan `#90DDF0` needle)
   - "STITCH STUDIOS" wordmark in white, spaced uppercase
   - "ANIMATION & MEDIA" subtitle in slate
   - "Prepared exclusively for" + bold "Hamilton City Council"
   - Project title: "Movin' Martin — Animated Road Safety & Active Travel Series"
   - "March 2026"
   - Animated scroll-down chevron at bottom (CSS bounce animation)

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, navigate to `http://localhost:4390/proposal/hamilton-city-council`. Confirm:
- Full-screen dark hero with logo, titles, scroll indicator
- No app navigation/header visible
- Page is accessible without login

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProposalPage.jsx
git commit -m "feat: proposal page scaffold with hero section and scroll animations"
```

---

### Task 3: Project Vision Section

**Files:**
- Modify: `src/pages/ProposalPage.jsx`

- [ ] **Step 1: Add Section 2 — Project Vision**

Below the Hero section, add a new section with `data-animate`:

- Two-column grid (`md:grid-cols-2`, stacks on mobile)
- **Left column:** Section heading "Project Vision" in white. Paragraph text (slate `#94a3b8`) describing the Movin' Martin concept — animated road safety + active travel series for primary school children, interactive learning moments inspired by Dora the Explorer, companion workbooks.
- **Right column:** 5 stat cards in a vertical stack. Each card: `bg-white/5 border border-[#2C666E]/30 rounded-xl p-4`. Contents:
  - "7 Episodes" with subtitle "Character intro + 5 themed + compilation"
  - "3:30 Feature Film" with subtitle "Full compilation edit"
  - "Primary School" with subtitle "Ages 5–12 target audience"
  - "Workbook Integration" with subtitle "Reinforced classroom learning"
  - "Active Travel Focus" with subtitle "Walking, biking, scooting to school"

- [ ] **Step 2: Verify in browser**

Scroll past hero. Confirm two-column layout on desktop, stacked on narrow viewport. Text is readable, cards have teal borders.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProposalPage.jsx
git commit -m "feat: add Project Vision section to proposal page"
```

---

### Task 4: Episode Guide Section

**Files:**
- Modify: `src/pages/ProposalPage.jsx`

- [ ] **Step 1: Define episode data array**

At the top of the component (or just above the return), define an `EPISODES` array:

```jsx
const EPISODES = [
  {
    number: 1,
    title: 'Character Introduction',
    duration: '30–45 sec',
    description: 'Meet Movin\' Martin — establishes the character, sets the tone for the series.',
    phrases: ['Get movin\' with Movin\' Martin!'],
    badge: 'First Episode',
  },
  {
    number: 2,
    title: 'Keeping Safe on Our Wheels',
    duration: '~30 sec',
    description: 'Safety gear essentials for bikes, scooters, and skateboards.',
    phrases: ['Be bright, be seen'],
  },
  {
    number: 3,
    title: 'Check Before You Step',
    duration: '~30 sec',
    description: 'Pedestrian crossing safety — look, listen, and think before stepping out.',
    phrases: ['Check before you step!', 'Stop, look and listen'],
  },
  {
    number: 4,
    title: 'Sneaky Driveways',
    duration: '~30 sec',
    description: 'Awareness around driveways and reversing vehicles.',
    phrases: ['Stay alert, be aware'],
  },
  {
    number: 5,
    title: 'Foot Path Safety',
    duration: '~30 sec',
    description: 'Sharing paths safely with pedestrians, cyclists, and scooter riders.',
    phrases: ['Cross like a boss!'],
  },
  {
    number: 6,
    title: 'Walk or Wheels Superstar',
    duration: '~30 sec',
    description: 'Promoting active travel to school — walking, biking, scooting.',
    phrases: ['Walk or Wheels Superstar!'],
  },
  {
    number: 7,
    title: 'Full Feature Compilation Film',
    duration: '~3:30 min',
    description: 'All episodes combined into one complete film for assembly or classroom viewing.',
    phrases: [],
    isCompilation: true,
  },
];
```

- [ ] **Step 2: Render the Episode Guide section**

New section with `data-animate`:
- Heading: "Episode Guide"
- Subtitle: "Seven deliverables — six standalone episodes plus a full compilation film"
- 2-column grid (`md:grid-cols-2`) mapping over `EPISODES`
- Each card: `bg-white/5 border border-white/10 rounded-2xl p-6`
  - Episode number + title as heading
  - Duration as teal pill (`bg-[#2C666E]/20 text-[#90DDF0] text-sm px-3 py-1 rounded-full`)
  - Description text in slate
  - Phrases as small pills (`bg-white/10 text-white/70 text-xs`)
  - Optional badge (card 1): teal badge top-right
  - `<video>` element: `rounded-xl w-full mt-4`, `controls`, `poster="#"`, `src` set to `#placeholder` (Stu will replace both `src` and `poster` URLs)
- Card 7 (`isCompilation`): `md:col-span-2` full width, `border-[#2C666E]/50` distinct border

- [ ] **Step 3: Verify in browser**

Scroll to Episode Guide. Confirm 2-col grid, compilation card spans full width, phrase pills render, video placeholders present.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProposalPage.jsx
git commit -m "feat: add Episode Guide section with 7 episode cards"
```

---

### Task 5: Sample Work Section

**Files:**
- Modify: `src/pages/ProposalPage.jsx`

- [ ] **Step 1: Add Section 4 — Sample Work**

New section with `data-animate`:
- Heading: "Sample Work"
- Subtitle: "Examples of animation output from our Storyboard pipeline"
- 3-column grid on desktop (`md:grid-cols-3`), 1-col on mobile
- 3 sample cards, each:
  - `bg-white/5 border border-white/10 rounded-2xl overflow-hidden`
  - `<video>` element: `w-full aspect-video`, `controls`, `poster="#"`, `src="#placeholder"`
  - Caption below: "Sample animation — final style will be tailored to Movin' Martin" in small slate text

- [ ] **Step 2: Verify and commit**

```bash
git add src/pages/ProposalPage.jsx
git commit -m "feat: add Sample Work section with video placeholders"
```

---

### Task 6: The Approach Section

**Files:**
- Modify: `src/pages/ProposalPage.jsx`

- [ ] **Step 1: Add Section 5 — The Approach**

New section with `data-animate`:
- Heading: "The Approach"
- 3-column grid on desktop, 1-col on mobile
- 3 step cards with numbered circles and content:

  1. **Story & Script** (circle: "1")
     - "AI-assisted scriptwriting with interactive learning beats. Each episode structured around a key road safety message with pause-and-ask moments."

  2. **Animation** (circle: "2")
     - "AI-powered visual generation with consistent character design. Movin' Martin maintains a cohesive look and personality throughout."

  3. **Polish** (circle: "3")
     - "Professional voiceover, background music, sound effects, captions, and final edit. Ready for classroom and online distribution."

- Desktop only: connecting lines between the 3 cards using a horizontal dashed border on a `hidden md:block` element positioned between the circles
- Each card: `bg-white/5 border border-white/10 rounded-2xl p-6 text-center`
- Number circles: `w-12 h-12 rounded-full bg-[#2C666E] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4`

- [ ] **Step 2: Verify and commit**

```bash
git add src/pages/ProposalPage.jsx
git commit -m "feat: add The Approach section with 3-step process"
```

---

### Task 7: Pricing Tiers Section

**Files:**
- Modify: `src/pages/ProposalPage.jsx`

- [ ] **Step 1: Define pricing data**

```jsx
const TIERS = [
  {
    name: 'Base',
    price: '$25,000',
    recommended: false,
    features: [
      { text: '7 animated episodes', included: true },
      { text: 'Interactive learning beats', included: true },
      { text: 'Movin\' Martin website with admin backend', included: true },
      { text: 'Digital delivery (MP4, web-optimised)', included: true },
      { text: 'Professional voiceover', included: false },
      { text: 'Voice lipsync animation', included: false },
      { text: 'Original music & sound effects', included: false },
      { text: 'Workbook integration guide', included: false },
    ],
  },
  {
    name: 'Premium',
    price: '$30,000',
    recommended: true,
    features: [
      { text: '7 animated episodes', included: true },
      { text: 'Interactive learning beats', included: true },
      { text: 'Movin\' Martin website with admin backend', included: true },
      { text: 'Digital delivery (MP4, web-optimised)', included: true },
      { text: 'Professional voiceover', included: true },
      { text: 'Voice lipsync animation', included: true },
      { text: 'Original music & sound effects', included: false },
      { text: 'Workbook integration guide', included: false },
    ],
  },
  {
    name: 'Deluxe',
    price: '$35,000',
    recommended: false,
    features: [
      { text: '7 animated episodes', included: true },
      { text: 'Interactive learning beats', included: true },
      { text: 'Movin\' Martin website with admin backend', included: true },
      { text: 'Digital delivery (MP4, web-optimised)', included: true },
      { text: 'Professional voiceover', included: true },
      { text: 'Voice lipsync animation', included: true },
      { text: 'Original music & sound effects', included: true },
      { text: 'Workbook integration guide', included: true },
    ],
  },
];
```

- [ ] **Step 2: Render the Pricing section**

New section with `data-animate`:
- Heading: "Investment"
- Subtitle: "All prices exclusive of GST"
- 3-column grid on desktop (`md:grid-cols-3`), 1-col on mobile
- Each tier card:
  - `bg-white/5 border rounded-2xl p-8`
  - Recommended tier: `border-[#2C666E] ring-1 ring-[#2C666E]` + "Recommended" badge (`bg-[#2C666E] text-white text-xs px-3 py-1 rounded-full`)
  - Non-recommended: `border-white/10`
  - Tier name as `text-xl font-semibold text-white`
  - Price as `text-4xl font-bold text-white mt-2`
  - "+ GST" in small slate text
  - Divider line (`border-t border-white/10 my-6`)
  - Feature list: each line with a check (teal `✓`) or dash (slate `—`) icon, text in white or slate depending on `included`

- [ ] **Step 3: Verify and commit**

```bash
git add src/pages/ProposalPage.jsx
git commit -m "feat: add Pricing Tiers section with Base/Premium/Deluxe"
```

---

### Task 8: About & Footer Sections

**Files:**
- Modify: `src/pages/ProposalPage.jsx`

- [ ] **Step 1: Add Section 7 — About Stitch Studios**

New section with `data-animate`:
- Centered layout, max-width container
- Stitch Studios logo (reuse the same SVG from hero, smaller scale)
- Tagline: "Stitching stories together through animation"
- Brief paragraph about the company
- CTA: "Let's bring Movin' Martin to life" as a prominent heading
- Contact details: name, email, phone (use placeholder values Stu will replace)
- Optional: teal CTA button linking to `mailto:` address

- [ ] **Step 2: Add Section 8 — Footer**

Below the About section:
- Dark border top (`border-t border-white/10`)
- Centered text in small slate:
  - "This proposal is confidential and prepared exclusively for Hamilton City Council"
  - "© 2026 Stitch Studios LLC"
  - "Prepared March 2026"

- [ ] **Step 3: Verify full page scroll**

Navigate to the proposal page. Scroll through all 8 sections top to bottom. Confirm:
- Fade-in animations trigger on scroll
- All sections render correctly
- Responsive: resize browser to mobile width, confirm single-column stacking
- No app chrome (header/nav/sidebar) visible

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProposalPage.jsx
git commit -m "feat: add About and Footer sections, complete proposal page"
```

---

### Task 9: Final Polish & Review

**Files:**
- Modify: `src/pages/ProposalPage.jsx` (if needed)

- [ ] **Step 1: Full visual review**

Walk through the entire page at desktop width. Check:
- Consistent spacing between sections (use `py-24` or similar for each section)
- Colour consistency — no stray grays or off-brand colours
- Typography hierarchy — headings white and bold, body text slate, pills and badges teal
- Video placeholders don't break layout (use `aspect-video` on containers)
- Logo SVG renders crisply at both hero size and about section size

- [ ] **Step 2: Responsive check**

Resize to mobile (375px). Confirm:
- All grids stack to single column
- Text is readable without horizontal scroll
- Video elements scale properly
- Pricing cards stack vertically
- Connecting lines in Approach section are hidden

- [ ] **Step 3: Fix any issues found, commit**

```bash
git add src/pages/ProposalPage.jsx
git commit -m "fix: polish proposal page layout and responsive behavior"
```
