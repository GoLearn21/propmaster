// Updated MasterKeyAIAssistant with Real Backend Integration
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
  History,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  sendAIMessage,
  createTask,
  getMentionData,
  getChatHistory,
  saveChatConversation,
  type Message,
  type TaskDetails,
  type TaskTable,
  type MentionData
} from '../services/aiService';
import toast from 'react-hot-toast';

interface ChatHistory {
  id: string;
  title: string;
  last_message: string;
  created_at: string;
}

// MasterKey predefined prompts
const PREDEFINED_PROMPTS = [
  "Highlight today's priorities",
  "Can you send an owner request which one of my tenants have f..",
  "List tenants with balance due September",
  "List all tasks due in the ext 7 d.."
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
  const [mentionData, setMentionData] = useState<MentionData>({ properties: [], units: [], tenants: [] });
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load mention data when @ is typed
  useEffect(() => {
    if (showMentions) {
      loadMentionData();
    }
  }, [showMentions]);

  // Load chat history on mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadMentionData = async () => {
    try {
      const data = await getMentionData();
      setMentionData(data);
    } catch (error) {
      console.error('Failed to load mention data:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory();
      setChatHistory(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

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

  const handleMentionSelect = (mention: any) => {
    const mentionText = `@${mention.display}`;
    setInputMessage((prev) => prev.replace(/@[^\s]*$/, mentionText + ' '));
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send message to AI backend
      const response = await sendAIMessage(inputMessage, messages);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.message,
        timestamp: new Date(),
        structuredData: response.structuredData
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Update task details if present
      if (response.taskDetails) {
        setTaskDetails(response.taskDetails);
      }

      // Save conversation
      if (messages.length > 1) {
        const conversationTitle = messages[1]?.content.substring(0, 50) || 'New conversation';
        await saveChatConversation(conversationTitle, response.message, currentConversationId);
      }

      toast.success('AI response received');
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again or contact support if the issue persists.",
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredefinedPrompt = async (prompt: string) => {
    setInputMessage(prompt);
    // Trigger send after a brief delay to allow state update
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleCreateTasks = async () => {
    if (!taskDetails) return;

    setIsLoading(true);
    try {
      const tasks = await createTask({
        title: taskDetails.overview || 'Maintenance Task',
        description: taskDetails.overview,
        taskType: taskDetails.type,
        frequency: taskDetails.frequency,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium',
        isRecurring: true,
        recurrenceCount: 2
      });

      // Create confirmation message with task table
      const taskTable: TaskTable = {
        type: 'table',
        headers: ['Task', 'Due Date', 'Property', 'Status', 'Priority'],
        rows: tasks.map((t: any) => ({
          task: t.title,
          dueDate: t.due_date || 'TBD',
          property: taskDetails.location || 'N/A',
          status: t.status,
          priority: t.priority
        }))
      };

      const confirmationMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Perfect! I've created ${tasks.length} recurring task(s):`,
        timestamp: new Date(),
        structuredData: taskTable
      };

      setMessages((prev) => [...prev, confirmationMessage]);
      setTaskDetails(null);
      toast.success(`Created ${tasks.length} task(s) successfully!`);
    } catch (error) {
      console.error('Failed to create tasks:', error);
      toast.error('Failed to create tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderStructuredData = (data: any) => {
    if (!data) return null;

    if (data.type === 'table' || data.headers) {
      return (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-teal-50">
              <tr>
                {data.headers.map((header: string, idx: number) => (
                  <th
                    key={idx}
                    className="px-4 py-3 text-left text-xs font-medium text-teal-800 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.rows.map((row: Record<string, string>, rowIdx: number) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {data.headers.map((header: string, colIdx: number) => {
                    const key = header.toLowerCase().replace(' ', '');
                    const cellValue = row[key] || row[header] || '-';
                    return (
                      <td key={colIdx} className="px-4 py-3 text-sm text-gray-900">
                        {cellValue}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return null;
  };

  const allMentions = [
    ...mentionData.properties.map(p => ({ ...p, category: 'Properties' })),
    ...mentionData.units.map(u => ({ ...u, category: 'Units' })),
    ...mentionData.tenants.map(t => ({ ...t, category: 'Tenants' }))
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] bg-gray-50">
      {/* Chat History Sidebar */}
      {showChatHistory && (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Chat History</h3>
              <button
                onClick={() => setShowChatHistory(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-8">
                No chat history yet
              </div>
            ) : (
              chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setCurrentConversationId(chat.id);
                    setShowChatHistory(false);
                  }}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 mb-2"
                >
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {chat.title}
                  </div>
                  <div className="text-xs text-gray-500 truncate mt-1">
                    {chat.last_message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(chat.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                <p className="text-sm text-gray-500">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <History className="w-4 h-4" />
              <span>Chat history</span>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start space-x-3",
                message.type === 'user' ? "flex-row-reverse space-x-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.type === 'user' ? "bg-blue-500" : "bg-teal-500"
                )}
              >
                {message.type === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className={cn("flex-1", message.type === 'user' ? "flex justify-end" : "")}>
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 max-w-2xl",
                    message.type === 'user'
                      ? "bg-blue-500 text-white"
                      : "bg-white border border-gray-200 text-gray-900"
                  )}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.structuredData && renderStructuredData(message.structuredData)}
                  <div className={cn(
                    "text-xs mt-2",
                    message.type === 'user' ? "text-blue-100" : "text-gray-400"
                  )}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Predefined Prompts */}
        <div className="px-6 py-3 bg-white border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handlePredefinedPrompt(prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-full hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type @ to link a property, unit, or tenant to your task request"
              disabled={isLoading}
              className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>

            {/* Mention Dropdown */}
            {showMentions && allMentions.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {['Properties', 'Units', 'Tenants'].map((category) => {
                  const items = allMentions.filter(m => m.category === category);
                  if (items.length === 0) return null;

                  return (
                    <div key={category}>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                        {category}
                      </div>
                      {items.map((mention) => (
                        <button
                          key={mention.id}
                          onClick={() => handleMentionSelect(mention)}
                          className="w-full px-3 py-2 text-left hover:bg-teal-50 flex items-center space-x-2"
                        >
                          <Badge variant={
                            mention.type === 'property' ? 'default' :
                            mention.type === 'unit' ? 'secondary' : 'warning'
                          }>
                            {mention.type}
                          </Badge>
                          <span className="text-sm text-gray-900">{mention.display}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Panel */}
      {taskDetails && (
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Details</h3>
          
          <div className="space-y-4">
            {taskDetails.frequency && (
              <div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Frequency</span>
                </div>
                <div className="text-sm text-gray-900">{taskDetails.frequency}</div>
              </div>
            )}

            {taskDetails.location && (
              <div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>Location</span>
                </div>
                <div className="text-sm text-gray-900">{taskDetails.location}</div>
              </div>
            )}

            {taskDetails.type && (
              <div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <Tag className="w-4 h-4" />
                  <span>Type</span>
                </div>
                <div className="text-sm text-gray-900">{taskDetails.type}</div>
              </div>
            )}

            {taskDetails.overview && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Overview</div>
                <div className="text-sm text-gray-900">{taskDetails.overview}</div>
              </div>
            )}

            <Button 
              onClick={handleCreateTasks}
              disabled={isLoading}
              className="w-full mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create the tasks
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
