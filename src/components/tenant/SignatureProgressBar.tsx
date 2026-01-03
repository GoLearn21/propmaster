/**
 * Signature Progress Bar Component
 * DocuSign-quality progress indicator for lease signing
 * Shows step-by-step field completion with clear visual feedback
 */

import React from 'react';
import {
  Check,
  Edit3,
  Circle,
  ChevronRight,
  FileSignature,
  Calendar,
  Type,
  CheckSquare,
} from 'lucide-react';

/**
 * Field types in a signing document
 */
export type SigningFieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox';

/**
 * Individual field in the signing flow
 */
export interface SigningField {
  id: string;
  type: SigningFieldType;
  label: string;
  required: boolean;
  completed: boolean;
  value?: string;
  page?: number;
}

/**
 * Progress bar props
 */
interface SignatureProgressBarProps {
  currentField: number;
  totalFields: number;
  fields?: SigningField[];
  variant?: 'default' | 'minimal' | 'detailed';
  showFieldCount?: boolean;
  className?: string;
}

/**
 * Field type icon mapping
 */
const FIELD_ICONS: Record<SigningFieldType, React.ElementType> = {
  signature: FileSignature,
  initials: Edit3,
  date: Calendar,
  text: Type,
  checkbox: CheckSquare,
};

/**
 * Field type labels
 */
const FIELD_LABELS: Record<SigningFieldType, string> = {
  signature: 'Signature',
  initials: 'Initials',
  date: 'Date',
  text: 'Text Field',
  checkbox: 'Checkbox',
};

/**
 * Main progress bar component
 */
export default function SignatureProgressBar({
  currentField,
  totalFields,
  fields,
  variant = 'default',
  showFieldCount = true,
  className = '',
}: SignatureProgressBarProps) {
  const progress = totalFields > 0 ? (currentField / totalFields) * 100 : 0;
  const isComplete = currentField >= totalFields;

  if (variant === 'minimal') {
    return (
      <SignatureProgressMinimal
        currentField={currentField}
        totalFields={totalFields}
        progress={progress}
        className={className}
      />
    );
  }

  if (variant === 'detailed' && fields) {
    return (
      <SignatureProgressDetailed
        fields={fields}
        currentFieldIndex={currentField - 1}
        className={className}
      />
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-neutral-light p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${isComplete ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}
          `}>
            {isComplete ? (
              <Check className="h-4 w-4" />
            ) : (
              <Edit3 className="h-4 w-4" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-neutral-darkest">
              {isComplete ? 'All fields completed!' : 'Signing Progress'}
            </h4>
            {showFieldCount && !isComplete && (
              <p className="text-sm text-neutral">
                Field {currentField} of {totalFields}
              </p>
            )}
          </div>
        </div>

        {/* Percentage */}
        <div className={`
          text-lg font-semibold
          ${isComplete ? 'text-success' : 'text-primary'}
        `}>
          {Math.round(progress)}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-neutral-light rounded-full overflow-hidden">
        <div
          className={`
            h-full rounded-full transition-all duration-500 ease-out
            ${isComplete ? 'bg-success' : 'bg-primary'}
          `}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Field dots indicator */}
      {totalFields <= 10 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {Array.from({ length: totalFields }).map((_, index) => (
            <div
              key={index}
              className={`
                w-2.5 h-2.5 rounded-full transition-all
                ${index < currentField
                  ? 'bg-primary scale-100'
                  : index === currentField
                  ? 'bg-primary/50 scale-125 ring-2 ring-primary/30'
                  : 'bg-neutral-light'
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal progress bar variant
 */
interface SignatureProgressMinimalProps {
  currentField: number;
  totalFields: number;
  progress: number;
  className?: string;
}

function SignatureProgressMinimal({
  currentField,
  totalFields,
  progress,
  className = '',
}: SignatureProgressMinimalProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Field count */}
      <span className="text-sm font-medium text-neutral-dark whitespace-nowrap">
        {currentField} / {totalFields}
      </span>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-neutral-light rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Percentage */}
      <span className="text-sm font-medium text-primary whitespace-nowrap">
        {Math.round(progress)}%
      </span>
    </div>
  );
}

/**
 * Detailed progress with field steps
 */
interface SignatureProgressDetailedProps {
  fields: SigningField[];
  currentFieldIndex: number;
  className?: string;
}

function SignatureProgressDetailed({
  fields,
  currentFieldIndex,
  className = '',
}: SignatureProgressDetailedProps) {
  // Show max 5 fields at a time, centered on current
  const maxVisible = 5;
  const startIndex = Math.max(
    0,
    Math.min(currentFieldIndex - 2, fields.length - maxVisible)
  );
  const visibleFields = fields.slice(startIndex, startIndex + maxVisible);
  const completedCount = fields.filter((f) => f.completed).length;

  return (
    <div className={`bg-white rounded-lg border border-neutral-light p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-neutral-dark">
          {completedCount} of {fields.length} fields completed
        </span>
        <span className="text-sm font-semibold text-primary">
          {Math.round((completedCount / fields.length) * 100)}%
        </span>
      </div>

      {/* Field steps */}
      <div className="flex items-center justify-between">
        {/* Show ellipsis if not at start */}
        {startIndex > 0 && (
          <div className="text-neutral-light text-sm mr-2">...</div>
        )}

        {visibleFields.map((field, index) => {
          const actualIndex = startIndex + index;
          const FieldIcon = FIELD_ICONS[field.type];
          const isCompleted = field.completed;
          const isCurrent = actualIndex === currentFieldIndex;

          return (
            <React.Fragment key={field.id}>
              {/* Field step */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${isCompleted
                      ? 'bg-success text-white'
                      : isCurrent
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-neutral-light text-neutral'}
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <FieldIcon className="h-5 w-5" />
                  )}
                </div>
                <span className={`
                  text-xs mt-1.5 whitespace-nowrap
                  ${isCurrent ? 'font-medium text-primary' : 'text-neutral'}
                `}>
                  {FIELD_LABELS[field.type]}
                </span>
              </div>

              {/* Connector line */}
              {index < visibleFields.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 bg-neutral-light relative">
                  {/* Progress fill */}
                  <div
                    className={`
                      absolute inset-y-0 left-0 transition-all
                      ${isCompleted ? 'bg-success w-full' : 'w-0'}
                    `}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Show ellipsis if not at end */}
        {startIndex + maxVisible < fields.length && (
          <div className="text-neutral-light text-sm ml-2">...</div>
        )}
      </div>
    </div>
  );
}

/**
 * Floating progress indicator (for overlay during signing)
 */
interface FloatingProgressProps {
  currentField: number;
  totalFields: number;
  currentFieldType?: SigningFieldType;
  onNext?: () => void;
  onPrevious?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
}

export function FloatingProgress({
  currentField,
  totalFields,
  currentFieldType,
  onNext,
  onPrevious,
  canGoNext = true,
  canGoPrevious = true,
}: FloatingProgressProps) {
  const progress = (currentField / totalFields) * 100;
  const FieldIcon = currentFieldType ? FIELD_ICONS[currentFieldType] : Edit3;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-neutral-darkest text-white rounded-full shadow-xl px-5 py-3 flex items-center gap-4">
        {/* Previous button */}
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
          aria-label="Previous field"
        >
          <ChevronRight className="h-5 w-5 rotate-180" />
        </button>

        {/* Field indicator */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <FieldIcon className="h-4 w-4" />
          </div>
          <div>
            <span className="text-sm font-medium">
              {currentFieldType ? FIELD_LABELS[currentFieldType] : 'Field'}
            </span>
            <span className="text-sm text-neutral-light ml-2">
              {currentField} of {totalFields}
            </span>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Next button */}
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30"
          aria-label="Next field"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Completion celebration component
 */
interface SigningCompleteProps {
  documentName: string;
  onDownload?: () => void;
  onContinue?: () => void;
}

export function SigningComplete({
  documentName,
  onDownload,
  onContinue,
}: SigningCompleteProps) {
  return (
    <div className="text-center py-8">
      {/* Success animation */}
      <div className="relative inline-block mb-6">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center animate-pulse">
          <Check className="h-10 w-10 text-success" />
        </div>
        {/* Celebration particles */}
        <div className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-warning animate-bounce" />
        <div className="absolute -top-1 -right-3 w-3 h-3 rounded-full bg-primary animate-bounce delay-100" />
        <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-secondary animate-bounce delay-200" />
      </div>

      <h2 className="text-2xl font-bold text-neutral-darkest mb-2">
        Signing Complete!
      </h2>
      <p className="text-neutral-dark mb-6 max-w-md mx-auto">
        You have successfully signed <strong>{documentName}</strong>.
        A copy has been saved to your documents.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onDownload && (
          <button
            onClick={onDownload}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors"
          >
            <FileSignature className="h-5 w-5" />
            Download Signed Copy
          </button>
        )}
        {onContinue && (
          <button
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Continue to Documents
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
