import React, { useState } from 'react';
import { X, Search, Users, CheckSquare, Home, FileText, DollarSign, MessageSquare, Calendar, Building, UserPlus, Briefcase, ClipboardList, FileCheck, Mail, Phone, FileSignature, Package, Wrench, Receipt, CreditCard, TrendingUp, BarChart, Settings, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CreateNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreateOption {
  id: string;
  label: string;
  category: string;
  icon: React.ElementType;
  path?: string;
  action?: () => void;
}

const createOptions: CreateOption[] = [
  // People
  { id: 'tenant', label: 'Tenant', category: 'People', icon: Users, path: '/people?tab=tenants&action=create' },
  { id: 'owner', label: 'Owner', category: 'People', icon: UserPlus, path: '/people?tab=owners&action=create' },
  { id: 'vendor', label: 'Vendor', category: 'People', icon: Briefcase, path: '/people?tab=vendors&action=create' },
  { id: 'prospect', label: 'Prospect', category: 'People', icon: Users, path: '/people?tab=prospects&action=create' },
  { id: 'contact', label: 'Contact', category: 'People', icon: UserPlus, path: '/people?action=create-contact' },
  
  // Tasks & Maintenance
  { id: 'task', label: 'Task', category: 'Tasks', icon: CheckSquare, path: '/tasks-maintenance?action=create-task' },
  { id: 'work-order', label: 'Work Order', category: 'Tasks', icon: Wrench, path: '/tasks-maintenance?action=create-work-order' },
  { id: 'maintenance-request', label: 'Maintenance Request', category: 'Tasks', icon: ClipboardList, path: '/tasks-maintenance?action=create-request' },
  { id: 'recurring-task', label: 'Recurring Task', category: 'Tasks', icon: CheckSquare, path: '/tasks-maintenance?action=create-recurring' },
  
  // Rentals
  { id: 'property', label: 'Property', category: 'Rentals', icon: Building, path: '/properties/new' },
  { id: 'unit', label: 'Unit', category: 'Rentals', icon: Home, path: '/properties?action=create-unit' },
  { id: 'property-group', label: 'Property Group', category: 'Rentals', icon: Building, path: '/properties?action=create-group' },
  
  // Leasing
  { id: 'lease', label: 'Lease', category: 'Leasing', icon: FileSignature, path: '/leasing/create' },
  { id: 'rental-application', label: 'Rental Application', category: 'Leasing', icon: FileCheck, path: '/leasing/applications/create' },
  { id: 'tenant-screening', label: 'Tenant Screening', category: 'Leasing', icon: Shield, path: '/leasing/screening/create' },
  { id: 'lease-renewal', label: 'Lease Renewal', category: 'Leasing', icon: FileSignature, path: '/leasing/renewals/create' },
  { id: 'move-in', label: 'Move In', category: 'Leasing', icon: Home, path: '/leasing/move-in/create' },
  { id: 'move-out', label: 'Move Out', category: 'Leasing', icon: Home, path: '/leasing/move-out/create' },
  
  // Accounting & Transactions
  { id: 'bill', label: 'Bill', category: 'Accounting', icon: Receipt, path: '/transactions/create?type=bill' },
  { id: 'charge', label: 'Charge', category: 'Accounting', icon: DollarSign, path: '/transactions/create?type=charge' },
  { id: 'payment', label: 'Payment', category: 'Accounting', icon: CreditCard, path: '/transactions/create?type=payment' },
  { id: 'credit', label: 'Credit', category: 'Accounting', icon: DollarSign, path: '/transactions/create?type=credit' },
  { id: 'refund', label: 'Refund', category: 'Accounting', icon: TrendingUp, path: '/transactions/create?type=refund' },
  { id: 'deposit', label: 'Deposit', category: 'Accounting', icon: DollarSign, path: '/transactions/create?type=deposit' },
  { id: 'expense', label: 'Expense', category: 'Accounting', icon: Receipt, path: '/transactions/create?type=expense' },
  { id: 'journal-entry', label: 'Journal Entry', category: 'Accounting', icon: FileText, path: '/transactions/create?type=journal' },
  { id: 'recurring-charge', label: 'Recurring Charge', category: 'Accounting', icon: DollarSign, path: '/transactions/create?type=recurring-charge' },
  
  // Communications
  { id: 'email', label: 'Email', category: 'Communications', icon: Mail, path: '/communications?action=email' },
  { id: 'text-message', label: 'Text Message', category: 'Communications', icon: MessageSquare, path: '/communications?action=text' },
  { id: 'phone-call', label: 'Phone Call', category: 'Communications', icon: Phone, path: '/communications?action=call' },
  { id: 'announcement', label: 'Announcement', category: 'Communications', icon: MessageSquare, path: '/communications?action=announcement' },
  
  // Documents & Files
  { id: 'document', label: 'Document', category: 'Documents', icon: FileText, path: '/files-agreements?action=upload' },
  { id: 'agreement', label: 'Agreement', category: 'Documents', icon: FileSignature, path: '/files-agreements?action=create-agreement' },
  { id: 'lease-document', label: 'Lease Document', category: 'Documents', icon: FileCheck, path: '/files-agreements?action=lease-doc' },
  
  // Calendar & Events
  { id: 'event', label: 'Event', category: 'Calendar', icon: Calendar, path: '/calendar?action=create' },
  { id: 'appointment', label: 'Appointment', category: 'Calendar', icon: Calendar, path: '/calendar?action=appointment' },
  { id: 'showing', label: 'Property Showing', category: 'Calendar', icon: Home, path: '/calendar?action=showing' },
  { id: 'inspection', label: 'Inspection', category: 'Calendar', icon: CheckSquare, path: '/calendar?action=inspection' },
  
  // Reports & Analytics
  { id: 'report', label: 'Custom Report', category: 'Reports', icon: BarChart, path: '/reports?action=create' },
  { id: 'financial-report', label: 'Financial Report', category: 'Reports', icon: TrendingUp, path: '/reports?action=financial' },
  
  // Settings & Configuration
  { id: 'custom-field', label: 'Custom Field', category: 'Settings', icon: Settings, path: '/settings?action=custom-field' },
  { id: 'automation', label: 'Automation', category: 'Settings', icon: Settings, path: '/settings?action=automation' },
];

const categories = Array.from(new Set(createOptions.map(opt => opt.category)));

export default function CreateNewModal({ isOpen, onClose }: CreateNewModalProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredOptions = createOptions.filter(option => {
    const matchesSearch = option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         option.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || option.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOptionClick = (option: CreateOption) => {
    if (option.path) {
      navigate(option.path);
      onClose();
    } else if (option.action) {
      option.action();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Create New</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search what you want to create..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                  !selectedCategory
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Options Grid */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No options found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleOptionClick(option)}
                      className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-teal-100 flex items-center justify-center mb-3 transition-colors">
                        <Icon className="w-6 h-6 text-gray-600 group-hover:text-teal-600 transition-colors" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 text-center">
                        {option.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {option.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
