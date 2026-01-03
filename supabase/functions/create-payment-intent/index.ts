Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { amount, currency = 'usd', metadata } = await req.json();

        console.log('Creating payment intent:', { amount, currency, metadata });

        // Validate required parameters
        if (!amount || amount <= 0) {
            throw new Error('Valid amount is required');
        }

        // Get environment variables
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!stripeSecretKey) {
            console.error('Stripe secret key not found in environment');
            throw new Error('Stripe secret key not configured');
        }

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        console.log('Environment variables validated, creating payment intent...');

        // Get user from auth header if provided
        let userId = null;
        const authHeader = req.headers.get('authorization');
        if (authHeader) {
            try {
                const token = authHeader.replace('Bearer ', '');
                const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': serviceRoleKey
                    }
                });
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    userId = userData.id;
                    console.log('User identified:', userId);
                }
            } catch (error) {
                console.log('Could not get user from token:', error.message);
            }
        }

        // Create payment intent with Stripe
        const stripeParams = new URLSearchParams();
        stripeParams.append('amount', Math.round(amount * 100).toString()); // Convert to cents
        stripeParams.append('currency', currency);
        stripeParams.append('payment_method_types[]', 'card');
        stripeParams.append('payment_method_types[]', 'us_bank_account');
        
        // Add metadata
        if (metadata) {
            for (const [key, value] of Object.entries(metadata)) {
                stripeParams.append(`metadata[${key}]`, String(value));
            }
        }
        
        if (userId) {
            stripeParams.append('metadata[user_id]', userId);
        }

        console.log('Calling Stripe API...');

        const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: stripeParams.toString()
        });

        console.log('Stripe API response status:', stripeResponse.status);

        if (!stripeResponse.ok) {
            const errorData = await stripeResponse.text();
            console.error('Stripe API error:', errorData);
            throw new Error(`Stripe API error: ${errorData}`);
        }

        const paymentIntent = await stripeResponse.json();
        console.log('Payment intent created successfully:', paymentIntent.id);

        // Create payment record in database
        const paymentData = {
            tenant_id: metadata?.tenant_id || null,
            lease_id: metadata?.lease_id || null,
            stripe_payment_intent_id: paymentIntent.id,
            amount: amount,
            status: 'pending',
            payment_method: 'credit_card', // Default, will be updated on confirmation
            payment_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('Creating payment record in database...');

        const paymentResponse = await fetch(`${supabaseUrl}/rest/v1/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(paymentData)
        });

        if (!paymentResponse.ok) {
            const errorText = await paymentResponse.text();
            console.error('Failed to create payment record:', errorText);
            // Log error but don't fail the payment intent creation
            console.warn('Payment intent created but database record creation failed');
        } else {
            console.log('Payment record created successfully');
        }

        const result = {
            data: {
                id: paymentIntent.id,
                client_secret: paymentIntent.client_secret,
                amount: amount,
                currency: currency,
                status: paymentIntent.status
            }
        };

        console.log('Payment intent creation completed successfully');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Payment intent creation error:', error);

        const errorResponse = {
            error: {
                code: 'PAYMENT_INTENT_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});