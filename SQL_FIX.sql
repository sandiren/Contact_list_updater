-- This script fixes the final security rule for Supabase Storage.
-- It is safe to run this multiple times.

-- Drop policies if they already exist to prevent errors
DROP POLICY IF EXISTS "Allow authenticated uploads to vcf-files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from vcf-files" ON storage.objects;

-- Create policy to allow logged-in users to UPLOAD contact files
CREATE POLICY "Allow authenticated uploads to vcf-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'vcf-files' );

-- Create policy to allow ANYONE to DOWNLOAD the contact file via the QR code
CREATE POLICY "Allow public reads from vcf-files"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vcf-files' );