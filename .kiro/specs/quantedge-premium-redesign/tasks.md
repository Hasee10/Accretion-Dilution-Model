# QuantEdge Premium Redesign - Implementation Tasks

## Phase 1: Foundation (Design System)

- [x] 1. Install and Configure Fonts
  - [x] 1.1 Install DM Mono font family (Google Fonts or local files)
  - [x] 1.2 Install Geist font family
  - [x] 1.3 Install Cabinet Grotesk font family
  - [x] 1.4 Create font-face declarations in globals.css
  - [x] 1.5 Create Tailwind utility classes for each font family
  - [x] 1.6 Test font rendering across browsers

- [x] 2. Update Color Palette in globals.css
  - [x] 2.1 Add background layer variables (--bg-base, --bg-surface, --bg-elevated, --bg-overlay)
  - [x] 2.2 Add border variables (--border-subtle, --border-default, --border-strong)
  - [x] 2.3 Add accent color variables (primary, cyan, violet, emerald, rose, amber)
  - [x] 2.4 Add text color variables (primary, secondary, muted)
  - [x] 2.5 Add data-specific variables (positive, negative, neutral)
  - [x] 2.6 Verify color contrast ratios for accessibility

- [x] 3. Create Typography Utility Classes
  - [x] 3.1 Create font-family utilities (font-mono, font-ui, font-display)
  - [x] 3.2 Create type scale utilities (text-data-lg, text-data-md, text-data-sm)
  - [x] 3.3 Create letter-spacing utilities for uppercase labels
  - [x] 3.4 Test typography rendering

## Phase 2: Core Components

- [x] 4. Create DataValue Component
  - [x] 4.1 Create component file: frontend/src/components/ui/data-value.tsx
  - [x] 4.2 Implement value formatting (currency, percentage, number)
  - [x] 4.3 Implement size variants (sm, md, lg)
  - [x] 4.4 Implement colorization logic (positive/negative)
  - [x] 4.5 Add decimal precision control
  - [x] 4.6 Apply DM Mono font
  - [x] 4.7 Write unit tests for formatting logic

- [x] 5. Create MetricCard Component
  - [ ] 5.1 Create component file: frontend/src/components/ui/metric-card.tsx
  - [ ] 5.2 Implement card layout structure
  - [ ] 5.3 Add vertical accent bar (1px × 24px)
  - [ ] 5.4 Implement label section (uppercase, small)
  - [ ] 5.5 Implement value display (36px DM Mono)
  - [ ] 5.6 Implement secondary info section
  - [ ] 5.7 Add optional badge support
  - [ ] 5.8 Add optional sparkline support
  - [ ] 5.9 Implement hover state transitions

- [x] 6. Create Enhanced Card Component
  - [x] 6.1 Create component file: frontend/src/components/ui/premium-card.tsx
  - [x] 6.2 Implement base card styling (background, border, padding)
  - [x] 6.3 Add vertical accent bar with color prop
  - [x] 6.4 Implement hover state (border color transition)
  - [x] 6.5 Remove box shadows, use borders only
  - [x] 6.6 Add className prop for extensibility

- [x] 7. Create FinanceTable Component
  - [x] 7.1 Create component file: frontend/src/components/ui/finance-table.tsx
  - [x] 7.2 Define ColumnDef interface
  - [x] 7.3 Implement table structure with sticky headers
  - [x] 7.4 Implement alternating row backgrounds
  - [x] 7.5 Implement column type formatting (text, number, currency, percentage)
  - [x] 7.6 Implement right-alignment for number columns
  - [x] 7.7 Implement positive/negative colorization
  - [x] 7.8 Add sortable column support with icons
  - [x] 7.9 Implement row hover state
  - [x] 7.10 Create empty state component
  - [x] 7.11 Apply DM Mono to number columns

- [ ] 8. Create Custom Slider Component
  - [x] 8.1 Create component file: frontend/src/components/ui/premium-slider.tsx
  - [x] 8.2 Implement custom thumb styling (12px circle, white ring)
  - [ ] 8.
  - [ ]* 2.7 Write property test for Card shadow constraint
    - **Property 5: Card Shadow Constraint**
    - **Validates: Requirements 3.2**
  
  - [ ]* 2.8 Write unit tests for Card component
    - Test accent bar rendering and dimensions
    - Test hover state transitions
    - Test padding variants
    - _Requirements: 3.2_
  
  - [x] 2.9 Implement MetricCard component
    - Create MetricCard with label, value, change, sparkline, secondaryInfo props
    - Render label in small caps, 10px, muted color
    - Render value in 36px DM Mono with colorization
    - Render secondary info in 13px below value
    - Add optional sparkline visualization
    - Use Card component as base
    - _Requirements: 3.3_
  
  - [ ]* 2.10 Write property test for MetricCard value styling
    - **Property 6: MetricCard Value Styling**
    - **Validates: Requirements 3.3**
  
  - [ ]* 2.11 Write property test for MetricCard secondary info
    - **Property 7: MetricCard Secondary Info Positioning**
    - **Validates: Requirements 3.3**
  
  - [ ]* 2.12 Write unit tests for MetricCard
    - Test with and without sparkline
    - Test with and without secondary info
    - Test with positive/negative values
    - _Requirements: 3.3_

- [ ] 3. Checkpoint - Verify core components
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 4. Implement table and slider components
  - [ ] 4.1 Create FinanceTable component
    - Define Column and FinanceTableProps interfaces
    - Implement table with sticky headers and bottom border
    - Add alternating row backgrounds (--bg-surface and --bg-elevated)
    - Right-align numeric columns in DM Mono
    - Apply colorization to positive/negative numbers
    - Add sortable column functionality with arrow icons
    - Implement row hover states
    - Add empty state with icon and message
    - _Requirements: 3.10_
  
  - [ ]* 4.2 Write property test for table row alternation
    - **Property 16: FinanceTable Row Alternation**
    - **Validates: Requirements 3.10**
  
  - [ ]* 4.3 Write property test for numeric column alignment
    - **Property 17: FinanceTable Numeric Column Alignment**
    - **Validates: Requirements 3.10**
  
  - [ ]* 4.4 Write unit tests for FinanceTable
    - Test empty state rendering
    - Test sorting functionality
    - Test column alignment for different data types
    - _Requirements: 3.10_
  
  - [ ] 4.5 Create custom Slider component
    - Implement slider with min, max, value, onChange props
    - Style thumb: 12px circle, --accent-primary, 2px white ring
    - Style track: left side --accent-primary, right side --bg-overlay
    - Add tick marks at specified positions
    - Add focus ring styling
    - Support formatValue function for display
    - _Requirements: 3.8_
  
  - [ ]* 4.6 Write unit tests for Slider component
    - Test value updates on interaction
    - Test tick mark positioning
    - Test keyboard accessibility
    - _Requirements: 3.8_

- [ ] 5. Create skeleton loading components
  - [ ] 5.1 Implement base Skeleton component
    - Create Skeleton with variant, width, height, animation props
    - Implement shimmer animation (left-to-right gradient)
    - Use --bg-surface to --bg-elevated gradient
    - _Requirements: 3.11_
  
  - [ ] 5.2 Create skeleton variants for each component type
    - MetricCardSkeleton matching MetricCard layout
    - FinanceTableSkeleton matching table layout
    - ChartSkeleton matching chart dimensions
    - HeatmapSkeleton matching heatmap grid
    - _Requirements: 3.11_
  
  - [ ]* 5.3 Write property test for skeleton layout matching
    - **Property 19: Skeleton Layout Matching**
    - **Validates: Requirements 3.11**
  
  - [ ]* 5.4 Write property test for skeleton state coverage
    - **Property 20: Skeleton State Coverage**
    - **Validates: Requirements 3.11**

