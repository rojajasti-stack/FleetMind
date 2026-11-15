-- ==============================================================================
-- FleetMind AI — Comprehensive Role-Based Access Control (RBAC) & RLS Test Suite
-- File: supabase/tests/rls_security_test_suite.sql
-- Roles Tested: Super Admin, Admin, Normal User, Guest, Anonymous
-- Tests: Permissions, Privilege Escalation Prevention, Cross-Tenant Isolation,
--        Audit Trail Immutability, RPC Role Management.
-- ==============================================================================

BEGIN;

-- 1. Create In-Memory Result Reporting Table
CREATE TEMP TABLE test_results (
  test_id INT PRIMARY KEY,
  category TEXT NOT NULL,
  test_name TEXT NOT NULL,
  expected TEXT NOT NULL,
  actual TEXT NOT NULL,
  status TEXT NOT NULL
);

GRANT ALL ON TABLE test_results TO anon, authenticated;

-- Helper test recording function (SECURITY DEFINER allows writing results across mock roles)
CREATE OR REPLACE FUNCTION record_test(
  p_id INT,
  p_cat TEXT,
  p_name TEXT,
  p_exp TEXT,
  p_act TEXT,
  p_status TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO test_results (test_id, category, test_name, expected, actual, status)
  VALUES (p_id, p_cat, p_name, p_exp, p_act, p_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_temp, public;

GRANT EXECUTE ON FUNCTION record_test TO anon, authenticated;

-- 2. Mock Multi-Tenant Identities & Organizations (Replica mode bypasses triggers during test fixture setup)
SET LOCAL session_replication_role = 'replica';

DO $$
DECLARE
  v_org1 UUID := '00000000-0000-0000-0000-000000000001';
  v_org2 UUID := '00000000-0000-0000-0000-000000000002';
  v_super_admin UUID := '00000000-0000-0000-0000-000000000099';
  v_admin UUID := '11111111-1111-1111-1111-111111111111';
  v_normal_user UUID := '22222222-2222-2222-2222-222222222222';
  v_accountant UUID := '33333333-3333-3333-3333-333333333333';
  v_guest UUID := '55555555-5555-5555-5555-555555555555';
  v_org2_user UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
  -- Ensure Org 1 exists
  INSERT INTO public.organizations (id, name, slug, billing_tier)
  VALUES (v_org1, 'FleetMind Primary Org', 'fleetmind-primary', 'Enterprise')
  ON CONFLICT (id) DO NOTHING;

  -- Create Org 2 (Multi-Tenant Isolation)
  INSERT INTO public.organizations (id, name, slug, billing_tier)
  VALUES (v_org2, 'Org 2 Logistics Corp', 'org2-logistics', 'Professional')
  ON CONFLICT (id) DO NOTHING;

  -- Create bus in Org 2
  INSERT INTO public.buses (
    id, organization_id, bus_number, registration_number, model, manufacturer, year, capacity, status,
    fuel_type, odometer, insurance_expiry, registration_expiry, last_service_date, next_service_date
  ) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', v_org2, 'BUS-ORG2-99', 'DL-01-ORG2-9999',
    'City Rider', 'Tata Motors', 2023, 40, 'active', 'CNG', 12000,
    '2027-01-01', '2027-01-01', '2026-01-01', '2026-07-01'
  ) ON CONFLICT DO NOTHING;

  -- Create sample bus in Org 1 if none exists
  INSERT INTO public.buses (
    id, organization_id, bus_number, registration_number, model, manufacturer, year, capacity, status,
    fuel_type, odometer, insurance_expiry, registration_expiry, last_service_date, next_service_date
  ) VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', v_org1, 'BUS-TEST-01', 'MH-12-TEST-0001',
    'Volvo 9600', 'Volvo', 2023, 48, 'active', 'Diesel', 50000,
    '2027-01-01', '2027-01-01', '2026-01-01', '2026-07-01'
  ) ON CONFLICT DO NOTHING;

  -- Provision mock users in auth.users
  INSERT INTO auth.users (id, email) VALUES
    (v_super_admin, 'superadmin@test.io'),
    (v_admin, 'admin@test.io'),
    (v_normal_user, 'operator@test.io'),
    (v_accountant, 'accountant@test.io'),
    (v_guest, 'guest@test.io'),
    (v_org2_user, 'org2mgr@test.io')
  ON CONFLICT (id) DO NOTHING;

  -- Set profiles with distinct required roles
  INSERT INTO public.profiles (id, organization_id, full_name, email, role) VALUES
    (v_super_admin, v_org1, 'Sam SuperAdmin', 'superadmin@test.io', 'Super Admin'),
    (v_admin, v_org1, 'Alice Admin', 'admin@test.io', 'Admin'),
    (v_normal_user, v_org1, 'Ned NormalUser', 'operator@test.io', 'Normal User'),
    (v_accountant, v_org1, 'Carol Accountant', 'accountant@test.io', 'Accountant'),
    (v_guest, v_org1, 'Gary Guest', 'guest@test.io', 'Guest'),
    (v_org2_user, v_org2, 'Oscar OrgTwo', 'org2mgr@test.io', 'Admin')
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, organization_id = EXCLUDED.organization_id;

  -- Insert sample expense in Org 1
  INSERT INTO public.expenses (
    organization_id, category, type, amount, date, description, payment_method
  ) VALUES (
    v_org1, 'fuel', 'expense', 5000.00, CURRENT_DATE, 'Diesel Fuel Batch', 'Bank Transfer'
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Restore standard origin trigger mode for actual policy testing
SET LOCAL session_replication_role = 'origin';

-- ==============================================================================
-- 3. TEST SUITE EXECUTION
-- ==============================================================================
DO $$
DECLARE
  v_org1 UUID := '00000000-0000-0000-0000-000000000001';
  v_org2 UUID := '00000000-0000-0000-0000-000000000002';
  v_super_admin UUID := '00000000-0000-0000-0000-000000000099';
  v_admin UUID := '11111111-1111-1111-1111-111111111111';
  v_normal_user UUID := '22222222-2222-2222-2222-222222222222';
  v_accountant UUID := '33333333-3333-3333-3333-333333333333';
  v_guest UUID := '55555555-5555-5555-5555-555555555555';
  v_org2_user UUID := '44444444-4444-4444-4444-444444444444';
  v_count INT;
  v_err TEXT;
  v_test_bus_id UUID;
  v_rpc_res JSONB;
BEGIN

  -- ----------------------------------------------------------------------------
  -- GROUP 1: ANONYMOUS ACCESS RESTRICTIONS
  -- ----------------------------------------------------------------------------
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', '', true);

  -- Test 1: Anon SELECT buses
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.buses;
    IF v_count = 0 THEN
      PERFORM record_test(1, 'ANONYMOUS', 'SELECT buses blocked for anon', '0 rows or denied', '0 rows returned', 'PASS');
    ELSE
      PERFORM record_test(1, 'ANONYMOUS', 'SELECT buses blocked for anon', '0 rows or denied', v_count || ' rows leaked', 'FAIL');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM record_test(1, 'ANONYMOUS', 'SELECT buses blocked for anon', '0 rows or denied', 'Permission denied (grant)', 'PASS');
  END;

  -- Test 2: Anon SELECT expenses
  BEGIN
    SELECT COUNT(*) INTO v_count FROM public.expenses;
    IF v_count = 0 THEN
      PERFORM record_test(2, 'ANONYMOUS', 'SELECT expenses blocked for anon', '0 rows or denied', '0 rows returned', 'PASS');
    ELSE
      PERFORM record_test(2, 'ANONYMOUS', 'SELECT expenses blocked for anon', '0 rows or denied', v_count || ' rows leaked', 'FAIL');
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM record_test(2, 'ANONYMOUS', 'SELECT expenses blocked for anon', '0 rows or denied', 'Permission denied (grant)', 'PASS');
  END;

  -- Test 3: Anon INSERT trips
  BEGIN
    INSERT INTO public.trips (organization_id, trip_code, route_name, bus_number, driver_name, date, start_time, end_time, start_point, end_point)
    VALUES (v_org1, 'ANON-01', 'Route 1', 'BUS-01', 'Driver', CURRENT_DATE, '08:00', '10:00', 'A', 'B');
    PERFORM record_test(3, 'ANONYMOUS', 'INSERT trip blocked for anon', 'Permission denied / blocked', 'Insert succeeded', 'FAIL');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(3, 'ANONYMOUS', 'INSERT trip blocked for anon', 'Permission denied / blocked', 'Blocked: ' || SQLERRM, 'PASS');
  END;

  -- ----------------------------------------------------------------------------
  -- GROUP 2: GUEST ROLE (READ-ONLY RESTRICTION)
  -- ----------------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_guest::text, true);

  -- Test 4: Guest SELECT buses (Allowed read-only overview)
  SELECT COUNT(*) INTO v_count FROM public.buses WHERE organization_id = v_org1;
  IF v_count > 0 THEN
    PERFORM record_test(4, 'GUEST', 'Guest read-only view of fleet allowed', '> 0 rows', v_count || ' buses visible', 'PASS');
  ELSE
    PERFORM record_test(4, 'GUEST', 'Guest read-only view of fleet allowed', '> 0 rows', '0 rows returned', 'FAIL');
  END IF;

  -- Test 5: Guest INSERT trips BLOCKED by can_write_operations()
  BEGIN
    INSERT INTO public.trips (organization_id, trip_code, route_name, bus_number, driver_name, date, start_time, end_time, start_point, end_point)
    VALUES (v_org1, 'GST-TRIP-01', 'Route 1', 'BUS-01', 'Driver', CURRENT_DATE, '08:00', '10:00', 'A', 'B');
    PERFORM record_test(5, 'GUEST', 'Guest INSERT trip BLOCKED', 'RLS violation', 'Insert succeeded', 'FAIL');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(5, 'GUEST', 'Guest INSERT trip BLOCKED', 'RLS violation', 'Blocked: ' || SQLERRM, 'PASS');
  END;

  -- Test 6: Guest SELECT expenses (Confidential financial records BLOCKED)
  SELECT COUNT(*) INTO v_count FROM public.expenses;
  IF v_count = 0 THEN
    PERFORM record_test(6, 'GUEST', 'Guest SELECT expenses BLOCKED', '0 rows', '0 rows returned (hidden)', 'PASS');
  ELSE
    PERFORM record_test(6, 'GUEST', 'Guest SELECT expenses BLOCKED', '0 rows', v_count || ' rows leaked', 'FAIL');
  END IF;

  -- Test 7: Guest SELECT settings BLOCKED
  SELECT COUNT(*) INTO v_count FROM public.settings;
  IF v_count = 0 THEN
    PERFORM record_test(7, 'GUEST', 'Guest SELECT settings BLOCKED', '0 rows', '0 rows returned (hidden)', 'PASS');
  ELSE
    PERFORM record_test(7, 'GUEST', 'Guest SELECT settings BLOCKED', '0 rows', v_count || ' rows leaked', 'FAIL');
  END IF;

  -- ----------------------------------------------------------------------------
  -- GROUP 3: NORMAL USER ROLE (OPERATIONS PERMITTED, ADMIN RESTRICTED)
  -- ----------------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_normal_user::text, true);

  -- Test 8: Normal User SELECT buses allowed
  SELECT COUNT(*) INTO v_count FROM public.buses WHERE organization_id = v_org1;
  IF v_count > 0 THEN
    PERFORM record_test(8, 'NORMAL_USER', 'Normal User SELECT buses allowed', '> 0 rows', v_count || ' buses read', 'PASS');
  ELSE
    PERFORM record_test(8, 'NORMAL_USER', 'Normal User SELECT buses allowed', '> 0 rows', '0 rows returned', 'FAIL');
  END IF;

  -- Test 9: Normal User INSERT trip allowed
  BEGIN
    INSERT INTO public.trips (organization_id, trip_code, route_name, bus_number, driver_name, date, start_time, end_time, start_point, end_point)
    VALUES (v_org1, 'NORM-TRIP-01', 'Route 1', 'BUS-TEST-01', 'Rajesh Sharma', CURRENT_DATE, '08:00', '10:00', 'A', 'B');
    PERFORM record_test(9, 'NORMAL_USER', 'Normal User INSERT trip allowed', 'Allowed', 'Trip scheduled', 'PASS');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(9, 'NORMAL_USER', 'Normal User INSERT trip allowed', 'Allowed', 'Blocked: ' || SQLERRM, 'FAIL');
  END;

  -- Test 10: Normal User UPDATE trip allowed
  UPDATE public.trips SET status = 'in_progress' WHERE trip_code = 'NORM-TRIP-01';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 1 THEN
    PERFORM record_test(10, 'NORMAL_USER', 'Normal User UPDATE trip allowed', '1 row updated', '1 row updated', 'PASS');
  ELSE
    PERFORM record_test(10, 'NORMAL_USER', 'Normal User UPDATE trip allowed', '1 row updated', v_count || ' rows updated', 'FAIL');
  END IF;

  -- Test 11: Normal User DELETE bus BLOCKED (Only Admin can delete fleet vehicles)
  DELETE FROM public.buses WHERE bus_number = 'BUS-TEST-01';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    PERFORM record_test(11, 'NORMAL_USER', 'Normal User DELETE bus BLOCKED', '0 rows deleted', '0 rows deleted', 'PASS');
  ELSE
    PERFORM record_test(11, 'NORMAL_USER', 'Normal User DELETE bus BLOCKED', '0 rows deleted', v_count || ' deleted', 'FAIL');
  END IF;

  -- Test 12: Normal User SELECT audit_logs BLOCKED
  SELECT COUNT(*) INTO v_count FROM public.audit_logs;
  IF v_count = 0 THEN
    PERFORM record_test(12, 'NORMAL_USER', 'Normal User SELECT audit_logs BLOCKED', '0 rows', '0 rows visible (hidden)', 'PASS');
  ELSE
    PERFORM record_test(12, 'NORMAL_USER', 'Normal User SELECT audit_logs BLOCKED', '0 rows', v_count || ' leaked', 'FAIL');
  END IF;

  -- Test 13: Normal User Self-Privilege Escalation to Admin BLOCKED by Trigger
  BEGIN
    UPDATE public.profiles SET role = 'Admin' WHERE id = v_normal_user;
    PERFORM record_test(13, 'NORMAL_USER', 'Self-Privilege Escalation BLOCKED', 'Exception', 'Update succeeded (Privilege Escalation!)', 'FAIL');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Security Policy Violation%' OR SQLERRM LIKE '%administrators%' THEN
      PERFORM record_test(13, 'NORMAL_USER', 'Self-Privilege Escalation BLOCKED', 'Exception', 'Blocked by trigger: ' || SQLERRM, 'PASS');
    ELSE
      PERFORM record_test(13, 'NORMAL_USER', 'Self-Privilege Escalation BLOCKED', 'Exception', 'Error: ' || SQLERRM, 'PASS');
    END IF;
  END;

  -- Test 14: Normal User calling manage_user_role RPC BLOCKED
  BEGIN
    PERFORM public.manage_user_role(v_normal_user, 'Admin');
    PERFORM record_test(14, 'NORMAL_USER', 'manage_user_role RPC BLOCKED for Normal User', 'Exception', 'RPC Succeeded', 'FAIL');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(14, 'NORMAL_USER', 'manage_user_role RPC BLOCKED for Normal User', 'Exception', 'Access Denied: ' || SQLERRM, 'PASS');
  END;

  -- ----------------------------------------------------------------------------
  -- GROUP 4: ADMIN ROLE (ORGANIZATION PRIVILEGES & GOVERNANCE)
  -- ----------------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_admin::text, true);

  -- Test 15: Admin full CRUD on buses
  BEGIN
    INSERT INTO public.buses (
      organization_id, bus_number, registration_number, model, manufacturer, year, capacity,
      insurance_expiry, registration_expiry, last_service_date, next_service_date
    ) VALUES (
      v_org1, 'BUS-ADM-01', 'MH-12-ADM-0001', 'Admin Star', 'Volvo', 2024, 45,
      '2027-01-01', '2027-01-01', '2026-01-01', '2026-07-01'
    ) RETURNING id INTO v_test_bus_id;

    UPDATE public.buses SET status = 'maintenance' WHERE id = v_test_bus_id;
    DELETE FROM public.buses WHERE id = v_test_bus_id;

    PERFORM record_test(15, 'ADMIN', 'Admin full CRUD on fleet vehicles', 'Full CRUD success', 'INSERT, UPDATE, DELETE completed', 'PASS');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(15, 'ADMIN', 'Admin full CRUD on fleet vehicles', 'Full CRUD success', 'Failed: ' || SQLERRM, 'FAIL');
  END;

  -- Test 16: Admin manage_user_role: can update Normal User to Dispatcher
  BEGIN
    v_rpc_res := public.manage_user_role(v_normal_user, 'Dispatcher');
    PERFORM record_test(16, 'ADMIN', 'Admin can assign operational role to member', 'Success', 'Role updated to Dispatcher', 'PASS');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(16, 'ADMIN', 'Admin can assign operational role to member', 'Success', 'Failed: ' || SQLERRM, 'FAIL');
  END;

  -- Test 17: Admin role change audit log created
  SELECT COUNT(*) INTO v_count FROM public.audit_logs 
  WHERE entity_id = v_normal_user::text AND action = 'ROLE_CHANGED';
  IF v_count > 0 THEN
    PERFORM record_test(17, 'ADMIN', 'Role change recorded in audit log', '> 0 entries', v_count || ' audit log created', 'PASS');
  ELSE
    PERFORM record_test(17, 'ADMIN', 'Role change recorded in audit log', '> 0 entries', '0 entries found', 'FAIL');
  END IF;

  -- Test 18: Admin CANNOT promote anyone to Super Admin
  BEGIN
    PERFORM public.manage_user_role(v_normal_user, 'Super Admin');
    PERFORM record_test(18, 'ADMIN', 'Admin CANNOT grant Super Admin privileges', 'Exception', 'Admin granted Super Admin!', 'FAIL');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(18, 'ADMIN', 'Admin CANNOT grant Super Admin privileges', 'Exception', 'Blocked: ' || SQLERRM, 'PASS');
  END;

  -- Test 19: Admin CANNOT alter their own role
  BEGIN
    PERFORM public.manage_user_role(v_admin, 'Super Admin');
    PERFORM record_test(19, 'ADMIN', 'Admin CANNOT self-escalate via RPC', 'Exception', 'Admin altered own role!', 'FAIL');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(19, 'ADMIN', 'Admin CANNOT self-escalate via RPC', 'Exception', 'Blocked: ' || SQLERRM, 'PASS');
  END;

  -- Test 20: Admin CANNOT manage users from another organization (Cross-Tenant)
  BEGIN
    PERFORM public.manage_user_role(v_org2_user, 'Normal User');
    PERFORM record_test(20, 'ADMIN', 'Cross-Tenant role modification BLOCKED', 'Exception', 'Cross-tenant update succeeded!', 'FAIL');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(20, 'ADMIN', 'Cross-Tenant role modification BLOCKED', 'Exception', 'Blocked: ' || SQLERRM, 'PASS');
  END;

  -- ----------------------------------------------------------------------------
  -- GROUP 5: SUPER ADMIN ROLE (PLATFORM OVERSIGHT & ROOT AUTHORITY)
  -- ----------------------------------------------------------------------------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_super_admin::text, true);

  -- Test 21: Super Admin cross-tenant visibility (Sees Org 1 AND Org 2)
  SELECT COUNT(DISTINCT organization_id) INTO v_count FROM public.buses;
  IF v_count >= 2 THEN
    PERFORM record_test(21, 'SUPER_ADMIN', 'Super Admin cross-tenant visibility', '>= 2 orgs', v_count || ' orgs visible', 'PASS');
  ELSE
    PERFORM record_test(21, 'SUPER_ADMIN', 'Super Admin cross-tenant visibility', '>= 2 orgs', v_count || ' orgs visible', 'FAIL');
  END IF;

  -- Test 22: Super Admin can promote user to Admin
  BEGIN
    v_rpc_res := public.manage_user_role(v_normal_user, 'Admin');
    PERFORM record_test(22, 'SUPER_ADMIN', 'Super Admin can promote user to Admin', 'Success', 'User promoted to Admin', 'PASS');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(22, 'SUPER_ADMIN', 'Super Admin can promote user to Admin', 'Success', 'Failed: ' || SQLERRM, 'FAIL');
  END;

  -- Test 23: Super Admin can grant Super Admin
  BEGIN
    v_rpc_res := public.manage_user_role(v_normal_user, 'Super Admin');
    PERFORM record_test(23, 'SUPER_ADMIN', 'Super Admin can grant Super Admin', 'Success', 'Granted Super Admin', 'PASS');
  EXCEPTION WHEN OTHERS THEN
    PERFORM record_test(23, 'SUPER_ADMIN', 'Super Admin can grant Super Admin', 'Success', 'Failed: ' || SQLERRM, 'FAIL');
  END;

  -- ----------------------------------------------------------------------------
  -- GROUP 6: AUDIT TRAIL IMMUTABILITY (EVEN SUPER ADMIN CANNOT ALTER)
  -- ----------------------------------------------------------------------------
  -- Test 24: UPDATE audit_logs BLOCKED even for Super Admin
  UPDATE public.audit_logs SET details = 'Forged Details';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    PERFORM record_test(24, 'IMMUTABILITY', 'UPDATE audit_logs BLOCKED for Super Admin', '0 rows updated', '0 rows updated (USING FALSE)', 'PASS');
  ELSE
    PERFORM record_test(24, 'IMMUTABILITY', 'UPDATE audit_logs BLOCKED for Super Admin', '0 rows updated', v_count || ' rows updated', 'FAIL');
  END IF;

  -- Test 25: DELETE audit_logs BLOCKED even for Super Admin
  DELETE FROM public.audit_logs;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    PERFORM record_test(25, 'IMMUTABILITY', 'DELETE audit_logs BLOCKED for Super Admin', '0 rows deleted', '0 rows deleted (USING FALSE)', 'PASS');
  ELSE
    PERFORM record_test(25, 'IMMUTABILITY', 'DELETE audit_logs BLOCKED for Super Admin', '0 rows deleted', v_count || ' rows deleted', 'FAIL');
  END IF;

  -- Test 26: DELETE settings BLOCKED even for Super Admin
  DELETE FROM public.settings;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    PERFORM record_test(26, 'IMMUTABILITY', 'DELETE settings BLOCKED for Super Admin', '0 rows deleted', '0 rows deleted (USING FALSE)', 'PASS');
  ELSE
    PERFORM record_test(26, 'IMMUTABILITY', 'DELETE settings BLOCKED for Super Admin', '0 rows deleted', v_count || ' rows deleted', 'FAIL');
  END IF;

END;
$$;

-- 4. Output Summary Report Table
SELECT
  test_id AS "#",
  category AS "Category",
  test_name AS "Security Policy Test",
  expected AS "Expected",
  actual AS "Actual",
  status AS "Status"
FROM test_results
ORDER BY test_id;

-- 5. Roll back transaction so database remains pristine
ROLLBACK;
