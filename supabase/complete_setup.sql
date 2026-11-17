-- ==============================================================================
-- FleetMind AI â€” Comprehensive Database Schema & Row Level Security (RLS)
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
  currency_symbol TEXT NOT NULL DEFAULT 'â‚¹',
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
-- ==============================================================================
-- FleetMind AI â€” Supabase Storage Buckets & Row Level Security (RLS) Policies
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
-- ==============================================================================
-- FleetMind AI â€” Production Security Hardening & Performance Advisor Indexes
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
-- ==============================================================================
-- FleetMind AI â€” Initial Seed Data
-- Mirrors the demo datasets from src/services/store.ts
-- ==============================================================================

-- 0. Default Organization (Multi-tenant Root)
INSERT INTO public.organizations (id, name, slug, billing_tier, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'FleetMind Commercial Logistics',
  'fleetmind-hq',
  'Enterprise',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- 1. Organization Settings
INSERT INTO public.settings (
  organization_id, company_name, currency, currency_symbol, timezone, date_format,
  fuel_efficiency_alert_threshold, maintenance_reminder_days, low_stock_warning_threshold,
  notifications_email, notifications_browser
) VALUES (
  '00000000-0000-0000-0000-000000000001', 'FleetMind Commercial Logistics', 'INR', 'â‚¹', 'Asia/Kolkata', 'DD/MM/YYYY',
  4.00, 14, 5, TRUE, TRUE
);

-- 2. Buses (Vehicles)
INSERT INTO public.buses (
  bus_number, registration_number, model, manufacturer, year, capacity,
  status, fuel_type, odometer, assigned_driver, route,
  insurance_expiry, registration_expiry, last_service_date, next_service_date, notes
) VALUES
('FM-101', 'MH-12-RN-8821', 'Volvo 9600 B11R Multi-Axle Sleeper', 'Volvo Buses', 2023, 48, 'active', 'Diesel', 84250, 'Rajesh Kumar', 'Mumbai - Pune Express', '2026-11-20', '2028-05-15', '2026-09-10', '2026-12-10', 'Premium air suspension, fleet flagship vehicle.'),
('FM-102', 'MH-14-BT-3309', 'Scania Metrolink HD Coach', 'Scania', 2022, 53, 'active', 'Diesel', 112400, 'Amit Sharma', 'Delhi - Jaipur Highway', '2026-12-05', '2027-08-22', '2026-08-28', '2026-11-28', 'Equipped with collision mitigation radar.'),
('FM-103', 'KA-01-MJ-4392', 'Tata Starbus Ultra EV 9m', 'Tata Motors', 2024, 34, 'maintenance', 'Electric', 32180, 'Suresh Patel', 'Bengaluru - Chennai Corridor', '2027-01-14', '2029-02-10', '2026-07-15', '2026-10-01', 'Battery thermal management inspection scheduled.'),
('FM-104', 'DL-01-AB-9012', 'BharatBenz 1624 Intercity Coach', 'Daimler India', 2023, 44, 'active', 'Diesel', 73900, 'Vikram Singh', 'Delhi - Jaipur Highway', '2026-10-25', '2028-11-04', '2026-09-02', '2026-12-02', 'Telematics GPS Unit #902 installed.'),
('FM-105', 'AP-09-CZ-5511', 'Ashok Leyland Lynx Smart Coach', 'Ashok Leyland', 2021, 36, 'active', 'CNG', 148200, 'Mohammad Faizan', 'Hyderabad - Vijayawada', '2027-04-18', '2026-12-30', '2026-09-18', '2026-12-18', 'CNG cylinder hydro-tested in Aug 2026.'),
('FM-106', 'GJ-01-EQ-7744', 'Eicher Skyline Pro 3011', 'VE Commercial Vehicles', 2022, 40, 'inactive', 'Diesel', 98400, 'Ramesh Joshi', 'Ahmedabad - Surat Shuttle', '2027-03-12', '2027-09-19', '2026-08-11', '2026-11-11', 'Undergoing gearbox sync overhaul in workshop.'),
('FM-107', 'MH-04-AX-1123', 'Force Urbania Executive 17-Seater', 'Force Motors', 2023, 17, 'active', 'Diesel', 45200, 'Harpreet Singh', 'Mumbai - Pune Express', '2027-06-30', '2028-06-30', '2026-09-22', '2026-12-22', 'Corporate shuttle service vehicle.'),
('FM-108', 'KA-05-NN-6677', 'Tata Marcopolo Starbus Prime', 'Tata Motors', 2022, 42, 'active', 'Diesel', 104600, 'Anand Rao', 'Bengaluru - Chennai Corridor', '2026-11-14', '2027-05-18', '2026-08-15', '2026-11-15', 'Regular intercity express run.');

-- 3. Drivers
INSERT INTO public.drivers (
  name, phone, email, license_number, license_expiry, joining_date, assigned_bus,
  status, today_availability, experience_years, total_trips, distance_km, safety_score, emergency_contact
) VALUES
('Rajesh Kumar', '+91 98201 44512', 'rajesh.kumar@fleetmind.ai', 'MH12 20140029811', '2028-04-14', '2019-03-10', 'FM-101', 'active', 'on_trip', 12, 1420, 298400, 98, '+91 98201 99881 (Sunita Kumar - Spouse)'),
('Amit Sharma', '+91 98112 33445', 'amit.sharma@fleetmind.ai', 'DL04 20160087123', '2027-09-18', '2020-07-15', 'FM-102', 'active', 'available', 9, 980, 184500, 94, '+91 98112 88771 (Pooja Sharma)'),
('Suresh Patel', '+91 94260 77112', 'suresh.patel@fleetmind.ai', 'KA01 20120011993', '2026-12-20', '2018-01-20', 'FM-103', 'active', 'off_duty', 14, 1840, 362000, 91, '+91 94260 22334 (Geeta Patel)'),
('Vikram Singh', '+91 98722 66334', 'vikram.singh@fleetmind.ai', 'DL01 20170098442', '2027-11-05', '2021-04-01', 'FM-104', 'active', 'on_trip', 8, 760, 142300, 96, '+91 98722 11009 (Jaspreet Kaur)'),
('Mohammad Faizan', '+91 98480 55221', 'm.faizan@fleetmind.ai', 'AP09 20150033441', '2028-02-28', '2019-11-12', 'FM-105', 'active', 'available', 10, 1150, 219800, 93, '+91 98480 99443 (Zeenat Begum)'),
('Ramesh Joshi', '+91 97240 88991', 'ramesh.joshi@fleetmind.ai', 'GJ01 20130077884', '2026-11-15', '2017-09-01', 'FM-106', 'on_leave', 'off_duty', 15, 2100, 412000, 89, '+91 97240 11223 (Bhavna Joshi)');

-- 4. Mechanics
INSERT INTO public.mechanics (
  name, phone, specialty, status, active_tasks, hourly_rate
) VALUES
('Sunil Verma', '+91 98205 11223', 'Engine & Transmission Specialist', 'available', 1, 650.00),
('Dinesh Kulkarni', '+91 98205 22334', 'HVAC & Electrical Master Tech', 'busy', 2, 700.00),
('Abdul Rahim', '+91 98205 33445', 'Brake Systems & Suspension Expert', 'available', 0, 600.00),
('Pravin Gaikwad', '+91 98205 44556', 'Pneumatics & Wheel Alignment Specialist', 'off_duty', 0, 550.00);

-- 5. Routes
INSERT INTO public.routes (
  route_name, route_code, start_point, end_point, distance_km, estimated_time, fare,
  assigned_buses, assigned_drivers, stops, status
) VALUES
('Mumbai - Pune Express', 'EXP-101', 'Mumbai Dadar TT', 'Pune Swargate', 152, '3h 30m', 450.00, ARRAY['FM-101', 'FM-107'], ARRAY['Rajesh Kumar', 'Harpreet Singh'], ARRAY['Vashi Toll', 'Lonavala Exit', 'Wakad Bypass'], 'active'),
('Delhi - Jaipur Highway', 'EXP-202', 'Delhi Kashmiri Gate', 'Jaipur Sindhi Camp', 270, '5h 15m', 750.00, ARRAY['FM-102', 'FM-104'], ARRAY['Amit Sharma', 'Vikram Singh'], ARRAY['Gurugram IFFCO Chowk', 'Behror Midway', 'Kotputli Bypass'], 'active'),
('Bengaluru - Chennai Corridor', 'EXP-303', 'Bengaluru Majestic', 'Chennai Koyambedu', 345, '6h 45m', 950.00, ARRAY['FM-103', 'FM-108'], ARRAY['Suresh Patel', 'Anand Rao'], ARRAY['Electronic City Toll', 'Hosur Lake', 'Vellore Bypass', 'Kanchipuram Gate'], 'active'),
('Hyderabad - Vijayawada Expressway', 'EXP-404', 'Hyderabad MGBS', 'Vijayawada Pandit Nehru', 275, '5h 00m', 680.00, ARRAY['FM-105'], ARRAY['Mohammad Faizan'], ARRAY['Hayathnagar', 'Suryapet Midway', 'Nandigama'], 'active');

-- 6. Inventory Items
INSERT INTO public.inventory (
  item_name, sku, category, current_stock, minimum_stock, purchase_price, vendor, unit, storage_location
) VALUES
('Synthetic Engine Oil 15W-40 (20L Drum)', 'OIL-15W40-20L', 'fluids', 18, 5, 6200.00, 'Castrol Commercial India', 'Drums', 'Bay A-01'),
('Heavy-Duty Front Brake Pad Set', 'BRK-PAD-HD01', 'brakes', 12, 6, 4500.00, 'Knorr-Bremse India', 'Sets', 'Bay B-04'),
('Fuel Filter Element (Volvo 9600 OEM)', 'FLT-FL-V96', 'engine', 8, 4, 1850.00, 'Volvo Parts Direct', 'Pcs', 'Bay A-03'),
('Tubeless Radial Coach Tire 295/80 R22.5', 'TIR-295-R22', 'tires', 14, 8, 22500.00, 'MRF Commercial Tyres', 'Pcs', 'Yard C-02'),
('LED Intercity Headlight Assembly RH', 'ELE-HL-LED-R', 'electrical', 3, 2, 8900.00, 'Lumax Auto Technologies', 'Pcs', 'Bay D-02'),
('Coolant Pre-Mix OAT Red 5L', 'FLU-COOL-5L', 'fluids', 24, 10, 850.00, 'TotalEnergies Lubricants', 'Cans', 'Bay A-02'),
('Air Dryer Cartridge Desiccant', 'PNE-AIR-DRY', 'brakes', 6, 3, 2400.00, 'Wabco India Limited', 'Pcs', 'Bay B-02'),
('Heavy Duty Air Suspension Bellows', 'SUS-BEL-01', 'suspension', 5, 2, 7800.00, 'ContiTech Suspension', 'Pcs', 'Bay C-01');

-- 7. Loans (EMI)
INSERT INTO public.loans (
  loan_id, lender, bus_number, principal_amount, interest_rate, loan_start_date, term_months,
  monthly_emi, total_paid, outstanding_balance, next_due_date, status, installments_paid, installments_total
) VALUES
('LN-VLV-2023-01', 'HDFC Bank Commercial Vehicle Finance', 'FM-101', 12000000.00, 8.75, '2023-04-15', 60, 247850.00, 4213450.00, 7786550.00, '2026-11-15', 'active', 17, 60),
('LN-SCN-2022-04', 'Tata Capital Heavy Equipment Finance', 'FM-102', 9500000.00, 9.20, '2022-09-01', 60, 198200.00, 4756800.00, 4743200.00, '2026-11-01', 'active', 24, 60),
('LN-TAT-2024-02', 'State Bank of India Green Mobility EV Loan', 'FM-103', 7500000.00, 7.80, '2024-02-10', 84, 116450.00, 931600.00, 6568400.00, '2026-11-10', 'active', 8, 84),
('LN-BHB-2023-07', 'ICICI Bank Transport Equipment Finance', 'FM-104', 6800000.00, 9.00, '2023-08-20', 48, 169200.00, 2368800.00, 4431200.00, '2026-11-20', 'active', 14, 48);

-- 8. Expenses & Financial Ledger
INSERT INTO public.expenses (
  category, type, amount, date, description, bus_number, payment_method, reference_number
) VALUES
('revenue', 'revenue', 345000.00, '2026-10-10', 'Passenger Ticket Bookings (Online & Counter)', NULL, 'Bank Transfer', 'TXN-REV-1010'),
('revenue', 'revenue', 185000.00, '2026-10-08', 'Tech Corp Monthly Staff Shuttle Charter Contract', NULL, 'Bank Transfer', 'TXN-REV-1008'),
('fuel', 'expense', 62950.00, '2026-10-10', 'Weekly Fleet Fuel Settlement (BPCL & IOCL)', 'Multiple Buses', 'Bank Transfer', 'TXN-EXP-01'),
('maintenance', 'expense', 52700.00, '2026-10-09', 'Workshop Repairs & Spare Parts Installation', 'FM-103', 'Bank Transfer', 'TXN-EXP-02'),
('driver_salary', 'expense', 175000.00, '2026-10-01', 'Monthly Fleet Drivers & Support Staff Payroll', NULL, 'Bank Transfer', 'TXN-EXP-03'),
('emi', 'expense', 168400.00, '2026-10-05', 'HDFC & ICICI Vehicle Loan Monthly Instalments', 'FM-101 / FM-102', 'Bank Transfer', 'TXN-EXP-04'),
('tolls', 'expense', 24800.00, '2026-10-07', 'FASTag Fleet RFID Fast Recharge (NHAI)', 'Multiple Buses', 'UPI', 'TXN-EXP-05'),
('insurance', 'expense', 45000.00, '2026-09-28', 'Annual Comprehensive Vehicle Insurance Installment', 'FM-107', 'Bank Transfer', 'TXN-EXP-06');

-- 9. Notifications
INSERT INTO public.notifications (
  title, message, type, severity, read, link
) VALUES
('Scheduled Service Overdue', 'FM-103 (Tata Starbus Ultra EV) was due for battery coolant inspection on 2026-10-01.', 'maintenance', 'critical', FALSE, '/maintenance-records'),
('Commercial Insurance Expiring Soon', 'FM-104 (BharatBenz 1624) insurance expires in 12 days (2026-10-25). Initiate renewal with Oriental Insurance.', 'insurance', 'warning', FALSE, '/buses'),
('Driver License Expiry Alert', 'Driver Ramesh Joshi (Licence GJ01 20130077884) expires in 30 days. Upload renewal certificate.', 'license', 'warning', FALSE, '/drivers'),
('Low Stock Alert: Headlight Assembly', 'LED Headlight RH stock dropped to 3 units (reorder threshold is 2).', 'inventory', 'info', TRUE, '/inventory'),
('Monthly EMI Payment Due', 'EMI payment of â‚¹2,47,850 for FM-101 (HDFC Commercial) is scheduled on 2026-11-15.', 'emi', 'critical', FALSE, '/emi'),
('FASTag Low Balance Warning', 'Toll FASTag wallet balance dropped below â‚¹5,000 threshold. Recharge to avoid express corridor delays.', 'system', 'info', TRUE, '/finance');
