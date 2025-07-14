import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to upload an image to Supabase Storage
export const uploadImage = async (bucketName, filePath, file) => {
  const { data, error } = await supabase.storage.from(bucketName).upload(filePath, file);
  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }
  return data;
};

// Function to get a public URL for an image
export const getImageUrl = (bucketName, filePath) => {
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data?.publicUrl || "";
};