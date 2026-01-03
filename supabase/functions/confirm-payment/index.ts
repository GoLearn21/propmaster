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
        const { payment_intent_id, payment_method_id, amount, metadata } = await req.json();

        console.log('Confirming payment:', { payment_intent_id, payment_method_id, amount });

        // Validate required parameters
        if (!payment_intent_id) {
            throw new Error('Payment intent ID is required');
        }

        if (!payment_method_id) {
            throw new Error('Payment method ID is required');
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

        console.log('Environment variables validated, confirming payment...');

        // Confirm payment intent with Stripe
        const confirmParams = new URLSearchParams();
        confirmParams.append('payment_method', payment_method_id);
        confirmParams.append('return_url', 'https://your-app.com/return'); // This should be configurable

        console.log('Calling Stripe payment confirmation API...');

        const stripeResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}/confirm`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: confirmParams.toString()
        });

        console.log('Stripe confirmation response status:', stripeResponse.status);

        if (!stripeResponse.ok) {
            const errorData = await stripeResponse.text();
            console.error('Stripe confirmation error:', errorData);
            throw new Error(`Stripe confirmation error: ${errorData}`);
        }

        const paymentIntent = await stripeResponse.json();
        console.log('Payment confirmed with Stripe:', paymentIntent.id, 'Status:', paymentIntent.status);

        // Update payment record in database
        const updateData = {
            status: paymentIntent.status === 'succeeded' ? 'paid' : 
                    paymentIntent.status === 'processing' ? 'processing' :
                    paymentIntent.status === 'requires_action' ? 'pending' : 'failed',
            payment_date: paymentIntent.status === 'succeeded' ? new Date().toISOString() : null,
            reference_number: paymentIntent.id,
            updated_at: new Date().toISOString()
        };

        // Get payment method details for database
        if (paymentIntent.payment_method) {
            const paymentMethodResponse = await fetch(`https://api.stripe.com/v1/payment_methods/${paymentIntent.payment_method}`, {
                headers: {
                    'Authorization': `Bearer ${stripeSecretKey}`
                }
            });

            if (paymentMethodResponse.ok) {
                const paymentMethodData = await paymentMethodResponse.json();
                updateData.payment_method = paymentMethodData.type === 'card' ? 'credit_card' : 
                                          paymentMethodData.type === 'us_bank_account' ? 'ach' : 'other';
            }
        }

        console.log('Updating payment record in database...');

        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/payments?stripe_payment_intent_id=eq.${payment_intent_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateData)
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Failed to update payment record:', errorText);
            throw new Error(`Failed to update payment record: ${errorText}`);
        }

        const updatedPayments = await updateResponse.json();
        const updatedPayment = updatedPayments[0];

        console.log('Payment record updated successfully:', updatedPayment?.id);

        // If payment succeeded, handle additional logic
        if (paymentIntent.status === 'succeeded') {
            console.log('Payment succeeded, performing post-payment actions...');

            // Update lease balance if applicable
            if (metadata?.lease_id) {
                try {
                    // This would integrate with the automated billing system
                    // to update lease balances and apply payment allocation
                    console.log('Updating lease balance for lease:', metadata.lease_id);
                } catch (error) {
                    console.error('Error updating lease balance:', error);
                    // Don't fail the whole operation for this
                }
            }

            // Generate receipt
            try {
                // This would integrate with the receipt generation system
                console.log('Generating receipt for payment:', updatedPayment?.id);
            } catch (error) {
                console.error('Error generating receipt:', error);
                // Don't fail the whole operation for this
            }
        }

        const result = {
            data: {
                id: updatedPayment?.id,
                stripe_payment_intent_id: payment_intent_id,
                amount: amount,
                status: updateData.status,
                payment_date: updateData.payment_date,
                tenant_id: updatedPayment?.tenant_id,
                lease_id: updatedPayment?.lease_id
            }
        };

        console.log('Payment confirmation completed successfully');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Payment confirmation error:', error);

        const errorResponse = {
            error: {
                code: 'PAYMENT_CONFIRMATION_FAILED',
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