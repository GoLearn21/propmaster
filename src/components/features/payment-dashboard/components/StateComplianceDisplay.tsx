/**
 * State Compliance Display
 * Shows NC/SC/GA state-specific regulations for property management
 */

import React, { useState, useMemo } from 'react';
import { Card } from '../../../ui/Card';
import { Badge } from '../../../ui/Badge';
import { Button } from '../../../ui/Button';
import { toast } from 'sonner';
import {
  Scale,
  AlertTriangle,
  CheckCircle,
  Info,
  MapPin,
  Clock,
  DollarSign,
  Shield,
  FileText,
  Building,
  ExternalLink,
  X,
  ClipboardCheck,
  Square,
  CheckSquare,
  Printer,
  Download,
} from 'lucide-react';

interface StateRegulation {
  state: string;
  stateName: string;
  citation: string;
  lateFee: {
    gracePeriodDays: number;
    maxPercent: number | null;
    minFee: number | null;
    description: string;
  };
  securityDeposit: {
    maxMonths: number | null;
    returnDays: number;
    interestRequired: boolean;
    description: string;
  };
  escrow: {
    required: boolean;
    threshold: number | null;
    description: string;
  };
}

const STATE_REGULATIONS: StateRegulation[] = [
  {
    state: 'NC',
    stateName: 'North Carolina',
    citation: 'NC Gen. Stat. § 42-46 to 42-52',
    lateFee: {
      gracePeriodDays: 5,
      maxPercent: 5,
      minFee: 15,
      description: '5-day grace period required. Late fee: greater of 5% or $15.',
    },
    securityDeposit: {
      maxMonths: 2,
      returnDays: 30,
      interestRequired: false,
      description: 'Maximum 2 months rent. Must return within 30 days.',
    },
    escrow: {
      required: true,
      threshold: null,
      description: 'Security deposits must be held in trust account.',
    },
  },
  {
    state: 'SC',
    stateName: 'South Carolina',
    citation: 'SC Code § 27-40-410',
    lateFee: {
      gracePeriodDays: 5,
      maxPercent: null,
      minFee: null,
      description: 'Reasonable fee standard. Typically 5-10% is considered reasonable.',
    },
    securityDeposit: {
      maxMonths: null,
      returnDays: 30,
      interestRequired: false,
      description: 'No statutory limit on amount. Return within 30 days.',
    },
    escrow: {
      required: false,
      threshold: null,
      description: 'No escrow requirement.',
    },
  },
  {
    state: 'GA',
    stateName: 'Georgia (Atlanta)',
    citation: 'GA Code § 44-7-30 to 44-7-34',
    lateFee: {
      gracePeriodDays: 0,
      maxPercent: null,
      minFee: null,
      description: 'Late fee must be explicitly stated in lease agreement.',
    },
    securityDeposit: {
      maxMonths: null,
      returnDays: 30,
      interestRequired: false,
      description: 'No statutory limit. Return within 30 days (1 month).',
    },
    escrow: {
      required: true,
      threshold: 10,
      description: 'Escrow account required for landlords with 10+ units.',
    },
  },
];

// State statute URLs
const STATE_STATUTE_URLS: Record<string, { url: string; title: string }> = {
  NC: {
    url: 'https://www.ncleg.gov/Laws/GeneralStatuteSections/Chapter42',
    title: 'NC General Statutes Chapter 42 - Landlord and Tenant',
  },
  SC: {
    url: 'https://www.scstatehouse.gov/code/t27c040.php',
    title: 'SC Code Title 27 Chapter 40 - Residential Landlord and Tenant Act',
  },
  GA: {
    url: 'https://law.justia.com/codes/georgia/title-44/chapter-7/',
    title: 'GA Code Title 44 Chapter 7 - Landlord and Tenant',
  },
};

// Compliance checklist items per state
const STATE_CHECKLISTS: Record<string, { category: string; items: { id: string; label: string; description: string }[] }[]> = {
  NC: [
    {
      category: 'Late Fees',
      items: [
        { id: 'nc-lf-1', label: 'Grace period of 5 days provided', description: 'No late fee can be charged until rent is 5+ days late' },
        { id: 'nc-lf-2', label: 'Late fee does not exceed 5% or $15', description: 'Late fee is the greater of 5% of rent OR $15, but not more' },
        { id: 'nc-lf-3', label: 'Late fee terms in written lease', description: 'All late fee terms are clearly stated in the lease agreement' },
      ],
    },
    {
      category: 'Security Deposits',
      items: [
        { id: 'nc-sd-1', label: 'Deposit ≤ 2 months rent', description: 'Security deposit does not exceed 2 months rent' },
        { id: 'nc-sd-2', label: 'Held in trust account', description: 'Deposit is held in a licensed trust account in NC' },
        { id: 'nc-sd-3', label: 'Tenant notified of bank', description: 'Tenant received written notice of bank name and address' },
        { id: 'nc-sd-4', label: '30-day return process', description: 'Process in place to return deposit within 30 days of move-out' },
        { id: 'nc-sd-5', label: 'Itemized deduction statement', description: 'Itemized statement provided with any deductions' },
      ],
    },
    {
      category: 'General Compliance',
      items: [
        { id: 'nc-gc-1', label: 'Written lease agreement', description: 'All lease terms are documented in writing' },
        { id: 'nc-gc-2', label: 'Lead paint disclosure (pre-1978)', description: 'Lead paint disclosure provided for properties built before 1978' },
        { id: 'nc-gc-3', label: 'Habitability standards met', description: 'Property meets all NC habitability requirements' },
      ],
    },
  ],
  SC: [
    {
      category: 'Late Fees',
      items: [
        { id: 'sc-lf-1', label: 'Reasonable late fee amount', description: 'Late fee is reasonable (typically 5-10% of monthly rent)' },
        { id: 'sc-lf-2', label: 'Late fee terms in lease', description: 'Late fee terms clearly stated in lease agreement' },
        { id: 'sc-lf-3', label: 'Consistent fee application', description: 'Late fees applied consistently to all tenants' },
      ],
    },
    {
      category: 'Security Deposits',
      items: [
        { id: 'sc-sd-1', label: 'Deposit amount documented', description: 'Security deposit amount clearly stated in lease' },
        { id: 'sc-sd-2', label: '30-day return timeline', description: 'Deposit returned within 30 days of move-out' },
        { id: 'sc-sd-3', label: 'Itemized statement provided', description: 'Written itemized statement provided with any deductions' },
        { id: 'sc-sd-4', label: 'Forwarding address requested', description: 'Process to request tenant forwarding address at move-out' },
      ],
    },
    {
      category: 'General Compliance',
      items: [
        { id: 'sc-gc-1', label: 'Written lease agreement', description: 'All lease terms documented in writing' },
        { id: 'sc-gc-2', label: 'Property disclosure provided', description: 'Required property disclosures made to tenant' },
        { id: 'sc-gc-3', label: 'Habitability maintained', description: 'Property maintains SC habitability standards' },
      ],
    },
  ],
  GA: [
    {
      category: 'Late Fees',
      items: [
        { id: 'ga-lf-1', label: 'Late fee in lease agreement', description: 'Late fee amount explicitly stated in signed lease' },
        { id: 'ga-lf-2', label: 'Reasonable fee amount', description: 'Late fee is reasonable relative to rent amount' },
        { id: 'ga-lf-3', label: 'Grace period if specified', description: 'Any promised grace period is honored' },
      ],
    },
    {
      category: 'Security Deposits',
      items: [
        { id: 'ga-sd-1', label: 'Move-in inspection done', description: 'Move-in inspection completed and documented' },
        { id: 'ga-sd-2', label: 'Escrow account (10+ units)', description: 'Deposits held in escrow if managing 10+ units' },
        { id: 'ga-sd-3', label: '30-day return timeline', description: 'Deposit returned within 30 days (1 month) of move-out' },
        { id: 'ga-sd-4', label: 'Itemized deductions provided', description: 'Written itemized statement provided with deductions' },
        { id: 'ga-sd-5', label: 'Move-out inspection offered', description: 'Tenant offered opportunity to be present at move-out inspection' },
      ],
    },
    {
      category: 'General Compliance',
      items: [
        { id: 'ga-gc-1', label: 'Written lease agreement', description: 'All material terms in writing' },
        { id: 'ga-gc-2', label: 'Flood zone disclosure', description: 'Tenant informed if property is in flood zone' },
        { id: 'ga-gc-3', label: 'Mold disclosure if known', description: 'Known mold issues disclosed to tenant' },
        { id: 'ga-gc-4', label: 'Owner/agent identification', description: 'Tenant provided with owner or authorized agent contact info' },
      ],
    },
  ],
};

interface StateComplianceDisplayProps {
  selectedState?: string;
  onStateSelect?: (state: string) => void;
}

export const StateComplianceDisplay: React.FC<StateComplianceDisplayProps> = ({
  selectedState,
  onStateSelect,
}) => {
  const [activeState, setActiveState] = useState(selectedState || 'NC');
  const [complianceStatus, setComplianceStatus] = useState<Record<string, boolean>>({
    NC: true,
    SC: true,
    GA: true,
  });

  // Modal states
  const [showStatuteModal, setShowStatuteModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  const handleStateSelect = (state: string) => {
    setActiveState(state);
    onStateSelect?.(state);
  };

  const activeRegulation = STATE_REGULATIONS.find((r) => r.state === activeState);

  // Initialize checklist state when opening modal
  const openChecklistModal = () => {
    const checklist = STATE_CHECKLISTS[activeState];
    if (checklist) {
      const initialState: Record<string, boolean> = {};
      checklist.forEach(category => {
        category.items.forEach(item => {
          // Load from localStorage or default to false
          const savedState = localStorage.getItem(`compliance-${item.id}`);
          initialState[item.id] = savedState === 'true';
        });
      });
      setChecklistState(initialState);
    }
    setShowChecklistModal(true);
  };

  // Toggle checklist item and save to localStorage
  const toggleChecklistItem = (itemId: string) => {
    setChecklistState(prev => {
      const newState = { ...prev, [itemId]: !prev[itemId] };
      localStorage.setItem(`compliance-${itemId}`, String(newState[itemId]));
      return newState;
    });
  };

  // Calculate compliance percentage for current state
  const complianceStats = useMemo(() => {
    const checklist = STATE_CHECKLISTS[activeState];
    if (!checklist) return { completed: 0, total: 0, percentage: 0 };

    let completed = 0;
    let total = 0;

    checklist.forEach(category => {
      category.items.forEach(item => {
        total++;
        if (checklistState[item.id]) completed++;
      });
    });

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [activeState, checklistState]);

  // Handle View Full Statute
  const handleViewStatute = () => {
    setShowStatuteModal(true);
  };

  // Open external statute link
  const openStatuteLink = () => {
    const statuteInfo = STATE_STATUTE_URLS[activeState];
    if (statuteInfo) {
      window.open(statuteInfo.url, '_blank', 'noopener,noreferrer');
      toast.success(`Opening ${activeState} statute in new tab`);
    }
  };

  // Print checklist
  const printChecklist = () => {
    const checklist = STATE_CHECKLISTS[activeState];
    if (!checklist) return;

    const printContent = checklist.map(category => {
      const items = category.items.map(item =>
        `  ${checklistState[item.id] ? '✓' : '☐'} ${item.label}\n    ${item.description}`
      ).join('\n\n');
      return `${category.category}\n${'─'.repeat(40)}\n${items}`;
    }).join('\n\n');

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${activeState} Compliance Checklist</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; }
              h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
              pre { white-space: pre-wrap; font-size: 14px; line-height: 1.8; }
              .date { color: #666; font-size: 12px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>${STATE_REGULATIONS.find(r => r.state === activeState)?.stateName} Compliance Checklist</h1>
            <pre>${printContent}</pre>
            <p class="date">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success('Checklist opened for printing');
  };

  // Download checklist as PDF (text format)
  const downloadChecklist = () => {
    const checklist = STATE_CHECKLISTS[activeState];
    if (!checklist) return;

    const content = checklist.map(category => {
      const items = category.items.map(item =>
        `  [${checklistState[item.id] ? 'X' : ' '}] ${item.label}\n      ${item.description}`
      ).join('\n\n');
      return `${category.category}\n${'='.repeat(50)}\n${items}`;
    }).join('\n\n\n');

    const fullContent = `${STATE_REGULATIONS.find(r => r.state === activeState)?.stateName} COMPLIANCE CHECKLIST
${'='.repeat(60)}
Citation: ${activeRegulation?.citation}
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

${content}

---
PropMaster Property Management System
`;

    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeState}-compliance-checklist-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Checklist downloaded');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-h3 font-semibold text-neutral-black">
                State Compliance Center
              </h2>
              <p className="text-small text-neutral-medium">
                NC, SC, and Georgia property management regulations
              </p>
            </div>
          </div>
          <Badge variant="default" className="bg-accent-green text-accent-foreground">
            All States Compliant
          </Badge>
        </div>

        {/* State Selector */}
        <div className="flex gap-4">
          {STATE_REGULATIONS.map((reg) => (
            <button
              key={reg.state}
              onClick={() => handleStateSelect(reg.state)}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                activeState === reg.state
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-neutral-black">{reg.state}</span>
                </div>
                {complianceStatus[reg.state] ? (
                  <CheckCircle className="h-5 w-5 text-accent-green" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-status-error" />
                )}
              </div>
              <p className="text-small text-neutral-medium text-left">{reg.stateName}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Active State Details */}
      {activeRegulation && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Late Fee Rules */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent-orange/10">
                <Clock className="h-5 w-5 text-accent-orange" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-black">Late Fee Rules</h3>
                <p className="text-small text-neutral-medium">{activeRegulation.citation}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-neutral-medium">Grace Period</span>
                <span className="font-semibold">
                  {activeRegulation.lateFee.gracePeriodDays > 0
                    ? `${activeRegulation.lateFee.gracePeriodDays} days`
                    : 'Not required'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-neutral-medium">Maximum Fee</span>
                <span className="font-semibold">
                  {activeRegulation.lateFee.maxPercent
                    ? `${activeRegulation.lateFee.maxPercent}%`
                    : 'Reasonable standard'}
                </span>
              </div>

              {activeRegulation.lateFee.minFee && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-neutral-medium">Minimum Fee</span>
                  <span className="font-semibold">${activeRegulation.lateFee.minFee}</span>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-small text-blue-800">
                    {activeRegulation.lateFee.description}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Security Deposit Rules */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-black">Security Deposit</h3>
                <p className="text-small text-neutral-medium">Maximum & return requirements</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-neutral-medium">Maximum Amount</span>
                <span className="font-semibold">
                  {activeRegulation.securityDeposit.maxMonths
                    ? `${activeRegulation.securityDeposit.maxMonths} months rent`
                    : 'No statutory limit'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-neutral-medium">Return Deadline</span>
                <span className="font-semibold">
                  {activeRegulation.securityDeposit.returnDays} days
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-neutral-medium">Interest Required</span>
                <span className="font-semibold">
                  {activeRegulation.securityDeposit.interestRequired ? 'Yes' : 'No'}
                </span>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-small text-blue-800">
                    {activeRegulation.securityDeposit.description}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Escrow Requirements */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent-green/10">
                <Shield className="h-5 w-5 text-accent-green" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-black">Escrow / Trust Account</h3>
                <p className="text-small text-neutral-medium">Deposit holding requirements</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-neutral-medium">Required</span>
                <Badge
                  variant={activeRegulation.escrow.required ? 'default' : 'secondary'}
                  className={
                    activeRegulation.escrow.required
                      ? 'bg-accent-green text-accent-foreground'
                      : ''
                  }
                >
                  {activeRegulation.escrow.required ? 'Yes' : 'No'}
                </Badge>
              </div>

              {activeRegulation.escrow.threshold && (
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-neutral-medium">Unit Threshold</span>
                  <span className="font-semibold">{activeRegulation.escrow.threshold}+ units</span>
                </div>
              )}

              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-small text-blue-800">
                    {activeRegulation.escrow.description}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Legal Resources */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-neutral-light">
                <FileText className="h-5 w-5 text-neutral-black" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-black">Legal Resources</h3>
                <p className="text-small text-neutral-medium">Reference materials</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-neutral-lighter rounded-lg">
                <p className="text-small font-medium text-neutral-black mb-1">
                  Statutory Citation
                </p>
                <p className="text-small text-neutral-medium">{activeRegulation.citation}</p>
              </div>

              <Button variant="outline" className="w-full" onClick={handleViewStatute}>
                <FileText className="h-4 w-4 mr-2" />
                View Full Statute
              </Button>

              <Button variant="outline" className="w-full" onClick={openChecklistModal}>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Compliance Checklist
                {complianceStats.total > 0 && (
                  <Badge className="ml-2 bg-primary text-white text-xs">
                    {complianceStats.completed}/{complianceStats.total}
                  </Badge>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Compliance Warnings */}
      <Card className="p-6 border-l-4 border-accent-orange">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-accent-orange mt-0.5" />
          <div>
            <h3 className="font-semibold text-neutral-black mb-2">Important Reminders</h3>
            <ul className="space-y-2 text-small text-neutral-medium">
              <li>
                • <strong>NC:</strong> Always wait 5 full days before assessing late fees
              </li>
              <li>
                • <strong>NC:</strong> Security deposits cannot exceed 2 months rent
              </li>
              <li>
                • <strong>GA:</strong> Properties with 10+ units require escrow accounts
              </li>
              <li>
                • <strong>All States:</strong> Return security deposits within 30 days
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* View Full Statute Modal */}
      {showStatuteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">State Statute Reference</h2>
                  <p className="text-small text-neutral-medium mt-1">{activeRegulation?.stateName}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowStatuteModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Statute Info */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Scale className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-small font-medium text-blue-900">Official Citation</p>
                      <p className="text-small text-blue-700 mt-1">{activeRegulation?.citation}</p>
                    </div>
                  </div>
                </div>

                {/* Statute Summary */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-neutral-black">Key Provisions</h4>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium text-neutral-black">Late Fee Requirements</span>
                    </div>
                    <p className="text-small text-neutral-medium">{activeRegulation?.lateFee.description}</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-medium text-neutral-black">Security Deposit Requirements</span>
                    </div>
                    <p className="text-small text-neutral-medium">{activeRegulation?.securityDeposit.description}</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="font-medium text-neutral-black">Escrow Requirements</span>
                    </div>
                    <p className="text-small text-neutral-medium">{activeRegulation?.escrow.description}</p>
                  </div>
                </div>

                {/* External Link */}
                <div className="p-4 bg-neutral-lighter rounded-lg">
                  <p className="text-small text-neutral-medium mb-3">
                    For the complete official statute text, visit the state legislature website:
                  </p>
                  <Button onClick={openStatuteLink} className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open {STATE_STATUTE_URLS[activeState]?.title}
                  </Button>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="text-small font-medium text-amber-800">Legal Disclaimer</p>
                      <p className="text-xs text-amber-700 mt-1">
                        This is a summary for educational purposes only. Always consult with a licensed
                        attorney for legal advice regarding landlord-tenant laws in your jurisdiction.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setShowStatuteModal(false)}>Close</Button>
                <Button onClick={openStatuteLink}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Official Statute
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Compliance Checklist Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-h3 font-bold text-neutral-black">
                    {activeRegulation?.stateName} Compliance Checklist
                  </h2>
                  <p className="text-small text-neutral-medium mt-1">
                    Track your compliance with state landlord-tenant laws
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowChecklistModal(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-small text-neutral-medium">Compliance Progress</span>
                  <span className={`text-small font-medium ${
                    complianceStats.percentage === 100 ? 'text-green-600' :
                    complianceStats.percentage >= 75 ? 'text-blue-600' :
                    complianceStats.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {complianceStats.completed} of {complianceStats.total} items ({complianceStats.percentage}%)
                  </span>
                </div>
                <div className="h-3 bg-neutral-lighter rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      complianceStats.percentage === 100 ? 'bg-green-500' :
                      complianceStats.percentage >= 75 ? 'bg-blue-500' :
                      complianceStats.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${complianceStats.percentage}%` }}
                  />
                </div>
              </div>

              {/* Checklist Items */}
              <div className="space-y-6">
                {STATE_CHECKLISTS[activeState]?.map((category) => (
                  <div key={category.category} className="border border-border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-neutral-lighter border-b border-border">
                      <h4 className="font-semibold text-neutral-black">{category.category}</h4>
                    </div>
                    <div className="divide-y divide-border">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-4 cursor-pointer transition-colors hover:bg-neutral-lighter/50 ${
                            checklistState[item.id] ? 'bg-green-50/50' : ''
                          }`}
                          onClick={() => toggleChecklistItem(item.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {checklistState[item.id] ? (
                                <CheckSquare className="h-5 w-5 text-green-600" />
                              ) : (
                                <Square className="h-5 w-5 text-neutral-medium" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className={`text-small font-medium ${
                                checklistState[item.id] ? 'text-green-800 line-through' : 'text-neutral-black'
                              }`}>
                                {item.label}
                              </p>
                              <p className="text-xs text-neutral-medium mt-1">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Completion Status */}
              {complianceStats.percentage === 100 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-800">Fully Compliant!</p>
                      <p className="text-small text-green-700">
                        All {activeState} compliance items have been verified.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-border">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={printChecklist}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadChecklist}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                <Button onClick={() => setShowChecklistModal(false)}>Done</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StateComplianceDisplay;
