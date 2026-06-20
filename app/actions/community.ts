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

      return (data || []).map((item: any) => ({
        ...item,
        fileTypeLabel: item.file_type.split('/')[1]?.toUpperCase() || '3D'
      }));
    },
    300 // Cache for 5 minutes
  );
}
