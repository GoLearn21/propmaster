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
        const { amount, currency = 'usd', leaseId, tenantId, propertyId, unitId, paymentType, description, metadata } = await req.json();

        console.log('Rent payment request received:', { amount, currency, leaseId, tenantId });

        // Validate required parameters
        if (!amount || amount <= 0) {
            throw new Error('Valid amount is required');
        }

        if (!leaseId) {
            throw new Error('Lease ID is required');
        }

        // Get environment variables
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!stripeSecretKey) {
            console.error('Stripe secret key not found');
            throw new Error('Payment system not configured');
        }

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Database configuration missing');
        }

        console.log('Creating payment intent...');

        // Prepare Stripe payment intent data
        const stripeParams = new URLSearchParams();
        stripeParams.append('amount', Math.round(amount * 100).toString()); // Convert to cents
        stripeParams.append('currency', currency);
        stripeParams.append('payment_method_types[]', 'card');
        stripeParams.append('description', description || `Rent payment for lease ${leaseId}`);
        stripeParams.append('metadata[lease_id]', leaseId);
        stripeParams.append('metadata[tenant_id]', tenantId || '');
        
        // Add any additional metadata
        if (metadata) {
            Object.keys(metadata).forEach(key => {
                stripeParams.append(`metadata[${key}]`, metadata[key]);
            });
        }

        // Create payment intent with Stripe
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
        console.log('Payment intent created:', paymentIntent.id);

        // Generate payment number
        const paymentNumber = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Create payment record in database
        const paymentData = {
            payment_number: paymentNumber,
            tenant_id: tenantId,
            lease_id: leaseId,
            property_id: propertyId,
            unit_id: unitId,
            payment_type: paymentType || 'rent',
            amount: amount,
            currency: currency,
            due_date: new Date().toISOString().split('T')[0], // Today's date as YYYY-MM-DD
            status: 'pending',
            payment_method: 'online', // Stripe is an online payment method
            stripe_payment_intent_id: paymentIntent.id,
            notes: description,
            paid_date: new Date().toISOString(),
            metadata: metadata || {},
            created_at: new Date().toISOString()
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
            
            // Cancel the payment intent if database insert fails
            try {
                await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntent.id}/cancel`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${stripeSecretKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                console.log('Payment intent cancelled due to database error');
            } catch (cancelError) {
                console.error('Failed to cancel payment intent:', cancelError.message);
            }
            
            throw new Error(`Failed to create payment record: ${errorText}`);
        }

        const payment = await paymentResponse.json();
        const paymentId = payment[0].id;
        console.log('Payment record created:', paymentId);

        const result = {
            data: {
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                paymentId: paymentId,
                amount: amount,
                currency: currency,
                status: 'pending'
            }
        };

        console.log('Payment intent creation completed successfully');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Payment processing error:', error);

        const errorResponse = {
            error: {
                code: 'PAYMENT_FAILED',
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
