import { supabase } from '../lib/supabase';

/**
 * Lease Renewal Automation Service
 * Handles automatic lease renewal offers, rent increases, and renewal workflows
 * Phase 2: Automation & Workflows
 */

export interface LeaseRenewalOffer {
  id: string;
  lease_id: string;
  tenant_id: string;
  property_id: string;
  unit_id: string;
  current_rent: number;
  proposed_rent: number;
  rent_increase_percentage: number;
  current_end_date: string;
  proposed_start_date: string;
  proposed_end_date: string;
  offer_sent_date: string;
  offer_expiration_date: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'countered';
  tenant_response_date?: string;
  counter_offer_rent?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RenewalResult {
  leases_expiring: number;
  offers_generated: number;
  offers_sent: number;
  errors: string[];
}

/**
 * Process lease renewals - should be called daily by cron job
 * Identifies leases expiring in 60 days and generates renewal offers
 */
export async function processLeaseRenewals(): Promise<RenewalResult> {
  const results: RenewalResult = {
    leases_expiring: 0,
    offers_generated: 0,
    offers_sent: 0,
    errors: []
  };

  try {
    // Calculate date 60 days from now
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
    const targetDate = sixtyDaysFromNow.toISOString().split('T')[0];

    // Calculate date 70 days from now (10-day window)
    const seventyDaysFromNow = new Date();
    seventyDaysFromNow.setDate(seventyDaysFromNow.getDate() + 70);
    const windowEnd = seventyDaysFromNow.toISOString().split('T')[0];

    console.log(`Checking for leases expiring between ${targetDate} and ${windowEnd}...`);

    // Get all active leases expiring in 60-70 days
    const { data: expiringLeases, error: leasesError } = await supabase
      .from('leases')
      .select(`
        *,
        tenants:tenant_id(id, first_name, last_name, email, phone),
        properties:property_id(id, name, address),
        units:unit_id(id, unit_number)
      `)
      .eq('status', 'active')
      .gte('end_date', targetDate)
      .lte('end_date', windowEnd);

    if (leasesError) {
      results.errors.push(`Failed to fetch expiring leases: ${leasesError.message}`);
      return results;
    }

    if (!expiringLeases || expiringLeases.length === 0) {
      console.log('No leases expiring in the next 60-70 days');
      return results;
    }

    results.leases_expiring = expiringLeases.length;
    console.log(`Found ${expiringLeases.length} leases expiring soon`);

    // Process each expiring lease
    for (const lease of expiringLeases) {
      try {
        // Check if renewal offer already exists
        const { data: existingOffer } = await supabase
          .from('lease_renewal_offers')
          .select('id')
          .eq('lease_id', lease.id)
          .in('status', ['pending', 'countered'])
          .single();

        if (existingOffer) {
          console.log(`Renewal offer already exists for lease ${lease.id}`);
          continue;
        }

        // Generate renewal offer
        const offer = await generateRenewalOffer(lease);
        if (offer) {
          results.offers_generated++;

          // Send renewal offer to tenant
          const sent = await sendRenewalOffer(offer, lease);
          if (sent) {
            results.offers_sent++;
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`Failed to process lease ${lease.id}: ${errorMsg}`);
      }
    }

    console.log(`Renewal processing complete: ${results.offers_generated} offers generated, ${results.offers_sent} sent`);
    return results;

  } catch (error) {
    console.error('Lease renewal processing error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Generate a renewal offer for a lease
 * Calculates market-based rent increase
 */
async function generateRenewalOffer(lease: any): Promise<LeaseRenewalOffer | null> {
  try {
    console.log(`Generating renewal offer for lease ${lease.id}`);

    // Calculate rent increase based on market conditions
    const rentIncrease = await calculateRentIncrease(lease);
    const proposedRent = Math.round((lease.monthly_rent * (1 + rentIncrease / 100)) * 100) / 100;

    // Calculate new lease dates
    const currentEndDate = new Date(lease.end_date);
    const proposedStartDate = new Date(currentEndDate);
    proposedStartDate.setDate(proposedStartDate.getDate() + 1); // Day after current lease ends

    const proposedEndDate = new Date(proposedStartDate);
    proposedEndDate.setFullYear(proposedEndDate.getFullYear() + 1); // 1-year lease

    // Offer expires 30 days before lease end
    const offerExpirationDate = new Date(currentEndDate);
    offerExpirationDate.setDate(offerExpirationDate.getDate() - 30);

    // Create renewal offer
    const { data: offer, error } = await supabase
      .from('lease_renewal_offers')
      .insert({
        lease_id: lease.id,
        tenant_id: lease.tenant_id,
        property_id: lease.property_id,
        unit_id: lease.unit_id,
        current_rent: lease.monthly_rent,
        proposed_rent: proposedRent,
        rent_increase_percentage: rentIncrease,
        current_end_date: lease.end_date,
        proposed_start_date: proposedStartDate.toISOString().split('T')[0],
        proposed_end_date: proposedEndDate.toISOString().split('T')[0],
        offer_sent_date: new Date().toISOString().split('T')[0],
        offer_expiration_date: offerExpirationDate.toISOString().split('T')[0],
        status: 'pending',
        notes: 'Auto-generated renewal offer'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create renewal offer:', error);
      return null;
    }

    console.log(`Renewal offer created: $${lease.monthly_rent} → $${proposedRent} (+${rentIncrease}%)`);
    return offer;

  } catch (error) {
    console.error('Generate renewal offer error:', error);
    return null;
  }
}

/**
 * Calculate rent increase percentage based on market conditions
 * Uses property location, current rent, and market trends
 */
async function calculateRentIncrease(lease: any): Promise<number> {
  try {
    // Base rent increase (3% is typical for inflation)
    let baseIncrease = 3.0;

    // Get market data for the area
    // TODO: Integrate with real estate market data API (Zillow, Rentometer, etc.)

    // For now, use intelligent defaults based on current rent
    const currentRent = lease.monthly_rent;

    // Adjust based on current rent level
    // Lower rents can support higher percentage increases
    if (currentRent < 1000) {
      baseIncrease = 5.0; // Higher percentage for affordable units
    } else if (currentRent < 1500) {
      baseIncrease = 4.0;
    } else if (currentRent < 2500) {
      baseIncrease = 3.5;
    } else {
      baseIncrease = 2.5; // Luxury units: lower percentage increase
    }

    // Get property performance to adjust increase
    const { data: propertyData } = await supabase
      .from('properties')
      .select('city, state')
      .eq('id', lease.property_id)
      .single();

    // Adjust for high-demand markets
    const highDemandCities = ['San Francisco', 'New York', 'Seattle', 'Austin', 'Denver'];
    if (propertyData && highDemandCities.includes(propertyData.city)) {
      baseIncrease += 1.0; // Add 1% for high-demand markets
    }

    // Cap increases at reasonable levels
    const maxIncrease = 8.0; // Max 8% increase
    const minIncrease = 0.0; // Allow no increase if market is soft

    return Math.min(Math.max(baseIncrease, minIncrease), maxIncrease);

  } catch (error) {
    console.error('Calculate rent increase error:', error);
    return 3.0; // Default to 3% on error
  }
}

/**
 * Send renewal offer to tenant via email
 */
async function sendRenewalOffer(offer: LeaseRenewalOffer, lease: any): Promise<boolean> {
  try {
    console.log(`Sending renewal offer to tenant ${offer.tenant_id}`);

    // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
    // For now, log the email content

    const emailContent = `
      Dear ${lease.tenants?.first_name} ${lease.tenants?.last_name},

      Your lease at ${lease.properties?.address}, Unit ${lease.units?.unit_number}
      is expiring on ${offer.current_end_date}.

      We would love to have you stay! Here's your renewal offer:

      Current Monthly Rent: $${offer.current_rent.toFixed(2)}
      Proposed Monthly Rent: $${offer.proposed_rent.toFixed(2)}
      Increase: ${offer.rent_increase_percentage.toFixed(1)}%

      New Lease Term: ${offer.proposed_start_date} to ${offer.proposed_end_date}

      Please respond by ${offer.offer_expiration_date} to accept this offer.

      You can:
      - Accept the offer as-is
      - Submit a counter-offer
      - Decline and move out

      Thank you for being a great tenant!
    `;

    console.log('Renewal offer email:', emailContent);

    // In production, send actual email here
    // await sendEmail(lease.tenants.email, 'Lease Renewal Offer', emailContent);

    return true;

  } catch (error) {
    console.error('Send renewal offer error:', error);
    return false;
  }
}

/**
 * Process tenant response to renewal offer
 */
export async function processRenewalResponse(
  offerId: string,
  response: 'accept' | 'decline' | 'counter',
  counterOfferRent?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: offer, error: fetchError } = await supabase
      .from('lease_renewal_offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (fetchError || !offer) {
      return { success: false, error: 'Renewal offer not found' };
    }

    if (offer.status !== 'pending' && offer.status !== 'countered') {
      return { success: false, error: 'Offer is no longer pending' };
    }

    const now = new Date().toISOString().split('T')[0];

    switch (response) {
      case 'accept':
        // Accept the renewal offer
        await supabase
          .from('lease_renewal_offers')
          .update({
            status: 'accepted',
            tenant_response_date: now,
            updated_at: new Date().toISOString()
          })
          .eq('id', offerId);

        // Create lease amendment
        await createLeaseAmendment(offer, 'accepted');

        console.log(`Renewal offer ${offerId} accepted`);
        return { success: true };

      case 'decline':
        // Tenant is moving out
        await supabase
          .from('lease_renewal_offers')
          .update({
            status: 'declined',
            tenant_response_date: now,
            updated_at: new Date().toISOString()
          })
          .eq('id', offerId);

        // TODO: Trigger move-out workflow
        console.log(`Renewal offer ${offerId} declined - tenant moving out`);
        return { success: true };

      case 'counter':
        // Tenant submitted counter-offer
        if (!counterOfferRent) {
          return { success: false, error: 'Counter-offer rent amount required' };
        }

        await supabase
          .from('lease_renewal_offers')
          .update({
            status: 'countered',
            tenant_response_date: now,
            counter_offer_rent: counterOfferRent,
            updated_at: new Date().toISOString()
          })
          .eq('id', offerId);

        // TODO: Notify property manager of counter-offer
        console.log(`Renewal offer ${offerId} countered at $${counterOfferRent}`);
        return { success: true };

      default:
        return { success: false, error: 'Invalid response type' };
    }

  } catch (error) {
    console.error('Process renewal response error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create lease amendment for accepted renewal
 */
async function createLeaseAmendment(offer: LeaseRenewalOffer, status: string): Promise<void> {
  try {
    // Get next amendment number for this lease
    const { data: amendments } = await supabase
      .from('lease_amendments')
      .select('amendment_number')
      .eq('lease_id', offer.lease_id)
      .order('amendment_number', { ascending: false })
      .limit(1);

    const nextAmendmentNumber = (amendments && amendments.length > 0)
      ? amendments[0].amendment_number + 1
      : 1;

    // Create amendment record
    await supabase
      .from('lease_amendments')
      .insert({
        lease_id: offer.lease_id,
        amendment_number: nextAmendmentNumber,
        amendment_type: 'term_extension',
        effective_date: offer.proposed_start_date,
        description: 'Lease renewal - term extension and rent adjustment',
        changes: {
          end_date: {
            old: offer.current_end_date,
            new: offer.proposed_end_date
          },
          monthly_rent: {
            old: offer.current_rent,
            new: offer.proposed_rent
          }
        },
        status: 'active',
        signed_date: new Date().toISOString().split('T')[0]
      });

    // Update the original lease
    await supabase
      .from('leases')
      .update({
        end_date: offer.proposed_end_date,
        monthly_rent: offer.proposed_rent,
        updated_at: new Date().toISOString()
      })
      .eq('id', offer.lease_id);

    console.log(`Lease amendment created for renewal ${offer.id}`);

  } catch (error) {
    console.error('Create lease amendment error:', error);
  }
}

/**
 * Check for expired renewal offers and update status
 */
export async function processExpiredOffers(): Promise<{ expired: number; errors: string[] }> {
  const results = { expired: 0, errors: [] as string[] };

  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: expiredOffers, error } = await supabase
      .from('lease_renewal_offers')
      .select('id')
      .eq('status', 'pending')
      .lt('offer_expiration_date', today);

    if (error) {
      results.errors.push(error.message);
      return results;
    }

    if (expiredOffers && expiredOffers.length > 0) {
      // Update expired offers
      await supabase
        .from('lease_renewal_offers')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'pending')
        .lt('offer_expiration_date', today);

      results.expired = expiredOffers.length;
      console.log(`Marked ${results.expired} renewal offers as expired`);
    }

    return results;

  } catch (error) {
    console.error('Process expired offers error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
}

/**
 * Get renewal status for a lease
 */
export async function getRenewalStatus(leaseId: string): Promise<LeaseRenewalOffer | null> {
  try {
    const { data, error } = await supabase
      .from('lease_renewal_offers')
      .select('*')
      .eq('lease_id', leaseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to get renewal status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get renewal status error:', error);
    return null;
  }
}
