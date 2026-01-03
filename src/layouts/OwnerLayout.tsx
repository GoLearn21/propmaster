/**
 * Owner Portal Layout
 * Layout wrapper for all owner portal pages with owner-specific navigation
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOwnerAuth } from '../contexts/OwnerAuthContext';
import { Button } from '../components/ui/Button';
import {
  Home,
  DollarSign,
  TrendingUp,
  FileText,
  Building2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Download,
} from 'lucide-react';

/**
 * Owner navigation items
 */
const ownerNavItems = [
  {
    name: 'Dashboard',
    path: '/owner/dashboard',
    icon: Home,
  },
  {
    name: 'Properties',
    path: '/owner/properties',
    icon: Building2,
  },
  {
    name: 'Financial Reports',
    path: '/owner/financial-reports',
    icon: BarChart3,
  },
  {
    name: 'Income & Expenses',
    path: '/owner/income-expenses',
    icon: DollarSign,
  },
  {
    name: 'Performance',
    path: '/owner/performance',
    icon: TrendingUp,
  },
  {
    name: 'Tenants',
    path: '/owner/tenants',
    icon: Users,
  },
  {
    name: 'Documents',
    path: '/owner/documents',
    icon: FileText,
  },
  {
    name: 'Tax Reports',
    path: '/owner/tax-reports',
    icon: Download,
  },
  {
    name: 'Settings',
    path: '/owner/settings',
    icon: Settings,
  },
];

interface OwnerLayoutProps {
  children: React.ReactNode;
}

export default function OwnerLayout({ children }: OwnerLayoutProps) {
  const location = useLocation();
  const { owner, logout } = useOwnerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/owner/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-emerald-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                PropMaster
                <span className="ml-2 text-sm font-normal text-gray-500">Owner Portal</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {owner?.first_name} {owner?.last_name}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {ownerNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive(item.path)
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <div className="flex pt-16">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden md:block w-64 bg-white border-r border-gray-200 fixed h-full overflow-y-auto">
          <nav className="mt-5 px-3">
            <div className="space-y-1">
              {ownerNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.path)
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Owner Portfolio Info Card */}
          {owner && (
            <div className="mt-8 mx-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-3">
                <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold">
                  {owner.first_name?.[0]}
                  {owner.last_name?.[0]}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {owner.first_name} {owner.last_name}
                  </p>
                  <p className="text-xs text-gray-500">Property Owner</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Properties</span>
                  <span className="font-medium text-gray-900">
                    {owner.owned_properties?.length || 0}
                  </span>
                </div>
                {owner.total_units && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total Units</span>
                    <span className="font-medium text-gray-900">{owner.total_units}</span>
                  </div>
                )}
                {owner.portfolio_value && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Portfolio Value</span>
                    <span className="font-medium text-gray-900">
                      ${(owner.portfolio_value / 1000000).toFixed(1)}M
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="md:ml-64 flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
