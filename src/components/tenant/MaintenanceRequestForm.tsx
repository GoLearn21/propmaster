/**
 * Maintenance Request Form Component
 * Multi-step form for submitting maintenance requests
 * Includes category selection, details, photos, and entry permissions
 */

import React, { useState } from 'react';
import {
  Droplet,
  Zap,
  Thermometer,
  UtensilsCrossed,
  Hammer,
  PaintBucket,
  LayoutGrid,
  Home,
  Leaf,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Clock,
  Lock,
  Info,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Checkbox } from '../ui/Checkbox';
import ImageUploader from './ImageUploader';
import {
  MaintenanceCategory,
  MaintenancePriority,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  CreateMaintenanceRequestInput,
  getEmergencyInfo,
} from '../../services/tenant/tenantMaintenanceService';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  caption?: string;
}

interface MaintenanceRequestFormProps {
  onSubmit: (data: CreateMaintenanceRequestInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Category icons mapping
 */
const CATEGORY_ICONS: Record<MaintenanceCategory, React.ElementType> = {
  plumbing: Droplet,
  electrical: Zap,
  hvac: Thermometer,
  appliances: UtensilsCrossed,
  carpentry: Hammer,
  painting: PaintBucket,
  flooring: LayoutGrid,
  roofing: Home,
  landscaping: Leaf,
  cleaning: Sparkles,
  other: HelpCircle,
};

/**
 * Form steps
 */
type FormStep = 'category' | 'details' | 'photos' | 'entry' | 'review';

export default function MaintenanceRequestForm({
  onSubmit,
  onCancel,
  loading = false,
}: MaintenanceRequestFormProps) {
  const [step, setStep] = useState<FormStep>('category');
  const [formData, setFormData] = useState<{
    category: MaintenanceCategory | null;
    priority: MaintenancePriority;
    title: string;
    description: string;
    tenant_notes: string;
    tenant_preferred_time: string;
    entry_permission: boolean;
    entry_instructions: string;
    images: ImageFile[];
  }>({
    category: null,
    priority: 'medium',
    title: '',
    description: '',
    tenant_notes: '',
    tenant_preferred_time: '',
    entry_permission: true,
    entry_instructions: '',
    images: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const emergencyInfo = getEmergencyInfo();

  /**
   * Validate current step
   */
  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 'category':
        if (!formData.category) {
          newErrors.category = 'Please select a category';
        }
        break;
      case 'details':
        if (!formData.title.trim()) {
          newErrors.title = 'Please provide a brief title';
        }
        if (formData.title.length > 100) {
          newErrors.title = 'Title must be less than 100 characters';
        }
        if (!formData.description.trim()) {
          newErrors.description = 'Please describe the issue';
        }
        break;
      case 'entry':
        if (!formData.entry_permission && !formData.entry_instructions.trim()) {
          newErrors.entry_instructions = 'Please provide instructions if entry is not permitted';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Navigate to next step
   */
  const nextStep = () => {
    if (!validateStep()) return;

    const steps: FormStep[] = ['category', 'details', 'photos', 'entry', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  /**
   * Navigate to previous step
   */
  const prevStep = () => {
    const steps: FormStep[] = ['category', 'details', 'photos', 'entry', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (!formData.category) return;

    await onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      priority: formData.priority,
      tenant_notes: formData.tenant_notes.trim() || undefined,
      tenant_preferred_time: formData.tenant_preferred_time.trim() || undefined,
      entry_permission: formData.entry_permission,
      entry_instructions: formData.entry_instructions.trim() || undefined,
      images: formData.images.map((img) => img.file),
    });
  };

  /**
   * Get progress percentage
   */
  const getProgress = (): number => {
    const steps: FormStep[] = ['category', 'details', 'photos', 'entry', 'review'];
    const currentIndex = steps.indexOf(step);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-2 bg-neutral-light rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${getProgress()}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-neutral">
          <span className={step === 'category' ? 'text-primary font-medium' : ''}>Category</span>
          <span className={step === 'details' ? 'text-primary font-medium' : ''}>Details</span>
          <span className={step === 'photos' ? 'text-primary font-medium' : ''}>Photos</span>
          <span className={step === 'entry' ? 'text-primary font-medium' : ''}>Entry</span>
          <span className={step === 'review' ? 'text-primary font-medium' : ''}>Review</span>
        </div>
      </div>

      {/* Step 1: Category Selection */}
      {step === 'category' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
              What type of issue are you experiencing?
            </h2>
            <p className="text-neutral-dark">
              Select the category that best describes your maintenance request.
            </p>
          </div>

          {/* Emergency Banner */}
          <div className="bg-error/10 border border-error/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-error">Is this an emergency?</p>
                <p className="text-sm text-neutral-dark mt-1">
                  For emergencies like gas leaks, flooding, or fire, call{' '}
                  <a href={`tel:${emergencyInfo.phone}`} className="font-medium text-error underline">
                    {emergencyInfo.phone}
                  </a>{' '}
                  ({emergencyInfo.hours})
                </p>
              </div>
            </div>
          </div>

          {/* Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.keys(MAINTENANCE_CATEGORIES) as MaintenanceCategory[]).map((category) => {
              const Icon = CATEGORY_ICONS[category];
              const info = MAINTENANCE_CATEGORIES[category];
              const isSelected = formData.category === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setFormData({ ...formData, category })}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-neutral-light hover:border-neutral'
                    }
                  `}
                >
                  <Icon className={`h-6 w-6 mb-2 ${isSelected ? 'text-primary' : 'text-neutral'}`} />
                  <p className="font-medium text-neutral-darkest">{info.label}</p>
                  <p className="text-xs text-neutral mt-1 line-clamp-2">{info.description}</p>
                </button>
              );
            })}
          </div>

          {errors.category && (
            <p className="text-sm text-error">{errors.category}</p>
          )}
        </div>
      )}

      {/* Step 2: Details */}
      {step === 'details' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
              Tell us about the issue
            </h2>
            <p className="text-neutral-dark">
              Provide details to help us understand and resolve the problem quickly.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Brief Title <span className="text-error">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Leaking faucet in kitchen"
              maxLength={100}
            />
            {errors.title && <p className="text-sm text-error mt-1">{errors.title}</p>}
            <p className="text-xs text-neutral mt-1">{formData.title.length}/100 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Detailed Description <span className="text-error">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please describe the issue in detail. Include when it started, how often it occurs, and any other relevant information."
              rows={5}
              className="w-full px-3 py-2 border border-neutral-light rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
            {errors.description && <p className="text-sm text-error mt-1">{errors.description}</p>}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Priority Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.keys(MAINTENANCE_PRIORITIES) as MaintenancePriority[]).map((priority) => {
                const info = MAINTENANCE_PRIORITIES[priority];
                const isSelected = formData.priority === priority;

                return (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    className={`
                      p-3 rounded-lg border-2 text-center transition-all
                      ${isSelected
                        ? `border-${info.color} bg-${info.color}/5`
                        : 'border-neutral-light hover:border-neutral'
                      }
                    `}
                  >
                    <p className={`font-medium ${isSelected ? `text-${info.color}` : 'text-neutral-darkest'}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-neutral mt-1">{info.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Time */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Preferred Time for Service (Optional)
            </label>
            <Input
              value={formData.tenant_preferred_time}
              onChange={(e) => setFormData({ ...formData, tenant_preferred_time: e.target.value })}
              placeholder="e.g., Mornings between 9am-12pm, or any weekday"
            />
            <p className="text-xs text-neutral mt-1">
              Let us know your schedule preferences (we'll try to accommodate)
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Photos */}
      {step === 'photos' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
              Add photos (optional but helpful)
            </h2>
            <p className="text-neutral-dark">
              Photos help technicians understand the issue before arriving and come prepared with the right tools.
            </p>
          </div>

          <ImageUploader
            images={formData.images}
            onChange={(images) => setFormData({ ...formData, images })}
            maxImages={5}
            maxSizeMB={10}
          />

          <div className="bg-primary/5 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-dark">
                <p className="font-medium text-primary mb-1">Tips for helpful photos:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Show the overall area and close-up of the problem</li>
                  <li>Include any visible damage or water stains</li>
                  <li>If applicable, show the model number of appliances</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Entry Permissions */}
      {step === 'entry' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
              Entry permissions
            </h2>
            <p className="text-neutral-dark">
              Let us know how the technician should access your unit.
            </p>
          </div>

          {/* Entry Permission Toggle */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-neutral-light rounded-lg cursor-pointer hover:bg-neutral-lightest transition-colors">
              <Checkbox
                checked={formData.entry_permission}
                onChange={(e) => setFormData({ ...formData, entry_permission: e.target.checked })}
              />
              <div>
                <p className="font-medium text-neutral-darkest">
                  Permission to enter when I'm not home
                </p>
                <p className="text-sm text-neutral mt-1">
                  The technician may enter using a master key during normal business hours if you're not available.
                </p>
              </div>
            </label>

            {!formData.entry_permission && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-dark">Entry not permitted</p>
                    <p className="text-sm text-neutral-dark mt-1">
                      You must be present during the service visit. This may delay repairs.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Entry Instructions */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Special Entry Instructions
              {!formData.entry_permission && <span className="text-error"> *</span>}
            </label>
            <textarea
              value={formData.entry_instructions}
              onChange={(e) => setFormData({ ...formData, entry_instructions: e.target.value })}
              placeholder={formData.entry_permission
                ? "e.g., Please knock loudly, doorbell doesn't work. Pet-friendly household (dog is friendly)."
                : "e.g., Please call 30 minutes before arriving. I work from home and need notice."
              }
              rows={3}
              className="w-full px-3 py-2 border border-neutral-light rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
            {errors.entry_instructions && (
              <p className="text-sm text-error mt-1">{errors.entry_instructions}</p>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark mb-2">
              Additional Notes for Technician (Optional)
            </label>
            <textarea
              value={formData.tenant_notes}
              onChange={(e) => setFormData({ ...formData, tenant_notes: e.target.value })}
              placeholder="Any other information that might help the technician..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-light rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 'review' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-darkest mb-2">
              Review your request
            </h2>
            <p className="text-neutral-dark">
              Please review the details before submitting.
            </p>
          </div>

          <div className="bg-neutral-lightest rounded-lg p-6 space-y-4">
            {/* Category & Priority */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral">Category</p>
                <p className="font-medium text-neutral-darkest">
                  {formData.category && MAINTENANCE_CATEGORIES[formData.category].label}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral">Priority</p>
                <p className={`font-medium text-${MAINTENANCE_PRIORITIES[formData.priority].color}`}>
                  {MAINTENANCE_PRIORITIES[formData.priority].label}
                </p>
              </div>
            </div>

            {/* Title */}
            <div className="pt-4 border-t border-neutral-light">
              <p className="text-sm text-neutral">Title</p>
              <p className="font-medium text-neutral-darkest">{formData.title}</p>
            </div>

            {/* Description */}
            <div>
              <p className="text-sm text-neutral">Description</p>
              <p className="text-neutral-dark whitespace-pre-wrap">{formData.description}</p>
            </div>

            {/* Photos */}
            {formData.images.length > 0 && (
              <div className="pt-4 border-t border-neutral-light">
                <p className="text-sm text-neutral mb-2">Photos ({formData.images.length})</p>
                <div className="flex gap-2 overflow-x-auto">
                  {formData.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.preview}
                      alt="Preview"
                      className="h-16 w-16 object-cover rounded-lg flex-shrink-0"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Entry Permissions */}
            <div className="pt-4 border-t border-neutral-light">
              <p className="text-sm text-neutral">Entry Permission</p>
              <p className="font-medium text-neutral-darkest">
                {formData.entry_permission
                  ? 'Technician may enter when not home'
                  : 'Must be present during visit'
                }
              </p>
              {formData.entry_instructions && (
                <p className="text-sm text-neutral-dark mt-1">{formData.entry_instructions}</p>
              )}
            </div>

            {/* Preferred Time */}
            {formData.tenant_preferred_time && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-neutral" />
                <span className="text-sm text-neutral-dark">{formData.tenant_preferred_time}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t border-neutral-light">
        {step === 'category' ? (
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        ) : (
          <Button variant="outline" onClick={prevStep} disabled={loading}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}

        {step === 'review' ? (
          <Button variant="primary" onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        ) : (
          <Button variant="primary" onClick={nextStep} disabled={loading}>
            Continue
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
