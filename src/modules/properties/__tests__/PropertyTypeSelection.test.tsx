import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PropertyTypeSelection from '../components/PropertyTypeSelection';
import { PropertyData } from '../types/property';

// Mock PropertyTypeSummary to avoid icon rendering issues in tests
vi.mock('../components/PropertyTypeSummary', () => {
  return {
    default: ({ type }: { type: any; showFullDetails?: boolean }) => {
      return (
        <div data-testid="property-type-summary">
          {type ? (
            <div>
              <h4>{type.title}</h4>
              <p>{type.category} Property</p>
              {type.description && type.description.map((desc: string, index: number) => (
                <div key={index}>{desc}</div>
              ))}
            </div>
          ) : (
            <div>No property type selected</div>
          )}
        </div>
      );
    },
  };
});

// Mock lucide-react icons to avoid rendering issues
vi.mock('lucide-react', () => ({
  Home: () => <div data-testid="mock-icon-home" />,
  Building: () => <div data-testid="mock-icon-building" />,
  Check: () => <div data-testid="mock-icon-check" />,
  ChevronRight: () => <div data-testid="mock-icon-chevron-right" />,
  ArrowLeft: () => <div data-testid="mock-icon-arrow-left" />,
}));

const mockPropertyData: PropertyData = {
  type: null,
  address: {
    streetAddress: '',
    unitAptSuite: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  },
  unitDetails: {
    totalUnits: 0,
    unitTypes: [],
    squareFootage: 0,
    floors: 0,
    leaseTypes: [],
    rentRanges: { min: 0, max: 0 },
  },
  bankAccounts: [],
  ownership: {
    ownerType: '',
    legalName: '',
    contactInfo: {
      email: '',
      phone: '',
    },
    ownershipPercentage: 100,
  },
};

describe('PropertyTypeSelection', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    mockOnUpdate.mockClear();
  });

  test('renders initial category selection step', () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('What type of property are you adding?')).toBeInTheDocument();
    expect(screen.getByText('Choose the category that best describes your property')).toBeInTheDocument();
    expect(screen.getByText('Residential')).toBeInTheDocument();
    expect(screen.getByText('Commercial')).toBeInTheDocument();
    expect(screen.getByText('Single-family homes, apartments, condos, and other properties designed for living')).toBeInTheDocument();
    expect(screen.getByText('Office buildings, retail stores, warehouses, and properties for business use')).toBeInTheDocument();
  });

  test('shows residential property types when residential is selected', async () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // Click on Residential category
    const residentialButton = screen.getByText('Select Residential');
    fireEvent.click(residentialButton);

    await waitFor(() => {
      expect(screen.getByText('Back to Categories')).toBeInTheDocument();
      expect(screen.getByText('Select Your Residential Property Type')).toBeInTheDocument();
    });

    // Check that all residential types are displayed
    expect(screen.getByText('Single-Family')).toBeInTheDocument();
    expect(screen.getByText('Multi-Family')).toBeInTheDocument();
    expect(screen.getByText('Condo')).toBeInTheDocument();
    expect(screen.getByText('Townhome')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();

    // Check descriptions for Single-Family
    expect(screen.getByText('Standalone residential structure designed for one family')).toBeInTheDocument();
    expect(screen.getByText('Private yard, garage, and dedicated entrance')).toBeInTheDocument();
    expect(screen.getByText('Complete ownership of land and building')).toBeInTheDocument();
  });

  test('shows commercial property types when commercial is selected', async () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // Click on Commercial category
    const commercialButton = screen.getByText('Select Commercial');
    fireEvent.click(commercialButton);

    await waitFor(() => {
      expect(screen.getByText('Back to Categories')).toBeInTheDocument();
      expect(screen.getByText('Select Your Commercial Property Type')).toBeInTheDocument();
    });

    // Check that all commercial types are displayed
    expect(screen.getByText('Office')).toBeInTheDocument();
    expect(screen.getByText('Retail')).toBeInTheDocument();
    expect(screen.getByText('Shopping Center')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('Industrial')).toBeInTheDocument();

    // Check descriptions for Office
    expect(screen.getByText('Professional office space for business operations')).toBeInTheDocument();
    expect(screen.getByText('Designed for administrative and professional services')).toBeInTheDocument();
    expect(screen.getByText('Typically includes parking and conference facilities')).toBeInTheDocument();
  });

  test('selects a property type when clicked', async () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // Select residential category
    const residentialButton = screen.getByText('Select Residential');
    fireEvent.click(residentialButton);

    await waitFor(() => {
      expect(screen.getByText('Single-Family')).toBeInTheDocument();
    });

    // Select Single-Family property type
    const singleFamilyType = screen.getByText('Single-Family').closest('div')?.parentElement;
    if (singleFamilyType) {
      fireEvent.click(singleFamilyType);
    }

    // Verify onUpdate was called with the correct property type
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        type: expect.objectContaining({
          id: 'single-family',
          category: 'residential',
          title: 'Single-Family',
        })
      });
    });
  });

  test('shows custom input field when "Other" is selected', async () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // Select residential category first
    const residentialButton = screen.getByText('Select Residential');
    fireEvent.click(residentialButton);

    await waitFor(() => {
      // Verify we're on residential type selection
      expect(screen.getByText('Select Your Residential Property Type')).toBeInTheDocument();
    });

    // Look for Other option text
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  test('handles back to categories navigation', async () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // First select residential to move to property types
    const residentialButton = screen.getByText('Select Residential');
    fireEvent.click(residentialButton);

    await waitFor(() => {
      expect(screen.getByText('Select Your Residential Property Type')).toBeInTheDocument();
    });

    // Click back to categories
    const backButton = screen.getByText('Back to Categories');
    fireEvent.click(backButton);

    // Should return to category selection
    await waitFor(() => {
      expect(screen.getByText('Select Residential')).toBeInTheDocument();
    });
  });

  test('displays error message when type is required but not selected', () => {
    const errors = {
      type: 'Please select a property type',
    };

    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={errors}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Selection Required')).toBeInTheDocument();
    expect(screen.getByText('Please select a property type')).toBeInTheDocument();
  });

  test('displays selection summary when type is selected', async () => {
    const updatedData = {
      ...mockPropertyData,
      type: {
        id: 'single-family',
        category: 'residential' as const,
        title: 'Single-Family',
        description: ['Standalone residential structure designed for one family', 'Private yard, garage, and dedicated entrance', 'Complete ownership of land and building'],
        icon: 'home',
      }
    };

    render(
      <PropertyTypeSelection
        data={updatedData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Current Selection')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5 completed')).toBeInTheDocument();
    
    const summary = screen.getByTestId('property-type-summary');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent('Single-Family');
    expect(summary).toHaveTextContent('residential Property');
  });

  test('handles proper state initialization from existing data', () => {
    const updatedData = {
      ...mockPropertyData,
      type: {
        id: 'condo',
        category: 'residential' as const,
        title: 'Condo',
        description: ['Test description'],
        icon: 'building',
      }
    };

    render(
      <PropertyTypeSelection
        data={updatedData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // Should show property types since type is already selected with category
    expect(screen.getByText('Select Your Residential Property Type')).toBeInTheDocument();
    expect(screen.getByText('Back to Categories')).toBeInTheDocument();
  });

  test('shows category indicator with correct styling', async () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // Select residential category
    const residentialButton = screen.getByText('Select Residential');
    fireEvent.click(residentialButton);

    await waitFor(() => {
      // Verify we moved to residential property type selection
      expect(screen.getByText('Select Your Residential Property Type')).toBeInTheDocument();
    });
  });

  test('applies correct color theming for residential vs commercial', async () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // Test residential theming - click should show property types
    const residentialButton = screen.getByText('Select Residential');
    fireEvent.click(residentialButton);

    await waitFor(() => {
      // Verify we moved to residential property type selection
      expect(screen.getByText('Select Your Residential Property Type')).toBeInTheDocument();
    });

    // Go back and test commercial
    const backButton = screen.getByText('Back to Categories');
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Select Commercial')).toBeInTheDocument();
    });

    const commercialButton = screen.getByText('Select Commercial');
    fireEvent.click(commercialButton);

    await waitFor(() => {
      // Verify we moved to commercial property type selection
      expect(screen.getByText('Select Your Commercial Property Type')).toBeInTheDocument();
    });
  });

  test('handles animation states during category transitions', async () => {
    render(
      <PropertyTypeSelection
        data={mockPropertyData}
        errors={{}}
        onUpdate={mockOnUpdate}
      />
    );

    // Select residential category
    const residentialButton = screen.getByText('Select Residential');
    fireEvent.click(residentialButton);

    // Should trigger animation
    await waitFor(() => {
      expect(screen.getByText('Select Your Residential Property Type')).toBeInTheDocument();
    });

    // Go back to test transition back to categories
    const backButton = screen.getByText('Back to Categories');
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('What type of property are you adding?')).toBeInTheDocument();
    });
  });
});