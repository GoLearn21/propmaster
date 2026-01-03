// Create Task from AI Assistant
// Handles task creation with proper data validation

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { 
      title, 
      description, 
      propertyId, 
      taskType, 
      frequency, 
      dueDate, 
      priority = 'medium',
      isRecurring = false,
      recurrenceCount = 1
    } = await req.json();

    if (!title) {
      throw new Error('Task title is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const createdTasks = [];

    // Create single or multiple recurring tasks
    for (let i = 0; i < recurrenceCount; i++) {
      const taskData = {
        title,
        description: description || '',
        property_id: propertyId,
        task_type: taskType || 'maintenance',
        status: 'pending',
        priority,
        frequency,
        due_date: dueDate,
        created_at: new Date().toISOString(),
      };

      const response = await fetch(`${supabaseUrl}/rest/v1/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create task: ${error}`);
      }

      const task = await response.json();
      createdTasks.push(task[0]);
    }

    return new Response(
      JSON.stringify({
        data: {
          tasks: createdTasks,
          count: createdTasks.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Create task error:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'TASK_CREATION_ERROR',
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
