import React from 'react';
import MasterKeyAIAssistantIntegrated from '@/components/DoorLoopAIAssistantIntegrated';

export default function AIAssistantPage() {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Page Header */}
      <div className="border-b border-neutral-light px-6 py-4 bg-white">
        <h1 className="text-2xl font-bold text-neutral-dark">AI Assistant</h1>
        <p className="text-sm text-neutral-medium mt-1">
          Your intelligent assistant for property management tasks, insights, and automation
        </p>
      </div>

      {/* AI Assistant Component */}
      <div className="flex-1 overflow-hidden">
        <MasterKeyAIAssistantIntegrated />
      </div>
    </div>
  );
}
