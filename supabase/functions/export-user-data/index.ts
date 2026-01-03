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
    const { format = 'json' } = await req.json();
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    // Extract user from JWT (simplified - in production use proper JWT validation)
    const token = authHeader.replace('Bearer ', '');
    
    // Fetch user data from Supabase
    const headers = {
      'Authorization': authHeader,
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
    };

    // Fetch all relevant data
    const [propertiesRes, unitsRes, tenantsRes, leasesRes, tasksRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/properties?select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/units?select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/tenants?select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/leases?select=*`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/tasks?select=*`, { headers }),
    ]);

    const properties = await propertiesRes.json();
    const units = await unitsRes.json();
    const tenants = await tenantsRes.json();
    const leases = await leasesRes.json();
    const tasks = await tasksRes.json();

    const exportData = {
      exported_at: new Date().toISOString(),
      properties: properties || [],
      units: units || [],
      tenants: tenants || [],
      leases: leases || [],
      tasks: tasks || [],
    };

    if (format === 'csv') {
      // Generate CSV summary
      const csvRows = [
        ['Data Type', 'Count'],
        ['Properties', properties?.length || 0],
        ['Units', units?.length || 0],
        ['Tenants', tenants?.length || 0],
        ['Leases', leases?.length || 0],
        ['Tasks', tasks?.length || 0],
      ];
      
      const csvString = csvRows.map(row => row.join(',')).join('\\n');
      
      return new Response(csvString, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="propmaster-export-${Date.now()}.csv"`,
        },
      });
    } else {
      // Return JSON
      return new Response(JSON.stringify(exportData), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="propmaster-export-${Date.now()}.json"`,
        },
      });
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'EXPORT_ERROR',
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
