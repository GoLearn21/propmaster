import React, { useState } from 'react';
import { Card } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import { Input } from '../../../ui/Input';
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  Shield,
  Settings,
  Download
} from 'lucide-react';
import { PaymentMethod } from '../types';

export const PaymentMethodManagement: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      tenantId: 'tenant-001',
      type: 'ach',
      isDefault: true,
      isActive: true,
      bankName: 'Chase Bank',
      accountType: 'checking',
      accountNumber: '1234',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-03-20T14:22:00Z'
    },
    {
      id: '2',
      tenantId: 'tenant-002',
      type: 'credit_card',
      isDefault: false,
      isActive: true,
      cardType: 'visa',
      cardNumber: '4567',
      expiryMonth: 12,
      expiryYear: 2026,
      createdAt: '2024-02-10T09:15:00Z',
      updatedAt: '2024-03-15T16:45:00Z'
    },
    {
      id: '3',
      tenantId: 'tenant-003',
      type: 'ach',
      isDefault: false,
      isActive: false,
      bankName: 'Bank of America',
      accountType: 'savings',
      accountNumber: '8901',
      createdAt: '2024-01-20T11:00:00Z',
      updatedAt: '2024-03-10T12:30:00Z'
    }
  ]);

  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredMethods = paymentMethods.filter(method => {
    if (selectedTenant === 'all') return true;
    return method.tenantId === selectedTenant;
  });

  const handleSetDefault = (methodId: string) => {
    setPaymentMethods(prev => prev.map(method => ({
      ...method,
      isDefault: method.id === methodId
    })));
  };

  const handleToggleActive = (methodId: string) => {
    setPaymentMethods(prev => prev.map(method => 
      method.id === methodId 
        ? { ...method, isActive: !method.isActive }
        : method
    ));
  };

  const handleDelete = (methodId: string) => {
    setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
  };

  const getCardIcon = (type: PaymentMethod['type']) => {
    return type === 'ach' ? '🏦' : '💳';
  };

  const getCardTypeColor = (cardType?: string) => {
    const colors = {
      visa: 'text-blue-600',
      mastercard: 'text-red-600',
      amex: 'text-green-600',
      discover: 'text-orange-600'
    };
    return colors[cardType as keyof typeof colors] || 'text-neutral-medium';
  };

  const formatAccountNumber = (accountNumber: string) => {
    return `•••• ${accountNumber}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const summaryStats = {
    totalMethods: paymentMethods.length,
    activeMethods: paymentMethods.filter(m => m.isActive).length,
    achMethods: paymentMethods.filter(m => m.type === 'ach').length,
    creditCardMethods: paymentMethods.filter(m => m.type === 'credit_card').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-neutral-black font-semibold">
          Payment Method Management
        </h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button 
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-accent-green hover:bg-accent-green-hover"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-primary">
              {summaryStats.totalMethods}
            </p>
            <p className="text-small text-neutral-medium">Total Methods</p>
          </div>
        </Card>
        
        <Card className="p-4 bg-accent-green bg-opacity-10">
          <div className="text-center">
            <p className="text-h4 font-bold text-accent-green">
              {summaryStats.activeMethods}
            </p>
            <p className="text-small text-neutral-medium">Active Methods</p>
          </div>
        </Card>
        
        <Card className="p-4 bg-neutral-lighter">
          <div className="text-center">
            <p className="text-h4 font-bold text-neutral-black">
              {summaryStats.achMethods}
            </p>
            <p className="text-small text-neutral-medium">ACH Methods</p>
          </div>
        </Card>
        
        <Card className="p-4 bg-neutral-lighter">
          <div className="text-center">
            <p className="text-h4 font-bold text-neutral-black">
              {summaryStats.creditCardMethods}
            </p>
            <p className="text-small text-neutral-medium">Credit Cards</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-neutral-lighter">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="select text-small"
            >
              <option value="all">All Tenants</option>
              <option value="tenant-001">Tenant 001</option>
              <option value="tenant-002">Tenant 002</option>
              <option value="tenant-003">Tenant 003</option>
            </select>
            
            <div className="flex items-center gap-2 text-small text-neutral-medium">
              <Shield className="h-4 w-4" />
              All payment methods are PCI compliant
            </div>
          </div>
          
          <p className="text-small text-neutral-medium">
            Showing {filteredMethods.length} of {paymentMethods.length} methods
          </p>
        </div>
      </Card>

      {/* Payment Methods List */}
      <div className="space-y-4">
        {filteredMethods.map((method) => (
          <Card 
            key={method.id} 
            className={`p-6 transition-all duration-200 hover:shadow-lg ${
              !method.isActive ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                {/* Payment Method Icon */}
                <div className="p-3 rounded-lg bg-neutral-lighter">
                  <span className="text-2xl">{getCardIcon(method.type)}</span>
                </div>

                {/* Method Details */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-small font-semibold text-neutral-black">
                      {method.type === 'ach' ? 'Bank Account' : 'Credit Card'}
                    </h3>
                    
                    {method.isDefault && (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                    
                    <Badge 
                      variant={method.isActive ? 'success' : 'secondary'}
                      className="text-xs"
                    >
                      {method.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {method.type === 'ach' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-neutral-medium" />
                        <span className="text-small text-neutral-black">
                          {method.bankName}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-tiny text-neutral-medium">
                        <span className="capitalize">{method.accountType}</span>
                        <span>•••• {method.accountNumber}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className={`h-4 w-4 ${getCardTypeColor(method.cardType)}`} />
                        <span className={`text-small font-semibold ${getCardTypeColor(method.cardType)}`}>
                          {method.cardType?.toUpperCase()}
                        </span>
                        <span className="text-tiny text-neutral-medium">
                          •••• {method.cardNumber}
                        </span>
                      </div>
                      <div className="text-tiny text-neutral-medium">
                        Expires {method.expiryMonth?.toString().padStart(2, '0')}/{method.expiryYear}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-tiny text-neutral-medium">
                    <span>Added {formatDate(method.createdAt)}</span>
                    <span>Updated {formatDate(method.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!method.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(method.id)}
                    title="Set as default"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMethod(method)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(method.id)}
                  className={method.isActive ? 'text-status-warning' : 'text-accent-green'}
                >
                  {method.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(method.id)}
                  className="text-status-error"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tenant Summary */}
      <Card className="p-6">
        <h3 className="text-h4 text-neutral-black font-semibold mb-4">
          Tenant Payment Method Summary
        </h3>
        
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-neutral-lighter rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-neutral-medium" />
                <span className="text-small font-medium text-neutral-black">
                  Tenant 001
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-tiny text-neutral-medium">1 method</span>
                <Badge variant="success" className="text-xs">Active</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-lighter rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-neutral-medium" />
                <span className="text-small font-medium text-neutral-black">
                  Tenant 002
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-tiny text-neutral-medium">1 method</span>
                <Badge variant="success" className="text-xs">Active</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-lighter rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-neutral-medium" />
                <span className="text-small font-medium text-neutral-black">
                  Tenant 003
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-tiny text-neutral-medium">1 method</span>
                <Badge variant="warning" className="text-xs">Inactive</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Payment Method Detail Modal */}
      {selectedMethod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-h3 text-neutral-black">
                Payment Method Details
              </h3>
              <Button 
                variant="ghost" 
                onClick={() => setSelectedMethod(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Method Overview */}
              <Card className="p-4 bg-neutral-lighter">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-lg bg-white">
                    <span className="text-3xl">{getCardIcon(selectedMethod.type)}</span>
                  </div>
                  <div>
                    <h4 className="text-h4 text-neutral-black font-semibold">
                      {selectedMethod.type === 'ach' ? 'Bank Account' : 'Credit Card'}
                    </h4>
                    <p className="text-small text-neutral-medium">
                      Added {formatDate(selectedMethod.createdAt)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {selectedMethod.isDefault && (
                        <Badge variant="success" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Default Method
                        </Badge>
                      )}
                      <Badge 
                        variant={selectedMethod.isActive ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {selectedMethod.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Detailed Information */}
              <div className="space-y-4">
                {selectedMethod.type === 'ach' ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-small font-medium text-neutral-medium">
                          Bank Name
                        </label>
                        <p className="text-small text-neutral-black mt-1">
                          {selectedMethod.bankName}
                        </p>
                      </div>
                      <div>
                        <label className="text-small font-medium text-neutral-medium">
                          Account Type
                        </label>
                        <p className="text-small text-neutral-black mt-1 capitalize">
                          {selectedMethod.accountType}
                        </p>
                      </div>
                      <div>
                        <label className="text-small font-medium text-neutral-medium">
                          Account Number
                        </label>
                        <p className="text-small text-neutral-black mt-1">
                          {formatAccountNumber(selectedMethod.accountNumber || '')}
                        </p>
                      </div>
                      <div>
                        <label className="text-small font-medium text-neutral-medium">
                          Account Status
                        </label>
                        <p className="text-small text-neutral-black mt-1">
                          Verified & Active
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-small font-medium text-neutral-medium">
                          Card Type
                        </label>
                        <p className={`text-small font-semibold mt-1 ${getCardTypeColor(selectedMethod.cardType)}`}>
                          {selectedMethod.cardType?.toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <label className="text-small font-medium text-neutral-medium">
                          Card Number
                        </label>
                        <p className="text-small text-neutral-black mt-1">
                          •••• •••• •••• {selectedMethod.cardNumber}
                        </p>
                      </div>
                      <div>
                        <label className="text-small font-medium text-neutral-medium">
                          Expiry Date
                        </label>
                        <p className="text-small text-neutral-black mt-1">
                          {selectedMethod.expiryMonth?.toString().padStart(2, '0')}/{selectedMethod.expiryYear}
                        </p>
                      </div>
                      <div>
                        <label className="text-small font-medium text-neutral-medium">
                          Card Status
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="h-4 w-4 text-status-success" />
                          <span className="text-small text-neutral-black">
                            Verified & Active
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-small font-medium text-neutral-medium">
                      Date Added
                    </label>
                    <p className="text-small text-neutral-black mt-1">
                      {formatDate(selectedMethod.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="text-small font-medium text-neutral-medium">
                      Last Updated
                    </label>
                    <p className="text-small text-neutral-black mt-1">
                      {formatDate(selectedMethod.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                {!selectedMethod.isDefault && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      handleSetDefault(selectedMethod.id);
                      setSelectedMethod(null);
                    }}
                  >
                    Set as Default
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={() => {
                    handleToggleActive(selectedMethod.id);
                    setSelectedMethod(null);
                  }}
                  className={selectedMethod.isActive ? 'text-status-warning' : 'text-accent-green'}
                >
                  {selectedMethod.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                
                <Button 
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedMethod.id);
                    setSelectedMethod(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};