import { supabase } from '../../../lib/supabase';
import type { Property, PropertyFormData, PropertyData } from '../types/property';

/**
 * Property Service
 * Handles all property CRUD operations with Supabase
 */

export interface CreatePropertyInput {
  organizationId?: string; // Optional for now, not used in simple schema
  propertyData: PropertyData;
}

export interface PropertyServiceResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Create a new property from wizard data
 */
export async function createProperty(
  input: CreatePropertyInput
): Promise<PropertyServiceResponse<Property>> {
  try {
    const { organizationId, propertyData } = input;

    // Validate required fields
    if (!propertyData.type) {
      return {
        data: null,
        error: 'Property type is required',
      };
    }

    if (!propertyData.address.streetAddress || !propertyData.address.city) {
      return {
        data: null,
        error: 'Property address is required',
      };
    }

    // Map wizard data to database schema
    // Exact columns from Supabase: id, name, address, city, state, zip_code, property_type, created_at, updated_at
    const propertyInsert = {
      name: `${propertyData.address.streetAddress}, ${propertyData.address.city}`,
      address: propertyData.address.streetAddress || 'N/A', // Required, cannot be null
      city: propertyData.address.city,
      state: propertyData.address.state,
      zip_code: propertyData.address.zipCode,
      property_type: propertyData.type.title,
    };

    console.log('=== Property Insert Debug ===');
    console.log('Full property data:', JSON.stringify(propertyInsert, null, 2));

    // First, check what columns actually exist by querying the table
    console.log('Querying existing properties to determine available columns...');
    const { data: existingProperties, error: checkError } = await supabase
      .from('properties')
      .select('*')
      .limit(1);

    if (checkError) {
      console.error('Properties table check error:', checkError);
      console.error('Error details:', JSON.stringify(checkError, null, 2));
    } else if (existingProperties && existingProperties.length > 0) {
      console.log('Existing property columns:', Object.keys(existingProperties[0]));
    } else {
      console.log('No existing properties found - table may be empty');
    }

    // Insert property with exact schema match
    console.log('Inserting property with data:', JSON.stringify(propertyInsert, null, 2));

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert(propertyInsert)
      .select()
      .single();

    if (propertyError) {
      console.error('Property insert failed:', propertyError);
      console.error('Error details:', JSON.stringify(propertyError, null, 2));
      return {
        data: null,
        error: `Failed to create property: ${propertyError.message}`,
      };
    }

    console.log('Property created successfully:', property);

    // ✅ Insert bank accounts if provided
    if (propertyData.bankAccounts && propertyData.bankAccounts.length > 0) {
      console.log('Saving bank accounts:', propertyData.bankAccounts);

      try {
        const bankAccountInserts = propertyData.bankAccounts.map(account => ({
          property_id: property.id,
          account_name: account.nickname || 'Property Account',
          bank_name: account.bankName || 'Unknown Bank',
          account_type: account.accountType || 'checking',
          routing_number: account.routingNumber || '',
          account_number_last4: account.accountNumber ? account.accountNumber.slice(-4) : '0000',
          is_primary: account.isPrimary || false,
          is_active: true
        }));

        const { error: bankError } = await supabase
          .from('bank_accounts')
          .insert(bankAccountInserts);

        if (bankError) {
          console.error('Failed to save bank accounts:', bankError);
          // Don't fail the whole operation, just log the error
        } else {
          console.log('Bank accounts saved successfully');
        }
      } catch (bankErr) {
        console.error('Bank accounts table not available yet:', bankErr);
      }
    }

    // ✅ Insert ownership information if provided
    if (propertyData.ownership && propertyData.ownership.legalName) {
      console.log('Saving ownership info:', propertyData.ownership);

      try {
        const { error: ownershipError } = await supabase
          .from('property_ownership')
          .insert({
            property_id: property.id,
            // Note: owner_id should link to people table - for now using null
            // In production, you'd first create/lookup the owner in people table
            owner_id: null,
            ownership_percentage: propertyData.ownership.ownershipPercentage || 100,
            start_date: new Date().toISOString().split('T')[0],
            distribution_method: 'ach',
            tax_id: propertyData.ownership.taxId || null,
            notes: `Legal Name: ${propertyData.ownership.legalName}`
          });

        if (ownershipError) {
          console.error('Failed to save ownership:', ownershipError);
          // Don't fail the whole operation, just log the error
        } else {
          console.log('Ownership info saved successfully');
        }
      } catch (ownershipErr) {
        console.error('Property ownership table not available yet:', ownershipErr);
      }
    }

    return {
      data: property,
      error: null,
    };
  } catch (error) {
    console.error('Create property error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Map wizard property type to database property type
 */
function mapPropertyType(typeId: string): string {
  const typeMapping: Record<string, string> = {
    'single-family': 'single_family',
    'multi-family': 'multi_family',
    'condo': 'condo',
    'townhome': 'townhouse',
    'office': 'office',
    'retail': 'retail',
    'shopping-center': 'retail',
    'storage': 'storage',
    'parking': 'commercial',
    'industrial': 'warehouse',
  };

  return typeMapping[typeId] || 'other';
}

/**
 * Get all properties
 */
export async function getProperties(): Promise<PropertyServiceResponse<Property[]>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return {
        data: null,
        error: error.message,
      };
    }

    return {
      data: data || [],
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get a single property by ID
 */
export async function getProperty(
  propertyId: string
): Promise<PropertyServiceResponse<Property>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update a property
 */
export async function updateProperty(
  propertyId: string,
  updates: Partial<PropertyFormData>
): Promise<PropertyServiceResponse<Property>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: error.message,
      };
    }

    return {
      data,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete a property (soft delete)
 */
export async function deleteProperty(
  propertyId: string
): Promise<PropertyServiceResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('properties')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', propertyId);

    if (error) {
      return {
        data: false,
        error: error.message,
      };
    }

    return {
      data: true,
      error: null,
    };
  } catch (error) {
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
