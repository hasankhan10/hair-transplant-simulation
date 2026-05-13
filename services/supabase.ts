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

export const createLeadInSupabase = async (leadData: { name: string, age: string, gender: string, phone: string }) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .upsert(
        { ...leadData, status: 'New Lead', journey_status: 'Lead Captured' }, 
        { onConflict: 'phone' } // Uses the unique phone number to update existing or insert new!
      );
    if (error) console.error("Error creating lead in Supabase:", error);
  } catch (err) {
    console.error("Supabase insert error:", err);
  }
};

export const updateLeadImageInSupabase = async (phone: string, imageUrl: string, density?: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ 
        simulation_image_url: imageUrl, 
        density: density,
        journey_status: 'Simulation Completed' 
      })
      .eq('phone', phone);
    if (error) console.error("Error updating lead image in Supabase:", error);
  } catch (err) {
    console.error("Supabase update error:", err);
  }
};

export const updateJourneyStatus = async (phone: string, journeyStatus: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ journey_status: journeyStatus })
      .eq('phone', phone);
    if (error) console.error("Error updating journey status:", error);
  } catch (err) {
    console.error("Supabase update error:", err);
  }
};

export const updateSalesStatus = async (phone: string, salesStatus: string) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update({ status: salesStatus })
      .eq('phone', phone);
    if (error) console.error("Error updating sales status:", error);
  } catch (err) {
    console.error("Supabase update error:", err);
  }
};

export const deleteLead = async (phone: string) => {
  try {
    // 1. Delete the image from storage (it uses the phone as the sessionId)
    const fileName = `simulation_${phone}.jpg`;
    const { error: storageError } = await supabase.storage
      .from('simulation_images')
      .remove([fileName]);
      
    if (storageError) console.warn("Could not delete image (might not exist):", storageError);

    // 2. Delete the record from the database
    const { error: dbError } = await supabase
      .from('leads')
      .delete()
      .eq('phone', phone);
      
    if (dbError) throw dbError;
    
    return true;
  } catch (err) {
    console.error("Error deleting lead:", err);
    return false;
  }
};
