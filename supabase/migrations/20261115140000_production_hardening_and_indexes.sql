-- ==============================================================================
-- FleetMind AI — Production Security Hardening & Performance Advisor Indexes
-- Migration ID: 20261115140000_production_hardening_and_indexes.sql
-- Description:
--   1. Provisions missing relational entities: gps_vehicles & emi_payments
--   2. Creates security_invoker view for emi_loans matching Edge Functions
--   3. Applies B-Tree indexes on all unindexed foreign keys (Supabase Performance Advisor)
--   4. Configures Row Level Security (RLS) on new tables with least-privilege grants
--   5. Explicitly revokes all public/anon privileges
-- ==============================================================================

-- 1. Table: public.gps_vehicles (Real-time Telematics Tracking)
CREATE TABLE IF NOT EXISTS public.gps_vehicles (
  bus_id UUID PRIMARY KEY REFERENCES public.buses(id) ON DELETE CASCADE,
  bus_number TEXT NOT NULL,
  lat NUMERIC(10, 6) NOT NULL CHECK (lat >= -90.0 AND lat <= 90.0),
  lng NUMERIC(10, 6) NOT NULL CHECK (lng >= -180.0 AND lng <= 180.0),
  speed NUMERIC(5, 2) NOT NULL DEFAULT 0.0 CHECK (speed >= 0.0 AND speed <= 300.0),
  heading INT NOT NULL DEFAULT 0 CHECK (heading >= 0 AND heading <= 360),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  battery_level INT NOT NULL DEFAULT 100 CHECK (battery_level >= 0 AND battery_level <= 100),
  fuel_level INT NOT NULL DEFAULT 100 CHECK (fuel_level >= 0 AND fuel_level <= 100),
  current_route TEXT,
  destination TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: public.emi_payments (Financial Installment Ledger)
CREATE TABLE IF NOT EXISTS public.emi_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  installment_number INT NOT NULL CHECK (installment_number > 0),
  due_date DATE NOT NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'overdue')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Security-Invoker View: public.emi_loans -> public.loans
-- (Allows Edge Functions & queries to access emi_loans while strictly enforcing caller RLS)
CREATE OR REPLACE VIEW public.emi_loans
WITH (security_invoker = true)
AS SELECT * FROM public.loans;

-- ==============================================================================
-- 4. Enable Row Level Security (RLS) on Newly Added Tables
-- ==============================================================================
ALTER TABLE public.gps_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emi_payments ENABLE ROW LEVEL SECURITY;

-- 4.1 GPS Vehicles RLS Policies
-- Org members can view GPS location of vehicles in their fleet
CREATE POLICY "gps_select_org" ON public.gps_vehicles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buses b
      WHERE b.id = gps_vehicles.bus_id
        AND (b.organization_id = public.current_user_org_id() OR public.is_super_admin())
    )
  );

-- Dispatchers, Fleet Managers, and Admins can update GPS coordinates (or Edge Function via service role)
CREATE POLICY "gps_write_ops" ON public.gps_vehicles
  FOR ALL TO authenticated
  USING (
    public.can_write_operations()
    AND EXISTS (
      SELECT 1 FROM public.buses b
      WHERE b.id = gps_vehicles.bus_id
        AND (b.organization_id = public.current_user_org_id() OR public.is_super_admin())
    )
  )
  WITH CHECK (
    public.can_write_operations()
    AND EXISTS (
      SELECT 1 FROM public.buses b
      WHERE b.id = gps_vehicles.bus_id
        AND (b.organization_id = public.current_user_org_id() OR public.is_super_admin())
    )
  );

-- 4.2 EMI Payments RLS Policies
-- Only Finance roles can view EMI payment records
CREATE POLICY "emi_pmt_select_finance" ON public.emi_payments
  FOR SELECT TO authenticated
  USING (
    public.can_access_finance()
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

-- Only Finance roles can record EMI payments
CREATE POLICY "emi_pmt_insert_finance" ON public.emi_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_finance()
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

-- Payments are immutable audit records; updates and deletes denied
CREATE POLICY "emi_pmt_update_deny" ON public.emi_payments
  FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY "emi_pmt_delete_deny" ON public.emi_payments
  FOR DELETE TO authenticated
  USING (FALSE);

-- ==============================================================================
-- 5. Performance Advisor Indexes (Unindexed Foreign Keys Coverage)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_trips_bus_id ON public.trips(bus_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_route_id ON public.trips(route_id);

CREATE INDEX IF NOT EXISTS idx_service_bus_id ON public.service_records(bus_id);
CREATE INDEX IF NOT EXISTS idx_service_mechanic_id ON public.service_records(mechanic_id);

CREATE INDEX IF NOT EXISTS idx_fuel_bus_id ON public.fuel_records(bus_id);
CREATE INDEX IF NOT EXISTS idx_loans_bus_id ON public.loans(bus_id);

CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_bus_id ON public.inventory_movements(bus_id);

CREATE INDEX IF NOT EXISTS idx_emi_payments_loan_id ON public.emi_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_emi_payments_org_id ON public.emi_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_gps_vehicles_last_updated ON public.gps_vehicles(last_updated);

-- Additional Foreign Key Coverage (Supabase Performance Advisor)
CREATE INDEX IF NOT EXISTS idx_settings_org_id ON public.settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_mechanics_org_id ON public.mechanics(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_bus_id ON public.expenses(bus_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- ==============================================================================
-- 6. Zero Anonymous Access & Least-Privilege Grants
-- ==============================================================================
REVOKE ALL ON TABLE public.gps_vehicles FROM anon;
REVOKE ALL ON TABLE public.emi_payments FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gps_vehicles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.emi_payments TO authenticated;
GRANT SELECT ON public.emi_loans TO authenticated;
