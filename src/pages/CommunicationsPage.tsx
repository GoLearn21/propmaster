import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  Mail,
  Search,
  Plus,
  Archive,
  MoreVertical,
  ArrowLeft,
  Clock,
  CheckCheck,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Input,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  Textarea,
  Loading,
} from '../components/ui';
import {
  getThreads,
  getThreadMessages,
  sendMessage,
  markThreadAsRead,
  archiveThread,
  getTemplates,
  type ConversationThread,
  type Communication,
  type MessageTemplate,
} from '../services/communicationsService';
import toast from 'react-hot-toast';

export default function CommunicationsPage() {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<Communication[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // Compose form state
  const [composeForm, setComposeForm] = useState({
    recipient_ids: [] as string[],
    recipient_type: 'tenant',
    subject: '',
    body: '',
    channel: 'portal',
    template_id: '',
  });

  useEffect(() => {
    loadThreads();
    loadTemplates();
  }, [showArchived]);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread.id);
    }
  }, [selectedThread]);

  const loadThreads = async () => {
    setLoading(true);
    try {
      const data = await getThreads({ archived: showArchived });
      setThreads(data);
    } catch (error: any) {
      console.error('Error loading threads:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    setMessagesLoading(true);
    try {
      const data = await getThreadMessages(threadId);
      setMessages(data);
      // Mark thread as read
      await markThreadAsRead(threadId);
      // Update thread unread count in UI
      setThreads(prev =>
        prev.map(t => (t.id === threadId ? { ...t, unread_count: 0 } : t))
      );
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (error: any) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!composeForm.body.trim()) {
      toast.error('Message body is required');
      return;
    }

    // For demo, using placeholder recipient
    if (composeForm.recipient_ids.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    try {
      await sendMessage({
        recipient_ids: composeForm.recipient_ids,
        recipient_type: composeForm.recipient_type,
        subject: composeForm.subject,
        body: composeForm.body,
        channel: composeForm.channel,
        template_id: composeForm.template_id || undefined,
      });

      toast.success('Message sent successfully');
      setIsComposeOpen(false);
      setComposeForm({
        recipient_ids: [],
        recipient_type: 'tenant',
        subject: '',
        body: '',
        channel: 'portal',
        template_id: '',
      });

      // Reload threads
      loadThreads();
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleArchiveThread = async (threadId: string, archived: boolean) => {
    try {
      await archiveThread(threadId, archived);
      toast.success(archived ? 'Conversation archived' : 'Conversation restored');
      loadThreads();
      if (selectedThread?.id === threadId) {
        setSelectedThread(null);
      }
    } catch (error: any) {
      console.error('Error archiving thread:', error);
      toast.error('Failed to archive conversation');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setComposeForm(prev => ({
        ...prev,
        template_id: templateId,
        subject: template.subject || prev.subject,
        body: template.body,
      }));
    }
  };

  const filteredThreads = threads.filter(thread =>
    thread.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      sent: 'info',
      delivered: 'success',
      read: 'success',
      failed: 'error',
      draft: 'warning',
    };
    return <Badge variant={variants[status] || 'info'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loading text="Loading conversations..." size="lg" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-neutral-lightest">
      {/* Header */}
      <div className="bg-white border-b border-neutral-light px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h3 font-bold text-neutral-black">Communications</h1>
            <p className="text-sm text-neutral-medium mt-1">
              Manage conversations with tenants, owners, and vendors
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Archive className="h-4 w-4" />}
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? 'Active' : 'Archived'}
            </Button>
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  New Message
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Compose Message</DialogTitle>
                  <DialogDescription>
                    Send a message via email, SMS, or portal
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Select
                    label="Template (Optional)"
                    value={composeForm.template_id}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    options={[
                      { value: '', label: 'No template' },
                      ...templates.map(t => ({ value: t.id, label: t.name })),
                    ]}
                  />
                  <Select
                    label="Channel"
                    value={composeForm.channel}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, channel: e.target.value }))}
                    options={[
                      { value: 'portal', label: 'Portal Message' },
                      { value: 'email', label: 'Email' },
                      { value: 'sms', label: 'SMS' },
                      { value: 'push', label: 'Push Notification' },
                    ]}
                  />
                  <Select
                    label="Recipient Type"
                    value={composeForm.recipient_type}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, recipient_type: e.target.value }))}
                    options={[
                      { value: 'tenant', label: 'Tenant' },
                      { value: 'owner', label: 'Owner' },
                      { value: 'vendor', label: 'Vendor' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'broadcast', label: 'Broadcast to All' },
                    ]}
                  />
                  <Input
                    label="Subject"
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Enter subject..."
                  />
                  <Textarea
                    label="Message"
                    value={composeForm.body}
                    onChange={(e) => setComposeForm(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Type your message..."
                    rows={6}
                  />
                  <div className="text-xs text-neutral-medium">
                    Note: Recipients will be selected based on recipient type. For demo purposes,
                    this will create a conversation with system users.
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<Send className="h-4 w-4" />}
                    onClick={handleSendMessage}
                  >
                    Send Message
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Inbox Sidebar */}
        <div className="w-96 bg-white border-r border-neutral-light flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-neutral-light">
            <Input
              type="text"
              placeholder="Search conversations..."
              leftIcon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <MessageSquare className="h-12 w-12 text-neutral-light mb-3" />
                <p className="text-neutral-medium">
                  {showArchived ? 'No archived conversations' : 'No conversations yet'}
                </p>
                <p className="text-sm text-neutral-medium mt-1">
                  {!showArchived && 'Start a new conversation to get started'}
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => setSelectedThread(thread)}
                  className={`p-4 border-b border-neutral-lighter cursor-pointer hover:bg-neutral-lightest transition-colors ${
                    selectedThread?.id === thread.id ? 'bg-primary-lightest border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-neutral-black truncate">
                          {thread.subject || 'No subject'}
                        </h3>
                        {thread.unread_count > 0 && (
                          <Badge variant="primary">{thread.unread_count}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-neutral-medium mt-1 line-clamp-2">
                        {thread.last_message_preview || 'No messages yet'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-neutral-medium" />
                        <span className="text-xs text-neutral-medium">
                          {new Date(thread.last_message_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveThread(thread.id, !thread.is_archived);
                      }}
                      className="p-1 hover:bg-neutral-lighter rounded"
                    >
                      <Archive className="h-4 w-4 text-neutral-medium" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedThread ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-neutral-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<ArrowLeft className="h-4 w-4" />}
                      onClick={() => setSelectedThread(null)}
                      className="md:hidden"
                    >
                      Back
                    </Button>
                    <div>
                      <h2 className="font-semibold text-neutral-black">
                        {selectedThread.subject || 'No subject'}
                      </h2>
                      <p className="text-sm text-neutral-medium">
                        {selectedThread.participants.length} participant(s)
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loading text="Loading messages..." />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-neutral-medium">
                    No messages in this conversation
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_type === 'manager' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-lg rounded-lg p-3 ${
                          message.sender_type === 'manager'
                            ? 'bg-primary text-white'
                            : 'bg-neutral-lightest text-neutral-black'
                        }`}
                      >
                        {message.subject && (
                          <div className="font-semibold mb-1">{message.subject}</div>
                        )}
                        <div className="whitespace-pre-wrap">{message.body}</div>
                        <div className="flex items-center justify-between gap-2 mt-2 text-xs opacity-75">
                          <div className="flex items-center gap-2">
                            {getChannelIcon(message.channel)}
                            <span>{new Date(message.sent_at).toLocaleString()}</span>
                          </div>
                          {message.sender_type === 'manager' && message.status === 'read' && (
                            <CheckCheck className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Box */}
              <div className="p-4 border-t border-neutral-light">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Type a reply..."
                    rows={2}
                    className="flex-1"
                  />
                  <Button variant="primary" size="md" leftIcon={<Send className="h-4 w-4" />}>
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <MessageSquare className="h-16 w-16 text-neutral-light mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-black mb-2">
                  Select a conversation
                </h3>
                <p className="text-neutral-medium">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
