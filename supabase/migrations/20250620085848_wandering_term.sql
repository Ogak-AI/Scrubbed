-- Create storage bucket for waste photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('waste-photos', 'waste-photos', true);

-- Set up RLS policies for the waste-photos bucket
CREATE POLICY "Users can upload their own waste photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'waste-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view waste photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'waste-photos');

CREATE POLICY "Users can update their own waste photos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'waste-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own waste photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'waste-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );