-- ==============================================================================
-- FleetMind AI — Initial Seed Data
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
  '00000000-0000-0000-0000-000000000001', 'FleetMind Commercial Logistics', 'INR', '₹', 'Asia/Kolkata', 'DD/MM/YYYY',
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
('Monthly EMI Payment Due', 'EMI payment of ₹2,47,850 for FM-101 (HDFC Commercial) is scheduled on 2026-11-15.', 'emi', 'critical', FALSE, '/emi'),
('FASTag Low Balance Warning', 'Toll FASTag wallet balance dropped below ₹5,000 threshold. Recharge to avoid express corridor delays.', 'system', 'info', TRUE, '/finance');
