# QuantEdge Premium Redesign - Requirements

## 1. Overview

Transform QuantEdge from a university-project aesthetic into a premium, Bloomberg Terminal-inspired financial platform with modern SaaS polish. The redesign focuses on data density, professional aesthetics, and enhanced data visualization while maintaining dark theme consistency.

## 2. User Stories

### 2.1 As a financial analyst
I want the platform to look and feel like professional-grade financial software (Bloomberg Terminal quality) so that I can confidently use it for client presentations and serious financial analysis.

### 2.2 As a power user
I want data-dense visualizations with clear hierarchies and premium typography so that I can quickly scan and interpret complex financial metrics without visual clutter.

### 2.3 As a daily user
I want consistent, polished UI components across all pages so that the platform feels cohesive and professionally designed.

### 2.4 As an investment banker
I want enhanced data visualizations (heatmaps, charts, waterfalls) that clearly communicate financial insights so that I can make better-informed decisions faster.

### 2.5 As a user working with financial data
I want all numbers displayed in a monospace font with proper formatting so that numerical data is easy to read and compare at a glance.

## 3. Acceptance Criteria

### 3.1 Design System Implementation
- [ ] New color palette implemented in CSS variables with layered depth backgrounds
- [ ] Three premium fonts installed and configured: DM Mono (numbers), Geist (UI), Cabinet Grotesk (headings)
- [ ] All financial numbers render in DM Mono font via reusable DataValue component
- [ ] Color system includes specific accent colors for positive/negative/neutral states

### 3.2 Card Component Redesign
- [ ] All cards use new background (--bg-surface) with subtle borders
- [ ] Cards have 1px x 24px vertical accent bar in top-left corner
- [ ] Hover states transition border color smoothly
- [ ] No box shadows used - borders only for depth
- [ ] Consistent 20px padding across all cards

### 3.3 Metric Display Cards (KPIs)
- [ ] Large metric cards show value in 36px DM Mono font
- [ ] Labels in small caps, 10px, muted color
- [ ] Values colored by positive/negative state
- [ ] Optional sparkline visualization included
- [ ] Secondary information (per share, etc.) in 13px below main value

### 3.4 EPS Bridge Waterfall Chart
- [ ] Standalone EPS bar in cyan with 0.8 opacity
- [ ] A/D Impact bar uses diagonal stripe pattern (SVG)
- [ ] Pro-Forma EPS bar in primary accent color
- [ ] Floating value labels in DM Mono above/below bars
- [ ] Animated connector line between bar tops
- [ ] "DILUTIVE" or "ACCRETIVE" badge in top-right
- [ ] Chart title with colored dot indicator
- [ ] Y-axis with left-aligned dollar signs in DM Mono
- [ ] Dashed gridlines in subtle border color

### 3.5 Sensitivity Heatmaps
- [ ] Gradient interpolation from negative (rose) → neutral (overlay) → positive (emerald)
- [ ] Minimum cell size: 64px wide × 36px tall
- [ ] Cell text in DM Mono 12px, white, centered
- [ ] Row/column headers with elevated background, uppercase
- [ ] Current value cell highlighted with white 2px border
- [ ] Hover state with brightness and scale transition
- [ ] Color legend bar at bottom showing gradient scale
- [ ] Active intersection cell (current values) highlighted

### 3.6 DCF Cash Flow Bar Chart
- [ ] Revenue bars in cyan at 60% opacity (tallest)
- [ ] EBITDA bars in violet at 80% opacity (medium)
- [ ] FCF bars in emerald solid (shortest)
- [ ] Year-over-year growth % labels above Revenue bars
- [ ] Thin trend line overlay for FCF trajectory
- [ ] Year labels in Cabinet Grotesk 12px
- [ ] Horizontal gridlines only, dashed, subtle

### 3.7 Contribution Analysis Chart
- [ ] Side-by-side columns: Acquirer (left) vs Target (right)
- [ ] Each column has two stacked bars: Equity Ownership % and NI Contribution %
- [ ] Equity bars in primary accent, NI bars in violet
- [ ] Large DM Mono percentage values inside bar segments
- [ ] Center divider line with "Acquirer vs Target" label
- [ ] Warning badge if equity ownership > NI contribution for acquirer

### 3.8 Interactive Breakeven Finder
- [ ] Custom slider thumb: 12px circle, primary accent, white ring
- [ ] Track colored: left = primary accent, right = overlay
- [ ] Display "Current Synergies" and "Required for Breakeven" above slider
- [ ] Gap/surplus indicator in rose (need more) or emerald (have buffer)
- [ ] Real-time A/D percentage in large DM Mono updates with slider
- [ ] Tick marks at 25%, 50%, 75% of range

### 3.9 Sidebar Redesign
- [ ] Two modes: 220px (expanded) and 56px (icon-only)
- [ ] Background darker than main content (--bg-base)
- [ ] "QE" monogram logo in primary accent
- [ ] Section labels: 9px uppercase with letter-spacing
- [ ] Active item: 2px left border in primary accent
- [ ] Hover state with smooth background transition
- [ ] Bottom section: user avatar + name + email + settings icon
- [ ] Keyboard shortcut hints displayed next to items

### 3.10 Finance Table Component
- [ ] Reusable <FinanceTable> component created
- [ ] Alternating row backgrounds (surface and elevated)
- [ ] Sticky column headers with bottom border
- [ ] Number columns right-aligned in DM Mono
- [ ] Positive numbers in green, negative in red
- [ ] Sortable columns with arrow icon on hover
- [ ] Row hover state with subtle background
- [ ] Empty state with centered icon and message

### 3.11 Loading States
- [ ] Skeleton screens match exact layout of loaded content
- [ ] Skeleton color with shimmer animation (left-to-right gradient)
- [ ] No blank white flashes during loading
- [ ] Applied consistently across all data-fetching scenarios

### 3.12 Global Consistency
- [ ] All changes applied to both Merger Analysis and DCF pages
- [ ] Consistent spacing, typography, and color usage throughout
- [ ] History page updated with new table component
- [ ] All interactive elements have proper hover/active states

## 4. Technical Requirements

### 4.1 Font Installation
- Install DM Mono font family (Google Fonts or local)
- Install Geist font family
- Install Cabinet Grotesk font family
- Configure font-face declarations in CSS
- Create utility classes for each font family

### 4.2 CSS Variables
- Update globals.css with new color palette
- Ensure all colors use CSS custom properties
- Support for dark theme (primary focus)
- Proper color contrast ratios for accessibility

### 4.3 Component Architecture
- Create reusable DataValue component for numbers
- Create reusable FinanceTable component
- Create reusable MetricCard component
- Create custom Slider component with premium styling
- Create skeleton loading components

### 4.4 Chart Customization
- Extend Recharts components with custom styling
- Create SVG pattern definitions for diagonal stripes
- Implement custom tooltips matching design system
- Add animation configurations for smooth transitions

### 4.5 Performance
- Ensure font loading doesn't block rendering
- Optimize SVG patterns and gradients
- Maintain smooth 60fps animations
- Lazy load chart components where appropriate

## 5. Out of Scope

- Light theme implementation (dark theme only)
- Mobile responsive redesign (desktop focus)
- Backend API changes
- New feature additions beyond visual redesign
- Authentication UI redesign
- Settings pages redesign

## 6. Dependencies

- Google Fonts API or local font files
- Recharts library (already installed)
- Tailwind CSS (already installed)
- React 19 (already installed)

## 7. Success Metrics

- Visual consistency score: 100% of components follow design system
- Typography compliance: 100% of numbers use DM Mono
- Color palette compliance: 100% of colors use CSS variables
- Component reusability: All repeated patterns extracted to components
- Loading state coverage: 100% of async operations show skeleton screens
