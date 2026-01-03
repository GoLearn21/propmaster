import { supabase } from '../lib/supabase';

export interface MaintenanceAsset {
  id: string;
  name: string;
  type: 'hvac' | 'plumbing' | 'electrical' | 'appliance' | 'structural';
  property: string;
  location: string;
  installDate: string;
  lastService: string;
  nextService: string;
  failureProbability: number;
  healthScore: number;
  estimatedCost: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export const predictiveMaintenanceService = {
  async getAssets(): Promise<MaintenanceAsset[]> {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          property:properties(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('No equipment data found');
        return [];
      }

      return (data || []).map(asset => {
        const property = asset.property as any;
        
        // Map equipment type
        let type: 'hvac' | 'plumbing' | 'electrical' | 'appliance' | 'structural' = 'hvac';
        const assetType = asset.type?.toLowerCase() || '';
        if (assetType.includes('plumb')) type = 'plumbing';
        else if (assetType.includes('electric')) type = 'electrical';
        else if (assetType.includes('appliance') || assetType.includes('refriger') || assetType.includes('washer')) type = 'appliance';
        else if (assetType.includes('struct') || assetType.includes('roof') || assetType.includes('foundation')) type = 'structural';
        else if (assetType.includes('hvac') || assetType.includes('heat') || assetType.includes('cool') || assetType.includes('air')) type = 'hvac';

        // Calculate health score based on age and last maintenance
        const installDate = new Date(asset.install_date || '2020-01-01');
        const lastService = new Date(asset.last_service_date || Date.now());
        const today = new Date();
        
        const ageInYears = (today.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        const daysSinceService = (today.getTime() - lastService.getTime()) / (1000 * 60 * 60 * 24);
        
        // Simple health score calculation (100 = perfect, 0 = critical)
        let healthScore = 100;
        healthScore -= ageInYears * 5; // Lose 5 points per year
        healthScore -= daysSinceService * 0.2; // Lose 0.2 points per day since service
        healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

        // Calculate failure probability (inverse of health score with some randomness)
        const failureProbability = Math.round(100 - healthScore + (Math.random() * 20 - 10));
        const clampedFailure = Math.max(0, Math.min(100, failureProbability));

        // Determine priority based on failure probability
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (clampedFailure >= 80) priority = 'critical';
        else if (clampedFailure >= 60) priority = 'high';
        else if (clampedFailure >= 40) priority = 'medium';
        else priority = 'low';

        // Calculate next service date (6 months from last service)
        const nextServiceDate = new Date(lastService);
        nextServiceDate.setMonth(nextServiceDate.getMonth() + 6);

        // Estimate repair cost based on type
        let estimatedCost = 500;
        if (type === 'hvac') estimatedCost = 850;
        else if (type === 'electrical') estimatedCost = 1200;
        else if (type === 'structural') estimatedCost = 2500;
        else if (type === 'plumbing') estimatedCost = 450;
        else if (type === 'appliance') estimatedCost = 350;

        return {
          id: asset.id,
          name: asset.metadata?.name || `${asset.manufacturer || ''} ${asset.model || ''}`.trim() || asset.type || 'Equipment',
          type,
          property: property?.name || 'Unknown Property',
          location: asset.metadata?.location || asset.unit_id || 'Unknown Location',
          installDate: asset.install_date || '2020-01-01',
          lastService: asset.last_service_date || today.toISOString().split('T')[0],
          nextService: nextServiceDate.toISOString().split('T')[0],
          failureProbability: clampedFailure,
          healthScore,
          estimatedCost,
          priority
        };
      });
    } catch (error) {
      console.error('Error fetching maintenance assets:', error);
      return [];
    }
  }
};
