-- Storage RLS for service-logos (public read) and payment-proofs (authenticated only).
-- Uploads from the app use the authenticated Supabase client, so INSERT/UPDATE/DELETE
-- policies are required. Upsert also needs SELECT.

-- service-logos: public logos
CREATE POLICY "Public read service logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'service-logos');

CREATE POLICY "Authenticated upload service logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'service-logos');

CREATE POLICY "Authenticated update service logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'service-logos')
  WITH CHECK (bucket_id = 'service-logos');

CREATE POLICY "Authenticated delete service logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'service-logos');

-- payment-proofs: private proof images
CREATE POLICY "Authenticated read payment proofs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated upload payment proofs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated update payment proofs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'payment-proofs')
  WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Authenticated delete payment proofs"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'payment-proofs');
