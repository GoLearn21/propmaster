import React, { useState } from 'react';
import { Check, ArrowRight, ArrowLeft, Building2, Home, Users, DollarSign, Bell, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, Button, Breadcrumb } from '../components/ui';
import toast from 'react-hot-toast';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

const GetStartedPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showWizard, setShowWizard] = useState(true);
  
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 1,
      title: 'Add Your First Property',
      description: 'Set up your property portfolio by adding property details, address, and type.',
      icon: <Building2 className="h-8 w-8" />,
      completed: false,
    },
    {
      id: 2,
      title: 'Set Up Units & Rental Details',
      description: 'Configure rental units, set pricing, and define amenities for each property.',
      icon: <Home className="h-8 w-8" />,
      completed: false,
    },
    {
      id: 3,
      title: 'Add Tenants & Leases',
      description: 'Create tenant profiles, set up leases, and manage rental agreements.',
      icon: <Users className="h-8 w-8" />,
      completed: false,
    },
    {
      id: 4,
      title: 'Configure Accounting Settings',
      description: 'Set up payment methods, tax settings, and financial configurations.',
      icon: <DollarSign className="h-8 w-8" />,
      completed: false,
    },
    {
      id: 5,
      title: 'Set Up Notifications',
      description: 'Configure email and SMS alerts to stay informed about important events.',
      icon: <Bell className="h-8 w-8" />,
      completed: false,
    },
    {
      id: 6,
      title: 'Explore Features',
      description: 'Take a tour of key features: tasks, reports, maintenance, and more.',
      icon: <Sparkles className="h-8 w-8" />,
      completed: false,
    },
  ]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleMarkComplete = () => {
    const updatedSteps = [...steps];
    updatedSteps[currentStep].completed = true;
    setSteps(updatedSteps);
    toast.success(`${steps[currentStep].title} marked as complete!`);
    
    if (currentStep < steps.length - 1) {
      setTimeout(() => handleNext(), 500);
    }
  };

  const handleSkipStep = () => {
    toast('Step skipped. You can return to it anytime.');
    handleNext();
  };

  const handleFinish = () => {
    toast.success('🎉 Welcome to PropMaster! You\'re all set to get started.');
    setShowWizard(false);
  };

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (!showWizard) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[{ label: 'Get Started' }]} />
        
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            You're All Set!
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Your PropMaster account is configured and ready to use. Start managing your properties with confidence.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <Link to="/dashboard">
              <Button variant="primary" size="lg">
                Go to Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="lg" onClick={() => setShowWizard(true)}>
              Restart Onboarding
            </Button>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Add Properties</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Start building your portfolio
                </p>
                <Link to="/rentals">
                  <Button variant="outline" size="sm">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Manage Tenants</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Add and organize your tenants
                </p>
                <Link to="/tenants">
                  <Button variant="outline" size="sm">Add Tenants</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Track Payments</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Monitor rent and expenses
                </p>
                <Link to="/payments">
                  <Button variant="outline" size="sm">View Payments</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Get Started' }]} />
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to PropMaster
          </h1>
          <p className="text-lg text-gray-600">
            Let's get your property management system set up in 6 simple steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {completedCount} of {steps.length} completed
            </span>
            <span className="text-sm font-medium text-gray-700">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setCurrentStep(index)}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all
                    ${
                      index === currentStep
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : step.completed
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {step.completed ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>
                <span className="text-xs text-gray-600 mt-2 text-center hidden md:block max-w-[80px]">
                  {step.title.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-12 md:w-16 h-1 mx-2
                  ${step.completed ? 'bg-green-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-start gap-6 mb-6">
              <div className="flex-shrink-0 w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                {steps[currentStep].icon}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {steps[currentStep].title}
                </h2>
                <p className="text-gray-600">
                  {steps[currentStep].description}
                </p>
              </div>
              {steps[currentStep].completed && (
                <div className="flex-shrink-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <Check className="h-4 w-4" />
                    Completed
                  </div>
                </div>
              )}
            </div>

            {/* Step-specific content */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              {currentStep === 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">What you'll need:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Property address and basic details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Property type (Single Family, Multi-Family, Commercial)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Number of units in the property</span>
                    </li>
                  </ul>
                  <div className="mt-4">
                    <Link to="/rentals">
                      <Button variant="primary" className="w-full md:w-auto">
                        <Building2 className="h-4 w-4 mr-2" />
                        Add Property Now
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Configure your units:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Set monthly rent amount for each unit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Define security deposit requirements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">List amenities (parking, utilities, appliances)</span>
                    </li>
                  </ul>
                  <div className="mt-4">
                    <Link to="/rentals">
                      <Button variant="primary" className="w-full md:w-auto">
                        <Home className="h-4 w-4 mr-2" />
                        Configure Units
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Tenant & Lease Setup:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Create tenant profiles with contact information</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Set lease start and end dates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Upload lease agreements and documents</span>
                    </li>
                  </ul>
                  <div className="mt-4 flex gap-3">
                    <Link to="/tenants">
                      <Button variant="primary">
                        <Users className="h-4 w-4 mr-2" />
                        Add Tenants
                      </Button>
                    </Link>
                    <Link to="/leasing">
                      <Button variant="outline">
                        Manage Leases
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Financial Configuration:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Set up accepted payment methods (ACH, Credit Card)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Configure tax settings and reporting</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Define late fee policies and grace periods</span>
                    </li>
                  </ul>
                  <div className="mt-4">
                    <Link to="/settings">
                      <Button variant="primary" className="w-full md:w-auto">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Configure Accounting
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Notification Preferences:</h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Enable email alerts for payments and tasks</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Set up SMS notifications for urgent issues</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">Configure maintenance request alerts</span>
                    </li>
                  </ul>
                  <div className="mt-4">
                    <Link to="/settings">
                      <Button variant="primary" className="w-full md:w-auto">
                        <Bell className="h-4 w-4 mr-2" />
                        Setup Notifications
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Explore Key Features:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link to="/tasks" className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <h4 className="font-semibold text-gray-900 mb-1">Task Management</h4>
                      <p className="text-sm text-gray-600">Track maintenance, inspections, and to-dos</p>
                    </Link>
                    <Link to="/reports" className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <h4 className="font-semibold text-gray-900 mb-1">Reports & Analytics</h4>
                      <p className="text-sm text-gray-600">View financial insights and performance</p>
                    </Link>
                    <Link to="/work-orders" className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <h4 className="font-semibold text-gray-900 mb-1">Work Orders</h4>
                      <p className="text-sm text-gray-600">Manage maintenance requests efficiently</p>
                    </Link>
                    <Link to="/communications" className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <h4 className="font-semibold text-gray-900 mb-1">Communications</h4>
                      <p className="text-sm text-gray-600">Send messages to tenants and vendors</p>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleSkipStep}
                >
                  Skip for Now
                </Button>
                
                {!steps[currentStep].completed && (
                  <Button
                    variant="outline"
                    onClick={handleMarkComplete}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Complete
                  </Button>
                )}

                {currentStep === steps.length - 1 ? (
                  <Button variant="primary" onClick={handleFinish}>
                    Finish Setup
                    <Sparkles className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help getting started?{' '}
            <Link to="/settings" className="text-blue-600 hover:text-blue-700 font-medium">
              Visit our Help Center
            </Link>
            {' '}or{' '}
            <Link to="/communications" className="text-blue-600 hover:text-blue-700 font-medium">
              contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default GetStartedPage;
