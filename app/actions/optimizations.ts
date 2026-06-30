'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveOptimization(
  fileName: string, 
  originalSize: number, 
  compressedSize: number, 
  fileType: string,
  previewUrl?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase.from('optimizations').insert({
    user_id: user.id,
    file_name: fileName,
    original_size: originalSize,
    compressed_size: compressedSize,
    file_type: fileType,
    preview_url: previewUrl,
  });

  if (error) {
    console.error('Failed to save optimization:', error);
    return { error: error.message };
  }

  revalidatePath('/profile');
  return { success: true };
}

export async function toggleOptimizationPrivacy(id: string, isPublic: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('optimizations')
    .update({ is_public: isPublic })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to update optimization privacy:', error);
    return { error: error.message };
  }

  revalidatePath('/profile');
  revalidatePath('/community');
  return { success: true };
}

export async function updateOptimizationPrice(id: string, price: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('optimizations')
    .update({ price })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to update optimization price:', error);
    return { error: error.message };
  }

  revalidatePath('/profile');
  revalidatePath('/community');
  return { success: true };
}
