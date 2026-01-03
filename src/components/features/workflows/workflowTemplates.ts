/**
 * Workflow Templates
 * Pre-defined workflows for common property management operations
 */

import { Workflow } from './types';

export const WORKFLOW_TEMPLATES: Workflow[] = [
  // ===== TENANT WORKFLOWS =====
  {
    id: 'new-tenant-onboarding',
    title: 'New Tenant Onboarding',
    description: 'Complete guide for screening and onboarding a new tenant from application to move-in',
    category: 'tenant',
    icon: 'UserPlus',
    color: 'bg-blue-500',
    estimatedTotalMinutes: 120,
    frequency: 'as-needed',
    complianceNotes: [
      'Fair Housing Act compliance required',
      'Consistent screening criteria for all applicants',
      'Security deposit limits vary by state'
    ],
    stateVariations: [
      { state: 'NC', notes: ['Max security deposit: 2 months rent', '5-day grace period required'] },
      { state: 'SC', notes: ['No statutory deposit limit', '5-day grace period common'] },
      { state: 'GA', notes: ['No statutory deposit limit', 'Move-in inspection recommended'] }
    ],
    steps: [
      {
        id: 'receive-application',
        title: 'Receive & Review Application',
        description: 'Collect completed rental application with required documents',
        status: 'pending',
        navigateTo: '/leasing',
        queryParams: { tab: 'applications' },
        actionLabel: 'View Applications',
        estimatedMinutes: 15,
        required: true,
        tips: [
          'Verify all fields are completed',
          'Collect government-issued ID',
          'Require proof of income (3x rent)'
        ],
        checklist: [
          { id: 'app-complete', label: 'Application fully completed', completed: false },
          { id: 'id-collected', label: 'Government ID collected', completed: false },
          { id: 'income-proof', label: 'Proof of income received', completed: false },
          { id: 'references', label: 'References provided', completed: false }
        ]
      },
      {
        id: 'background-check',
        title: 'Run Background & Credit Check',
        description: 'Perform credit, criminal, and eviction history screening',
        status: 'pending',
        navigateTo: '/leasing',
        queryParams: { tab: 'screening' },
        actionLabel: 'Run Screening',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['receive-application'],
        tips: [
          'Use consistent criteria for all applicants',
          'Document reasons for any denial',
          'Provide adverse action notice if denied'
        ],
        checklist: [
          { id: 'credit-check', label: 'Credit check completed', completed: false },
          { id: 'criminal-check', label: 'Criminal background check', completed: false },
          { id: 'eviction-check', label: 'Eviction history check', completed: false },
          { id: 'employment-verify', label: 'Employment verified', completed: false }
        ]
      },
      {
        id: 'approve-deny',
        title: 'Make Approval Decision',
        description: 'Review screening results and approve or deny application',
        status: 'pending',
        navigateTo: '/leasing',
        queryParams: { tab: 'applications' },
        actionLabel: 'Review Decision',
        estimatedMinutes: 15,
        required: true,
        dependsOn: ['background-check'],
        tips: [
          'Document decision criteria',
          'If denying, prepare adverse action letter',
          'Keep records for at least 3 years'
        ]
      },
      {
        id: 'prepare-lease',
        title: 'Prepare Lease Agreement',
        description: 'Generate state-compliant lease with all required disclosures',
        status: 'pending',
        navigateTo: '/leasing',
        queryParams: { tab: 'leases', action: 'new' },
        actionLabel: 'Create Lease',
        estimatedMinutes: 20,
        required: true,
        dependsOn: ['approve-deny'],
        tips: [
          'Include all state-required disclosures',
          'Specify rent amount, due date, late fees',
          'List all occupants and pets'
        ],
        checklist: [
          { id: 'lease-terms', label: 'Lease terms specified', completed: false },
          { id: 'disclosures', label: 'Required disclosures included', completed: false },
          { id: 'rules', label: 'Property rules attached', completed: false },
          { id: 'lead-paint', label: 'Lead paint disclosure (if applicable)', completed: false }
        ]
      },
      {
        id: 'collect-deposit',
        title: 'Collect Security Deposit',
        description: 'Collect security deposit and first month rent',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'deposits' },
        actionLabel: 'Record Deposit',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['prepare-lease'],
        tips: [
          'NC: Max 2 months rent for security deposit',
          'Provide receipt for all funds collected',
          'Deposit in escrow account within required timeframe'
        ]
      },
      {
        id: 'sign-lease',
        title: 'Execute Lease Agreement',
        description: 'Have all parties sign the lease agreement',
        status: 'pending',
        navigateTo: '/leasing',
        queryParams: { tab: 'leases' },
        actionLabel: 'Sign Lease',
        estimatedMinutes: 15,
        required: true,
        dependsOn: ['collect-deposit'],
        tips: [
          'Ensure all parties sign and date',
          'Provide copy to tenant within required timeframe',
          'Store original securely'
        ]
      },
      {
        id: 'move-in-inspection',
        title: 'Conduct Move-In Inspection',
        description: 'Document property condition with tenant present',
        status: 'pending',
        navigateTo: '/rentals',
        queryParams: { action: 'inspection' },
        actionLabel: 'Start Inspection',
        estimatedMinutes: 30,
        required: true,
        dependsOn: ['sign-lease'],
        tips: [
          'Take dated photos of all rooms',
          'Note any existing damage',
          'Have tenant sign inspection report'
        ],
        checklist: [
          { id: 'photos', label: 'Photos taken of all rooms', completed: false },
          { id: 'checklist-complete', label: 'Inspection checklist completed', completed: false },
          { id: 'tenant-signed', label: 'Tenant signed inspection report', completed: false },
          { id: 'keys-provided', label: 'Keys provided to tenant', completed: false }
        ]
      },
      {
        id: 'setup-portal',
        title: 'Set Up Tenant Portal',
        description: 'Create tenant account for online payments and communication',
        status: 'pending',
        navigateTo: '/people',
        queryParams: { tab: 'tenants' },
        actionLabel: 'Setup Portal',
        estimatedMinutes: 5,
        required: false,
        dependsOn: ['sign-lease'],
        tips: [
          'Send portal invitation email',
          'Explain online payment benefits',
          'Show how to submit maintenance requests'
        ]
      }
    ]
  },

  // ===== RENT COLLECTION WORKFLOW =====
  {
    id: 'monthly-rent-collection',
    title: 'Monthly Rent Collection',
    description: 'Systematic process for collecting rent and handling late payments',
    category: 'financial',
    icon: 'DollarSign',
    color: 'bg-green-500',
    estimatedTotalMinutes: 45,
    frequency: 'monthly',
    complianceNotes: [
      'Late fees must comply with state limits',
      'Grace periods required in some states',
      'Proper notice required before eviction'
    ],
    stateVariations: [
      { state: 'NC', notes: ['5-day grace period required', 'Late fee: $15 or 5% max'] },
      { state: 'SC', notes: ['No mandatory grace period', 'Late fee must be reasonable'] },
      { state: 'GA', notes: ['No mandatory grace period', 'Late fee typically 5-10%'] }
    ],
    steps: [
      {
        id: 'send-reminders',
        title: 'Send Payment Reminders',
        description: 'Send friendly rent reminder before due date',
        status: 'pending',
        navigateTo: '/comms',
        queryParams: { template: 'rent-reminder' },
        actionLabel: 'Send Reminders',
        estimatedMinutes: 10,
        required: false,
        tips: [
          'Send 3-5 days before due date',
          'Include payment portal link',
          'Confirm amount due'
        ]
      },
      {
        id: 'process-payments',
        title: 'Process Received Payments',
        description: 'Record and reconcile payments received',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'history' },
        actionLabel: 'View Payments',
        estimatedMinutes: 15,
        required: true,
        tips: [
          'Match payments to correct tenants',
          'Record payment method and date',
          'Issue receipts'
        ]
      },
      {
        id: 'identify-late',
        title: 'Identify Late Payments',
        description: 'After grace period, identify unpaid rent',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'aging' },
        actionLabel: 'View AR Aging',
        estimatedMinutes: 5,
        required: true,
        dependsOn: ['process-payments'],
        tips: [
          'Wait until grace period expires',
          'NC/SC: 5-day grace period',
          'Document all late payments'
        ]
      },
      {
        id: 'apply-late-fees',
        title: 'Apply Late Fees',
        description: 'Post late fees per lease agreement and state law',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'latefees' },
        actionLabel: 'Post Late Fees',
        estimatedMinutes: 5,
        required: true,
        dependsOn: ['identify-late'],
        tips: [
          'Verify late fee complies with state limits',
          'NC: Max $15 or 5% of rent',
          'Document in tenant ledger'
        ]
      },
      {
        id: 'send-late-notice',
        title: 'Send Late Payment Notice',
        description: 'Notify tenant of outstanding balance',
        status: 'pending',
        navigateTo: '/comms',
        queryParams: { template: 'late-notice' },
        actionLabel: 'Send Notice',
        estimatedMinutes: 5,
        required: true,
        dependsOn: ['apply-late-fees'],
        tips: [
          'Include total amount due',
          'Specify payment deadline',
          'Keep copy for records'
        ]
      },
      {
        id: 'follow-up',
        title: 'Follow Up & Payment Plan',
        description: 'Contact tenant and consider payment arrangement',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'plans' },
        actionLabel: 'Create Payment Plan',
        estimatedMinutes: 10,
        required: false,
        dependsOn: ['send-late-notice'],
        tips: [
          'Attempt phone contact',
          'Document all communication',
          'Consider payment plan for hardship cases'
        ]
      }
    ]
  },

  // ===== MOVE-OUT WORKFLOW =====
  {
    id: 'tenant-move-out',
    title: 'Tenant Move-Out Process',
    description: 'Handle move-out notice through deposit return and unit turnover',
    category: 'tenant',
    icon: 'LogOut',
    color: 'bg-orange-500',
    estimatedTotalMinutes: 90,
    frequency: 'as-needed',
    complianceNotes: [
      'Security deposit return deadlines are strict',
      'Itemized deduction statements required',
      'Proper notice timelines must be followed'
    ],
    stateVariations: [
      { state: 'NC', notes: ['30-day deposit return deadline', 'Interim accounting within 30 days if repairs needed'] },
      { state: 'SC', notes: ['30-day deposit return deadline', 'Written itemization required'] },
      { state: 'GA', notes: ['30-day deposit return deadline', '3-day inspection notice required'] }
    ],
    steps: [
      {
        id: 'receive-notice',
        title: 'Receive Move-Out Notice',
        description: 'Document receipt of tenant move-out notice',
        status: 'pending',
        navigateTo: '/leasing',
        queryParams: { tab: 'leases' },
        actionLabel: 'View Leases',
        estimatedMinutes: 5,
        required: true,
        tips: [
          'Confirm notice period meets lease requirements',
          'Document date notice received',
          'Send acknowledgment to tenant'
        ],
        checklist: [
          { id: 'notice-date', label: 'Notice date documented', completed: false },
          { id: 'move-out-date', label: 'Move-out date confirmed', completed: false },
          { id: 'ack-sent', label: 'Acknowledgment sent to tenant', completed: false }
        ]
      },
      {
        id: 'schedule-inspection',
        title: 'Schedule Move-Out Inspection',
        description: 'Coordinate inspection date with tenant',
        status: 'pending',
        navigateTo: '/calendar',
        actionLabel: 'Schedule Inspection',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['receive-notice'],
        tips: [
          'GA requires 3-day advance notice',
          'Schedule during daylight hours',
          'Allow tenant to be present'
        ]
      },
      {
        id: 'conduct-inspection',
        title: 'Conduct Move-Out Inspection',
        description: 'Document property condition and any damages',
        status: 'pending',
        navigateTo: '/rentals',
        queryParams: { action: 'inspection' },
        actionLabel: 'Start Inspection',
        estimatedMinutes: 30,
        required: true,
        dependsOn: ['schedule-inspection'],
        tips: [
          'Compare to move-in inspection',
          'Document all damages with photos',
          'Note normal wear and tear vs damage'
        ],
        checklist: [
          { id: 'photos-taken', label: 'Photos taken of all areas', completed: false },
          { id: 'damage-noted', label: 'Damages documented', completed: false },
          { id: 'compare-move-in', label: 'Compared to move-in report', completed: false },
          { id: 'keys-collected', label: 'All keys collected', completed: false }
        ]
      },
      {
        id: 'calculate-deductions',
        title: 'Calculate Deposit Deductions',
        description: 'Itemize legitimate deductions from security deposit',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'deposits' },
        actionLabel: 'Calculate Deductions',
        estimatedMinutes: 15,
        required: true,
        dependsOn: ['conduct-inspection'],
        tips: [
          'Only deduct for damage beyond normal wear',
          'Get repair estimates/invoices',
          'Include unpaid rent or fees'
        ]
      },
      {
        id: 'prepare-statement',
        title: 'Prepare Itemized Statement',
        description: 'Create detailed accounting of deposit disposition',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'deposits' },
        actionLabel: 'Create Statement',
        estimatedMinutes: 15,
        required: true,
        dependsOn: ['calculate-deductions'],
        tips: [
          'Include all deductions with amounts',
          'Attach supporting documentation',
          'Calculate refund amount'
        ]
      },
      {
        id: 'return-deposit',
        title: 'Return Security Deposit',
        description: 'Send refund check and itemized statement within deadline',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'deposits' },
        actionLabel: 'Process Refund',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['prepare-statement'],
        tips: [
          'NC/SC/GA: 30-day deadline',
          'Mail to forwarding address',
          'Keep proof of mailing'
        ]
      },
      {
        id: 'prepare-unit',
        title: 'Prepare Unit for Re-Rental',
        description: 'Complete repairs and cleaning for next tenant',
        status: 'pending',
        navigateTo: '/tasks',
        actionLabel: 'Create Work Orders',
        estimatedMinutes: 5,
        required: true,
        dependsOn: ['conduct-inspection'],
        tips: [
          'Schedule cleaning service',
          'Complete needed repairs',
          'Update unit listing status'
        ]
      }
    ]
  },

  // ===== MAINTENANCE WORKFLOW =====
  {
    id: 'maintenance-request',
    title: 'Maintenance Request Handling',
    description: 'Process maintenance requests from submission to completion',
    category: 'maintenance',
    icon: 'Wrench',
    color: 'bg-yellow-500',
    estimatedTotalMinutes: 30,
    frequency: 'as-needed',
    complianceNotes: [
      'Emergency repairs require immediate response',
      'Habitability issues must be addressed promptly',
      'Document all maintenance for liability protection'
    ],
    steps: [
      {
        id: 'receive-request',
        title: 'Receive & Triage Request',
        description: 'Review request and assess priority level',
        status: 'pending',
        navigateTo: '/tasks',
        queryParams: { filter: 'new' },
        actionLabel: 'View Requests',
        estimatedMinutes: 5,
        required: true,
        tips: [
          'Emergency: No heat/AC, flooding, security issues',
          'Urgent: Appliance failures, plumbing issues',
          'Routine: Cosmetic, minor repairs'
        ],
        checklist: [
          { id: 'priority-set', label: 'Priority level assigned', completed: false },
          { id: 'details-complete', label: 'Issue details documented', completed: false }
        ]
      },
      {
        id: 'assign-vendor',
        title: 'Assign to Vendor/Staff',
        description: 'Assign appropriate technician or vendor',
        status: 'pending',
        navigateTo: '/tasks',
        actionLabel: 'Assign Work',
        estimatedMinutes: 5,
        required: true,
        dependsOn: ['receive-request'],
        tips: [
          'Match specialty to issue type',
          'Check vendor availability',
          'Confirm insurance coverage'
        ]
      },
      {
        id: 'schedule-repair',
        title: 'Schedule Repair',
        description: 'Coordinate access with tenant',
        status: 'pending',
        navigateTo: '/calendar',
        actionLabel: 'Schedule',
        estimatedMinutes: 5,
        required: true,
        dependsOn: ['assign-vendor'],
        tips: [
          'Provide entry notice (24-48 hours)',
          'Confirm tenant availability',
          'Send calendar invite'
        ]
      },
      {
        id: 'complete-repair',
        title: 'Complete Repair',
        description: 'Vendor completes work and documents',
        status: 'pending',
        navigateTo: '/tasks',
        actionLabel: 'Update Status',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['schedule-repair'],
        tips: [
          'Get completion photos',
          'Have tenant verify completion',
          'Collect invoice'
        ]
      },
      {
        id: 'close-request',
        title: 'Close & Invoice',
        description: 'Close work order and process any charges',
        status: 'pending',
        navigateTo: '/tasks',
        actionLabel: 'Close Request',
        estimatedMinutes: 5,
        required: true,
        dependsOn: ['complete-repair'],
        tips: [
          'If tenant-caused, charge to tenant',
          'File invoice for records',
          'Update maintenance log'
        ]
      }
    ]
  },

  // ===== LEASE RENEWAL WORKFLOW =====
  {
    id: 'lease-renewal',
    title: 'Lease Renewal Process',
    description: 'Identify expiring leases and process renewals',
    category: 'lease',
    icon: 'RefreshCw',
    color: 'bg-purple-500',
    estimatedTotalMinutes: 45,
    frequency: 'monthly',
    steps: [
      {
        id: 'identify-expiring',
        title: 'Identify Expiring Leases',
        description: 'Review leases expiring in 60-90 days',
        status: 'pending',
        navigateTo: '/leasing',
        queryParams: { filter: 'expiring' },
        actionLabel: 'View Expiring',
        estimatedMinutes: 10,
        required: true,
        tips: [
          'Start 90 days before expiration',
          'Review tenant payment history',
          'Check market rent rates'
        ]
      },
      {
        id: 'evaluate-tenant',
        title: 'Evaluate Tenant Performance',
        description: 'Review payment history and lease compliance',
        status: 'pending',
        navigateTo: '/people',
        queryParams: { tab: 'tenants' },
        actionLabel: 'Review Tenant',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['identify-expiring'],
        tips: [
          'Check for late payments',
          'Review any lease violations',
          'Consider tenant value'
        ]
      },
      {
        id: 'determine-terms',
        title: 'Determine Renewal Terms',
        description: 'Set rent increase and lease terms',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'billing' },
        actionLabel: 'Set Pricing',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['evaluate-tenant'],
        tips: [
          'Research comparable market rents',
          'Consider property expenses',
          'Factor in good tenant discount'
        ]
      },
      {
        id: 'send-offer',
        title: 'Send Renewal Offer',
        description: 'Present renewal terms to tenant',
        status: 'pending',
        navigateTo: '/comms',
        queryParams: { template: 'renewal-offer' },
        actionLabel: 'Send Offer',
        estimatedMinutes: 5,
        required: true,
        dependsOn: ['determine-terms'],
        tips: [
          'Send 60 days before expiration',
          'Clearly state new terms',
          'Set response deadline'
        ]
      },
      {
        id: 'execute-renewal',
        title: 'Execute Renewal Agreement',
        description: 'Complete and sign renewal lease',
        status: 'pending',
        navigateTo: '/leasing',
        queryParams: { tab: 'leases' },
        actionLabel: 'Create Renewal',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['send-offer'],
        tips: [
          'Update rent amount in system',
          'Get signatures from all parties',
          'Provide copy to tenant'
        ]
      }
    ]
  },

  // ===== NEW PROPERTY SETUP =====
  {
    id: 'new-property-setup',
    title: 'New Property Setup',
    description: 'Complete setup for a newly acquired property',
    category: 'property',
    icon: 'Building',
    color: 'bg-teal-500',
    estimatedTotalMinutes: 60,
    frequency: 'one-time',
    steps: [
      {
        id: 'add-property',
        title: 'Add Property to System',
        description: 'Create property record with basic information',
        status: 'pending',
        navigateTo: '/properties',
        queryParams: { action: 'new' },
        actionLabel: 'Add Property',
        estimatedMinutes: 10,
        required: true,
        tips: [
          'Enter complete address',
          'Select property type',
          'Add owner information'
        ],
        checklist: [
          { id: 'address', label: 'Address entered', completed: false },
          { id: 'type', label: 'Property type selected', completed: false },
          { id: 'owner', label: 'Owner assigned', completed: false }
        ]
      },
      {
        id: 'configure-units',
        title: 'Configure Units',
        description: 'Add all units with details and rent amounts',
        status: 'pending',
        navigateTo: '/rentals',
        queryParams: { action: 'add-unit' },
        actionLabel: 'Add Units',
        estimatedMinutes: 15,
        required: true,
        dependsOn: ['add-property'],
        tips: [
          'Enter bedroom/bathroom count',
          'Set market rent amount',
          'Add square footage'
        ]
      },
      {
        id: 'upload-media',
        title: 'Upload Photos & Documents',
        description: 'Add property photos and important documents',
        status: 'pending',
        navigateTo: '/files',
        actionLabel: 'Upload Files',
        estimatedMinutes: 15,
        required: false,
        dependsOn: ['add-property'],
        tips: [
          'Include exterior and interior photos',
          'Upload insurance documents',
          'Add any HOA docs'
        ]
      },
      {
        id: 'set-billing',
        title: 'Configure Billing Settings',
        description: 'Set up rent collection and late fee rules',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'billing' },
        actionLabel: 'Configure Billing',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['configure-units'],
        tips: [
          'Set payment due date',
          'Configure late fee per state law',
          'Set up auto-pay options'
        ]
      },
      {
        id: 'list-vacant',
        title: 'List Vacant Units',
        description: 'Create listings for any vacant units',
        status: 'pending',
        navigateTo: '/rentals',
        queryParams: { filter: 'vacant' },
        actionLabel: 'Create Listings',
        estimatedMinutes: 10,
        required: false,
        dependsOn: ['upload-media'],
        tips: [
          'Write compelling description',
          'Highlight key features',
          'Set showing availability'
        ]
      }
    ]
  },

  // ===== MONTHLY RECONCILIATION =====
  {
    id: 'monthly-reconciliation',
    title: 'Monthly Financial Reconciliation',
    description: 'End-of-month accounting and reporting process',
    category: 'financial',
    icon: 'Calculator',
    color: 'bg-emerald-500',
    estimatedTotalMinutes: 60,
    frequency: 'monthly',
    steps: [
      {
        id: 'review-income',
        title: 'Review Income',
        description: 'Verify all rent and other income recorded',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'overview' },
        actionLabel: 'View Income',
        estimatedMinutes: 15,
        required: true,
        tips: [
          'Check all expected rent collected',
          'Verify late fees applied',
          'Record other income'
        ]
      },
      {
        id: 'review-expenses',
        title: 'Review Expenses',
        description: 'Categorize and verify all expenses',
        status: 'pending',
        navigateTo: '/accounting',
        queryParams: { tab: 'ledger' },
        actionLabel: 'View Expenses',
        estimatedMinutes: 15,
        required: true,
        tips: [
          'Categorize all expenses',
          'Match to invoices',
          'Flag unusual items'
        ]
      },
      {
        id: 'reconcile-bank',
        title: 'Reconcile Bank Accounts',
        description: 'Match transactions to bank statement',
        status: 'pending',
        navigateTo: '/accounting',
        actionLabel: 'Reconcile',
        estimatedMinutes: 20,
        required: true,
        dependsOn: ['review-income', 'review-expenses'],
        tips: [
          'Match deposits to rent payments',
          'Verify all checks cleared',
          'Investigate discrepancies'
        ]
      },
      {
        id: 'generate-reports',
        title: 'Generate Owner Reports',
        description: 'Create monthly statements for property owners',
        status: 'pending',
        navigateTo: '/reports',
        actionLabel: 'Generate Reports',
        estimatedMinutes: 10,
        required: true,
        dependsOn: ['reconcile-bank'],
        tips: [
          'Include income summary',
          'List all expenses',
          'Show net operating income'
        ]
      }
    ]
  }
];

// Helper to get workflow by ID
export function getWorkflowById(id: string): Workflow | undefined {
  return WORKFLOW_TEMPLATES.find(w => w.id === id);
}

// Helper to get workflows by category
export function getWorkflowsByCategory(category: string): Workflow[] {
  return WORKFLOW_TEMPLATES.filter(w => w.category === category);
}
