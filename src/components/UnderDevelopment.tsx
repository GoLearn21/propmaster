import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft, Home } from 'lucide-react';

interface UnderDevelopmentProps {
  title: string;
  description?: string;
  backPath?: string;
  backLabel?: string;
}

/**
 * Placeholder component for features under development
 * Provides a professional UX for incomplete features
 */
export function UnderDevelopment({
  title,
  description = 'This feature is currently under development and will be available soon.',
  backPath,
  backLabel = 'Go Back'
}: UnderDevelopmentProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <Construction className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {backPath && (
            <button
              onClick={() => navigate(backPath)}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Check back soon for updates
        </p>
      </div>
    </div>
  );
}

export default UnderDevelopment;
