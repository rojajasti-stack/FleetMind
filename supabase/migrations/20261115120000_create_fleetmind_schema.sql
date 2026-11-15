-- ==============================================================================
-- FleetMind AI — Comprehensive Database Schema & Row Level Security (RLS)
-- Migration ID: 20261115120000_create_fleetmind_schema.sql
-- Description: Multi-tenant relational schema with complete RLS policies
--              for SELECT, INSERT, UPDATE, DELETE, anti-escalation triggers,
--              atomic stored procedures, and zero-trust anonymous access.
-- ==============================================================================

-- 1. Enable Cryptographic UUID Extensions (Safe across Cloud and Local Postgres)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;

-- ==============================================================================
-- 2. Organizations (Tenant Isolation Root)
-- ==============================================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  billing_tier TEXT NOT NULL DEFAULT 'Enterprise' CHECK (billing_tier IN ('Standard', 'Professional', 'Enterprise')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. Utility Trigger & Helper Functions (Hardened with fixed search_path)
-- ==============================================================================

-- 3.1 Updated-at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER set_orgs_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. User Profiles & Role-Based Access Control
-- ==============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  job_title TEXT DEFAULT 'Fleet Operator',
  company_name TEXT DEFAULT 'FleetMind Logistics',
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'Normal User' 
    CHECK (role IN ('Super Admin', 'Admin', 'Normal User', 'Guest', 'Fleet Manager', 'Dispatcher', 'Accountant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. Trusted Authorization Helper Functions (Hardened search_path)
-- ==============================================================================

-- Current user's organization UUID
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Current user's role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Role Check: Super Administrator (Platform Superuser)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Super Admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Role Check: Administrator (Super Admin or Admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Role Check: Fleet Manager or Administrator
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin', 'Fleet Manager')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Role Check: Finance / P&L Access (Super Admin, Admin, Fleet Manager, Accountant)
CREATE OR REPLACE FUNCTION public.can_access_finance()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin', 'Fleet Manager', 'Accountant')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Role Check: Guest Account (Read-only restriction)
CREATE OR REPLACE FUNCTION public.is_guest()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Guest'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- Role Check: Can write operational records (Any non-guest authenticated user)
CREATE OR REPLACE FUNCTION public.can_write_operations()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role NOT IN ('Guest')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;

-- 5.7 Anti-Privilege-Escalation Trigger: Prevent users from elevating their own role
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_is_admin BOOLEAN;
  v_caller_is_super_admin BOOLEAN;
BEGIN
  v_caller_is_super_admin := public.is_super_admin();
  v_caller_is_admin := public.is_admin();

  -- Check if role is changing
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Non-admins cannot modify any roles
    IF NOT v_caller_is_admin THEN
      RAISE EXCEPTION 'Security Policy Violation: Only verified administrators can modify user roles.';
    END IF;

    -- Only Super Admin can promote to Super Admin
    IF NEW.role = 'Super Admin' AND NOT v_caller_is_super_admin THEN
      RAISE EXCEPTION 'Security Policy Violation: Only a Super Admin can grant Super Admin privileges.';
    END IF;

    -- Only Super Admin can demote another Super Admin
    IF OLD.role = 'Super Admin' AND NOT v_caller_is_super_admin THEN
      RAISE EXCEPTION 'Security Policy Violation: Only a Super Admin can demote a Super Admin.';
    END IF;

    -- Administrators cannot alter their own privilege level (prevents self-demotion or self-elevation)
    IF NEW.id = auth.uid() AND NOT v_caller_is_super_admin THEN
      RAISE EXCEPTION 'Security Policy Violation: Administrators cannot alter their own privilege level.';
    END IF;
  END IF;

  -- Check if organization is changing
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    IF NOT v_caller_is_super_admin AND NOT (v_caller_is_admin AND NEW.id != auth.uid()) THEN
      RAISE EXCEPTION 'Security Policy Violation: Only verified administrators can reassign organizations.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- Automatic profile provisioner on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_default_org UUID;
BEGIN
  -- Grab first active organization or default
  SELECT id INTO v_default_org FROM public.organizations LIMIT 1;
  IF v_default_org IS NULL THEN
    INSERT INTO public.organizations (name, slug) 
    VALUES ('Default Organization', 'default') 
    RETURNING id INTO v_default_org;
  END IF;

  -- Security Hardening: Never trust client-provided role metadata
  INSERT INTO public.profiles (id, organization_id, full_name, email, role)
  VALUES (
    NEW.id,
    v_default_org,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Fleet Operator'),
    NEW.email,
    'Normal User' -- Safe least-privilege default for all new signups
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. Core Domain Tables (Multi-Tenant with organization_id FKs)
-- ==============================================================================

--------------------------------------------------------------------------------
-- 6.1 Settings
--------------------------------------------------------------------------------
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT 'FleetMind Commercial Logistics',
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  fuel_efficiency_alert_threshold NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
  maintenance_reminder_days INT NOT NULL DEFAULT 14,
  low_stock_warning_threshold INT NOT NULL DEFAULT 5,
  notifications_email BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_browser BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

--------------------------------------------------------------------------------
-- 6.2 Buses (Vehicle Fleet)
--------------------------------------------------------------------------------
CREATE TABLE public.buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  bus_number TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  model TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  year INT NOT NULL CHECK (year >= 1990 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
  capacity INT NOT NULL CHECK (capacity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  fuel_type TEXT NOT NULL DEFAULT 'Diesel' CHECK (fuel_type IN ('Diesel', 'Electric', 'CNG', 'Petrol', 'Hybrid')),
  odometer INT NOT NULL DEFAULT 0 CHECK (odometer >= 0),
  assigned_driver TEXT,
  route TEXT,
  insurance_expiry DATE NOT NULL,
  registration_expiry DATE NOT NULL,
  last_service_date DATE NOT NULL,
  next_service_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_buses_service_dates CHECK (next_service_date >= last_service_date),
  CONSTRAINT uq_bus_number_org UNIQUE (organization_id, bus_number),
  CONSTRAINT uq_registration_number_org UNIQUE (organization_id, registration_number)
);

CREATE TRIGGER set_buses_updated_at
  BEFORE UPDATE ON public.buses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

--------------------------------------------------------------------------------
-- 6.3 Drivers
--------------------------------------------------------------------------------
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  license_number TEXT NOT NULL,
  license_expiry DATE NOT NULL,
  joining_date DATE NOT NULL,
  assigned_bus TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  today_availability TEXT NOT NULL DEFAULT 'available' CHECK (today_availability IN ('available', 'on_trip', 'off_duty')),
  experience_years INT NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
  total_trips INT NOT NULL DEFAULT 0 CHECK (total_trips >= 0),
  distance_km INT NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  safety_score INT NOT NULL DEFAULT 95 CHECK (safety_score BETWEEN 0 AND 100),
  profile_photo TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_driver_license_org UNIQUE (organization_id, license_number)
);

CREATE TRIGGER set_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

--------------------------------------------------------------------------------
-- 6.4 Mechanics
--------------------------------------------------------------------------------
CREATE TABLE public.mechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  specialty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'off_duty')),
  active_tasks INT NOT NULL DEFAULT 0 CHECK (active_tasks >= 0),
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- 6.5 Routes
--------------------------------------------------------------------------------
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  route_code TEXT NOT NULL,
  start_point TEXT NOT NULL,
  end_point TEXT NOT NULL,
  distance_km INT NOT NULL CHECK (distance_km > 0),
  estimated_time TEXT NOT NULL,
  fare NUMERIC(10, 2) NOT NULL CHECK (fare >= 0),
  assigned_buses TEXT[] NOT NULL DEFAULT '{}',
  assigned_drivers TEXT[] NOT NULL DEFAULT '{}',
  stops TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_route_code_org UNIQUE (organization_id, route_code)
);

--------------------------------------------------------------------------------
-- 6.6 Trips
--------------------------------------------------------------------------------
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_code TEXT NOT NULL,
  route_id UUID REFERENCES public.routes(id) ON DELETE RESTRICT,
  route_name TEXT NOT NULL,
  bus_id UUID REFERENCES public.buses(id) ON DELETE RESTRICT,
  bus_number TEXT NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE RESTRICT,
  driver_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  start_point TEXT NOT NULL,
  end_point TEXT NOT NULL,
  fare NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (fare >= 0),
  passenger_count INT DEFAULT 0 CHECK (passenger_count >= 0),
  status TEXT NOT NULL DEFAULT 'scheduled' 
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'delayed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_trip_code_org UNIQUE (organization_id, trip_code)
);

--------------------------------------------------------------------------------
-- 6.7 Service Records (Maintenance)
--------------------------------------------------------------------------------
CREATE TABLE public.service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  bus_number TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_date DATE NOT NULL,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  parts_used TEXT NOT NULL DEFAULT '',
  mechanic_notes TEXT NOT NULL DEFAULT '',
  next_service_prediction DATE,
  mechanic_id UUID REFERENCES public.mechanics(id) ON DELETE SET NULL,
  mechanic_name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- 6.8 Inventory & Spare Parts
--------------------------------------------------------------------------------
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('engine', 'brakes', 'electrical', 'tires', 'fluids', 'suspension', 'other')),
  current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  minimum_stock INT NOT NULL DEFAULT 0 CHECK (minimum_stock >= 0),
  purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  vendor TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  storage_location TEXT NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_inventory_sku_org UNIQUE (organization_id, sku)
);

--------------------------------------------------------------------------------
-- 6.9 Inventory Movements (Immutable Ledger)
--------------------------------------------------------------------------------
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('received', 'issued')),
  quantity INT NOT NULL CHECK (quantity > 0),
  bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  bus_number TEXT,
  date DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- 6.10 Fuel Records
--------------------------------------------------------------------------------
CREATE TABLE public.fuel_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  bus_number TEXT NOT NULL,
  date DATE NOT NULL,
  liters NUMERIC(8, 2) NOT NULL CHECK (liters > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  price_per_liter NUMERIC(8, 2) NOT NULL CHECK (price_per_liter > 0),
  odometer_reading INT NOT NULL CHECK (odometer_reading >= 0),
  fuel_station TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  receipt_number TEXT,
  notes TEXT,
  calculated_efficiency NUMERIC(6, 2) CHECK (calculated_efficiency IS NULL OR calculated_efficiency >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- 6.11 Expenses (Financial Ledger)
--------------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('revenue', 'fuel', 'maintenance', 'driver_salary', 'insurance', 'tolls', 'parts', 'emi', 'other')),
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  bus_number TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Card', 'UPI')),
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--------------------------------------------------------------------------------
-- 6.12 Loans (EMI Commercial Vehicle Financing)
--------------------------------------------------------------------------------
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  loan_id TEXT NOT NULL,
  lender TEXT NOT NULL,
  bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  bus_number TEXT NOT NULL,
  principal_amount NUMERIC(14, 2) NOT NULL CHECK (principal_amount > 0),
  interest_rate NUMERIC(5, 2) NOT NULL CHECK (interest_rate >= 0),
  loan_start_date DATE NOT NULL,
  term_months INT NOT NULL CHECK (term_months > 0),
  monthly_emi NUMERIC(12, 2) NOT NULL CHECK (monthly_emi >= 0),
  total_paid NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  outstanding_balance NUMERIC(14, 2) NOT NULL CHECK (outstanding_balance >= 0),
  next_due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  installments_paid INT NOT NULL DEFAULT 0 CHECK (installments_paid >= 0),
  installments_total INT NOT NULL CHECK (installments_total > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_installments CHECK (installments_paid <= installments_total),
  CONSTRAINT uq_loan_id_org UNIQUE (organization_id, loan_id)
);

--------------------------------------------------------------------------------
-- 6.13 Notifications
--------------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'insurance', 'license', 'inventory', 'emi', 'trip', 'system')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  link TEXT
);

--------------------------------------------------------------------------------
-- 6.14 Audit Logs (Non-Repudiation Compliance Trail)
--------------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid 
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL
);

-- ==============================================================================
-- 7. High-Performance Indexing Strategy
-- ==============================================================================

-- Multi-Tenant Composite Indexes
CREATE INDEX idx_buses_org_status ON public.buses(organization_id, status);
CREATE INDEX idx_buses_org_service ON public.buses(organization_id, next_service_date);
CREATE INDEX idx_drivers_org_status ON public.drivers(organization_id, status);
CREATE INDEX idx_drivers_org_avail ON public.drivers(organization_id, today_availability);
CREATE INDEX idx_trips_org_date ON public.trips(organization_id, date);
CREATE INDEX idx_trips_org_status ON public.trips(organization_id, status);
CREATE INDEX idx_service_org_status ON public.service_records(organization_id, status);
CREATE INDEX idx_inventory_org_stock ON public.inventory(organization_id, current_stock);
CREATE INDEX idx_movements_org_item ON public.inventory_movements(organization_id, item_id);
CREATE INDEX idx_fuel_org_date ON public.fuel_records(organization_id, date);
CREATE INDEX idx_expenses_org_date ON public.expenses(organization_id, date);
CREATE INDEX idx_expenses_org_cat ON public.expenses(organization_id, category);
CREATE INDEX idx_loans_org_status ON public.loans(organization_id, status);
CREATE INDEX idx_notifications_org_user ON public.notifications(organization_id, user_id, read);
CREATE INDEX idx_audit_org_timestamp ON public.audit_logs(organization_id, timestamp);

-- ==============================================================================
-- 8. Atomic Business Procedures (Stored Functions)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.record_inventory_movement(
  p_item_id UUID,
  p_type TEXT,
  p_quantity INT,
  p_bus_number TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_item public.inventory%ROWTYPE;
  v_new_stock INT;
  v_movement_id UUID;
  v_user_org UUID;
BEGIN
  v_user_org := public.current_user_org_id();
  
  -- Exclusive lock on item within user's organization
  SELECT * INTO v_item 
  FROM public.inventory 
  WHERE id = p_item_id AND organization_id = v_user_org 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found or inaccessible';
  END IF;

  IF p_type = 'issued' THEN
    IF v_item.current_stock < p_quantity THEN
      RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_item.current_stock, p_quantity;
    END IF;
    v_new_stock := v_item.current_stock - p_quantity;
  ELSIF p_type = 'received' THEN
    v_new_stock := v_item.current_stock + p_quantity;
  ELSE
    RAISE EXCEPTION 'Invalid movement type: %', p_type;
  END IF;

  UPDATE public.inventory
  SET current_stock = v_new_stock, last_updated = NOW()
  WHERE id = p_item_id;

  INSERT INTO public.inventory_movements (
    organization_id, item_id, item_name, type, quantity, bus_number, date, notes
  ) VALUES (
    v_user_org, p_item_id, v_item.item_name, p_type, p_quantity, p_bus_number, CURRENT_DATE, p_notes
  ) RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'movement_id', v_movement_id,
    'previous_stock', v_item.current_stock,
    'new_stock', v_new_stock
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.record_emi_payment(
  p_loan_id UUID,
  p_amount NUMERIC(14, 2),
  p_payment_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_loan public.loans%ROWTYPE;
  v_new_paid NUMERIC(14, 2);
  v_new_balance NUMERIC(14, 2);
  v_new_installments INT;
  v_new_status TEXT;
  v_expense_id UUID;
  v_user_org UUID;
BEGIN
  v_user_org := public.current_user_org_id();

  SELECT * INTO v_loan 
  FROM public.loans 
  WHERE id = p_loan_id AND organization_id = v_user_org 
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan contract not found or inaccessible';
  END IF;

  v_new_paid := v_loan.total_paid + p_amount;
  v_new_balance := GREATEST(0, v_loan.outstanding_balance - p_amount);
  v_new_installments := LEAST(v_loan.installments_total, v_loan.installments_paid + 1);
  v_new_status := CASE WHEN v_new_balance = 0 OR v_new_installments >= v_loan.installments_total THEN 'completed' ELSE 'active' END;

  UPDATE public.loans
  SET 
    total_paid = v_new_paid,
    outstanding_balance = v_new_balance,
    installments_paid = v_new_installments,
    status = v_new_status,
    next_due_date = v_loan.next_due_date + INTERVAL '1 month'
  WHERE id = p_loan_id;

  INSERT INTO public.expenses (
    organization_id, category, type, amount, date, description, bus_number, payment_method, reference_number
  ) VALUES (
    v_user_org,
    'emi',
    'expense',
    p_amount,
    p_payment_date,
    format('EMI Payment #%s for %s (%s)', v_new_installments, v_loan.bus_number, v_loan.lender),
    v_loan.bus_number,
    'Bank Transfer',
    format('EMI-%s-%s', v_loan.loan_id, v_new_installments)
  ) RETURNING id INTO v_expense_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'loan_id', p_loan_id,
    'expense_id', v_expense_id,
    'outstanding_balance', v_new_balance,
    'installments_paid', v_new_installments,
    'status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 8.3 Administrative User Role Management (Protected Server-Side Procedure)
CREATE OR REPLACE FUNCTION public.manage_user_role(
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id UUID;
  v_caller_profile public.profiles%ROWTYPE;
  v_target_profile public.profiles%ROWTYPE;
  v_caller_is_super_admin BOOLEAN;
  v_caller_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication Required: You must be authenticated to modify user roles.';
  END IF;

  SELECT * INTO v_caller_profile FROM public.profiles WHERE id = v_caller_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Security Exception: Caller profile record not found.';
  END IF;

  v_caller_is_super_admin := (v_caller_profile.role = 'Super Admin');
  v_caller_is_admin := (v_caller_profile.role IN ('Super Admin', 'Admin'));

  IF NOT v_caller_is_admin THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can modify user roles.';
  END IF;

  -- Validate target role
  IF p_new_role NOT IN ('Super Admin', 'Admin', 'Normal User', 'Guest', 'Fleet Manager', 'Dispatcher', 'Accountant') THEN
    RAISE EXCEPTION 'Invalid role specified: %', p_new_role;
  END IF;

  -- Target user lookup
  SELECT * INTO v_target_profile FROM public.profiles WHERE id = p_target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found with id %', p_target_user_id;
  END IF;

  -- Organization isolation: Org Admins can only manage users within their organization
  IF NOT v_caller_is_super_admin AND v_caller_profile.organization_id != v_target_profile.organization_id THEN
    RAISE EXCEPTION 'Cross-Tenant Violation: Cannot modify user belonging to another organization.';
  END IF;

  -- Elevating to Super Admin requires Super Admin
  IF p_new_role = 'Super Admin' AND NOT v_caller_is_super_admin THEN
    RAISE EXCEPTION 'Privilege Escalation Violation: Only a Super Admin can promote to Super Admin.';
  END IF;

  -- Demoting a Super Admin requires Super Admin
  IF v_target_profile.role = 'Super Admin' AND NOT v_caller_is_super_admin THEN
    RAISE EXCEPTION 'Privilege Violation: Only a Super Admin can demote another Super Admin.';
  END IF;

  -- Admins cannot modify their own role
  IF p_target_user_id = v_caller_id AND NOT v_caller_is_super_admin THEN
    RAISE EXCEPTION 'Security Policy Violation: Administrators cannot alter their own privilege level.';
  END IF;

  -- Update role
  UPDATE public.profiles
  SET role = p_new_role, updated_at = NOW()
  WHERE id = p_target_user_id;

  -- Log action in immutable audit ledger
  INSERT INTO public.audit_logs (
    organization_id, user_name, user_id, action, entity_type, entity_id, details
  ) VALUES (
    v_target_profile.organization_id,
    v_caller_profile.full_name,
    v_caller_id,
    'ROLE_CHANGED',
    'User Profile',
    p_target_user_id::text,
    format('Role for user %s (%s) updated from %s to %s by %s (%s)',
      v_target_profile.full_name, v_target_profile.email, v_target_profile.role, p_new_role, v_caller_profile.full_name, v_caller_profile.role)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', p_target_user_id,
    'previous_role', v_target_profile.role,
    'new_role', p_new_role,
    'updated_by', v_caller_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 9. Complete Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on every table accessible via Data API
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 9.1 ORGANIZATIONS
--------------------------------------------------------------------------------
CREATE POLICY "org_select_member" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_user_org_id() OR public.is_super_admin());

CREATE POLICY "org_insert_admin" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "org_update_admin" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR (public.is_admin() AND id = public.current_user_org_id()))
  WITH CHECK (public.is_super_admin() OR (public.is_admin() AND id = public.current_user_org_id()));

CREATE POLICY "org_delete_admin" ON public.organizations
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

--------------------------------------------------------------------------------
-- 9.2 PROFILES
--------------------------------------------------------------------------------
-- Members can view profiles in their own organization (or Super Admin across all)
CREATE POLICY "profiles_select_org" ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id() OR public.is_super_admin());

-- Users can insert their own profile upon auth signup
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile; admins can update any in their org
CREATE POLICY "profiles_update_authorized" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (id = auth.uid() OR public.is_admin())
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  )
  WITH CHECK (
    (id = auth.uid() OR public.is_admin())
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

-- Only Admins can delete profiles (and cannot delete themselves)
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (
    (public.is_super_admin() OR (public.is_admin() AND organization_id = public.current_user_org_id()))
    AND id != auth.uid()
  );

--------------------------------------------------------------------------------
-- 9.3 SETTINGS
--------------------------------------------------------------------------------
CREATE POLICY "settings_select_org" ON public.settings
  FOR SELECT TO authenticated
  USING ((organization_id = public.current_user_org_id() OR public.is_super_admin()) AND NOT public.is_guest());

CREATE POLICY "settings_insert_admin" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "settings_update_mgr" ON public.settings
  FOR UPDATE TO authenticated
  USING (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()))
  WITH CHECK (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

-- Settings cannot be deleted
CREATE POLICY "settings_delete_deny" ON public.settings
  FOR DELETE TO authenticated
  USING (FALSE);

--------------------------------------------------------------------------------
-- 9.4 BUSES
--------------------------------------------------------------------------------
CREATE POLICY "buses_select_org" ON public.buses
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id() OR public.is_super_admin());

CREATE POLICY "buses_insert_mgr" ON public.buses
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "buses_update_mgr" ON public.buses
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()))
  WITH CHECK (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "buses_delete_admin" ON public.buses
  FOR DELETE TO authenticated
  USING (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

--------------------------------------------------------------------------------
-- 9.5 DRIVERS
--------------------------------------------------------------------------------
CREATE POLICY "drivers_select_org" ON public.drivers
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "drivers_insert_mgr" ON public.drivers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "drivers_update_ops" ON public.drivers
  FOR UPDATE TO authenticated
  USING (
    (public.is_manager_or_admin() OR public.current_user_role() = 'Dispatcher')
    AND organization_id = public.current_user_org_id()
  )
  WITH CHECK (
    (public.is_manager_or_admin() OR public.current_user_role() = 'Dispatcher')
    AND organization_id = public.current_user_org_id()
  );

CREATE POLICY "drivers_delete_admin" ON public.drivers
  FOR DELETE TO authenticated
  USING (public.is_admin() AND organization_id = public.current_user_org_id());

--------------------------------------------------------------------------------
-- 9.6 MECHANICS
--------------------------------------------------------------------------------
CREATE POLICY "mechanics_select_org" ON public.mechanics
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "mechanics_insert_mgr" ON public.mechanics
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "mechanics_update_mgr" ON public.mechanics
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin() AND organization_id = public.current_user_org_id())
  WITH CHECK (public.is_manager_or_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "mechanics_delete_admin" ON public.mechanics
  FOR DELETE TO authenticated
  USING (public.is_admin() AND organization_id = public.current_user_org_id());

--------------------------------------------------------------------------------
-- 9.7 ROUTES
--------------------------------------------------------------------------------
CREATE POLICY "routes_select_org" ON public.routes
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());

CREATE POLICY "routes_insert_mgr" ON public.routes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "routes_update_mgr" ON public.routes
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin() AND organization_id = public.current_user_org_id())
  WITH CHECK (public.is_manager_or_admin() AND organization_id = public.current_user_org_id());

CREATE POLICY "routes_delete_admin" ON public.routes
  FOR DELETE TO authenticated
  USING (public.is_admin() AND organization_id = public.current_user_org_id());

--------------------------------------------------------------------------------
-- 9.8 TRIPS
--------------------------------------------------------------------------------
CREATE POLICY "trips_select_org" ON public.trips
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id() OR public.is_super_admin());

CREATE POLICY "trips_insert_ops" ON public.trips
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_operations()
    AND (public.is_manager_or_admin() OR public.current_user_role() IN ('Dispatcher', 'Normal User'))
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

CREATE POLICY "trips_update_ops" ON public.trips
  FOR UPDATE TO authenticated
  USING (
    public.can_write_operations()
    AND (public.is_manager_or_admin() OR public.current_user_role() IN ('Dispatcher', 'Normal User'))
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  )
  WITH CHECK (
    public.can_write_operations()
    AND (public.is_manager_or_admin() OR public.current_user_role() IN ('Dispatcher', 'Normal User'))
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

CREATE POLICY "trips_delete_mgr" ON public.trips
  FOR DELETE TO authenticated
  USING (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

--------------------------------------------------------------------------------
-- 9.9 SERVICE RECORDS
--------------------------------------------------------------------------------
CREATE POLICY "service_select_org" ON public.service_records
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id() OR public.is_super_admin());

CREATE POLICY "service_insert_ops" ON public.service_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_operations()
    AND (public.is_manager_or_admin() OR public.current_user_role() IN ('Dispatcher', 'Normal User'))
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

CREATE POLICY "service_update_ops" ON public.service_records
  FOR UPDATE TO authenticated
  USING (
    public.can_write_operations()
    AND (public.is_manager_or_admin() OR public.current_user_role() IN ('Dispatcher', 'Normal User'))
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  )
  WITH CHECK (
    public.can_write_operations()
    AND (public.is_manager_or_admin() OR public.current_user_role() IN ('Dispatcher', 'Normal User'))
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

CREATE POLICY "service_delete_admin" ON public.service_records
  FOR DELETE TO authenticated
  USING (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

--------------------------------------------------------------------------------
-- 9.10 INVENTORY
--------------------------------------------------------------------------------
CREATE POLICY "inventory_select_org" ON public.inventory
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id() OR public.is_super_admin());

CREATE POLICY "inventory_insert_mgr" ON public.inventory
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "inventory_update_mgr" ON public.inventory
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()))
  WITH CHECK (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "inventory_delete_admin" ON public.inventory
  FOR DELETE TO authenticated
  USING (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

--------------------------------------------------------------------------------
-- 9.11 INVENTORY MOVEMENTS (IMMUTABLE AUDIT LEDGER)
--------------------------------------------------------------------------------
CREATE POLICY "movements_select_org" ON public.inventory_movements
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id() OR public.is_super_admin());

CREATE POLICY "movements_insert_ops" ON public.inventory_movements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_operations()
    AND (public.is_manager_or_admin() OR public.current_user_role() IN ('Dispatcher', 'Normal User'))
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

-- Stock movements can NEVER be altered or purged
CREATE POLICY "movements_update_deny" ON public.inventory_movements
  FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY "movements_delete_deny" ON public.inventory_movements
  FOR DELETE TO authenticated
  USING (FALSE);

--------------------------------------------------------------------------------
-- 9.12 FUEL RECORDS
--------------------------------------------------------------------------------
CREATE POLICY "fuel_select_org" ON public.fuel_records
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id() OR public.is_super_admin());

CREATE POLICY "fuel_insert_ops" ON public.fuel_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_operations()
    AND (public.is_manager_or_admin() OR public.current_user_role() IN ('Dispatcher', 'Normal User'))
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

CREATE POLICY "fuel_update_mgr" ON public.fuel_records
  FOR UPDATE TO authenticated
  USING (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()))
  WITH CHECK (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "fuel_delete_admin" ON public.fuel_records
  FOR DELETE TO authenticated
  USING (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

--------------------------------------------------------------------------------
-- 9.13 EXPENSES & FINANCIAL LEDGER (CONFIDENTIAL)
--------------------------------------------------------------------------------
-- Only Finance Roles can read ledger
CREATE POLICY "expenses_select_finance" ON public.expenses
  FOR SELECT TO authenticated
  USING (public.can_access_finance() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "expenses_insert_finance" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_finance() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "expenses_update_finance" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    (public.is_admin() OR public.current_user_role() = 'Accountant')
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  )
  WITH CHECK (
    (public.is_admin() OR public.current_user_role() = 'Accountant')
    AND (organization_id = public.current_user_org_id() OR public.is_super_admin())
  );

CREATE POLICY "expenses_delete_admin" ON public.expenses
  FOR DELETE TO authenticated
  USING (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

--------------------------------------------------------------------------------
-- 9.14 LOANS (EMI FINANCING)
--------------------------------------------------------------------------------
CREATE POLICY "loans_select_finance" ON public.loans
  FOR SELECT TO authenticated
  USING (public.can_access_finance() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "loans_insert_mgr" ON public.loans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "loans_update_finance" ON public.loans
  FOR UPDATE TO authenticated
  USING (public.can_access_finance() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()))
  WITH CHECK (public.can_access_finance() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

CREATE POLICY "loans_delete_admin" ON public.loans
  FOR DELETE TO authenticated
  USING (public.is_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

--------------------------------------------------------------------------------
-- 9.15 NOTIFICATIONS
--------------------------------------------------------------------------------
CREATE POLICY "notif_select_org_user" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    (organization_id = public.current_user_org_id() OR public.is_super_admin())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "notif_insert_auth" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org_id() OR public.is_super_admin());

CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    (organization_id = public.current_user_org_id() OR public.is_super_admin())
    AND (user_id IS NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    (organization_id = public.current_user_org_id() OR public.is_super_admin())
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "notif_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (
    (organization_id = public.current_user_org_id() OR public.is_super_admin())
    AND (user_id IS NULL OR user_id = auth.uid() OR public.is_admin())
  );

--------------------------------------------------------------------------------
-- 9.16 AUDIT LOGS (IMMUTABLE COMPLIANCE TRAIL)
--------------------------------------------------------------------------------
-- Only Admins and Fleet Managers can read the organization's audit trail
CREATE POLICY "audit_select_mgr" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_manager_or_admin() AND (organization_id = public.current_user_org_id() OR public.is_super_admin()));

-- Any authenticated action can write to the audit trail
CREATE POLICY "audit_insert_auth" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_org_id() OR public.is_super_admin());

-- Non-Repudiation: Audit trail can NEVER be modified or deleted by anyone
CREATE POLICY "audit_update_deny" ON public.audit_logs
  FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY "audit_delete_deny" ON public.audit_logs
  FOR DELETE TO authenticated
  USING (FALSE);

-- ==============================================================================
-- 10. Zero Anonymous Trust & Least-Privilege Grants
-- ==============================================================================
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
