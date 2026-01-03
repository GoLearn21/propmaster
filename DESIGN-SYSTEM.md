# PropMaster Design System Documentation

## Overview
This design system ensures visual consistency across the entire PropMaster property management application, matching DoorLoop's professional design standards.

**Version**: 1.0.0  
**Last Updated**: 2025-11-03  
**Framework**: React + TypeScript + Tailwind CSS

---

## Table of Contents
1. [Color System](#color-system)
2. [Typography](#typography)
3. [Spacing](#spacing)
4. [Border & Shadows](#border--shadows)
5. [Components](#components)
6. [Icons](#icons)
7. [Responsive Design](#responsive-design)
8. [Patterns & Guidelines](#patterns--guidelines)

---

## Color System

### Primary Colors
Our primary color palette uses a professional teal/turquoise that conveys trust and modernity.

```css
Primary: #20B2AA (Teal/Turquoise)
Primary Dark: #1A8D87
Primary Light: #4DD4CC
```

**Usage**: 
- Primary actions (CTAs, navigation active states)
- Links and interactive elements
- Focus states and highlights

### Accent Colors
Secondary colors used for emphasis and feedback.

```css
Accent Green: #00CC66 (Success actions, positive metrics)
Accent Pink: #EF4A81 (Featured items, special highlights)
Accent Gold: #FFC107 (Warnings, premium features)
```

**Usage**:
- Green: Primary button backgrounds, success states
- Pink: Important highlights, special badges
- Gold: Warning states, premium indicators

### Neutral Palette
Foundation colors for text, backgrounds, and UI elements.

```css
Black: #212121 (Primary text)
Dark: #333333 (Secondary text, headings)
Medium: #6C757D (Tertiary text, labels)
Light: #E0E0E0 (Borders, dividers)
Lighter: #F5F5F5 (Backgrounds, hover states)
White: #FFFFFF (Cards, main background)
```

**Usage**:
- Black: Main headings, important text
- Dark: Body text, descriptions
- Medium: Labels, secondary information
- Light: Borders, input outlines
- Lighter: Background fills, hover states
- White: Card backgrounds, modal overlays

### Status Colors
Semantic colors for feedback and states.

```css
Success: #24C76D (Completed, paid, active)
Warning: #FFC107 (Pending, needs attention)
Error: #DC3545 (Failed, overdue, critical)
Info: #82E8B1 (Informational, neutral states)
```

**Usage**:
- Success: Successful operations, paid invoices, active leases
- Warning: Pending actions, moderate priority
- Error: Failed operations, overdue tasks, critical issues
- Info: General information, tips, help text

### Tailwind Classes
```html
<!-- Primary -->
<div class="bg-primary text-white hover:bg-primary-dark"></div>

<!-- Accent -->
<button class="bg-accent-green text-white"></button>

<!-- Neutral -->
<p class="text-neutral-dark"></p>
<div class="bg-neutral-lighter border-neutral-light"></div>

<!-- Status -->
<span class="text-status-success"></span>
<div class="bg-status-warning/10"></div>
```

---

## Typography

### Font Family
```css
Primary Font Stack: 
'Inter', 'Open Sans', 'Lato', '-apple-system', 
'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 
'Oxygen', 'Ubuntu', sans-serif
```

**Characteristics**:
- Clean, modern sans-serif
- Excellent readability at all sizes
- Professional business aesthetic
- Wide language support

### Type Scale

| Class | Size | Line Height | Weight | Letter Spacing | Usage |
|-------|------|-------------|--------|----------------|-------|
| `text-h1` | 60px | 1.2 | 700 | -0.02em | Page titles, hero headings |
| `text-h2` | 40px | 1.3 | 700 | 0 | Section headings |
| `text-h3` | 32px | 1.4 | 600 | 0 | Subsection headings |
| `text-h4` | 24px | 1.4 | 600 | 0 | Card titles, component headings |
| `text-body` | 16px | 1.6 | 400 | 0 | Body text, descriptions |
| `text-small` | 14px | 1.5 | 500 | 0 | Labels, secondary text |
| `text-tiny` | 12px | 1.4 | 400 | 0 | Captions, timestamps |

### Font Weights
```css
Regular: 400 (Body text)
Medium: 500 (Labels, small text)
Semibold: 600 (Headings H3/H4)
Bold: 700 (Primary headings H1/H2)
```

### Typography Guidelines

**Headings**:
```html
<h1 class="text-h2 font-bold text-neutral-black">
  Dashboard Overview
</h1>

<h2 class="text-h3 font-semibold text-neutral-dark">
  Property Performance
</h2>

<h3 class="text-h4 font-semibold text-neutral-dark">
  Recent Activity
</h3>
```

**Body Text**:
```html
<p class="text-body text-neutral-dark">
  Welcome to your property management dashboard.
</p>

<p class="text-small text-neutral-medium">
  Last updated 2 hours ago
</p>
```

**Text Colors**:
- Primary text: `text-neutral-black` or `text-neutral-dark`
- Secondary text: `text-neutral-medium`
- Muted text: `text-neutral-medium`
- Links: `text-primary hover:text-primary-dark`

---

## Spacing

### Spacing Scale
Based on a 4px base unit for consistency.

```css
4px: space-1
8px: space-2
12px: space-3
16px: space-4 (Default component spacing)
20px: space-5
24px: space-6 (Default section spacing)
32px: space-8
40px: space-10
48px: space-12
64px: space-16
72px: space-18
88px: space-22
```

### Spacing Guidelines

**Component Spacing** (internal padding):
```html
<!-- Cards -->
<div class="p-6">Default card padding (24px)</div>

<!-- Buttons -->
<button class="px-4 py-2">Medium button (16px/8px)</button>

<!-- Input fields -->
<input class="px-4 py-2">Standard input (16px/8px)</input>
```

**Layout Spacing** (margins between elements):
```html
<!-- Section spacing -->
<div class="space-y-6">24px between sections</div>

<!-- Element spacing -->
<div class="space-y-4">16px between elements</div>

<!-- Tight spacing -->
<div class="space-y-2">8px between related items</div>
```

**Container Padding**:
```html
<!-- Page container -->
<div class="p-8">32px page padding</div>

<!-- Card content -->
<div class="p-6">24px card padding</div>

<!-- Compact sections -->
<div class="p-4">16px compact padding</div>
```

---

## Border & Shadows

### Border Radius
Consistent rounded corners for modern appearance.

```css
Small: 4px (rounded-sm) - Tags, badges
Medium: 8px (rounded-md) - Buttons, inputs
Large: 12px (rounded-lg) - Cards, modals
Extra Large: 16px (rounded-xl) - Large containers
Full: 9999px (rounded-full) - Pills, avatars
```

**Usage**:
```html
<button class="rounded-md">Button</button>
<div class="rounded-lg">Card</div>
<span class="rounded-sm">Badge</span>
<div class="rounded-full">Avatar</div>
```

### Shadows
Elevation system for visual hierarchy.

```css
Small: 0 1px 2px rgba(0,0,0,0.05)
  Usage: Subtle elevation, hover states

Medium: 0 4px 6px rgba(0,0,0,0.1)
  Usage: Cards, dropdown menus

Large: 0 10px 15px rgba(0,0,0,0.1)
  Usage: Modals, popovers

Extra Large: 0 20px 25px rgba(0,0,0,0.1)
  Usage: Major overlays, featured elements
```

**Shadow Classes**:
```html
<div class="shadow-sm">Subtle elevation</div>
<div class="shadow-md">Card elevation</div>
<div class="shadow-lg">Modal elevation</div>
<div class="shadow-xl">Featured elevation</div>
```

### Borders
```css
Border Width: 1px (standard)
Border Color: #E0E0E0 (neutral-light)
```

**Border Usage**:
```html
<div class="border border-neutral-light">Default border</div>
<input class="border-2 border-primary">Emphasized border</input>
<div class="border-b border-neutral-light">Bottom border only</div>
```

---

## Components

### Buttons

#### Variants

**Primary** (Green accent, main CTAs):
```html
<button class="bg-accent-green text-white hover:bg-accent-green-hover 
               shadow-md hover:shadow-lg rounded-md px-4 py-2 
               font-semibold transition-all">
  Primary Action
</button>
```

**Secondary** (Teal primary, secondary actions):
```html
<button class="bg-primary text-white hover:bg-primary-dark 
               rounded-md px-4 py-2 font-semibold transition-all">
  Secondary Action
</button>
```

**Outline** (Subtle actions):
```html
<button class="border border-neutral-light bg-transparent 
               hover:bg-neutral-lighter rounded-md px-4 py-2 
               font-semibold transition-all">
  Outline Button
</button>
```

**Ghost** (Minimal actions):
```html
<button class="bg-transparent text-primary hover:bg-neutral-lighter 
               hover:text-primary-dark rounded-md px-4 py-2 
               font-semibold transition-all">
  Ghost Button
</button>
```

#### Sizes
```html
<!-- Small -->
<button class="h-9 px-3 text-sm">Small</button>

<!-- Medium (default) -->
<button class="h-10 px-4 text-base">Medium</button>

<!-- Large -->
<button class="h-12 px-6 text-base">Large</button>

<!-- Extra Large -->
<button class="h-14 px-8 text-lg">Extra Large</button>
```

#### States
```html
<!-- Loading -->
<button disabled>
  <svg class="animate-spin h-4 w-4 mr-2">...</svg>
  Loading...
</button>

<!-- Disabled -->
<button disabled class="opacity-50 cursor-not-allowed">
  Disabled
</button>

<!-- With Icons -->
<button>
  <Icon class="mr-2 h-5 w-5" />
  Button Text
</button>
```

### Cards

**Default Card**:
```html
<div class="bg-white border border-neutral-light shadow-sm 
            hover:shadow-md rounded-lg p-6 transition-shadow">
  <h3 class="text-h4 font-semibold text-neutral-black mb-2">
    Card Title
  </h3>
  <p class="text-body text-neutral-medium">
    Card description text.
  </p>
</div>
```

**Elevated Card**:
```html
<div class="bg-white shadow-md rounded-lg p-6">
  Content
</div>
```

**Outline Card**:
```html
<div class="bg-transparent border border-neutral-light rounded-lg p-6">
  Content
</div>
```

### Form Elements

**Input Fields**:
```html
<input 
  type="text"
  class="w-full h-10 px-4 rounded-lg border border-neutral-light
         bg-white text-neutral-dark placeholder-neutral-medium
         focus:outline-none focus:ring-2 focus:ring-primary/20
         focus:border-primary transition-all"
  placeholder="Enter text..."
/>
```

**Select Dropdowns**:
```html
<select class="w-full h-10 px-4 rounded-lg border border-neutral-light
               bg-white text-neutral-dark focus:outline-none 
               focus:ring-2 focus:ring-primary/20 focus:border-primary">
  <option>Select option</option>
</select>
```

**Checkboxes**:
```html
<label class="flex items-center space-x-2 cursor-pointer">
  <input type="checkbox" 
         class="w-5 h-5 rounded border-neutral-light text-primary
                focus:ring-primary focus:ring-offset-0" />
  <span class="text-body text-neutral-dark">Checkbox label</span>
</label>
```

### Badges

**Status Badges**:
```html
<!-- Success -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-sm 
             text-tiny font-medium bg-status-success/10 
             text-status-success">
  Active
</span>

<!-- Warning -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-sm 
             text-tiny font-medium bg-status-warning/10 
             text-status-warning">
  Pending
</span>

<!-- Error -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-sm 
             text-tiny font-medium bg-status-error/10 
             text-status-error">
  Overdue
</span>

<!-- Info -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-sm 
             text-tiny font-medium bg-status-info/10 
             text-status-info">
  Info
</span>
```

### Tables

**Table Structure**:
```html
<table class="w-full">
  <thead>
    <tr class="border-b border-neutral-light">
      <th class="text-left py-3 px-4 text-tiny font-medium 
                 text-neutral-medium uppercase">
        Header
      </th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-neutral-lighter 
               hover:bg-neutral-lighter/50 transition-colors">
      <td class="py-4 px-4 text-body text-neutral-dark">
        Cell content
      </td>
    </tr>
  </tbody>
</table>
```

### Modals

**Modal Structure**:
```html
<!-- Backdrop -->
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"></div>

<!-- Modal -->
<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-xl max-w-md w-full">
    <!-- Header -->
    <div class="border-b border-neutral-light p-6">
      <h2 class="text-h4 font-semibold text-neutral-black">
        Modal Title
      </h2>
    </div>
    
    <!-- Body -->
    <div class="p-6">
      Modal content
    </div>
    
    <!-- Footer -->
    <div class="border-t border-neutral-light p-6 flex justify-end space-x-3">
      <button class="outline">Cancel</button>
      <button class="primary">Confirm</button>
    </div>
  </div>
</div>
```

---

## Icons

### Icon Library
**Library**: Lucide React
**Installation**: `npm install lucide-react`

### Icon Sizes
```css
Small: 16px (h-4 w-4) - Inline with text
Medium: 20px (h-5 w-5) - Default size
Large: 24px (h-6 w-6) - Emphasis, large buttons
Extra Large: 32px (h-8 w-8) - Feature icons
```

### Icon Usage
```tsx
import { Search, Plus, Check, X } from 'lucide-react';

// Medium size (default)
<Search className="h-5 w-5 text-neutral-medium" />

// Large size
<Plus className="h-6 w-6 text-white" />

// With color
<Check className="h-5 w-5 text-status-success" />
```

### Icon Colors
Match icon colors to their context:
```html
<!-- Text color -->
<Icon className="text-neutral-dark" />

<!-- Primary color -->
<Icon className="text-primary" />

<!-- Status color -->
<Icon className="text-status-success" />

<!-- White (on colored backgrounds) -->
<Icon className="text-white" />
```

### Icon Positioning
```html
<!-- Left icon in button -->
<button>
  <Icon className="mr-2 h-5 w-5" />
  Button Text
</button>

<!-- Right icon in button -->
<button>
  Button Text
  <Icon className="ml-2 h-5 w-5" />
</button>

<!-- Icon in input -->
<div class="relative">
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 
                   h-5 w-5 text-neutral-medium" />
  <input class="pl-11" />
</div>
```

---

## Responsive Design

### Breakpoints
```css
Mobile: 320px - 768px (sm:)
Tablet: 768px - 1024px (md:)
Desktop: 1024px - 1440px (lg:)
Large Desktop: 1440px+ (xl:, 2xl:)
```

### Responsive Patterns

**Grid Layouts**:
```html
<!-- Responsive stat cards -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
  <div>Card 4</div>
</div>

<!-- Responsive two-column -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
</div>
```

**Typography Scaling**:
```html
<!-- Responsive heading -->
<h1 class="text-2xl md:text-3xl lg:text-h2">
  Responsive Heading
</h1>

<!-- Responsive body -->
<p class="text-sm md:text-base">
  Responsive text
</p>
```

**Spacing Adjustments**:
```html
<!-- Responsive padding -->
<div class="p-4 md:p-6 lg:p-8">
  Content
</div>

<!-- Responsive gaps -->
<div class="space-y-4 md:space-y-6">
  Elements
</div>
```

**Navigation Patterns**:
```html
<!-- Mobile: Collapsed sidebar -->
<aside class="w-16 md:w-60">
  Navigation
</aside>

<!-- Hide on mobile, show on desktop -->
<div class="hidden lg:block">
  Desktop only
</div>

<!-- Show on mobile, hide on desktop -->
<div class="block lg:hidden">
  Mobile only
</div>
```

---

## Patterns & Guidelines

### Loading States
```html
<!-- Spinner -->
<div class="flex items-center justify-center p-8">
  <div class="animate-spin rounded-full h-8 w-8 
              border-b-2 border-primary"></div>
</div>

<!-- Skeleton loader -->
<div class="animate-pulse">
  <div class="h-4 bg-neutral-lighter rounded w-3/4 mb-2"></div>
  <div class="h-4 bg-neutral-lighter rounded w-1/2"></div>
</div>
```

### Empty States
```html
<div class="text-center py-12">
  <Icon className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
  <p class="text-neutral-medium">No items found</p>
  <p class="text-small text-neutral-light mt-2">
    Get started by creating your first item
  </p>
</div>
```

### Toast Notifications
Use `react-hot-toast` for notifications:
```tsx
import toast from 'react-hot-toast';

// Success
toast.success('Operation completed');

// Error
toast.error('Something went wrong');

// Info
toast('Information message');
```

### Focus States
All interactive elements must have focus states:
```html
<button class="focus:outline-none focus:ring-2 
               focus:ring-primary focus:ring-offset-2">
  Accessible Button
</button>

<input class="focus:outline-none focus:ring-2 
              focus:ring-primary/20 focus:border-primary">
```

### Hover States
Provide visual feedback on hover:
```html
<button class="hover:bg-primary-dark hover:-translate-y-0.5 
               hover:shadow-lg transition-all">
  Interactive Button
</button>

<div class="hover:bg-neutral-lighter transition-colors">
  Hoverable Card
</div>
```

### Transitions
Standard transition timing:
```html
<!-- All properties -->
<div class="transition-all duration-300">

<!-- Specific properties -->
<div class="transition-colors duration-200">
<div class="transition-shadow duration-300">
<div class="transition-transform duration-200">
```

---

## Accessibility Guidelines

### Color Contrast
- Text on white: Minimum 4.5:1 ratio
- Large text (18px+): Minimum 3:1 ratio
- All status colors meet WCAG AA standards

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus states are clearly visible
- Logical tab order is maintained

### Semantic HTML
```html
<!-- Use semantic elements -->
<header>, <nav>, <main>, <section>, <article>, <aside>, <footer>

<!-- Proper heading hierarchy -->
<h1> → <h2> → <h3> (no skipping levels)

<!-- Form labels -->
<label for="input-id">Label</label>
<input id="input-id" />
```

### ARIA Labels
```html
<button aria-label="Close modal">
  <X className="h-5 w-5" />
</button>

<div role="alert">Error message</div>

<nav aria-label="Primary navigation">...</nav>
```

---

## Implementation Checklist

### For New Components
- [ ] Uses design system color tokens
- [ ] Follows typography scale
- [ ] Implements proper spacing
- [ ] Has appropriate border radius
- [ ] Includes shadow elevation (if applicable)
- [ ] Uses Lucide React icons
- [ ] Responsive across all breakpoints
- [ ] Has loading states
- [ ] Has empty states
- [ ] Has hover states
- [ ] Has focus states
- [ ] Meets accessibility standards
- [ ] Follows semantic HTML
- [ ] Uses consistent transitions

### For New Pages
- [ ] Consistent page padding (p-8)
- [ ] Breadcrumb navigation
- [ ] Page title with proper hierarchy
- [ ] Responsive grid layout
- [ ] Proper section spacing
- [ ] Consistent card styling
- [ ] Loading state handling
- [ ] Error state handling
- [ ] Empty state handling
- [ ] Mobile-friendly layout

---

## Design Tokens Reference

### Quick Reference Table

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | #20B2AA | Main brand color |
| `accent-green` | #00CC66 | Primary actions |
| `accent-pink` | #EF4A81 | Highlights |
| `neutral-black` | #212121 | Primary text |
| `neutral-dark` | #333333 | Body text |
| `neutral-medium` | #6C757D | Secondary text |
| `neutral-light` | #E0E0E0 | Borders |
| `neutral-lighter` | #F5F5F5 | Backgrounds |
| `status-success` | #24C76D | Success states |
| `status-warning` | #FFC107 | Warning states |
| `status-error` | #DC3545 | Error states |
| `rounded-sm` | 4px | Small radius |
| `rounded-md` | 8px | Medium radius |
| `rounded-lg` | 12px | Large radius |
| `shadow-sm` | Subtle | Light elevation |
| `shadow-md` | Medium | Card elevation |
| `shadow-lg` | Strong | Modal elevation |

---

## Resources

### Documentation Links
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Lucide React Icons](https://lucide.dev/guide/packages/lucide-react)
- [React Hot Toast](https://react-hot-toast.com/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Design Tools
- Figma design files (if available)
- Color contrast checker
- Responsive design testing tools

### Support
For questions or clarifications about the design system, contact the development team.

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-11-03  
**Maintained By**: PropMaster Development Team
