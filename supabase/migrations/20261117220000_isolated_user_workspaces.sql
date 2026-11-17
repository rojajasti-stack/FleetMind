-- ==============================================================================
-- FleetMind AI — Isolated Multi-Tenant Workspace Provisioning Migration
-- Migration ID: 20261117220000_isolated_user_workspaces.sql
-- Description:
--   1. Atomically wrapped in a transaction (BEGIN / COMMIT).
--   2. Replaces handle_new_user() to provision a unique, dedicated organization
--      and default settings record for every newly registered account.
--   3. Assigns registering users as 'Admin' of their own private organization
--      (strictly organization-scoped; never grants platform-wide Super Admin).
--   4. Removes hardcoded demo organization default ('00000000-0000-0000-0000-000000000001')
--      from all 15 core domain tables without modifying existing records.
--   5. Implements session-based organization fallback trigger on insert.
--   6. Preserves existing demonstration organization and all existing accounts intact.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Remove hardcoded demo organization defaults from all 15 domain tables
-- (Only alters the column default for future inserts; does not modify existing data)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE IF EXISTS public.settings ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.buses ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.drivers ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.mechanics ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.routes ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.trips ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.service_records ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.inventory ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.inventory_movements ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.fuel_records ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.expenses ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.loans ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.notifications ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN organization_id DROP DEFAULT;
  ALTER TABLE IF EXISTS public.emi_payments ALTER COLUMN organization_id DROP DEFAULT;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Create automatic session fallback trigger function
-- (Ensures omitted organization_id receives the authenticated user's organization)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_organization_id_from_session()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.current_user_org_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Attach trigger to all 15 tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'settings', 'buses', 'drivers', 'mechanics', 'routes', 'trips',
    'service_records', 'inventory', 'inventory_movements', 'fuel_records',
    'expenses', 'loans', 'notifications', 'audit_logs', 'emi_payments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_org_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_org_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_organization_id_from_session();', t);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Replace handle_new_user() to atomically create unique organization and profile
-- (Guarantees every new account starts with a fresh, empty workspace)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_new_org_id UUID;
  v_company_name TEXT;
  v_full_name TEXT;
  v_base_slug TEXT;
  v_slug TEXT;
BEGIN
  -- Extract user full name safely
  v_full_name := TRIM(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  ));
  IF v_full_name = '' THEN
    v_full_name := 'Fleet Operator';
  END IF;

  -- Extract company name, or construct from operator name
  v_company_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'company_name', ''));
  IF v_company_name = '' THEN
    v_company_name := v_full_name || '''s Fleet';
  END IF;

  -- Generate clean, URL-safe base slug
  v_base_slug := lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  IF v_base_slug = '' THEN
    v_base_slug := 'fleet';
  END IF;

  -- Ensure global slug uniqueness with a random hexadecimal suffix
  v_slug := v_base_slug || '-' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);

  -- Step A: Atomically provision a new, isolated Organization
  v_new_org_id := gen_random_uuid();
  INSERT INTO public.organizations (
    id,
    name,
    slug,
    billing_tier,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_new_org_id,
    v_company_name,
    v_slug,
    'Enterprise',
    TRUE,
    NOW(),
    NOW()
  );

  -- Step B: Provision isolated organization Settings
  INSERT INTO public.settings (
    organization_id,
    company_name,
    currency,
    currency_symbol,
    timezone,
    date_format,
    fuel_efficiency_alert_threshold,
    maintenance_reminder_days,
    low_stock_warning_threshold,
    notifications_email,
    notifications_browser
  ) VALUES (
    v_new_org_id,
    v_company_name,
    'INR',
    '₹',
    'Asia/Kolkata',
    'DD/MM/YYYY',
    4.00,
    14,
    5,
    TRUE,
    TRUE
  );

  -- Step C: Provision Profile as 'Admin' of their newly created organization
  -- Security: Never accept organization_id or role from client-provided metadata.
  -- Role 'Admin' grants administrative control over their own fleet only (never platform Super Admin).
  INSERT INTO public.profiles (
    id,
    organization_id,
    full_name,
    email,
    role,
    company_name,
    job_title
  ) VALUES (
    NEW.id,
    v_new_org_id,
    v_full_name,
    NEW.email,
    'Admin',
    v_company_name,
    'Fleet Administrator'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 4. Re-bind trigger to auth.users
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;
