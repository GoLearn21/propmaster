import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyTypeSelection from '../components/PropertyTypeSelection';
import usePropertyWizard from '../hooks/usePropertyWizard';
import { CheckCircle, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { BankAccount } from '../types/property';
import { createProperty } from '../services/propertyService';
import toast from 'react-hot-toast';

/**
 * Property Wizard Page
 *
 * Multi-step wizard for creating new properties
 * Steps: Type → Address → Unit Details → Bank Accounts → Ownership
 */
export default function PropertyWizardPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    currentStep,
    propertyData,
    errors,
    isSaving,
    isDirty,
    updatePropertyData,
    handleNext,
    handleBack,
    handleStepClick,
    reset,
    canProceedToNext,
    canGoToStep,
  } = usePropertyWizard({
    autoSave: true,
    saveInterval: 2000,
  });

  const stepTitles = ['Type', 'Address', 'Unit Details', 'Bank Accounts', 'Ownership'];

  // Handle property submission
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // For demo purposes, using a default organization ID
      // In production, this would come from auth context
      const organizationId = 'demo-org-123';

      const result = await createProperty({
        organizationId,
        propertyData,
      });

      if (result.error) {
        setSubmitError(result.error);
        toast.error(`Failed to create property: ${result.error}`);
        return;
      }

      // Success!
      toast.success('Property created successfully!');
      localStorage.removeItem('propertyWizardDraft');

      // Navigate to the properties list page
      console.log('Navigating to properties list...');
      navigate('/properties');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSubmitError(errorMessage);
      toast.error(`Failed to create property: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PropertyTypeSelection
            data={propertyData}
            errors={errors}
            onUpdate={updatePropertyData}
          />
        );
      case 2:
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Address</h2>
            <p className="text-gray-600 mb-6">Enter the physical location of your property</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={propertyData.address?.streetAddress || ''}
                  onChange={(e) => updatePropertyData({
                    address: { ...propertyData.address, streetAddress: e.target.value }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={propertyData.address?.city || ''}
                    onChange={(e) => updatePropertyData({
                      address: { ...propertyData.address, city: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Miami"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={propertyData.address?.state || ''}
                    onChange={(e) => updatePropertyData({
                      address: { ...propertyData.address, state: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="FL"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={propertyData.address?.zipCode || ''}
                    onChange={(e) => updatePropertyData({
                      address: { ...propertyData.address, zipCode: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="33157"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={propertyData.address?.country || 'USA'}
                    onChange={(e) => updatePropertyData({
                      address: { ...propertyData.address, country: e.target.value }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unit Details</h2>
            <p className="text-gray-600 mb-6">Specify the number and configuration of units</p>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Units *
                  </label>
                  <input
                    type="number"
                    value={propertyData.unitDetails?.totalUnits || ''}
                    onChange={(e) => updatePropertyData({
                      unitDetails: { ...propertyData.unitDetails, totalUnits: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="12"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Square Footage
                  </label>
                  <input
                    type="number"
                    value={propertyData.unitDetails?.squareFootage || ''}
                    onChange={(e) => updatePropertyData({
                      unitDetails: { ...propertyData.unitDetails, squareFootage: parseInt(e.target.value) || 0 }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="15000"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Floors
                </label>
                <input
                  type="number"
                  value={propertyData.unitDetails?.floors || ''}
                  onChange={(e) => updatePropertyData({
                    unitDetails: { ...propertyData.unitDetails, floors: parseInt(e.target.value) || 0 }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="3"
                  min="1"
                />
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bank Accounts</h2>
            <p className="text-gray-600 mb-6">Link bank accounts for rent collection (Optional)</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                You can add bank account information later in the property settings.
              </p>
            </div>

            <div className="space-y-6">
              {/* Existing Bank Accounts */}
              {propertyData.bankAccounts && propertyData.bankAccounts.length > 0 && (
                <div className="space-y-4">
                  {propertyData.bankAccounts.map((account, index) => (
                    <div key={account.id} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{account.nickname}</h3>
                          {account.isPrimary && (
                            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const updatedAccounts = propertyData.bankAccounts.filter((_, i) => i !== index);
                            updatePropertyData({ bankAccounts: updatedAccounts });
                          }}
                          className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nickname *
                          </label>
                          <input
                            type="text"
                            value={account.nickname}
                            onChange={(e) => {
                              const updatedAccounts = [...propertyData.bankAccounts];
                              updatedAccounts[index] = { ...account, nickname: e.target.value };
                              updatePropertyData({ bankAccounts: updatedAccounts });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="e.g., Operating Account"
                          />
                          {errors[`account_${index}_nickname`] && (
                            <p className="text-red-600 text-sm mt-1">{errors[`account_${index}_nickname`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank Name *
                          </label>
                          <input
                            type="text"
                            value={account.bankName}
                            onChange={(e) => {
                              const updatedAccounts = [...propertyData.bankAccounts];
                              updatedAccounts[index] = { ...account, bankName: e.target.value };
                              updatePropertyData({ bankAccounts: updatedAccounts });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="e.g., Chase Bank"
                          />
                          {errors[`account_${index}_bankName`] && (
                            <p className="text-red-600 text-sm mt-1">{errors[`account_${index}_bankName`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Type *
                          </label>
                          <select
                            value={account.accountType}
                            onChange={(e) => {
                              const updatedAccounts = [...propertyData.bankAccounts];
                              updatedAccounts[index] = {
                                ...account,
                                accountType: e.target.value as 'checking' | 'savings' | 'money_market'
                              };
                              updatePropertyData({ bankAccounts: updatedAccounts });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                            <option value="money_market">Money Market</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Routing Number *
                          </label>
                          <input
                            type="text"
                            value={account.routingNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 9);
                              const updatedAccounts = [...propertyData.bankAccounts];
                              updatedAccounts[index] = { ...account, routingNumber: value };
                              updatePropertyData({ bankAccounts: updatedAccounts });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="123456789"
                            maxLength={9}
                          />
                          {errors[`account_${index}_routingNumber`] && (
                            <p className="text-red-600 text-sm mt-1">{errors[`account_${index}_routingNumber`]}</p>
                          )}
                        </div>

                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Number *
                          </label>
                          <input
                            type="text"
                            value={account.accountNumber}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              const updatedAccounts = [...propertyData.bankAccounts];
                              updatedAccounts[index] = { ...account, accountNumber: value };
                              updatePropertyData({ bankAccounts: updatedAccounts });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="Account number"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={account.isPrimary}
                              onChange={(e) => {
                                const updatedAccounts = propertyData.bankAccounts.map((acc, i) => ({
                                  ...acc,
                                  isPrimary: i === index ? e.target.checked : false
                                }));
                                updatePropertyData({ bankAccounts: updatedAccounts });
                              }}
                              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Set as primary account for this property
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Bank Account Button */}
              <button
                type="button"
                onClick={() => {
                  const newAccount: BankAccount = {
                    id: `temp_${Date.now()}`,
                    nickname: '',
                    bankName: '',
                    accountType: 'checking',
                    routingNumber: '',
                    accountNumber: '',
                    isPrimary: propertyData.bankAccounts.length === 0,
                  };
                  updatePropertyData({
                    bankAccounts: [...(propertyData.bankAccounts || []), newAccount]
                  });
                }}
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Add Bank Account</span>
              </button>

              {/* Skip Option */}
              {propertyData.bankAccounts.length === 0 && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="skip-bank"
                    checked={propertyData.skipBankAccount || false}
                    onChange={(e) => updatePropertyData({ skipBankAccount: e.target.checked })}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="skip-bank" className="text-sm text-gray-700 flex-1">
                    <span className="font-medium">Skip for now</span> - You can add bank account information later in the property settings.
                  </label>
                </div>
              )}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ownership Information</h2>
            <p className="text-gray-600 mb-6">Specify property ownership details (Optional)</p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-900">
                Ownership information can be added later in the property settings.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="skip-ownership"
                  checked={propertyData.skipOwnership || false}
                  onChange={(e) => updatePropertyData({ skipOwnership: e.target.checked })}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <label htmlFor="skip-ownership" className="ml-2 text-sm text-gray-700">
                  Skip for now and add ownership details later
                </label>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Add New Property
          </h1>
          <p className="text-gray-600">
            Follow the steps below to add your property to the system
          </p>
        </div>

        {/* Wizard Progress */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            {stepTitles.map((title, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;
              const isAccessible = canGoToStep(stepNumber);

              return (
                <div
                  key={stepNumber}
                  className={`flex items-center ${
                    index < stepTitles.length - 1 ? 'flex-1' : ''
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => handleStepClick(stepNumber)}
                      disabled={!isAccessible}
                      className={`flex items-center justify-center w-10 h-10 rounded-full font-medium transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : isCurrent
                          ? 'bg-teal-500 text-white'
                          : isAccessible
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        stepNumber
                      )}
                    </button>
                    <div className={`mt-2 text-xs font-medium ${
                      isCurrent ? 'text-teal-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {title}
                    </div>
                  </div>
                  {index < stepTitles.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 mt-[-20px] ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-lg">
          {renderStepContent()}

          {/* Error Message */}
          {submitError && (
            <div className="px-8 py-4 bg-red-50 border-t border-red-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Failed to create property</p>
                  <p className="text-sm text-red-700 mt-1">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Controls */}
          <div className="px-8 py-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Auto-save indicator */}
                {isSaving && (
                  <div className="flex items-center text-teal-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>
                    <span className="text-sm">Saving draft...</span>
                  </div>
                )}

                {isDirty && !isSaving && (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm">Draft saved</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3">
                {/* Cancel button */}
                <button
                  onClick={() => navigate('/properties')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>

                {/* Back button */}
                <button
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    currentStep === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Back
                </button>

                {/* Next/Complete button */}
                <button
                  onClick={async () => {
                    if (currentStep === 5) {
                      // Submit property to database
                      await handleSubmit();
                    } else {
                      handleNext();
                    }
                  }}
                  disabled={!canProceedToNext || isSubmitting}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    canProceedToNext && !isSubmitting
                      ? 'bg-teal-500 text-white hover:bg-teal-600'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Property...
                    </span>
                  ) : (
                    currentStep === 5 ? 'Complete Setup' : 'Continue'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
