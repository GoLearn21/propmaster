/**
 * Vendor Portal Layout
 * Layout wrapper for all vendor portal pages with vendor-specific navigation
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useVendorAuth } from '../contexts/VendorAuthContext';
import { Button } from '../components/ui/Button';
import {
  Wrench,
  ClipboardList,
  DollarSign,
  User,
  LogOut,
  Menu,
  X,
  Home,
  FileText,
  Settings,
} from 'lucide-react';

/**
 * Vendor navigation items
 */
const vendorNavItems = [
  {
    name: 'Dashboard',
    path: '/vendor/dashboard',
    icon: Home,
  },
  {
    name: 'My Jobs',
    path: '/vendor/jobs',
    icon: ClipboardList,
  },
  {
    name: 'Active Work Orders',
    path: '/vendor/work-orders',
    icon: Wrench,
  },
  {
    name: 'Payments',
    path: '/vendor/payments',
    icon: DollarSign,
  },
  {
    name: 'Documents',
    path: '/vendor/documents',
    icon: FileText,
  },
  {
    name: 'Profile',
    path: '/vendor/profile',
    icon: User,
  },
  {
    name: 'Settings',
    path: '/vendor/settings',
    icon: Settings,
  },
];

interface VendorLayoutProps {
  children: React.ReactNode;
}

export default function VendorLayout({ children }: VendorLayoutProps) {
  const location = useLocation();
  const { vendor, logout } = useVendorAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/vendor/login';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                PropMaster
                <span className="ml-2 text-sm font-normal text-gray-500">Vendor Portal</span>
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {vendor?.company_name || `${vendor?.first_name} ${vendor?.last_name}`}
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
              {vendorNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-600'
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
              {vendorNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-600'
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

          {/* Vendor Info Card */}
          {vendor && (
            <div className="mt-8 mx-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {vendor.first_name?.[0]}
                  {vendor.last_name?.[0]}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {vendor.first_name} {vendor.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{vendor.specialty}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Active Jobs</span>
                  <span className="font-medium text-gray-900">
                    {vendor.active_jobs_count || 0}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Completed</span>
                  <span className="font-medium text-gray-900">
                    {vendor.completed_jobs_count || 0}
                  </span>
                </div>
                {vendor.rating && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Rating</span>
                    <span className="font-medium text-gray-900">
                      {vendor.rating.toFixed(1)} ⭐
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
