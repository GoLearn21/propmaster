/**
 * Payment Method Card Component
 * Displays saved credit cards and bank accounts
 * Supports selection, default setting, and deletion
 */

import React from 'react';
import { CreditCard, Building2, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { PaymentMethod, getCardBrandIcon, formatCardExpiry, isCardExpired } from '../../services/tenant/stripeService';

interface PaymentMethodCardProps {
  method: PaymentMethod;
  selected?: boolean;
  onSelect?: () => void;
  onSetDefault?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  disabled?: boolean;
}

/**
 * Card brand logos (inline SVG or use Stripe's hosted images)
 */
const cardBrandLogos: Record<string, string> = {
  visa: 'https://js.stripe.com/v3/fingerprinted/img/visa-729c05c240c4bdb47b03ac81d9945bfe.svg',
  mastercard: 'https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg',
  amex: 'https://js.stripe.com/v3/fingerprinted/img/amex-a49b82f46c5cd6a96a6e418a6ca1717c.svg',
  discover: 'https://js.stripe.com/v3/fingerprinted/img/discover-ac52cd46f89fa40a29a0bfb954e33173.svg',
  diners: 'https://js.stripe.com/v3/fingerprinted/img/diners-fbcba0b73da545ac9d2d527b29e2c0a8.svg',
  jcb: 'https://js.stripe.com/v3/fingerprinted/img/jcb-271067874f48a0a0f3da2dc0bb0d14e5.svg',
  unionpay: 'https://js.stripe.com/v3/fingerprinted/img/unionpay-8a10aefc7295216c338ba4e1224627a1.svg',
};

export default function PaymentMethodCard({
  method,
  selected = false,
  onSelect,
  onSetDefault,
  onDelete,
  showActions = true,
  disabled = false,
}: PaymentMethodCardProps) {
  const isCard = method.type === 'card';
  const isBank = method.type === 'us_bank_account';
  const expired = isCard && method.exp_month && method.exp_year
    ? isCardExpired(method.exp_month, method.exp_year)
    : false;

  /**
   * Handle card click
   */
  const handleClick = () => {
    if (onSelect && !disabled && !expired) {
      onSelect();
    }
  };

  /**
   * Handle delete click
   */
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };

  /**
   * Handle set default click
   */
  const handleSetDefault = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSetDefault) onSetDefault();
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative flex items-center gap-4 p-4 rounded-lg border-2 transition-all
        ${onSelect ? 'cursor-pointer' : ''}
        ${selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-neutral-light hover:border-neutral'
        }
        ${disabled || expired ? 'opacity-60 cursor-not-allowed' : ''}
      `}
    >
      {/* Selection Radio */}
      {onSelect && (
        <div className="flex-shrink-0">
          <div
            className={`
              h-5 w-5 rounded-full border-2 flex items-center justify-center
              ${selected ? 'border-primary bg-primary' : 'border-neutral'}
            `}
          >
            {selected && (
              <div className="h-2 w-2 rounded-full bg-white" />
            )}
          </div>
        </div>
      )}

      {/* Icon */}
      <div className="flex-shrink-0">
        {isCard ? (
          method.brand && cardBrandLogos[method.brand.toLowerCase()] ? (
            <img
              src={cardBrandLogos[method.brand.toLowerCase()]}
              alt={method.brand}
              className="h-8 w-auto"
            />
          ) : (
            <div className="flex h-10 w-14 items-center justify-center rounded bg-neutral-lightest">
              <CreditCard className="h-5 w-5 text-neutral" />
            </div>
          )
        ) : (
          <div className="flex h-10 w-14 items-center justify-center rounded bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-neutral-darkest truncate">
            {isCard
              ? `${method.brand?.charAt(0).toUpperCase()}${method.brand?.slice(1) || 'Card'} ****${method.last4}`
              : `${method.bank_name || 'Bank Account'} ****${method.last4}`
            }
          </span>

          {/* Badges */}
          {method.is_default && (
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              Default
            </span>
          )}
          {expired && (
            <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium bg-error/10 text-error rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Expired
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1">
          {/* Card expiry or bank account type */}
          {isCard && method.exp_month && method.exp_year && (
            <span className={`text-sm ${expired ? 'text-error' : 'text-neutral'}`}>
              Expires {formatCardExpiry(method.exp_month, method.exp_year)}
            </span>
          )}
          {isBank && method.account_type && (
            <span className="text-sm text-neutral capitalize">
              {method.account_type} account
            </span>
          )}

          {/* Verification status for bank accounts */}
          {isBank && (
            <span className={`text-xs flex items-center gap-1 ${method.is_verified ? 'text-success' : 'text-warning'}`}>
              <CheckCircle className="h-3 w-3" />
              {method.is_verified ? 'Verified' : 'Pending verification'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex-shrink-0 flex items-center gap-2">
          {!method.is_default && onSetDefault && (
            <button
              onClick={handleSetDefault}
              className="text-xs text-primary hover:text-primary-dark transition-colors px-2 py-1 rounded hover:bg-primary/5"
            >
              Set Default
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-2 text-neutral hover:text-error hover:bg-error/10 rounded-lg transition-colors"
              title="Remove payment method"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Payment Method List Component
 * Displays a list of payment methods with selection
 */
interface PaymentMethodListProps {
  methods: PaymentMethod[];
  selectedId?: string;
  onSelect?: (method: PaymentMethod) => void;
  onSetDefault?: (methodId: string) => void;
  onDelete?: (methodId: string) => void;
  showActions?: boolean;
  emptyMessage?: string;
}

export function PaymentMethodList({
  methods,
  selectedId,
  onSelect,
  onSetDefault,
  onDelete,
  showActions = true,
  emptyMessage = 'No payment methods saved',
}: PaymentMethodListProps) {
  if (methods.length === 0) {
    return (
      <div className="text-center py-8 text-neutral">
        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Sort: default first, then by creation date
  const sortedMethods = [...methods].sort((a, b) => {
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-3">
      {sortedMethods.map((method) => (
        <PaymentMethodCard
          key={method.id}
          method={method}
          selected={method.id === selectedId}
          onSelect={onSelect ? () => onSelect(method) : undefined}
          onSetDefault={onSetDefault && !method.is_default ? () => onSetDefault(method.id) : undefined}
          onDelete={onDelete ? () => onDelete(method.id) : undefined}
          showActions={showActions}
        />
      ))}
    </div>
  );
}

/**
 * Compact Payment Method Display
 * For showing selected payment method in forms
 */
interface CompactPaymentMethodProps {
  method: PaymentMethod;
  onChange?: () => void;
}

export function CompactPaymentMethod({ method, onChange }: CompactPaymentMethodProps) {
  const isCard = method.type === 'card';

  return (
    <div className="flex items-center justify-between p-3 bg-neutral-lightest rounded-lg">
      <div className="flex items-center gap-3">
        {isCard ? (
          method.brand && cardBrandLogos[method.brand.toLowerCase()] ? (
            <img
              src={cardBrandLogos[method.brand.toLowerCase()]}
              alt={method.brand}
              className="h-6 w-auto"
            />
          ) : (
            <CreditCard className="h-5 w-5 text-neutral" />
          )
        ) : (
          <Building2 className="h-5 w-5 text-primary" />
        )}
        <span className="text-sm font-medium text-neutral-darkest">
          ****{method.last4}
        </span>
        {method.is_default && (
          <span className="text-xs text-neutral">(Default)</span>
        )}
      </div>
      {onChange && (
        <button
          onClick={onChange}
          className="text-sm text-primary hover:text-primary-dark transition-colors"
        >
          Change
        </button>
      )}
    </div>
  );
}
