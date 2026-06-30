'use server';

import { createClient } from '@/utils/supabase/server';
import { getCachedData } from '@/utils/redis';

export async function getCommunityShowcase() {
  return await getCachedData(
    'community_showcase',
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('public_optimizations_popularity')
        .select('*')
        .or('file_type.ilike.model/%,file_name.ilike.%.obj,file_name.ilike.%.fbx,file_name.ilike.%.stl,file_name.ilike.%.glb,file_name.ilike.%.gltf,file_name.ilike.%.ply,file_name.ilike.%.dae')
        .limit(100);

      if (error) {
        console.error('Error fetching community showcase:', error);
        throw new Error('Failed to fetch community items');
      }

      return (data || []).map((item: any) => {
        const mapped = {
          ...item,
          fileTypeLabel: item.file_type.split('/')[1]?.toUpperCase() || '3D',
        };
        // Ultra-secure: Never send the preview_url to the global showcase if it costs money
        if (mapped.price > 0) {
          mapped.preview_url = null;
        }
        return mapped;
      });
    },
    60 // Cache for 1 minute to reflect price updates faster
  );
}

export async function getOptimizationDetails(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('public_optimizations_popularity')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return { error: 'Optimization not found' };
  }

  let hasPurchased = false;

  // If it's free, everyone has "purchased" it implicitly
  if (!data.price || data.price <= 0) {
    hasPurchased = true;
  } else if (user) {
    // If it costs money, check if the user is the creator
    if (data.user_id === user.id) {
      hasPurchased = true;
    } else {
      // Check purchases table
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('optimization_id', id)
        .single();
      
      if (purchase) {
        hasPurchased = true;
      }
    }
  }

  // If not purchased, hide the URL
  if (!hasPurchased) {
    data.preview_url = null;
  }

  return { data, hasPurchased };
}
