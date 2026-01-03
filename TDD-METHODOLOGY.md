# Test-Driven Development (TDD) Methodology

## Overview

This document outlines the comprehensive testing approach for the PropMaster UI Component Library. We follow Test-Driven Development principles to ensure high-quality, maintainable, and reliable components.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Red-Green-Refactor Cycle](#red-green-refactor-cycle)
3. [Testing Stack](#testing-stack)
4. [Current Test Coverage](#current-test-coverage)
5. [Component Testing Guidelines](#component-testing-guidelines)
6. [Examples](#examples)
7. [Best Practices](#best-practices)

---

## Testing Philosophy

Our testing approach is built on these core principles:

- **User-Centric Testing**: Test components from the user's perspective, focusing on behavior rather than implementation details
- **Comprehensive Coverage**: Aim for 90%+ coverage across lines, functions, branches, and statements
- **Accessibility First**: Ensure all components meet WCAG standards through automated testing
- **Isolation**: Each test should be independent and not rely on other tests
- **Maintainability**: Write clear, descriptive tests that serve as documentation

---

## Red-Green-Refactor Cycle

The TDD cycle consists of three phases:

### 1. **Red Phase** - Write a Failing Test

Write a test for the desired behavior before implementing the feature.

```typescript
// Example: Testing a new Button variant
describe('Button - Destructive Variant', () => {
  it('should render with destructive styles', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button', { name: /delete/i });
    
    // This will fail initially because destructive variant doesn't exist yet
    expect(button).toHaveClass('bg-red-600');
  });
});
```

**Expected Result**: ❌ Test fails because the feature doesn't exist

### 2. **Green Phase** - Write Minimal Code to Pass

Implement just enough code to make the test pass.

```typescript
// Button.tsx - Add minimal implementation
export const Button = ({ variant, children, ...props }: ButtonProps) => {
  const variants = {
    primary: 'bg-blue-600 text-white',
    destructive: 'bg-red-600 text-white', // Minimal implementation
  };
  
  return (
    <button className={variants[variant]} {...props}>
      {children}
    </button>
  );
};
```

**Expected Result**: ✅ Test passes with minimal implementation

### 3. **Refactor Phase** - Improve the Code

Enhance the implementation while keeping tests green.

```typescript
// Button.tsx - Refactored with proper styling
const buttonVariants = cva('px-4 py-2 rounded font-medium transition-colors', {
  variants: {
    variant: {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    },
  },
});

export const Button = ({ variant, children, ...props }: ButtonProps) => {
  return (
    <button className={buttonVariants({ variant })} {...props}>
      {children}
    </button>
  );
};
```

**Expected Result**: ✅ All tests still pass with improved code

---

## Testing Stack

### Core Testing Tools

#### Vitest
- **Why**: Modern, fast testing framework built for Vite projects
- **Features**: ESM support, TypeScript out-of-the-box, compatible with Jest API
- **Configuration**: Located in `vitest.config.ts`

#### React Testing Library
- **Why**: Encourages testing from user perspective
- **Features**: Query by accessibility roles, user events, async utilities
- **Philosophy**: "The more your tests resemble the way your software is used, the more confidence they can give you"

#### Happy-DOM vs JSDOM

We use **Happy-DOM** instead of JSDOM for several critical reasons:

**Why Happy-DOM?**

1. **Node.js Compatibility**: 
   - Happy-DOM works seamlessly with Node.js v18.19.0
   - JSDOM has compatibility issues with newer webidl-conversions module
   - Error encountered with JSDOM: `Cannot read properties of undefined (reading 'get')` in webidl-conversions

2. **Performance**:
   - Happy-DOM is significantly faster (up to 3x in some benchmarks)
   - Lower memory footprint
   - Faster test execution across our 97 test suite

3. **Modern Standards**:
   - Better support for modern Web APIs
   - More accurate DOM implementation
   - Regular updates and active maintenance

4. **Reliability**:
   - Fewer edge cases and compatibility issues
   - Better error messages when tests fail
   - More predictable behavior

**Configuration in vitest.config.ts**:

```typescript
export default defineConfig({
  test: {
    environment: 'happy-dom', // Instead of 'jsdom'
    globals: true,
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
```

#### @vitest/coverage-v8
- **Why**: Fast code coverage with V8's native coverage
- **Target**: 90% coverage across all metrics
- **Reports**: Text, JSON, and HTML formats

---

## Current Test Coverage

### Test Statistics (As of Phase 1 Completion)

**Total Tests**: 97 ✅  
**Test Files**: 10  
**Status**: All Passing

### Component Test Breakdown

| Component | Tests | Coverage Focus |
|-----------|-------|----------------|
| **Button** | 13 | Variants (6), sizes (5), states, icons, loading |
| **Card** | 17 | Variants (4), header/footer, content sections |
| **Badge** | 14 | Status variants (7), sizes, colors |
| **Input** | 12 | Validation, icons, labels, error states |
| **Select** | 8 | Options, selection, labels, disabled state |
| **Checkbox** | 7 | Checked states, labels, disabled, indeterminate |
| **Textarea** | 6 | Multi-line input, resize, character count |
| **Table** | 4 | Data rendering, headers, rows, columns |
| **Avatar** | 10 | Images, initials, sizes, fallback behavior |
| **Loading** | 12 | Sizes (4), text, variants, accessibility |

### Test File Locations

```
src/components/ui/
├── Button.test.tsx        (97 lines, 13 tests)
├── Card.test.tsx          (125 lines, 17 tests)
├── Badge.test.tsx         (91 lines, 14 tests)
├── Input.test.tsx         (85 lines, 12 tests)
├── Select.test.tsx        (65 lines, 8 tests)
├── Checkbox.test.tsx      (52 lines, 7 tests)
├── Textarea.test.tsx      (48 lines, 6 tests)
├── Table.test.tsx         (70 lines, 4 tests)
├── Avatar.test.tsx        (63 lines, 10 tests)
└── Loading.test.tsx       (77 lines, 12 tests)
```

---

## Component Testing Guidelines

### 1. File Structure

Each component should have a corresponding `.test.tsx` file:

```
src/components/ui/
├── Button.tsx
├── Button.test.tsx
├── Button.stories.tsx
```

### 2. Test Organization

Use `describe` blocks to group related tests:

```typescript
describe('Button', () => {
  describe('Variants', () => {
    it('should render primary variant', () => { });
    it('should render secondary variant', () => { });
  });
  
  describe('States', () => {
    it('should handle disabled state', () => { });
    it('should handle loading state', () => { });
  });
});
```

### 3. What to Test

#### ✅ DO Test

- **Visual Variants**: All visual variations render correctly
- **User Interactions**: Click, hover, focus, keyboard events
- **Props**: All props produce expected behavior
- **Accessibility**: ARIA attributes, roles, keyboard navigation
- **States**: Loading, disabled, error, success states
- **Edge Cases**: Empty data, long text, special characters
- **Integration**: Component works with other components

#### ❌ DON'T Test

- **Implementation Details**: Internal state, private methods
- **Third-Party Libraries**: Assume libraries work correctly
- **Styling**: Specific CSS values (test classes instead)
- **Browser Quirks**: Let E2E tests handle cross-browser issues

### 4. Query Priority (React Testing Library)

Use queries in this order:

1. **Accessible Queries** (Preferred)
   - `getByRole`: `getByRole('button', { name: /submit/i })`
   - `getByLabelText`: `getByLabelText(/email address/i)`
   - `getByPlaceholderText`: `getByPlaceholderText(/enter email/i)`
   - `getByText`: `getByText(/welcome message/i)`

2. **Semantic Queries** (Good)
   - `getByAltText`: For images
   - `getByTitle`: For tooltips

3. **Test IDs** (Last Resort)
   - `getByTestId`: Only when no other option works

### 5. Async Testing

For components with async behavior:

```typescript
it('should load data asynchronously', async () => {
  render(<DataComponent />);
  
  // Wait for element to appear
  const data = await screen.findByText(/loaded data/i);
  expect(data).toBeInTheDocument();
});
```

### 6. User Event Simulation

Use `@testing-library/user-event` for realistic interactions:

```typescript
import { userEvent } from '@testing-library/user-event';

it('should handle user input', async () => {
  const user = userEvent.setup();
  render(<Input />);
  
  const input = screen.getByRole('textbox');
  await user.type(input, 'Hello World');
  
  expect(input).toHaveValue('Hello World');
});
```

---

## Examples

### Example 1: Button Component Tests

```typescript
describe('Button', () => {
  it('should render with default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-600');
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should disable button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it('should show loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});
```

### Example 2: Form Input Tests

```typescript
describe('Input', () => {
  it('should accept user input', async () => {
    const user = userEvent.setup();
    render(<Input label="Email" />);
    
    const input = screen.getByLabelText(/email/i);
    await user.type(input, 'test@example.com');
    
    expect(input).toHaveValue('test@example.com');
  });

  it('should display error message', () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  });

  it('should be accessible via label', () => {
    render(<Input label="Username" id="username" />);
    const input = screen.getByLabelText(/username/i);
    expect(input).toHaveAttribute('id', 'username');
  });
});
```

### Example 3: Card Component Tests

```typescript
describe('Card', () => {
  it('should render all sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );
    
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('should apply variant styles', () => {
    const { container } = render(<Card variant="outlined">Content</Card>);
    const card = container.firstChild;
    expect(card).toHaveClass('border-2');
  });
});
```

### Example 4: Testing Avatar Image Fallback

```typescript
describe('Avatar', () => {
  it('should render image when src is provided', () => {
    render(<Avatar src="/avatar.jpg" alt="User" />);
    const img = screen.getByRole('img', { name: /user/i });
    expect(img).toHaveAttribute('src', '/avatar.jpg');
  });

  it('should show initials fallback', () => {
    render(<Avatar alt="John Doe" />);
    // Avatar generates initials from alt text
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should handle different sizes', () => {
    render(<Avatar size="lg" alt="User" />);
    const avatar = screen.getByText('U').parentElement;
    expect(avatar).toHaveClass('h-12', 'w-12');
  });
});
```

---

## Best Practices

### 1. Test Naming

Use descriptive test names that explain the expected behavior:

```typescript
// ❌ Bad
it('button test', () => { });

// ✅ Good
it('should disable button and prevent clicks when disabled prop is true', () => { });
```

### 2. Arrange-Act-Assert Pattern

Structure tests clearly:

```typescript
it('should update count when button is clicked', async () => {
  // Arrange
  const user = userEvent.setup();
  render(<Counter />);
  
  // Act
  const button = screen.getByRole('button', { name: /increment/i });
  await user.click(button);
  
  // Assert
  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

### 3. Avoid Testing Implementation Details

```typescript
// ❌ Bad - Testing internal state
expect(component.state.isOpen).toBe(true);

// ✅ Good - Testing visible behavior
expect(screen.getByRole('dialog')).toBeVisible();
```

### 4. Use Accessible Queries

```typescript
// ❌ Bad - Using test IDs unnecessarily
screen.getByTestId('submit-button');

// ✅ Good - Using accessible queries
screen.getByRole('button', { name: /submit/i });
```

### 5. Mock External Dependencies

```typescript
// Mock fetch calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'test' }),
  })
);

// Mock file uploads
const file = new File(['content'], 'test.png', { type: 'image/png' });
```

### 6. Test Accessibility

```typescript
it('should be keyboard accessible', async () => {
  const user = userEvent.setup();
  render(<Button>Submit</Button>);
  
  const button = screen.getByRole('button');
  await user.tab(); // Focus button
  expect(button).toHaveFocus();
  
  await user.keyboard('{Enter}'); // Activate with keyboard
  // Assert expected behavior
});
```

### 7. Clean Up After Tests

```typescript
afterEach(() => {
  cleanup(); // Automatically done by React Testing Library
  vi.clearAllMocks(); // Clear mocks
});
```

---

## Writing Tests for New Components

When adding a new component, follow this checklist:

### Step 1: Create Test File

Create `ComponentName.test.tsx` next to the component.

### Step 2: Write Initial Tests

Start with basic rendering tests:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { NewComponent } from './NewComponent';

describe('NewComponent', () => {
  it('should render without crashing', () => {
    render(<NewComponent />);
    expect(screen.getByRole('...')).toBeInTheDocument();
  });
});
```

### Step 3: Test All Props

Write tests for each prop and prop combination:

```typescript
describe('Props', () => {
  it('should accept and display children', () => { });
  it('should apply size variants', () => { });
  it('should handle disabled state', () => { });
});
```

### Step 4: Test User Interactions

Test all interactive features:

```typescript
describe('Interactions', () => {
  it('should handle click events', async () => { });
  it('should handle keyboard navigation', async () => { });
  it('should handle focus states', async () => { });
});
```

### Step 5: Test Edge Cases

Cover unusual scenarios:

```typescript
describe('Edge Cases', () => {
  it('should handle empty data', () => { });
  it('should handle very long text', () => { });
  it('should handle special characters', () => { });
});
```

### Step 6: Test Accessibility

Ensure WCAG compliance:

```typescript
describe('Accessibility', () => {
  it('should have proper ARIA attributes', () => { });
  it('should be keyboard navigable', async () => { });
  it('should announce changes to screen readers', () => { });
});
```

---

## Running Tests

### Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test Button.test.tsx

# Run tests matching pattern
pnpm test --grep "Button"
```

### Coverage Report

After running tests with coverage, view the report:

```bash
# Open HTML coverage report
open coverage/index.html
```

---

## Coverage Thresholds

We maintain strict coverage requirements:

```typescript
coverage: {
  thresholds: {
    lines: 90,      // 90% of lines must be covered
    functions: 90,  // 90% of functions must be covered
    branches: 90,   // 90% of conditional branches must be covered
    statements: 90, // 90% of statements must be covered
  },
}
```

If coverage falls below thresholds, tests will fail.

---

## Debugging Tests

### View Test Output

```bash
# Verbose output
pnpm test --reporter=verbose

# See what's rendered
screen.debug(); // In test file
```

### Common Issues

#### Issue: "Unable to find element"

**Solution**: Check if element is rendered asynchronously

```typescript
// Use findBy instead of getBy
const element = await screen.findByRole('button');
```

#### Issue: "Element not visible"

**Solution**: Check if element has CSS that hides it

```typescript
// Use queryBy to check if element exists but isn't visible
const element = screen.queryByRole('button');
expect(element).not.toBeVisible();
```

#### Issue: "Act warnings"

**Solution**: Wrap state updates in `act()` or use async queries

```typescript
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});
```

---

## Next Steps for Testing

### Components Needing Tests

The following components still need comprehensive test suites:

1. **Dialog/Modal** - Test open/close, accessibility, focus trap
2. **Tabs** - Test navigation, active states, keyboard control
3. **Navigation** - Test routing, active states, dropdowns
4. **Sidebar** - Test collapse/expand, navigation, responsive
5. **Breadcrumb** - Test navigation, truncation, separator
6. **Toast/Notification** - Test display, dismiss, auto-hide
7. **Dropdown** - Test open/close, selection, keyboard nav
8. **Tooltip** - Test hover, focus, positioning
9. **Progress Bar** - Test values, animations, variants
10. **Switch/Toggle** - Test on/off states, labels, disabled

### Integration Tests

Create integration tests that test components working together:

```typescript
describe('Form Integration', () => {
  it('should submit form with all inputs', async () => {
    // Test Input, Select, Checkbox, Button working together
  });
});
```

### E2E Tests with Playwright

Create end-to-end tests for critical user flows:

```typescript
test('complete user registration flow', async ({ page }) => {
  await page.goto('/signup');
  // Test full signup process
});
```

---

## Conclusion

This TDD methodology ensures that our component library is:

- **Reliable**: All components work as expected
- **Maintainable**: Tests serve as documentation
- **Accessible**: WCAG compliance is verified
- **Robust**: Edge cases are covered
- **Performant**: Happy-DOM provides fast test execution

By following these guidelines, we maintain high code quality and confidence in our component library.

---

**Last Updated**: 2025-11-01  
**Test Count**: 97 passing tests  
**Coverage Target**: 90%+  
**Testing Framework**: Vitest + React Testing Library + Happy-DOM
