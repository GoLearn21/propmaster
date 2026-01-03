import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { 
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  TrendingUp,
  Wrench,
  DollarSign,
  Home,
  FileText,
  Settings,
  Minimize2,
  Maximize2,
  X,
  Lightbulb,
  Target,
  Brain,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  actions?: AIAction[];
}

interface AIAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface AIInsight {
  type: 'maintenance' | 'market' | 'financial' | 'operational';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  actions: string[];
}

export default function AIChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your AI assistant for PropMaster. I can help you with property management insights, maintenance predictions, market analysis, and much more. How can I assist you today?",
      timestamp: new Date(),
      suggestions: [
        "Show me maintenance predictions for my properties",
        "Analyze market trends in my area",
        "Optimize my rent prices",
        "Suggest vendors for maintenance work"
      ]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeInsights, setActiveInsights] = useState<AIInsight[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateAIResponse = async (userMessage: string): Promise<{ content: string; suggestions?: string[]; actions?: AIAction[] }> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lowerMessage = userMessage.toLowerCase();

    // Maintenance-related queries
    if (lowerMessage.includes('maintenance') || lowerMessage.includes('repair') || lowerMessage.includes('fix')) {
      return {
        content: "I've analyzed your maintenance data and found some important insights:",
        suggestions: [
          "Show me critical maintenance alerts",
          "Schedule preventive maintenance",
          "Find best vendors for repairs",
          "Predict equipment failures"
        ],
        actions: [
          {
            label: "View Maintenance Dashboard",
            icon: <Wrench className="h-4 w-4" />,
            onClick: () => console.log('Navigate to maintenance dashboard')
          },
          {
            label: "Schedule Maintenance",
            icon: <Clock className="h-4 w-4" />,
            onClick: () => console.log('Open maintenance scheduler')
          }
        ]
      };
    }

    // Market analysis queries
    if (lowerMessage.includes('market') || lowerMessage.includes('rent') || lowerMessage.includes('price')) {
      return {
        content: "Based on current market data in your area, here are the key insights:",
        suggestions: [
          "Compare my rent to market rates",
          "Show neighborhood trends",
          "Analyze competitive properties",
          "Predict market changes"
        ],
        actions: [
          {
            label: "View Market Report",
            icon: <TrendingUp className="h-4 w-4" />,
            onClick: () => console.log('Open market intelligence')
          },
          {
            label: "Adjust Rent Prices",
            icon: <DollarSign className="h-4 w-4" />,
            onClick: () => console.log('Open rent optimization')
          }
        ]
      };
    }

    // Financial queries
    if (lowerMessage.includes('financial') || lowerMessage.includes('profit') || lowerMessage.includes('income') || lowerMessage.includes('cost')) {
      return {
        content: "I've analyzed your financial performance and found several optimization opportunities:",
        suggestions: [
          "Show profit and loss breakdown",
          "Optimize operating expenses",
          "Analyze cash flow trends",
          "Suggest cost reductions"
        ],
        actions: [
          {
            label: "View Financial Dashboard",
            icon: <DollarSign className="h-4 w-4" />,
            onClick: () => console.log('Open financial dashboard')
          },
          {
            label: "Cost Optimization",
            icon: <Target className="h-4 w-4" />,
            onClick: () => console.log('Open cost optimization')
          }
        ]
      };
    }

    // Property performance queries
    if (lowerMessage.includes('property') || lowerMessage.includes('portfolio') || lowerMessage.includes('performance')) {
      return {
        content: "Here's your portfolio performance summary with AI-powered insights:",
        suggestions: [
          "Show property performance rankings",
          "Identify underperforming properties",
          "Get improvement recommendations",
          "Compare properties"
        ],
        actions: [
          {
            label: "View Portfolio Dashboard",
            icon: <Home className="h-4 w-4" />,
            onClick: () => console.log('Open portfolio dashboard')
          },
          {
            label: "Performance Analysis",
            icon: <Brain className="h-4 w-4" />,
            onClick: () => console.log('Open performance analysis')
          }
        ]
      };
    }

    // Default response
    return {
      content: "I can help you with various property management tasks including maintenance predictions, market analysis, financial optimization, and operational insights. What specific area would you like me to focus on?",
      suggestions: [
        "Predict maintenance needs",
        "Analyze market trends", 
        "Optimize rent prices",
        "Find top vendors",
        "Show financial insights"
      ]
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await generateAIResponse(inputMessage);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.content,
        timestamp: new Date(),
        suggestions: response.suggestions,
        actions: response.actions
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Generate some AI insights based on the conversation
      if (lowerMessage.includes('maintenance')) {
        setActiveInsights([
          {
            type: 'maintenance',
            title: 'HVAC System Alert',
            description: 'Predictive analysis suggests the HVAC system at Oak Street Complex may need attention within 30 days.',
            priority: 'high',
            confidence: 87,
            actions: ['Schedule inspection', 'Contact vendor', 'View details']
          },
          {
            type: 'maintenance',
            title: 'Preventive Maintenance Due',
            description: 'Three properties have preventive maintenance scheduled for next week.',
            priority: 'medium',
            confidence: 95,
            actions: ['View schedule', 'Confirm vendors', 'Send reminders']
          }
        ]);
      }
    } catch (error) {
      console.error('AI response error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleActionClick = (action: AIAction) => {
    action.onClick();
  };

  const lowerMessage = messages[messages.length - 1]?.content.toLowerCase() || '';

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full h-14 w-14 bg-primary hover:bg-primary/90 shadow-lg"
        >
          <MessageSquare className="h-6 w-6 text-white" />
          {activeInsights.length > 0 && (
            <div className="absolute -top-2 -right-2 h-5 w-5 bg-accent-pink rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">{activeInsights.length}</span>
            </div>
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col shadow-xl border-0 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-r from-primary to-accent-green rounded-full flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Assistant</h3>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {activeInsights.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h4 className="font-medium text-gray-900">AI Insights</h4>
          </div>
          <div className="space-y-2">
            {activeInsights.map((insight, index) => (
              <div key={index} className="p-3 bg-white rounded-lg border shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant={insight.priority === 'high' ? 'danger' : insight.priority === 'medium' ? 'warning' : 'secondary'}>
                        {insight.priority}
                      </Badge>
                      <span className="text-xs text-gray-500">{insight.confidence}% confidence</span>
                    </div>
                    <h5 className="font-medium text-gray-900 text-sm">{insight.title}</h5>
                    <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveInsights(prev => prev.filter((_, i) => i !== index))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.type === 'user' ? 'bg-primary' : 'bg-gradient-to-r from-primary to-accent-green'
              }`}>
                {message.type === 'user' ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4 text-white" />
                )}
              </div>
              <div className={`rounded-lg px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {message.actions && (
                  <div className="mt-3 space-y-2">
                    {message.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => handleActionClick(action)}
                      >
                        {action.icon}
                        <span className="ml-2">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-accent-green flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length > 0 && messages[messages.length - 1].suggestions && !isLoading && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {messages[messages.length - 1].suggestions!.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <Lightbulb className="h-3 w-3 mr-1" />
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <Input
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me anything about your properties..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}