import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const uploadSimulationImage = async (dataUrl: string, sessionId: string): Promise<string | null> => {
  try {
    // 1. Convert base64 dataUrl to Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    // 2. Create unique filename based ONLY on phone number so it overwrites
    const fileName = `simulation_${sessionId}.jpg`;

    // 3. Upload to Supabase Storage bucket 'simulation_images'
    const { data, error } = await supabase.storage
      .from('simulation_images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true // This tells Supabase to delete the old image and replace it!
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }

    // 4. Get the public URL and add a cache-buster so the browser always shows the newest one
    const { data: publicUrlData } = supabase.storage
      .from('simulation_images')
      .getPublicUrl(fileName);

    return `${publicUrlData.publicUrl}?t=${Date.now()}`;
  } catch (err) {
    console.error('Error uploading image to Supabase:', err);
    return null;
  }
};
