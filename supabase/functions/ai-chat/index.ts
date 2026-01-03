// DoorLoop AI Assistant - OpenAI Integration
// Provides intelligent conversational responses for property management tasks

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // System prompt for DoorLoop AI Assistant
    const systemPrompt = `You are an intelligent property management assistant for DoorLoop. You help property managers with:

1. Task Management: Create, schedule, and track maintenance tasks
2. Tenant Management: Track rent payments, balances, and tenant information
3. Property Operations: Manage properties, units, and work orders
4. Owner Relations: Handle owner requests and communications
5. Reporting: Generate insights on priorities, due dates, and finances

When extracting task details, identify:
- Frequency: How often the task should occur (e.g., "Every 6 months", "Monthly", "Annually")
- Location: The property or unit address
- Type: Category like "Preventative Maintenance", "Repair", "Inspection", etc.
- Overview: Brief description of the task

When presenting data, use structured formats:
- For multiple items, use bullet points
- For tabular data (tasks, tenants, balances), return in table format
- Be concise but informative

Always maintain a professional, helpful tone.`;

    // Build messages for OpenAI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const aiMessage = openaiData.choices[0]?.message?.content;

    if (!aiMessage) {
      throw new Error('No response from AI');
    }

    // Extract structured data if present
    let structuredData = null;
    let taskDetails = null;

    // Check if response contains task extraction
    if (message.toLowerCase().includes('filter') || 
        message.toLowerCase().includes('maintenance') ||
        message.toLowerCase().includes('repair')) {
      
      // Extract task details from AI response
      const frequencyMatch = aiMessage.match(/frequency[:\s]+([^\n]+)/i);
      const locationMatch = aiMessage.match(/location[:\s]+([^\n]+)/i);
      const typeMatch = aiMessage.match(/type[:\s]+([^\n]+)/i);

      if (frequencyMatch || locationMatch || typeMatch) {
        taskDetails = {
          frequency: frequencyMatch ? frequencyMatch[1].trim() : null,
          location: locationMatch ? locationMatch[1].trim() : null,
          type: typeMatch ? typeMatch[1].trim() : null,
        };
      }
    }

    // Check if we should fetch real data from database
    const lowerMessage = message.toLowerCase();
    
    if (supabaseUrl && supabaseServiceKey) {
      // Fetch tenants with balance due
      if (lowerMessage.includes('balance') || lowerMessage.includes('tenant')) {
        try {
          const tenantsResponse = await fetch(
            `${supabaseUrl}/rest/v1/tenants?balance_due=gt.0&order=balance_due.desc&limit=10`,
            {
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
              },
            }
          );

          if (tenantsResponse.ok) {
            const tenants = await tenantsResponse.json();
            if (tenants && tenants.length > 0) {
              structuredData = {
                type: 'table',
                headers: ['Tenant', 'Unit', 'Balance Due', 'Due Date'],
                rows: tenants.map((t: any) => ({
                  tenant: `${t.first_name} ${t.last_name}`,
                  unit: t.unit_id || 'N/A',
                  balanceDue: `$${t.balance_due?.toFixed(2) || '0.00'}`,
                  dueDate: 'Overdue',
                })),
              };
            }
          }
        } catch (e) {
          console.error('Error fetching tenants:', e);
        }
      }

      // Fetch upcoming tasks
      if (lowerMessage.includes('task') && (lowerMessage.includes('due') || lowerMessage.includes('upcoming'))) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          const tasksResponse = await fetch(
            `${supabaseUrl}/rest/v1/tasks?due_date=gte.${today}&due_date=lte.${nextWeek}&order=due_date.asc&limit=10`,
            {
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey,
              },
            }
          );

          if (tasksResponse.ok) {
            const tasks = await tasksResponse.json();
            if (tasks && tasks.length > 0) {
              structuredData = {
                type: 'table',
                headers: ['Task', 'Due Date', 'Status', 'Priority'],
                rows: tasks.map((t: any) => ({
                  task: t.title,
                  dueDate: t.due_date,
                  status: t.status,
                  priority: t.priority,
                })),
              };
            }
          }
        } catch (e) {
          console.error('Error fetching tasks:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        data: {
          message: aiMessage,
          structuredData,
          taskDetails,
          timestamp: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('AI Chat error:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'AI_CHAT_ERROR',
          message: error.message,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
