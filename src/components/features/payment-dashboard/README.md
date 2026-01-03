# Payment Dashboard

A comprehensive payment dashboard component matching DoorLoop's UI design exactly, built for the PropMaster property management system.

## Features

### Core Components
- **PaymentOverview**: Key metrics and performance indicators
- **PaymentHistoryTable**: Detailed payment transaction history with filtering
- **OutstandingBalances**: View and manage overdue payments
- **CollectionStatus**: Payment collection performance dashboard
- **BillingConfiguration**: Automated billing setup and configuration
- **PaymentMethodManagement**: Manage tenant payment methods

### DoorLoop UI Replication
- Exact color scheme: Primary (#2F438D), Accent Green (#00CC66), Accent Pink (#EF4A81)
- Typography matching DoorLoop's font system
- Consistent spacing and component styling
- Responsive design for desktop, tablet, and mobile
- Hover effects and micro-interactions

### Dashboard Sections

#### 1. Payment Overview
- Total revenue metrics
- Monthly revenue tracking
- Outstanding balance monitoring
- Collection rate visualization
- Quick statistics dashboard

#### 2. Payment History
- Searchable payment transactions
- Advanced filtering (date, status, type, amount)
- Sorting capabilities
- Pagination for large datasets
- Export functionality

#### 3. Outstanding Balances
- Tenant balance tracking
- Status indicators (current, past due, severely delinquent)
- Detailed breakdown views
- Reminder and collection tools

#### 4. Collection Status
- Payment status breakdown
- Collection rate trends
- Performance metrics
- Action recommendations

#### 5. Billing Configuration
- Automated billing setup
- Late fee configuration
- Reminder scheduling
- Property-specific settings

#### 6. Payment Methods
- ACH and credit card management
- Payment method status
- Default method configuration
- Security and compliance features

## Technical Implementation

### Architecture
```
payment-dashboard/
├── components/
│   ├── PaymentDashboard.tsx          # Main dashboard container
│   ├── PaymentOverview.tsx           # Metrics overview
│   ├── PaymentHistoryTable.tsx       # Transaction history
│   ├── OutstandingBalances.tsx       # Overdue payments
│   ├── CollectionStatus.tsx          # Collection analytics
│   ├── BillingConfiguration.tsx      # Billing setup
│   └── PaymentMethodManagement.tsx   # Payment methods
├── hooks/
│   └── usePaymentDashboard.ts        # Data management hook
├── services/
├── types/
│   └── index.ts                      # TypeScript definitions
└── tests/                            # Comprehensive test suite
```

### Key Technologies
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** components for accessibility
- **Lucide React** for icons
- **Testing Library** for component testing
- **Vitest** for unit testing

### Data Management
- Custom React hooks for state management
- Mock service layer (easily replaceable with real API)
- Optimistic updates and error handling
- Caching and performance optimization

## Responsive Design

### Breakpoints
- **Mobile**: < 768px - Single column layout
- **Tablet**: 768px - 1024px - Two column layout
- **Desktop**: > 1024px - Multi-column grid layout

### Mobile Optimizations
- Collapsible navigation
- Touch-friendly interactions
- Optimized data tables
- Streamlined filters

## Testing

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: Feature workflow testing
- **E2E Tests**: Complete user journey testing
- **Accessibility Tests**: WCAG compliance testing

### Test Files
- `PaymentDashboard.test.tsx` - Main component tests
- `PaymentOverview.test.tsx` - Overview component tests
- `PaymentDashboard.integration.test.tsx` - Integration tests
- `*Component*.test.tsx` - Individual component tests

### Running Tests
```bash
# Unit tests
npm run test

# Test coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

## DoorLoop Design System

### Color Palette
```css
/* Primary Colors */
--primary: #2F438D;
--primary-dark: #1B2A56;
--primary-light: #495E8B;

/* Accent Colors */
--accent-green: #00CC66;
--accent-green-hover: #00B359;
--accent-pink: #EF4A81;

/* Status Colors */
--status-success: #24C76D;
--status-warning: #FFC107;
--status-error: #DC3545;
--status-info: #82E8B1;

/* Neutral Palette */
--neutral-black: #212121;
--neutral-dark: #333333;
--neutral-medium: #6C757D;
--neutral-light: #E0E0E0;
--neutral-lighter: #F5F5F5;
--neutral-white: #FFFFFF;
```

### Typography
```css
/* Font Family */
font-family: 'Inter', 'Open Sans', 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;

/* Font Sizes */
--h1: 60px, font-weight: 700
--h2: 40px, font-weight: 700
--h3: 32px, font-weight: 600
--h4: 24px, font-weight: 600
--body: 16px, font-weight: 400
--small: 14px, font-weight: 500
--tiny: 12px, font-weight: 400
```

### Component Styling
- **Cards**: White background, 8px border radius, subtle shadow
- **Buttons**: Primary action with 6px border radius, hover effects
- **Inputs**: White background, light border, focus states
- **Tables**: Alternating row colors, hover states
- **Badges**: Status-based color coding

## Integration

### Props Interface
```typescript
interface PaymentDashboardProps {
  // Dashboard configuration
  userRole: 'landlord' | 'property_manager';
  propertyIds?: string[];
  refreshInterval?: number;
  
  // Event handlers
  onExport?: (data: ExportData) => void;
  onRefresh?: () => void;
  onError?: (error: Error) => void;
}
```

### Usage Example
```tsx
import { PaymentDashboard } from './components/features/payment-dashboard/PaymentDashboard';

function App() {
  return (
    <div className="app">
      <PaymentDashboard 
        userRole="property_manager"
        onExport={handleExport}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
```

### State Management
```typescript
const {
  metrics,
  paymentHistory,
  outstandingBalances,
  collectionStatus,
  loading,
  error,
  refreshData,
  exportData
} = usePaymentDashboard();
```

## Performance Considerations

### Optimization Features
- Lazy loading for large datasets
- Memoized calculations
- Optimized re-renders
- Efficient filtering and sorting
- Pagination for performance

### Caching Strategy
- Service layer caching
- Local storage for user preferences
- Optimistic updates
- Background data refresh

## Accessibility

### WCAG Compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast color ratios
- Focus management
- Alternative text for icons

### Testing
- Automated accessibility tests
- Manual testing with screen readers
- Keyboard-only navigation testing
- Color contrast validation

## Future Enhancements

### Planned Features
- Real-time payment notifications
- Advanced analytics and reporting
- Bulk payment processing
- Integration with accounting systems
- Multi-tenant support
- API rate limiting and caching

### Performance Improvements
- Virtual scrolling for large tables
- Progressive data loading
- Service worker integration
- Bundle optimization

## Contributing

### Code Style
- Follow TypeScript best practices
- Use meaningful component names
- Maintain consistent naming conventions
- Write comprehensive tests

### Component Guidelines
- One component per file
- Prop interface definitions
- Story examples for components
- Accessibility considerations

### Testing Standards
- Minimum 80% code coverage
- Test all user interactions
- Include edge cases
- Mock external dependencies

## License

This component is part of the PropMaster property management system and follows the project's licensing terms.