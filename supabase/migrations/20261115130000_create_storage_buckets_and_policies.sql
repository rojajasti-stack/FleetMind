-- ==============================================================================
-- FleetMind AI — Supabase Storage Buckets & Row Level Security (RLS) Policies
-- Migration ID: 20261115130000_create_storage_buckets_and_policies.sql
-- Description: Creates isolated storage buckets for vehicle compliance documents,
--              driver licenses/PII, financial receipts, and operator avatars.
--              Implements strict RLS policies, MIME validation, size enforcement,
--              organization tenancy, and zero anonymous access.
-- ==============================================================================

-- 1. Ensure Storage Schema & Required Tables Exist (Portable across Supabase Cloud & Local)
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  public BOOLEAN DEFAULT FALSE,
  avif_autodetection BOOLEAN DEFAULT FALSE,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT NOT NULL,
  owner UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_storage_bucket_name ON storage.objects(bucket_id, name);

-- 2. Storage Helper Functions
CREATE OR REPLACE FUNCTION storage.extension(name TEXT)
RETURNS TEXT AS $$
  SELECT lower(split_part(name, '.', -1));
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION storage.filename(name TEXT)
RETURNS TEXT AS $$
  SELECT split_part(name, '/', -1);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION storage.foldername(name TEXT)
RETURNS TEXT[] AS $$
  SELECT string_to_array(name, '/');
$$ LANGUAGE sql IMMUTABLE;

-- ==============================================================================
-- 3. Register Isolated Storage Buckets with Strict Constraints
-- ==============================================================================

-- 3.1 Avatars: Profile photos (Private bucket with authenticated / signed URL access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  FALSE,
  2097152, -- 2 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3.2 Vehicle Documents: RC Books, Insurance Policies, Fitness Certificates, Permits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-documents',
  'vehicle-documents',
  FALSE, -- Strictly Private
  10485760, -- 10 MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3.3 Driver Documents: Commercial Heavy Driving Licenses, Medical Fitness, Police Verification
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  FALSE, -- Strictly Private (Confidential PII)
  10485760, -- 10 MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3.4 Receipts: Fuel Pump Bills, Service Invoices, Spare Part Purchase Bills
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  FALSE, -- Strictly Private (Financial Records)
  10485760, -- 10 MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) on storage.objects
-- ==============================================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4.1 AVATARS POLICIES
-- Path Format: <user_id>/avatar_<timestamp>.<ext>
-- ------------------------------------------------------------------------------

-- Authenticated users can view avatars of members in their organization
CREATE POLICY "avatars_select_auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      split_part(name, '/', 1) = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id::text = split_part(name, '/', 1)
          AND (p.organization_id = public.current_user_org_id() OR public.is_super_admin())
      )
    )
  );

-- Users can only upload their own avatar with size & mime validation
CREATE POLICY "avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
    AND (COALESCE((metadata->>'size')::bigint, 0) <= 2097152)
    AND ((metadata->>'mimetype') IN ('image/jpeg', 'image/png', 'image/webp'))
  );

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND split_part(name, '/', 1) = auth.uid()::text
    AND (COALESCE((metadata->>'size')::bigint, 0) <= 2097152)
    AND ((metadata->>'mimetype') IN ('image/jpeg', 'image/png', 'image/webp'))
  );

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (split_part(name, '/', 1) = auth.uid()::text OR public.is_admin())
  );

-- ------------------------------------------------------------------------------
-- 4.2 VEHICLE DOCUMENTS POLICIES (CONFIDENTIAL COMPLIANCE)
-- Path Format: <org_id>/vehicles/<bus_id>/<doc_name>.<ext>
-- ------------------------------------------------------------------------------

-- Org members can view vehicle documents via signed URLs; guests have read-only
CREATE POLICY "vehicle_docs_select_org" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicle-documents'
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
  );

-- Only Fleet Managers and Admins can upload vehicle documents
CREATE POLICY "vehicle_docs_insert_mgr" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-documents'
    AND public.is_manager_or_admin()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
    AND (COALESCE((metadata->>'size')::bigint, 0) <= 10485760)
    AND ((metadata->>'mimetype') IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))
  );

CREATE POLICY "vehicle_docs_update_mgr" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'vehicle-documents'
    AND public.is_manager_or_admin()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'vehicle-documents'
    AND public.is_manager_or_admin()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
    AND (COALESCE((metadata->>'size')::bigint, 0) <= 10485760)
    AND ((metadata->>'mimetype') IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))
  );

-- Only Admins can delete vehicle compliance records
CREATE POLICY "vehicle_docs_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicle-documents'
    AND public.is_admin()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
  );

-- ------------------------------------------------------------------------------
-- 4.3 DRIVER DOCUMENTS POLICIES (HIGHLY SENSITIVE PII)
-- Path Format: <org_id>/drivers/<driver_id>/<doc_name>.<ext>
-- ------------------------------------------------------------------------------

-- Only verified non-guest org members can view driver documents
CREATE POLICY "driver_docs_select_org" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND NOT public.is_guest()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
  );

-- Only Fleet Managers and Admins can upload driver documents
CREATE POLICY "driver_docs_insert_mgr" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'driver-documents'
    AND public.is_manager_or_admin()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
    AND (COALESCE((metadata->>'size')::bigint, 0) <= 10485760)
    AND ((metadata->>'mimetype') IN ('application/pdf', 'image/jpeg', 'image/png'))
  );

-- Only Admins can delete driver PII documents
CREATE POLICY "driver_docs_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND public.is_admin()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
  );

-- ------------------------------------------------------------------------------
-- 4.4 FINANCIAL RECEIPTS & INVOICES POLICIES
-- Path Format: <org_id>/receipts/<category>/<doc_name>.<ext>
-- ------------------------------------------------------------------------------

-- Only Finance roles (Admin, Fleet Manager, Accountant) can view receipts
CREATE POLICY "receipts_select_finance" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.can_access_finance()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
  );

-- Finance roles and Dispatchers (for fuel dispensing slips) can upload receipts
CREATE POLICY "receipts_insert_ops" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.can_write_operations()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
    AND (COALESCE((metadata->>'size')::bigint, 0) <= 10485760)
    AND ((metadata->>'mimetype') IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp'))
  );

-- Only Admins can delete financial audit receipts
CREATE POLICY "receipts_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.is_admin()
    AND (
      split_part(name, '/', 1)::uuid = public.current_user_org_id()
      OR public.is_super_admin()
    )
  );

-- ==============================================================================
-- 5. Revoke Anonymous Access & Apply Least-Privilege Grants
-- ==============================================================================
REVOKE ALL ON SCHEMA storage FROM anon;
REVOKE ALL ON TABLE storage.objects FROM anon;
REVOKE ALL ON TABLE storage.buckets FROM anon;

GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT SELECT ON TABLE storage.buckets TO authenticated;
