import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  Send,
  Bot,
  User,
  Search,
  Clock,
  MapPin,
  Calendar,
  Tag,
  CheckCircle,
  AlertCircle,
  History
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  structuredData?: TaskDetails | TaskTable;
}

interface TaskDetails {
  frequency?: string;
  location?: string;
  type?: string;
  overview?: string;
}

interface TaskTable {
  headers: string[];
  rows: Array<Record<string, string>>;
}

interface ChatHistory {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

// MasterKey predefined prompts
const PREDEFINED_PROMPTS = [
  "Highlight today's priorities",
  "Can you send an owner request which one of my tenants have f..",
  "List tenants with balance due September",
  "List all tasks due in the ext 7 d..",
  "Highlight today's priorities"
];

export default function MasterKeyAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your MasterKey AI Assistant. I can help you manage tasks, send requests, track tenants, and more. Try one of the suggested prompts or ask me anything!",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock chat history
  const [chatHistory] = useState<ChatHistory[]>([
    { id: '1', title: 'Property maintenance tasks', lastMessage: 'Created 3 tasks', timestamp: new Date(Date.now() - 86400000) },
    { id: '2', title: 'Tenant balance inquiry', lastMessage: 'Listed 5 tenants', timestamp: new Date(Date.now() - 172800000) },
    { id: '3', title: 'Owner request', lastMessage: 'Sent request to owner', timestamp: new Date(Date.now() - 259200000) }
  ]);

  // Mock mention suggestions
  const mentionSuggestions = [
    { type: 'property', name: '11191 Southwest 176th Street', id: 'prop-1' },
    { type: 'property', name: 'Sunset Apartments Complex', id: 'prop-2' },
    { type: 'unit', name: 'Unit 101', id: 'unit-1' },
    { type: 'unit', name: 'Unit 202', id: 'unit-2' },
    { type: 'tenant', name: 'John Doe', id: 'tenant-1' },
    { type: 'tenant', name: 'Jane Smith', id: 'tenant-2' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);
    
    // Check for @mention trigger
    if (value.includes('@')) {
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const generateAIResponse = async (userMessage: string): Promise<Message> => {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));

    const lowerMessage = userMessage.toLowerCase();

    // Handle task creation workflow (e.g., "change furnace filters")
    if (lowerMessage.includes('furnace') || lowerMessage.includes('filter') || lowerMessage.includes('maintenance')) {
      setTaskDetails({
        frequency: 'Every 6 months (June and December)',
        location: '11191 Southwest 176th Street',
        type: 'Preventative Maintenance',
        overview: 'Regular furnace filter replacement'
      });

      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "I've extracted the details for your task:\n\n• Frequency: Every 6 months (June and December)\n• Location: 11191 Southwest 176th Street\n• Type: Preventative Maintenance\n\nWould you like me to create recurring tasks for this maintenance?",
        timestamp: new Date()
      };
    }

    // Handle "create tasks" confirmation
    if (lowerMessage.includes('create') && lowerMessage.includes('task')) {
      const taskTable: TaskTable = {
        headers: ['Task', 'Due Date', 'Property', 'Status', 'Priority'],
        rows: [
          { task: 'Change furnace filters', dueDate: 'June 15, 2025', property: '11191 SW 176th St', status: 'Scheduled', priority: 'Medium' },
          { task: 'Change furnace filters', dueDate: 'December 15, 2025', property: '11191 SW 176th St', status: 'Scheduled', priority: 'Medium' }
        ]
      };

      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Perfect! I've created 2 recurring tasks:",
        timestamp: new Date(),
        structuredData: taskTable
      };
    }

    // Handle priority highlights
    if (lowerMessage.includes('priority') || lowerMessage.includes('priorities')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Here are today's priorities:\n\n• 3 urgent maintenance requests requiring attention\n• 2 lease renewals expiring this week\n• 5 rent payments due today\n• 1 property inspection scheduled at 2 PM\n\nWould you like details on any of these items?",
        timestamp: new Date()
      };
    }

    // Handle tenant balance queries
    if (lowerMessage.includes('balance') || lowerMessage.includes('tenant')) {
      const taskTable: TaskTable = {
        headers: ['Tenant', 'Unit', 'Balance Due', 'Due Date', 'Days Late'],
        rows: [
          { tenant: 'John Doe', unit: '101', balanceDue: '$1,500', dueDate: 'Sept 1', daysLate: '30' },
          { tenant: 'Jane Smith', unit: '202', balanceDue: '$2,200', dueDate: 'Sept 5', daysLate: '26' },
          { tenant: 'Bob Johnson', unit: '305', balanceDue: '$1,800', dueDate: 'Sept 10', daysLate: '21' }
        ]
      };

      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Here are tenants with balance due in September:",
        timestamp: new Date(),
        structuredData: taskTable
      };
    }

    // Handle task due queries
    if (lowerMessage.includes('task') && (lowerMessage.includes('due') || lowerMessage.includes('7 day'))) {
      const taskTable: TaskTable = {
        headers: ['Task', 'Due Date', 'Assigned To', 'Status', 'Priority'],
        rows: [
          { task: 'HVAC inspection', dueDate: 'Nov 3', assignedTo: 'Mike Wilson', status: 'In Progress', priority: 'High' },
          { task: 'Plumbing repair Unit 204', dueDate: 'Nov 4', assignedTo: 'Sarah Lee', status: 'Not Started', priority: 'Medium' },
          { task: 'Roof leak assessment', dueDate: 'Nov 6', assignedTo: 'Tom Brown', status: 'Not Started', priority: 'High' }
        ]
      };

      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Here are all tasks due in the next 7 days:",
        timestamp: new Date(),
        structuredData: taskTable
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: "I can help you with:\n\n• Creating and managing tasks\n• Tracking tenant balances\n• Sending owner requests\n• Highlighting priorities\n• Managing properties and units\n\nTry asking me something like 'List all tasks due this week' or use the @ symbol to mention a property, unit, or tenant.",
      timestamp: new Date()
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Generate AI response
    const aiResponse = await generateAIResponse(inputMessage);
    setMessages(prev => [...prev, aiResponse]);
    setIsLoading(false);
  };

  const handlePredefinedPrompt = (prompt: string) => {
    setInputMessage(prompt);
    inputRef.current?.focus();
  };

  const handleMentionSelect = (mention: any) => {
    const newMessage = inputMessage.replace(/@\w*$/, `@${mention.name} `);
    setInputMessage(newMessage);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const renderTaskTable = (data: TaskTable) => {
    return (
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full border border-neutral-light rounded-lg">
          <thead className="bg-neutral-lighter">
            <tr>
              {data.headers.map((header, index) => (
                <th key={index} className="px-4 py-2 text-left text-sm font-semibold text-neutral-dark border-b border-neutral-light">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-neutral-lighter/50 transition-colors">
                {Object.values(row).map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2 text-sm text-neutral-dark border-b border-neutral-light">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-white">
      {/* Chat History Sidebar (conditional) */}
      {showChatHistory && (
        <div className="w-64 border-r border-neutral-light p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-dark">Chat History</h3>
            <button onClick={() => setShowChatHistory(false)} className="text-neutral-medium hover:text-neutral-dark">
              <Search className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-medium" />
            <input
              type="text"
              placeholder="Search chats"
              className="w-full pl-10 pr-3 py-2 text-sm border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            {chatHistory.map((chat) => (
              <div key={chat.id} className="p-3 rounded-lg hover:bg-neutral-lighter cursor-pointer transition-colors">
                <div className="font-medium text-sm text-neutral-dark">{chat.title}</div>
                <div className="text-xs text-neutral-medium mt-1">{chat.lastMessage}</div>
                <div className="text-xs text-neutral-medium mt-1">
                  {chat.timestamp.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-neutral-light p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold text-neutral-dark">AI Assistant</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="flex items-center space-x-1 text-sm text-neutral-medium hover:text-primary transition-colors"
            >
              <History className="h-4 w-4" />
              <span>Chat history</span>
            </button>
          </div>
        </div>

        {/* Predefined Prompts */}
        <div className="border-b border-neutral-light p-4 bg-neutral-lighter/50">
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_PROMPTS.slice(0, 4).map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePredefinedPrompt(prompt)}
                className="px-3 py-1.5 text-sm bg-white border border-neutral-light rounded-full hover:border-primary hover:text-primary transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={cn(
              "flex",
              message.type === 'user' ? 'justify-end' : 'justify-start'
            )}>
              <div className={cn(
                "max-w-2xl",
                message.type === 'user' ? 'flex flex-row-reverse items-start space-x-reverse space-x-2' : 'flex items-start space-x-2'
              )}>
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  message.type === 'user' ? 'bg-primary text-white' : 'bg-neutral-lighter text-primary'
                )}>
                  {message.type === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-lg",
                  message.type === 'user' ? 'bg-primary text-white' : 'bg-neutral-lighter text-neutral-dark'
                )}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  {message.structuredData && 'headers' in message.structuredData && renderTaskTable(message.structuredData)}
                  <div className="text-xs mt-2 opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-neutral-lighter flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="px-4 py-3 rounded-lg bg-neutral-lighter">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-neutral-medium rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-neutral-medium rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-neutral-medium rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* @Mention Suggestions */}
        {showMentions && (
          <div className="absolute bottom-24 left-4 right-4 max-w-md bg-white border border-neutral-light rounded-lg shadow-lg p-2 z-10">
            <div className="text-xs font-semibold text-neutral-medium mb-2 px-2">Link to:</div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {mentionSuggestions.map((mention, index) => (
                <button
                  key={index}
                  onClick={() => handleMentionSelect(mention)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-neutral-lighter transition-colors flex items-center space-x-2"
                >
                  <Badge variant={mention.type === 'property' ? 'success' : mention.type === 'unit' ? 'info' : 'default'} className="text-xs">
                    {mention.type}
                  </Badge>
                  <span className="text-sm text-neutral-dark">{mention.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-neutral-light p-4 bg-white">
          <div className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type @ to link a property, unit, or tenant to your task request"
              className="flex-1 px-4 py-3 border border-neutral-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 bg-primary hover:bg-primary-dark"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Task Details Panel */}
      {taskDetails && (
        <div className="w-80 border-l border-neutral-light p-6 overflow-y-auto">
          <h3 className="font-semibold text-neutral-dark mb-4">Task Details</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-neutral-medium mb-1 flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Frequency</span>
              </div>
              <div className="text-sm text-neutral-dark">{taskDetails.frequency}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-medium mb-1 flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Location</span>
              </div>
              <div className="text-sm text-neutral-dark">{taskDetails.location}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-medium mb-1 flex items-center space-x-2">
                <Tag className="h-4 w-4" />
                <span>Type</span>
              </div>
              <div className="text-sm text-neutral-dark">{taskDetails.type}</div>
            </div>
            {taskDetails.overview && (
              <div>
                <div className="text-sm font-medium text-neutral-medium mb-1">Overview</div>
                <div className="text-sm text-neutral-dark">{taskDetails.overview}</div>
              </div>
            )}
            <Button
              onClick={() => handleSendMessage()}
              className="w-full bg-primary hover:bg-primary-dark"
            >
              Create the tasks
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
