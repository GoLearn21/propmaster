import { supabase } from '../lib/supabase';

export interface MarketData {
  area: string;
  propertyType: string;
  avgRent: number;
  rentChange: number;
  occupancyRate: number;
  daysOnMarket: number;
  avgPropertyValue: number;
  valueChange: number;
}

export const marketIntelligenceService = {
  async getMarketData(area: string = 'Downtown'): Promise<MarketData | null> {
    try {
      const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('area', area)
        .order('data_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.log('No market data found, using defaults');
        return null;
      }

      return {
        area: data.area,
        propertyType: data.property_type || 'Urban Apartments',
        avgRent: parseFloat(data.avg_rent) || 2850,
        rentChange: parseFloat(data.rent_change_percentage) || 5.2,
        occupancyRate: parseFloat(data.occupancy_rate) || 94,
        daysOnMarket: data.days_on_market || 12,
        avgPropertyValue: parseFloat(data.avg_property_value) || 425000,
        valueChange: parseFloat(data.value_change_percentage) || 3.8
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      return null;
    }
  }
};
