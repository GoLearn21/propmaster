import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, X, Minimize2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import MasterKeyAIAssistant from './DoorLoopAIAssistant';
import { cn } from '@/lib/utils';

export interface FloatingAIButtonProps {
  className?: string;
}

const FloatingAIButton: React.FC<FloatingAIButtonProps> = ({ className }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (isExpanded) {
    return (
      <div className={cn(
        'fixed bottom-6 right-6 z-50 w-[800px] h-[600px] shadow-2xl',
        className
      )}>
        <Card className="h-full flex flex-col border-2 border-primary/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-light bg-primary text-white">
            <div className="flex items-center space-x-2">
              <Bot className="h-5 w-5" />
              <span className="font-medium">AI Assistant</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-primary-dark rounded transition-colors"
                title="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-primary-dark rounded transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-hidden">
              <MasterKeyAIAssistant />
            </div>
          )}

          {isMinimized && (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-neutral-medium text-center text-sm">
                AI Assistant minimized. Click the expand button to continue.
              </p>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-40',
      className
    )}>
      <Link to="/ai-assistant">
        <Button
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary-dark text-white shadow-lg hover:shadow-xl transition-all duration-200 p-0 group"
          title="Open AI Assistant"
        >
          <Bot className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </Button>
      </Link>
      
      {/* Notification dot */}
      <div className="absolute -top-1 -right-1 h-3 w-3 bg-accent-green rounded-full animate-pulse"></div>
    </div>
  );
};

FloatingAIButton.displayName = 'FloatingAIButton';

export { FloatingAIButton };
