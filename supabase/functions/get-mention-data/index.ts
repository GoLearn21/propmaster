// Get Mention Data - Properties, Units, Tenants
// Provides data for @mention autocomplete functionality

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get('search') || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const headers = {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
    };

    // Fetch properties
    const propertiesResponse = await fetch(
      `${supabaseUrl}/rest/v1/properties?select=id,name,address&limit=20`,
      { headers }
    );
    const properties = propertiesResponse.ok ? await propertiesResponse.json() : [];

    // Fetch units
    const unitsResponse = await fetch(
      `${supabaseUrl}/rest/v1/units?select=id,unit_number,property_id&limit=20`,
      { headers }
    );
    const units = unitsResponse.ok ? await unitsResponse.json() : [];

    // Fetch tenants
    const tenantsResponse = await fetch(
      `${supabaseUrl}/rest/v1/tenants?select=id,first_name,last_name,unit_id&limit=20`,
      { headers }
    );
    const tenants = tenantsResponse.ok ? await tenantsResponse.json() : [];

    // Format data for autocomplete
    const mentionData = {
      properties: properties.map((p: any) => ({
        type: 'property',
        id: p.id,
        name: p.name,
        display: `${p.name} - ${p.address}`,
      })),
      units: units.map((u: any) => ({
        type: 'unit',
        id: u.id,
        name: `Unit ${u.unit_number}`,
        display: `Unit ${u.unit_number}`,
      })),
      tenants: tenants.map((t: any) => ({
        type: 'tenant',
        id: t.id,
        name: `${t.first_name} ${t.last_name}`,
        display: `${t.first_name} ${t.last_name}`,
      })),
    };

    // Filter by search term if provided
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      mentionData.properties = mentionData.properties.filter((p: any) =>
        p.display.toLowerCase().includes(searchLower)
      );
      mentionData.units = mentionData.units.filter((u: any) =>
        u.display.toLowerCase().includes(searchLower)
      );
      mentionData.tenants = mentionData.tenants.filter((t: any) =>
        t.display.toLowerCase().includes(searchLower)
      );
    }

    return new Response(
      JSON.stringify({ data: mentionData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get mention data error:', error);

    return new Response(
      JSON.stringify({
        error: {
          code: 'MENTION_DATA_ERROR',
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
