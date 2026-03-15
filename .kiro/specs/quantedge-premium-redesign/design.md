# QuantEdge Premium Redesign - Design Document

## 1. Architecture Overview

This redesign focuses on the presentation layer, transforming the visual design system and component library while maintaining the existing backend architecture and data flow.

### 1.1 Design System Architecture

```
Design System
├── Foundation Layer
│   ├── Color Palette (CSS Variables)
│   ├── Typography System (3 font families)
│   ├── Spacing Scale
│   └── Border & Shadow System
├── Component Layer
│   ├── Primitive Components (DataValue, MetricCard, FinanceTable)
│   ├── Chart Components (Enhanced Recharts)
│   └── Layout Components (Sidebar, Card)
└── Page Layer
    ├── Merger Analysis Page
    ├── DCF Valuation Page
    └── History Page
```

## 2. Design System Specification

### 2.1 Color Palette

**Background Layers (Depth Hierarchy)**
- `--bg-base: #060608` - Deepest layer (sidebar, page background)
- `--bg-surface: #0d0d12` - Surface layer (cards, panels)
- `--bg-elevated: #13131a` - Elevated elements (dropdowns, tooltips)
- `--bg-overlay: #1a1a24` - Overlays and modals

**Borders**
- `--border-subtle: rgba(255,255,255,0.06)` - Minimal separation
- `--border-default: rgba(255,255,255,0.10)` - Standard borders
- `--border-strong: rgba(255,255,255,0.18)` - Emphasized borders

**Accent Colors**
- `--accent-primary: #f97316` - Primary CTA, positive actions
- `--accent-cyan: #06b6d4` - Secondary data, revenue
- `--accent-violet: #7c3aed` - Tertiary, EBITDA
- `--accent-emerald: #10b981` - Accretive/positive values
- `--accent-rose: #f43f5e` - Dilutive/negative values
- `--accent-amber: #f59e0b` - Warnings/neutral

**Text**
- `--text-primary: #f0f0f8` - Primary text
- `--text-secondary: #8888a0` - Secondary text
- `--text-muted: #44445a` - Muted text, placeholders

**Data-Specific**
- `--positive: #10b981` - Positive financial values
- `--negative: #f43f5e` - Negative financial values
- `--neutral: #f59e0b` - Neutral/warning values

### 2.2 Typography System

**Font Families**
1. **DM Mono** - All numerical data, tickers, financial values
   - Weights: 400 (Regular), 500 (Medium)
   - Use cases: Numbers, percentages, currency, dates

2. **Geist** - UI text, labels, body copy
   - Weights: 400 (Regular), 500 (Medium), 600 (Semibold)
   - Use cases: Labels, descriptions, table headers, buttons

3. **Cabinet Grotesk** - Headings, page titles
   - Weights: 500 (Medium), 700 (Bold), 800 (Extrabold)
   - Use cases: Page titles, section headings, card titles

**Type Scale**
- Display: 36px (Cabinet Grotesk Bold) - Main metric values
- H1: 24px (Cabinet Grotesk Bold) - Page titles
- H2: 18px (Cabinet Grotesk Medium) - Section titles
- H3: 14px (Cabinet Grotesk Medium) - Card titles
- Body: 13px (Geist Regular) - Standard text
- Small: 11px (Geist Regular) - Secondary text
- Tiny: 10px (Geist Medium) - Labels, uppercase
- Data Large: 36px (DM Mono Medium) - Primary metrics
- Data Medium: 16px (DM Mono Regular) - Secondary metrics
- Data Small: 12px (DM Mono Regular) - Table data

### 2.3 Spacing System

- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 20px
- 2xl: 24px
- 3xl: 32px
- 4xl: 48px

### 2.4 Border & Depth System

**No box shadows** - Use borders and layered backgrounds for depth
- Card borders: 1px solid var(--border-subtle)
- Hover borders: 1px solid var(--border-default)
- Active borders: 2px solid var(--accent-primary)
- Accent bars: 1px × 24px vertical bar in top-left corner

## 3. Component Specifications

### 3.1 DataValue Component

**Purpose**: Display all financial numbers with consistent formatting

**Props**:
- `value: number` - The numerical value
- `format: 'currency' | 'percentage' | 'number'` - Format type
- `size: 'sm' | 'md' | 'lg'` - Size variant
- `colorize: boolean` - Apply positive/negative coloring
- `decimals: number` - Decimal places

**Styling**:
- Font: DM Mono
- Color: Determined by value sign if colorize=true
- Sizes: sm=12px, md=16px, lg=36px

**Example**:
```tsx
<DataValue value={-0.744} format="percentage" size="lg" colorize />
// Renders: -74.4% in red, 36px DM Mono
```

### 3.2 MetricCard Component

**Purpose**: Display KPI metrics with consistent layout

**Structure**:
```
┌─ Accent Bar (1px × 24px)
│ ┌─────────────────────────────────┐
│ │ LABEL TEXT          [badge]     │
│ │                                 │
│ │ 36px Value                      │
│ │ 13px Secondary Info             │
│ │                                 │
│ │ ████████░░░░ Optional Sparkline │
│ └─────────────────────────────────┘
```

**Props**:
- `label: string` - Metric label (uppercase)
- `value: number` - Primary value
- `format: 'currency' | 'percentage' | 'number'`
- `secondaryInfo?: string` - Additional context
- `badge?: { text: string, color: string }`
- `sparklineData?: number[]`
- `accentColor: string` - Color for accent bar

**Styling**:
- Background: var(--bg-surface)
- Border: 1px solid var(--border-subtle)
- Padding: 20px
- Hover: border-color → var(--border-default)

### 3.3 FinanceTable Component

**Purpose**: Reusable table for financial data with proper formatting

**Features**:
- Alternating row backgrounds
- Sticky headers
- Sortable columns
- Right-aligned number columns
- Automatic colorization of positive/negative values
- Empty state handling

**Props**:
- `columns: ColumnDef[]` - Column definitions
- `data: any[]` - Table data
- `onSort?: (column: string, direction: 'asc' | 'desc') => void`
- `emptyMessage?: string`

**Column Definition**:
```typescript
interface ColumnDef {
  key: string
  label: string
  type: 'text' | 'number' | 'currency' | 'percentage'
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
}
```

**Styling**:
- Headers: var(--bg-base), uppercase Geist 10px, sticky
- Rows: Alternating var(--bg-surface) and var(--bg-elevated)
- Hover: var(--border-subtle) background
- Numbers: DM Mono, right-aligned, colorized

### 3.4 Enhanced Card Component

**Purpose**: Base card component with premium styling

**Features**:
- Vertical accent bar in top-left
- Subtle border with hover effect
- No box shadows
- Consistent padding

**Props**:
- `accentColor?: string` - Color for accent bar (default: primary)
- `children: ReactNode`
- `className?: string`

**Styling**:
```css
.premium-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 20px;
  position: relative;
  transition: border-color 0.2s ease;
}

.premium-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 24px;
  background: var(--accent-primary);
}

.premium-card:hover {
  border-color: var(--border-default);
}
```

### 3.5 Custom Slider Component

**Purpose**: Premium slider for breakeven finder

**Features**:
- Custom thumb: 12px circle with white ring
- Dual-color track (filled/unfilled)
- Tick marks at intervals
- Real-time value display

**Props**:
- `value: number`
- `min: number`
- `max: number`
- `step: number`
- `onChange: (value: number) => void`
- `tickMarks?: number[]` - Positions for tick marks

**Styling**:
- Thumb: 12px circle, var(--accent-primary), 2px white ring
- Track (filled): var(--accent-primary)
- Track (unfilled): var(--bg-overlay)
- Tick marks: 2px × 8px vertical lines

## 4. Chart Redesign Specifications

### 4.1 EPS Bridge Waterfall Chart

**Component**: Recharts ComposedChart

**Data Structure**:
```typescript
interface WaterfallData {
  name: string // 'Standalone EPS', 'A/D Impact', 'Pro-Forma EPS'
  value: number
  isBase: boolean // true for standalone and pro-forma
  isPositive?: boolean // for A/D impact
}
```

**Visual Elements**:
1. **Bars**:
   - Standalone EPS: var(--accent-cyan) at 0.8 opacity
   - A/D Impact: Diagonal stripe pattern (SVG), colored by sign
   - Pro-Forma EPS: var(--accent-primary)
   - Border radius: 4px on all corners

2. **SVG Pattern** (for A/D Impact):
```svg
<defs>
  <pattern id="diagonalStripes" patternUnits="userSpaceOnUse" width="8" height="8">
    <path d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4" 
          stroke="currentColor" 
          strokeWidth="1.5"/>
  </pattern>
</defs>
```

3. **Value Labels**:
   - Position: Above bar if positive, below if negative
   - Font: DM Mono 14px
   - Color: var(--text-primary)
   - Format: Currency with 2 decimals

4. **Connector Line**:
   - Animated line connecting bar tops
   - Color: var(--border-default)
   - Stroke width: 2px
   - Dash array: 4,4
   - Animation: 1s ease-in-out

5. **Badge**:
   - Position: Top-right of chart
   - Text: "DILUTIVE" or "ACCRETIVE"
   - Background: var(--negative) or var(--positive) at 0.2 opacity
   - Border: 1px solid var(--negative) or var(--positive)
   - Padding: 4px 12px
   - Font: Geist 11px uppercase

6. **Axes**:
   - X-axis: No tick lines, Geist 11px var(--text-secondary)
   - Y-axis: Left-aligned $, DM Mono 12px, gridlines dashed
   - Grid: Horizontal only, 1px dashed var(--border-subtle)

7. **Title**:
   - Font: Cabinet Grotesk 14px
   - Color: var(--text-primary)
   - Prefix: Colored dot (6px circle) matching accent

### 4.2 Sensitivity Heatmap

**Component**: Custom HTML table with gradient styling

**Data Structure**:
```typescript
interface HeatmapData {
  rows: HeatmapRow[]
  columns: string[] // Column keys
  rowKey: string // Key for row labels
  currentRow?: number // Index of current value row
  currentCol?: number // Index of current value column
}

interface HeatmapRow {
  [key: string]: number | string
}
```

**Color Interpolation**:
```typescript
function getHeatmapColor(value: number, min: number, max: number): string {
  const negative = '#f43f5e' // var(--negative)
  const neutral = '#1a1a24'   // var(--bg-overlay)
  const positive = '#10b981'  // var(--positive)
  
  if (value < 0) {
    // Interpolate between negative and neutral
    const ratio = Math.abs(value) / Math.abs(min)
    return interpolateColor(negative, neutral, ratio)
  } else {
    // Interpolate between neutral and positive
    const ratio = value / max
    return interpolateColor(neutral, positive, ratio)
  }
}
```

**Cell Styling**:
- Min size: 64px × 36px
- Text: DM Mono 12px, white, centered
- Padding: 8px
- Transition: all 0.2s ease

**Header Styling**:
- Background: var(--bg-elevated)
- Text: Geist 11px uppercase, var(--text-secondary)
- Letter-spacing: 0.05em
- Padding: 8px

**Current Value Highlight**:
- Border: 2px solid white
- Box-shadow: 0 0 0 4px rgba(255,255,255,0.1)

**Hover State**:
- Filter: brightness(1.2)
- Transform: scale(1.02)
- Z-index: 10

**Legend**:
- Position: Below table, centered
- Gradient bar: 200px × 12px
- Labels: "More Dilutive" (left), "More Accretive" (right)
- Font: Geist 10px var(--text-muted)

### 4.3 DCF Cash Flow Bar Chart

**Component**: Recharts BarChart

**Data Structure**:
```typescript
interface CashFlowData {
  name: string // 'Year 1', 'Year 2', etc.
  Revenue: number
  EBITDA: number
  FCF: number
  revenueGrowth?: number // YoY growth %
}
```

**Bar Configuration**:
1. **Revenue**:
   - Color: var(--accent-cyan) at 60% opacity
   - Tallest bar
   - Growth label above: `+X.X%` in Geist 10px

2. **EBITDA**:
   - Color: var(--accent-violet) at 80% opacity
   - Medium height

3. **FCF**:
   - Color: var(--accent-emerald) solid
   - Shortest bar
   - Trend line overlay

**Trend Line**:
- Component: Recharts Line
- Data: FCF values only
- Color: var(--accent-emerald)
- Stroke width: 2px
- Dot: 4px circle at each point

**Year Labels**:
- Font: Cabinet Grotesk 12px
- Color: var(--text-secondary)
- Position: Below X-axis

**Grid**:
- Horizontal only
- Style: 1px dashed var(--border-subtle)
- Opacity: 0.5

**Legend**:
- Position: Bottom center, horizontal
- Items: Colored dot (8px) + label
- Font: Geist 11px
- Spacing: 24px between items

### 4.4 Contribution Analysis Chart

**Component**: Custom Recharts BarChart with grouped bars

**Data Structure**:
```typescript
interface ContributionData {
  entity: 'Acquirer' | 'Target'
  equityOwnership: number // 0-1
  niContribution: number // 0-1
}
```

**Layout**:
```
Acquirer                    Target
┌────────┐                 ┌────────┐
│ Equity │                 │ Equity │
│  XX%   │                 │  XX%   │
├────────┤                 ├────────┤
│   NI   │                 │   NI   │
│  XX%   │                 │  XX%   │
└────────┘                 └────────┘
```

**Bar Styling**:
- Equity bars: var(--accent-primary)
- NI bars: var(--accent-violet)
- Width: 80px each
- Gap between groups: 40px
- Border radius: 4px top corners

**Value Labels**:
- Font: DM Mono 16px bold
- Color: white
- Position: Centered in bar
- Format: XX.X%

**Center Divider**:
- Vertical line: 2px solid var(--border-default)
- Label: "Acquirer vs Target"
- Font: Geist 10px uppercase var(--text-muted)
- Position: Center, above chart

**Warning Badge** (conditional):
- Condition: Acquirer equity ownership > NI contribution
- Text: "⚠ Equity Dilution Warning"
- Background: var(--accent-amber) at 0.2 opacity
- Border: 1px solid var(--accent-amber)
- Position: Top-right of chart
- Font: Geist 11px

### 4.5 Interactive Breakeven Finder

**Component**: Custom Slider with real-time feedback

**Layout**:
```
Current Synergies: $X.XM | Required for Breakeven: $X.XM
You need $X.XM MORE / You have $X.XM BUFFER

[━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━]
0%      25%     50%     75%    100%

Real-time A/D: -X.X%
```

**Slider Styling**:
- Track height: 6px
- Filled track: var(--accent-primary)
- Unfilled track: var(--bg-overlay)
- Thumb: 12px circle, var(--accent-primary), 2px white ring
- Tick marks: 2px × 8px at 25%, 50%, 75%

**Info Display**:
- Font: Geist 13px
- Labels: var(--text-secondary)
- Values: DM Mono 14px var(--text-primary)

**Gap/Surplus Indicator**:
- Font: Geist 14px bold
- Color: var(--negative) if gap, var(--positive) if surplus
- Icon: ⚠ for gap, ✓ for surplus

**Real-time A/D**:
- Font: DM Mono 24px
- Color: Colorized by value
- Updates: Debounced 100ms

## 5. Sidebar Redesign

### 5.1 Layout

**Dimensions**:
- Expanded: 220px width
- Collapsed: 56px width (icon-only)
- Transition: 0.3s ease

**Structure**:
```
┌─────────────────────┐
│ QE  QuantEdge       │ ← Logo area
├─────────────────────┤
│ FINANCIAL MODELS    │ ← Section label
│ ○ Merger Analysis   │
│ ● DCF Valuation     │ ← Active
│ ○ History           │
├─────────────────────┤
│ SETTINGS            │
│ ○ Profile           │
│ ○ Preferences       │
├─────────────────────┤
│ [Avatar] User Name  │ ← User section
│ user@email.com  ⚙   │
└─────────────────────┘
```

### 5.2 Styling

**Background**: var(--bg-base)

**Logo Area**:
- "QE" monogram: Cabinet Grotesk 18px bold, var(--accent-primary)
- "QuantEdge": Cabinet Grotesk 14px, var(--text-primary)
- Padding: 20px

**Section Labels**:
- Font: Geist 9px uppercase
- Color: var(--text-muted)
- Letter-spacing: 0.12em
- Padding: 16px 20px 8px

**Menu Items**:
- Font: Geist 13px
- Color: var(--text-secondary)
- Padding: 12px 20px
- Icon: 16px, left-aligned
- Hover: background var(--bg-surface)
- Active: 
  - Background: var(--bg-elevated)
  - Left border: 2px solid var(--accent-primary)
  - Color: var(--text-primary)

**Keyboard Shortcuts**:
- Font: DM Mono 10px
- Color: var(--text-muted)
- Position: Right-aligned
- Format: ⌘K, ⌘1, etc.

**User Section**:
- Background: var(--bg-surface)
- Border-top: 1px solid var(--border-subtle)
- Padding: 16px
- Avatar: 32px circle
- Name: Geist 13px var(--text-primary)
- Email: Geist 11px var(--text-muted)
- Settings icon: 16px, clickable

## 6. Loading States

### 6.1 Skeleton Screen System

**Purpose**: Prevent layout shift and blank flashes during data loading

**Implementation**:
```typescript
interface SkeletonProps {
  variant: 'text' | 'card' | 'chart' | 'table'
  width?: string
  height?: string
  count?: number
}
```

**Base Skeleton Styling**:
```css
.skeleton {
  background: var(--bg-overlay);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.skeleton::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,0.05),
    transparent
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  to {
    left: 100%;
  }
}
```

**Skeleton Variants**:

1. **Text Skeleton**:
   - Height: 1em
   - Width: Varies (50%, 75%, 100%)
   - Margin: 0.5em 0

2. **Card Skeleton**:
   - Matches MetricCard dimensions
   - Includes accent bar placeholder
   - Padding: 20px

3. **Chart Skeleton**:
   - Height: 300px
   - Includes axis placeholders
   - Grid pattern overlay

4. **Table Skeleton**:
   - Rows: 5-10 placeholder rows
   - Columns: Match actual table structure
   - Alternating row backgrounds

### 6.2 Loading State Locations

**Apply skeleton screens to**:
- Merger Analysis page initial load
- DCF Valuation page initial load
- History table data fetch
- Chart data updates (show previous data with opacity)
- Metric card value updates

**Never show**:
- Blank white screens
- Generic spinners (except for button actions)
- Layout shifts during load

## 7. Implementation Strategy

### 7.1 Phase 1: Foundation (Design System)
1. Install fonts (DM Mono, Geist, Cabinet Grotesk)
2. Update globals.css with new color palette
3. Create font utility classes
4. Test color contrast ratios

### 7.2 Phase 2: Core Components
1. Create DataValue component
2. Create MetricCard component
3. Create Enhanced Card component
4. Create FinanceTable component
5. Create Custom Slider component
6. Create Skeleton components

### 7.3 Phase 3: Chart Redesigns
1. Redesign EPS Bridge Waterfall
2. Redesign Sensitivity Heatmaps
3. Redesign DCF Cash Flow Chart
4. Redesign Contribution Analysis Chart
5. Redesign Breakeven Finder

### 7.4 Phase 4: Layout & Navigation
1. Redesign Sidebar
2. Update page layouts
3. Apply consistent spacing

### 7.5 Phase 5: Loading States
1. Create skeleton variants
2. Apply to all async operations
3. Test loading transitions

### 7.6 Phase 6: Polish & Consistency
1. Review all pages for consistency
2. Test hover/active states
3. Verify typography compliance
4. Final color palette verification

## 8. Testing Considerations

### 8.1 Visual Regression Testing
- Screenshot comparison before/after
- Verify color consistency across components
- Check typography rendering

### 8.2 Accessibility Testing
- Color contrast ratios (WCAG AA minimum)
- Keyboard navigation
- Screen reader compatibility

### 8.3 Performance Testing
- Font loading performance
- Animation frame rates (60fps target)
- Chart rendering performance with large datasets

### 8.4 Cross-browser Testing
- Chrome (primary)
- Firefox
- Safari
- Edge

## 9. Maintenance & Documentation

### 9.1 Component Documentation
- Storybook or similar for component showcase
- Usage examples for each component
- Props documentation

### 9.2 Design System Documentation
- Color palette reference
- Typography scale reference
- Spacing system reference
- Component guidelines

### 9.3 Code Standards
- Consistent naming conventions
- CSS variable usage (no hardcoded colors)
- Component composition patterns
- Performance best practices
