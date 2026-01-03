import { useState, useCallback, useEffect, useMemo } from 'react';
import { PropertyData, PropertyTypeOption } from '../types/property';

interface UsePropertyWizardProps {
  initialData?: Partial<PropertyData>;
  autoSave?: boolean;
  saveInterval?: number;
}

interface UsePropertyWizardReturn {
  // State
  currentStep: number;
  propertyData: PropertyData;
  errors: Record<string, string>;
  isSaving: boolean;
  isDirty: boolean;
  
  // Actions
  updatePropertyData: (updates: Partial<PropertyData>) => void;
  validateCurrentStep: () => boolean;
  handleNext: () => void;
  handleBack: () => void;
  handleStepClick: (stepNumber: number) => void;
  saveDraft: () => Promise<void>;
  reset: () => void;
  
  // Step validation
  canProceedToNext: boolean;
  canGoToStep: (stepNumber: number) => boolean;
}

const STEPS = [
  { id: 1, title: 'Type', validationKey: 'type' },
  { id: 2, title: 'Address', validationKey: 'address' },
  { id: 3, title: 'Unit Details', validationKey: 'unitDetails' },
  { id: 4, title: 'Bank Accounts', validationKey: 'bankAccounts' },
  { id: 5, title: 'Ownership', validationKey: 'ownership' },
];

const defaultPropertyData: PropertyData = {
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

export const usePropertyWizard = ({
  initialData = {},
  autoSave = true,
  saveInterval = 2000,
}: UsePropertyWizardProps = {}): UsePropertyWizardReturn => {
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyData, setPropertyData] = useState<PropertyData>({
    ...defaultPropertyData,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Track changes for dirty state
  useEffect(() => {
    const hasChanges = JSON.stringify(propertyData) !== JSON.stringify(defaultPropertyData);
    setIsDirty(hasChanges);
  }, [propertyData]);

  // Auto-save draft functionality
  useEffect(() => {
    if (!autoSave || !isDirty) return;

    const saveDraftTimeout = setTimeout(() => {
      try {
        localStorage.setItem('propertyWizardDraft', JSON.stringify(propertyData));
      } catch (error) {
        console.error('Failed to save draft to localStorage:', error);
      }
    }, saveInterval);

    return () => clearTimeout(saveDraftTimeout);
  }, [propertyData, autoSave, isDirty, saveInterval]);

  // Load draft on mount
  useEffect(() => {
    if (Object.keys(initialData).length > 0) return;

    try {
      const draft = localStorage.getItem('propertyWizardDraft');
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        setPropertyData(prev => ({ ...prev, ...parsedDraft }));
      }
    } catch (error) {
      console.error('Failed to load draft from localStorage:', error);
    }
  }, []);

  const updatePropertyData = useCallback((updates: Partial<PropertyData>) => {
    setPropertyData(prev => ({ ...prev, ...updates }));
    // Clear related errors when data is updated
    setErrors({});
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const step = STEPS[currentStep - 1];

    if (!step) return true;

    switch (step.id) {
      case 1: // Type
        if (!propertyData.type) {
          newErrors.type = 'Please select a property type';
        }
        break;

      case 2: // Address
        if (!propertyData.address.streetAddress.trim()) {
          newErrors.streetAddress = 'Street address is required';
        }
        if (!propertyData.address.city.trim()) {
          newErrors.city = 'City is required';
        }
        if (!propertyData.address.state.trim()) {
          newErrors.state = 'State is required';
        }
        if (!propertyData.address.zipCode.trim()) {
          newErrors.zipCode = 'ZIP code is required';
        }
        break;

      case 3: // Unit Details
        if (propertyData.type?.category === 'residential') {
          if (!propertyData.unitDetails.totalUnits || propertyData.unitDetails.totalUnits <= 0) {
            newErrors.totalUnits = 'Total units must be greater than 0';
          }
        } else if (propertyData.type?.category === 'commercial') {
          if (!propertyData.unitDetails.squareFootage || propertyData.unitDetails.squareFootage <= 0) {
            newErrors.squareFootage = 'Square footage must be greater than 0';
          }
        }
        break;

      case 4: // Bank Accounts (optional - validate only if accounts are provided)
        if (propertyData.bankAccounts.length > 0) {
          propertyData.bankAccounts.forEach((account, index) => {
            if (!account.nickname.trim()) {
              newErrors[`account_${index}_nickname`] = 'Account nickname is required';
            }
            if (!account.bankName.trim()) {
              newErrors[`account_${index}_bankName`] = 'Bank name is required';
            }
            if (!account.routingNumber.trim()) {
              newErrors[`account_${index}_routingNumber`] = 'Routing number is required';
            } else if (!/^\d{9}$/.test(account.routingNumber)) {
              newErrors[`account_${index}_routingNumber`] = 'Routing number must be 9 digits';
            }
          });
        }
        break;

      case 5: // Ownership
        if (!propertyData.ownership.ownerType) {
          newErrors.ownerType = 'Owner type is required';
        }
        if (!propertyData.ownership.legalName.trim()) {
          newErrors.legalName = 'Legal name is required';
        }
        if (!propertyData.ownership.contactInfo.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propertyData.ownership.contactInfo.email)) {
          newErrors.email = 'Invalid email format';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, propertyData]);

  const handleNext = useCallback(() => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  }, [currentStep, validateCurrentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleStepClick = useCallback((stepNumber: number) => {
    // Only allow clicking on completed steps or the next step
    if (stepNumber <= currentStep || (stepNumber === currentStep + 1 && validateCurrentStep())) {
      setCurrentStep(stepNumber);
    }
  }, [currentStep, validateCurrentStep]);

  const saveDraft = useCallback(async (): Promise<void> => {
    setIsSaving(true);
    try {
      localStorage.setItem('propertyWizardDraft', JSON.stringify(propertyData));
      // In a real app, you might also save to backend
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [propertyData]);

  const reset = useCallback(() => {
    setCurrentStep(1);
    setPropertyData({ ...defaultPropertyData, ...initialData });
    setErrors({});
    setIsSaving(false);
    setIsDirty(false);
    localStorage.removeItem('propertyWizardDraft');
  }, [initialData]);

  const canProceedToNext = useMemo(() => {
    // Check if current step is valid without calling validateCurrentStep (which calls setErrors)
    const step = STEPS[currentStep - 1];
    if (!step) return true;

    switch (step.id) {
      case 1: // Type
        return !!propertyData.type;
      case 2: // Address
        return !!(
          propertyData.address.streetAddress.trim() &&
          propertyData.address.city.trim() &&
          propertyData.address.state.trim() &&
          propertyData.address.zipCode.trim()
        );
      case 3: // Unit Details
        if (propertyData.type?.category === 'residential') {
          return propertyData.unitDetails.totalUnits > 0;
        } else if (propertyData.type?.category === 'commercial') {
          return propertyData.unitDetails.squareFootage > 0;
        }
        return true;
      case 4: // Bank Accounts (optional)
        return true;
      case 5: // Ownership (optional)
        return true;
      default:
        return true;
    }
  }, [currentStep, propertyData]);

  const canGoToStep = useCallback((stepNumber: number): boolean => {
    if (stepNumber <= currentStep) return true;
    if (stepNumber === currentStep + 1) return canProceedToNext;
    return false;
  }, [currentStep, canProceedToNext]);

  return {
    // State
    currentStep,
    propertyData,
    errors,
    isSaving,
    isDirty,
    
    // Actions
    updatePropertyData,
    validateCurrentStep,
    handleNext,
    handleBack,
    handleStepClick,
    saveDraft,
    reset,
    
    // Step validation
    canProceedToNext,
    canGoToStep,
  };
};

export default usePropertyWizard;