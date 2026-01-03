// Temporary function to set OpenAI API key as Supabase secret
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const projectId = 'rautdxfkuemmlhcrujxq';
    const accessToken = 'sbp_oauth_d0cc0829ce5b306d1476e78cb4a68055d6c46dae';
    const openaiKey = 'YOUR_OPENAI_API_KEY_HERE';

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}/secrets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([{
          name: 'OPENAI_API_KEY',
          value: openaiKey,
        }]),
      }
    );

    const result = await response.text();
    
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        result: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'SET_SECRET_ERROR',
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
