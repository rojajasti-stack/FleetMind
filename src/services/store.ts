import {
  Bus, Driver, Mechanic, ServiceRecord, InventoryItem, InventoryMovement,
  Route, Trip, FuelRecord, Expense, EmiLoan, EmiPayment, GpsVehicle,
  NotificationItem, AuditLog, UserProfile, SystemSettings
} from '../types';
import { calculateEmi } from '../utils/formatters';
import { supabase, isSupabaseConfigured } from './supabase';

export function formatNameFromEmail(email: string): string {
  if (!email) return 'Fleet Manager';
  const lower = email.toLowerCase().trim();
  if (lower.startsWith('rojajasti')) return 'Roja Jasti';
  const local = email.split('@')[0];
  const cleaned = local.replace(/[._\-+0-9]/g, ' ').trim();
  if (!cleaned) return 'Fleet Operator';
  return cleaned
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function getInitialAuthUser(): { id: string; email?: string; full_name?: string } | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const u = parsed?.user || parsed?.currentSession?.user;
          if (u?.id) {
            return {
              id: u.id,
              email: u.email,
              full_name: u.user_metadata?.full_name || u.user_metadata?.name
            };
          }
        }
      }
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

const initialAuthOnLoad = getInitialAuthUser();
let currentStoragePrefix = initialAuthOnLoad
  ? `fleetmind_user_${initialAuthOnLoad.id}_`
  : 'fleetmind_demo_';

// Initial pre-seeded mock data
const INITIAL_BUSES: Bus[] = [
  {
    id: 'bus-1',
    bus_number: 'FM-101',
    registration_number: 'MH-12-RN-8821',
    model: 'Volvo 9600 B11R Multi-Axle Sleeper',
    manufacturer: 'Volvo Buses',
    year: 2023,
    capacity: 48,
    status: 'active',
    fuel_type: 'Diesel',
    odometer: 84250,
    assigned_driver: 'Rajesh Kumar',
    route: 'Mumbai - Pune Express',
    insurance_expiry: '2026-11-20',
    registration_expiry: '2028-05-15',
    last_service_date: '2026-09-10',
    next_service_date: '2026-12-10',
    notes: 'Premium air suspension, fleet flagship vehicle.'
  },
  {
    id: 'bus-2',
    bus_number: 'FM-102',
    registration_number: 'MH-14-BT-3309',
    model: 'Scania Metrolink HD Coach',
    manufacturer: 'Scania',
    year: 2022,
    capacity: 53,
    status: 'active',
    fuel_type: 'Diesel',
    odometer: 112400,
    assigned_driver: 'Amit Sharma',
    route: 'Delhi - Jaipur Highway',
    insurance_expiry: '2026-12-05',
    registration_expiry: '2027-08-22',
    last_service_date: '2026-08-28',
    next_service_date: '2026-11-28',
    notes: 'Equipped with collision mitigation radar.'
  },
  {
    id: 'bus-3',
    bus_number: 'FM-103',
    registration_number: 'KA-01-MJ-4392',
    model: 'Tata Starbus Ultra EV 9m',
    manufacturer: 'Tata Motors',
    year: 2024,
    capacity: 34,
    status: 'maintenance',
    fuel_type: 'Electric',
    odometer: 32180,
    assigned_driver: 'Suresh Patel',
    route: 'Bengaluru - Chennai Corridor',
    insurance_expiry: '2027-01-14',
    registration_expiry: '2029-02-10',
    last_service_date: '2026-07-15',
    next_service_date: '2026-10-01', // Overdue maintenance alert!
    notes: 'Battery thermal management inspection scheduled.'
  },
  {
    id: 'bus-4',
    bus_number: 'FM-104',
    registration_number: 'DL-01-AB-9012',
    model: 'BharatBenz 1624 Intercity Coach',
    manufacturer: 'Daimler India',
    year: 2023,
    capacity: 44,
    status: 'active',
    fuel_type: 'Diesel',
    odometer: 73900,
    assigned_driver: 'Vikram Singh',
    route: 'Delhi - Jaipur Highway',
    insurance_expiry: '2026-10-25', // Expiring in < 2 weeks!
    registration_expiry: '2028-11-04',
    last_service_date: '2026-09-02',
    next_service_date: '2026-12-02',
    notes: 'Telematics GPS Unit #902 installed.'
  },
  {
    id: 'bus-5',
    bus_number: 'FM-105',
    registration_number: 'AP-09-CZ-5511',
    model: 'Ashok Leyland Lynx Smart Coach',
    manufacturer: 'Ashok Leyland',
    year: 2021,
    capacity: 36,
    status: 'active',
    fuel_type: 'CNG',
    odometer: 148200,
    assigned_driver: 'Mohammad Faizan',
    route: 'Hyderabad - Vijayawada',
    insurance_expiry: '2027-04-18',
    registration_expiry: '2026-12-30',
    last_service_date: '2026-09-18',
    next_service_date: '2026-12-18',
    notes: 'CNG cylinder hydro-tested in Aug 2026.'
  },
  {
    id: 'bus-6',
    bus_number: 'FM-106',
    registration_number: 'GJ-01-EQ-7744',
    model: 'Eicher Skyline Pro 3011',
    manufacturer: 'VE Commercial Vehicles',
    year: 2022,
    capacity: 40,
    status: 'inactive',
    fuel_type: 'Diesel',
    odometer: 98400,
    assigned_driver: 'Ramesh Joshi',
    route: 'Ahmedabad - Surat Shuttle',
    insurance_expiry: '2027-03-12',
    registration_expiry: '2027-09-19',
    last_service_date: '2026-08-11',
    next_service_date: '2026-11-11',
    notes: 'Undergoing gearbox sync overhaul in workshop.'
  },
  {
    id: 'bus-7',
    bus_number: 'FM-107',
    registration_number: 'MH-04-AX-1123',
    model: 'Force Urbania Executive 17-Seater',
    manufacturer: 'Force Motors',
    year: 2023,
    capacity: 17,
    status: 'active',
    fuel_type: 'Diesel',
    odometer: 45200,
    assigned_driver: 'Harpreet Singh',
    route: 'Mumbai - Pune Express',
    insurance_expiry: '2027-06-30',
    registration_expiry: '2028-06-30',
    last_service_date: '2026-09-22',
    next_service_date: '2026-12-22',
    notes: 'Corporate shuttle service vehicle.'
  },
  {
    id: 'bus-8',
    bus_number: 'FM-108',
    registration_number: 'KA-05-NN-6677',
    model: 'Tata Marcopolo Starbus Prime',
    manufacturer: 'Tata Motors',
    year: 2022,
    capacity: 42,
    status: 'active',
    fuel_type: 'Diesel',
    odometer: 104600,
    assigned_driver: 'Anand Rao',
    route: 'Bengaluru - Chennai Corridor',
    insurance_expiry: '2026-11-14',
    registration_expiry: '2027-05-18',
    last_service_date: '2026-08-15',
    next_service_date: '2026-11-15',
    notes: 'Regular intercity express run.'
  }
];

const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-1',
    name: 'Rajesh Kumar',
    phone: '+91 98201 44512',
    email: 'rajesh.kumar@fleetmind.ai',
    license_number: 'MH12 20140029811',
    license_expiry: '2028-04-14',
    joining_date: '2019-03-10',
    assigned_bus: 'FM-101',
    status: 'active',
    today_availability: 'on_trip',
    experience_years: 12,
    total_trips: 1420,
    distance_km: 298400,
    safety_score: 98,
    emergency_contact: '+91 98201 99881 (Sunita Kumar - Spouse)'
  },
  {
    id: 'drv-2',
    name: 'Amit Sharma',
    phone: '+91 98112 33445',
    email: 'amit.sharma@fleetmind.ai',
    license_number: 'DL04 20160087123',
    license_expiry: '2027-09-18',
    joining_date: '2020-07-15',
    assigned_bus: 'FM-102',
    status: 'active',
    today_availability: 'available',
    experience_years: 9,
    total_trips: 980,
    distance_km: 184500,
    safety_score: 94,
    emergency_contact: '+91 98112 88771 (Pooja Sharma)'
  },
  {
    id: 'drv-3',
    name: 'Suresh Patel',
    phone: '+91 97245 66778',
    email: 'suresh.patel@fleetmind.ai',
    license_number: 'GJ01 20110034112',
    license_expiry: '2026-10-26', // Expiring in 14 days!
    joining_date: '2018-01-20',
    assigned_bus: 'FM-103',
    status: 'active',
    today_availability: 'off_duty',
    experience_years: 14,
    total_trips: 1650,
    distance_km: 340200,
    safety_score: 91,
    emergency_contact: '+91 97245 11223 (Bhavna Patel)'
  },
  {
    id: 'drv-4',
    name: 'Vikram Singh',
    phone: '+91 98722 55441',
    email: 'vikram.singh@fleetmind.ai',
    license_number: 'PB10 20170054321',
    license_expiry: '2029-01-10',
    joining_date: '2021-04-05',
    assigned_bus: 'FM-104',
    status: 'active',
    today_availability: 'on_trip',
    experience_years: 8,
    total_trips: 840,
    distance_km: 162000,
    safety_score: 96,
    emergency_contact: '+91 98722 99002 (Gurpreet Singh)'
  },
  {
    id: 'drv-5',
    name: 'Mohammad Faizan',
    phone: '+91 94401 22334',
    email: 'm.faizan@fleetmind.ai',
    license_number: 'AP09 20150091823',
    license_expiry: '2028-11-20',
    joining_date: '2020-02-18',
    assigned_bus: 'FM-105',
    status: 'active',
    today_availability: 'available',
    experience_years: 11,
    total_trips: 1120,
    distance_km: 215400,
    safety_score: 95,
    emergency_contact: '+91 94401 55667 (Zoya Begum)'
  },
  {
    id: 'drv-6',
    name: 'Harpreet Singh',
    phone: '+91 98144 88776',
    email: 'harpreet.s@fleetmind.ai',
    license_number: 'HR26 20180012904',
    license_expiry: '2028-06-12',
    joining_date: '2022-08-10',
    assigned_bus: 'FM-107',
    status: 'active',
    today_availability: 'available',
    experience_years: 7,
    total_trips: 620,
    distance_km: 98400,
    safety_score: 97,
    emergency_contact: '+91 98144 11229 (Manjit Kaur)'
  },
  {
    id: 'drv-7',
    name: 'Ramesh Joshi',
    phone: '+91 98980 11223',
    email: 'ramesh.joshi@fleetmind.ai',
    license_number: 'GJ05 20130045612',
    license_expiry: '2027-02-14',
    joining_date: '2019-11-01',
    assigned_bus: 'FM-106',
    status: 'on_leave',
    today_availability: 'off_duty',
    experience_years: 13,
    total_trips: 1380,
    distance_km: 280000,
    safety_score: 89,
    emergency_contact: '+91 98980 99887 (Geeta Joshi)'
  },
  {
    id: 'drv-8',
    name: 'Anand Rao',
    phone: '+91 98450 33441',
    email: 'anand.rao@fleetmind.ai',
    license_number: 'KA03 20190077881',
    license_expiry: '2029-07-25',
    joining_date: '2023-01-15',
    assigned_bus: 'FM-108',
    status: 'active',
    today_availability: 'on_trip',
    experience_years: 6,
    total_trips: 490,
    distance_km: 84300,
    safety_score: 93,
    emergency_contact: '+91 98450 66779 (Shalini Rao)'
  }
];

const INITIAL_MECHANICS: Mechanic[] = [
  { id: 'mech-1', name: 'Sunil Verma', phone: '+91 98230 11928', specialty: 'Heavy Diesel & Transmission', status: 'busy', active_tasks: 2, hourly_rate: 650 },
  { id: 'mech-2', name: 'Ajay Patil', phone: '+91 98220 44551', specialty: 'EV Battery & Telematics', status: 'busy', active_tasks: 1, hourly_rate: 800 },
  { id: 'mech-3', name: 'Imran Khan', phone: '+91 98210 77882', specialty: 'Pneumatics & Air Suspension', status: 'available', active_tasks: 0, hourly_rate: 600 },
  { id: 'mech-4', name: 'Deepak Nair', phone: '+91 98401 55662', specialty: 'HVAC & Electrical Wiring', status: 'available', active_tasks: 0, hourly_rate: 550 },
];

const INITIAL_SERVICE_RECORDS: ServiceRecord[] = [
  {
    id: 'srv-1',
    bus_number: 'FM-103',
    service_type: 'battery',
    service_date: '2026-10-10',
    cost: 18500,
    parts_used: 'EV Battery Thermal Sensor Kit, Coolant refill',
    mechanic_notes: 'Cell module 4 temperature warning flagged in telematics. Recalibrated BMS and replaced temperature sensor.',
    next_service_prediction: '2026-11-10',
    mechanic_name: 'Ajay Patil',
    priority: 'critical',
    status: 'in_progress',
    created_at: '2026-10-10T09:00:00Z'
  },
  {
    id: 'srv-2',
    bus_number: 'FM-106',
    service_type: 'engine_tuneup',
    service_date: '2026-10-08',
    cost: 34200,
    parts_used: 'Gearbox Synchronizer Ring, Transmission Oil 80W-90 (12L)',
    mechanic_notes: 'Difficulty engaging 3rd gear reported by driver. Complete gearbox sync replacement underway.',
    next_service_prediction: '2027-01-15',
    mechanic_name: 'Sunil Verma',
    priority: 'high',
    status: 'in_progress',
    created_at: '2026-10-08T11:30:00Z'
  },
  {
    id: 'srv-3',
    bus_number: 'FM-101',
    service_type: 'oil_change',
    service_date: '2026-09-10',
    cost: 14500,
    parts_used: 'Mobil Delvac 15W-40 Synthetic Oil (28L), Spin-on Oil Filter',
    mechanic_notes: 'Scheduled 80k km oil and filter change. Fluid condition excellent, zero particulate buildup.',
    next_service_prediction: '2026-12-10',
    mechanic_name: 'Sunil Verma',
    priority: 'medium',
    status: 'completed',
    created_at: '2026-09-10T14:00:00Z'
  },
  {
    id: 'srv-4',
    bus_number: 'FM-104',
    service_type: 'brake_repair',
    service_date: '2026-09-02',
    cost: 22800,
    parts_used: 'Knorr-Bremse Front Disc Brake Pads Set, Brake Caliper Pin Kit',
    mechanic_notes: 'Replaced front axle brake pads with genuine OEM parts. Brake response tested on dynamometer.',
    next_service_prediction: '2026-12-02',
    mechanic_name: 'Imran Khan',
    priority: 'high',
    status: 'completed',
    created_at: '2026-09-02T10:15:00Z'
  },
  {
    id: 'srv-5',
    bus_number: 'FM-102',
    service_type: 'tire_replacement',
    service_date: '2026-08-28',
    cost: 58000,
    parts_used: '2x Michelin X Coach 295/80R22.5 Radial Tires',
    mechanic_notes: 'Front steer axle tires rotated and replaced due to reaching 3mm tread depth wear limit.',
    next_service_prediction: '2026-11-28',
    mechanic_name: 'Imran Khan',
    priority: 'medium',
    status: 'completed',
    created_at: '2026-08-28T16:00:00Z'
  },
  {
    id: 'srv-6',
    bus_number: 'FM-105',
    service_type: 'inspection',
    service_date: '2026-09-18',
    cost: 7500,
    parts_used: 'CNG High-Pressure Filter, O-rings',
    mechanic_notes: 'Statutory quarterly CNG safety leak inspection passed. Certificate renewed.',
    next_service_prediction: '2026-12-18',
    mechanic_name: 'Deepak Nair',
    priority: 'low',
    status: 'completed',
    created_at: '2026-09-18T13:45:00Z'
  }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    item_name: 'Heavy Duty Disc Brake Pads (Front)',
    sku: 'BP-HD-2950',
    category: 'brakes',
    current_stock: 4, // Low stock warning! (min is 8)
    minimum_stock: 8,
    purchase_price: 6500,
    vendor: 'Knorr-Bremse India',
    unit: 'Sets',
    storage_location: 'Bay A-03',
    last_updated: '2026-10-09'
  },
  {
    id: 'inv-2',
    item_name: 'Synthetic Engine Oil 15W-40 (20L Drum)',
    sku: 'OIL-SYN-15W40',
    category: 'fluids',
    current_stock: 14,
    minimum_stock: 6,
    purchase_price: 9200,
    vendor: 'Mobil Lubricants Ltd',
    unit: 'Drums',
    storage_location: 'Fluid Storage 02',
    last_updated: '2026-10-05'
  },
  {
    id: 'inv-3',
    item_name: 'High-Flow Engine Air Filter',
    sku: 'AF-HF-8812',
    category: 'engine',
    current_stock: 5, // Low stock alert! (min is 6)
    minimum_stock: 6,
    purchase_price: 2400,
    vendor: 'Mann+Hummel Filters',
    unit: 'Pcs',
    storage_location: 'Bay B-01',
    last_updated: '2026-10-01'
  },
  {
    id: 'inv-4',
    item_name: 'Tubeless Radial Tires 295/80R22.5',
    sku: 'TR-RAD-29580',
    category: 'tires',
    current_stock: 8,
    minimum_stock: 4,
    purchase_price: 28500,
    vendor: 'Michelin India Tyres',
    unit: 'Pcs',
    storage_location: 'Tire Rack T-01',
    last_updated: '2026-09-28'
  },
  {
    id: 'inv-5',
    item_name: 'Heavy Duty Bus Alternator 28V 150A',
    sku: 'ALT-HD-28V150',
    category: 'electrical',
    current_stock: 2,
    minimum_stock: 2,
    purchase_price: 21000,
    vendor: 'Lucas TVS',
    unit: 'Pcs',
    storage_location: 'Bay C-04',
    last_updated: '2026-09-15'
  },
  {
    id: 'inv-6',
    item_name: 'Coolant Glycol 50/50 Premix (20L)',
    sku: 'FL-COOL-5050',
    category: 'fluids',
    current_stock: 12,
    minimum_stock: 5,
    purchase_price: 3600,
    vendor: 'Castrol Radicool',
    unit: 'Cans',
    storage_location: 'Fluid Storage 01',
    last_updated: '2026-10-02'
  },
  {
    id: 'inv-7',
    item_name: 'Pneumatic Air Bellow / Suspension Spring',
    sku: 'SUSP-AB-401',
    category: 'suspension',
    current_stock: 6,
    minimum_stock: 4,
    purchase_price: 8800,
    vendor: 'Firestone Industrial',
    unit: 'Pcs',
    storage_location: 'Bay A-07',
    last_updated: '2026-09-20'
  },
  {
    id: 'inv-8',
    item_name: 'Heavy Duty Coach Wiper Blades 40-inch',
    sku: 'WIP-40-PR',
    category: 'other',
    current_stock: 10,
    minimum_stock: 4,
    purchase_price: 1800,
    vendor: 'Bosch Automotive',
    unit: 'Pairs',
    storage_location: 'Bay D-02',
    last_updated: '2026-10-06'
  }
];

const INITIAL_INVENTORY_MOVEMENTS: InventoryMovement[] = [
  { id: 'mov-1', item_id: 'inv-1', item_name: 'Heavy Duty Disc Brake Pads (Front)', type: 'issued', quantity: 2, bus_number: 'FM-104', date: '2026-09-02', notes: 'Scheduled brake overhaul' },
  { id: 'mov-2', item_id: 'inv-2', item_name: 'Synthetic Engine Oil 15W-40 (20L Drum)', type: 'issued', quantity: 1, bus_number: 'FM-101', date: '2026-09-10', notes: '80k km periodic maintenance' },
  { id: 'mov-3', item_id: 'inv-4', item_name: 'Tubeless Radial Tires 295/80R22.5', type: 'received', quantity: 6, date: '2026-09-28', notes: 'Restock order PO-8819' },
  { id: 'mov-4', item_id: 'inv-6', item_name: 'Coolant Glycol 50/50 Premix (20L)', type: 'received', quantity: 8, date: '2026-10-02', notes: 'Supplier delivery invoice #9921' },
];

const INITIAL_ROUTES: Route[] = [
  {
    id: 'rt-1',
    route_name: 'Mumbai - Pune Express Corridor',
    route_code: 'EXP-101',
    start_point: 'Mumbai Central Terminus',
    end_point: 'Pune Swargate Bus Station',
    distance_km: 152,
    estimated_time: '3h 15m',
    fare: 450,
    assigned_buses: ['FM-101', 'FM-107'],
    assigned_drivers: ['Rajesh Kumar', 'Harpreet Singh'],
    stops: ['Dadar', 'Vashi Toll', 'Lonavala Exit', 'Wakdewadi', 'Swargate'],
    status: 'active'
  },
  {
    id: 'rt-2',
    route_name: 'Delhi - Jaipur Highway Link',
    route_code: 'EXP-202',
    start_point: 'Delhi Kashmere Gate ISBT',
    end_point: 'Jaipur Sindhi Camp',
    distance_km: 268,
    estimated_time: '4h 45m',
    fare: 680,
    assigned_buses: ['FM-102', 'FM-104'],
    assigned_drivers: ['Amit Sharma', 'Vikram Singh'],
    stops: ['Dhaula Kuan', 'Gurugram IFFCO Chowk', 'Kotputli Midway', 'Shahpura', 'Sindhi Camp'],
    status: 'active'
  },
  {
    id: 'rt-3',
    route_name: 'Bengaluru - Chennai Expressway',
    route_code: 'EXP-303',
    start_point: 'Bengaluru Majestic Bus Stand',
    end_point: 'Chennai CMBT Koyambedu',
    distance_km: 345,
    estimated_time: '6h 30m',
    fare: 850,
    assigned_buses: ['FM-103', 'FM-108'],
    assigned_drivers: ['Suresh Patel', 'Anand Rao'],
    stops: ['Electronic City', 'Hosur', 'Krishnagiri Toll', 'Vellore', 'Sriperumbudur', 'CMBT'],
    status: 'active'
  },
  {
    id: 'rt-4',
    route_name: 'Hyderabad - Vijayawada Super Express',
    route_code: 'EXP-404',
    start_point: 'Hyderabad MGBS',
    end_point: 'Vijayawada PNBS',
    distance_km: 275,
    estimated_time: '4h 50m',
    fare: 620,
    assigned_buses: ['FM-105'],
    assigned_drivers: ['Mohammad Faizan'],
    stops: ['LB Nagar', 'Suryapet Midway', 'Kodad', 'Ibrahimpatnam', 'PNBS'],
    status: 'active'
  },
  {
    id: 'rt-5',
    route_name: 'Ahmedabad - Surat Business Shuttle',
    route_code: 'EXP-505',
    start_point: 'Ahmedabad Geeta Mandir',
    end_point: 'Surat Central Bus Station',
    distance_km: 260,
    estimated_time: '4h 20m',
    fare: 540,
    assigned_buses: ['FM-106'],
    assigned_drivers: ['Ramesh Joshi'],
    stops: ['C.T.M. Cross Road', 'Nadiad Express Exit', 'Vadodara Golden Chowkdi', 'Bharuch Toll', 'Surat'],
    status: 'active'
  }
];

const INITIAL_TRIPS: Trip[] = [
  {
    id: 'trp-1',
    trip_code: 'TRP-901',
    route_id: 'rt-1',
    route_name: 'Mumbai - Pune Express Corridor',
    bus_id: 'bus-1',
    bus_number: 'FM-101',
    driver_id: 'drv-1',
    driver_name: 'Rajesh Kumar',
    date: '2026-10-12',
    start_time: '08:00',
    end_time: '11:15',
    start_point: 'Mumbai Central Terminus',
    end_point: 'Pune Swargate Bus Station',
    fare: 450,
    passenger_count: 46,
    status: 'in_progress',
    created_at: '2026-10-11T18:00:00Z'
  },
  {
    id: 'trp-2',
    trip_code: 'TRP-902',
    route_id: 'rt-2',
    route_name: 'Delhi - Jaipur Highway Link',
    bus_id: 'bus-4',
    bus_number: 'FM-104',
    driver_id: 'drv-4',
    driver_name: 'Vikram Singh',
    date: '2026-10-12',
    start_time: '09:30',
    end_time: '14:15',
    start_point: 'Delhi Kashmere Gate ISBT',
    end_point: 'Jaipur Sindhi Camp',
    fare: 680,
    passenger_count: 42,
    status: 'in_progress',
    created_at: '2026-10-11T19:00:00Z'
  },
  {
    id: 'trp-3',
    trip_code: 'TRP-903',
    route_id: 'rt-3',
    route_name: 'Bengaluru - Chennai Expressway',
    bus_id: 'bus-8',
    bus_number: 'FM-108',
    driver_id: 'drv-8',
    driver_name: 'Anand Rao',
    date: '2026-10-12',
    start_time: '07:00',
    end_time: '13:30',
    start_point: 'Bengaluru Majestic Bus Stand',
    end_point: 'Chennai CMBT Koyambedu',
    fare: 850,
    passenger_count: 40,
    status: 'in_progress',
    created_at: '2026-10-11T20:00:00Z'
  },
  {
    id: 'trp-4',
    trip_code: 'TRP-904',
    route_id: 'rt-1',
    route_name: 'Mumbai - Pune Express Corridor',
    bus_id: 'bus-7',
    bus_number: 'FM-107',
    driver_id: 'drv-6',
    driver_name: 'Harpreet Singh',
    date: '2026-10-12',
    start_time: '14:00',
    end_time: '17:15',
    start_point: 'Pune Swargate Bus Station',
    end_point: 'Mumbai Central Terminus',
    fare: 450,
    passenger_count: 16,
    status: 'scheduled',
    created_at: '2026-10-12T07:00:00Z'
  },
  {
    id: 'trp-5',
    trip_code: 'TRP-905',
    route_id: 'rt-4',
    route_name: 'Hyderabad - Vijayawada Super Express',
    bus_id: 'bus-5',
    bus_number: 'FM-105',
    driver_id: 'drv-5',
    driver_name: 'Mohammad Faizan',
    date: '2026-10-12',
    start_time: '15:30',
    end_time: '20:20',
    start_point: 'Hyderabad MGBS',
    end_point: 'Vijayawada PNBS',
    fare: 620,
    passenger_count: 35,
    status: 'scheduled',
    created_at: '2026-10-12T08:00:00Z'
  },
  {
    id: 'trp-6',
    trip_code: 'TRP-898',
    route_id: 'rt-2',
    route_name: 'Delhi - Jaipur Highway Link',
    bus_id: 'bus-2',
    bus_number: 'FM-102',
    driver_id: 'drv-2',
    driver_name: 'Amit Sharma',
    date: '2026-10-11',
    start_time: '06:00',
    end_time: '10:45',
    start_point: 'Delhi Kashmere Gate ISBT',
    end_point: 'Jaipur Sindhi Camp',
    fare: 680,
    passenger_count: 51,
    status: 'completed',
    created_at: '2026-10-10T15:00:00Z'
  },
  {
    id: 'trp-7',
    trip_code: 'TRP-899',
    route_id: 'rt-1',
    route_name: 'Mumbai - Pune Express Corridor',
    bus_id: 'bus-1',
    bus_number: 'FM-101',
    driver_id: 'drv-1',
    driver_name: 'Rajesh Kumar',
    date: '2026-10-11',
    start_time: '16:00',
    end_time: '19:15',
    start_point: 'Pune Swargate Bus Station',
    end_point: 'Mumbai Central Terminus',
    fare: 450,
    passenger_count: 48,
    status: 'completed',
    created_at: '2026-10-10T16:00:00Z'
  }
];

const INITIAL_FUEL_RECORDS: FuelRecord[] = [
  {
    id: 'fuel-1',
    bus_number: 'FM-101',
    date: '2026-10-10',
    liters: 120,
    amount: 10800,
    price_per_liter: 90,
    odometer_reading: 84250,
    fuel_station: 'Indian Oil Highway Plaza, Khalapur',
    driver_name: 'Rajesh Kumar',
    receipt_number: 'IOC-88219',
    calculated_efficiency: 4.8,
    notes: 'Tank filled to auto-cutoff. Smooth highway drive.'
  },
  {
    id: 'fuel-2',
    bus_number: 'FM-102',
    date: '2026-10-09',
    liters: 145,
    amount: 13050,
    price_per_liter: 90,
    odometer_reading: 112400,
    fuel_station: 'Bharat Petroleum COCO, Behror',
    driver_name: 'Amit Sharma',
    receipt_number: 'BPCL-4412',
    calculated_efficiency: 4.6,
    notes: 'Intercity night route.'
  },
  {
    id: 'fuel-3',
    bus_number: 'FM-104',
    date: '2026-10-08',
    liters: 135,
    amount: 12150,
    price_per_liter: 90,
    odometer_reading: 73900,
    fuel_station: 'HP Auto Care, Manesar',
    driver_name: 'Vikram Singh',
    receipt_number: 'HPCL-7781',
    calculated_efficiency: 4.5,
    notes: 'Routine refill before morning departure.'
  },
  {
    id: 'fuel-4',
    bus_number: 'FM-105',
    date: '2026-10-07',
    liters: 95, // kg for CNG
    amount: 7600,
    price_per_liter: 80,
    odometer_reading: 148200,
    fuel_station: 'Bhagyanagar Gas Station, Suryapet',
    driver_name: 'Mohammad Faizan',
    receipt_number: 'BGL-3321',
    calculated_efficiency: 5.2,
    notes: 'CNG Cascade fast fill at 200 bar.'
  },
  {
    id: 'fuel-5',
    bus_number: 'FM-107',
    date: '2026-10-06',
    liters: 65,
    amount: 5850,
    price_per_liter: 90,
    odometer_reading: 45200,
    fuel_station: 'Shell Auto Fuel, Talegaon',
    driver_name: 'Harpreet Singh',
    receipt_number: 'SHL-9018',
    calculated_efficiency: 8.5, // Force Urbania smaller capacity
    notes: 'Corporate shuttle weekly fuel log.'
  },
  {
    id: 'fuel-6',
    bus_number: 'FM-108',
    date: '2026-10-05',
    liters: 150,
    amount: 13500,
    price_per_liter: 90,
    odometer_reading: 104600,
    fuel_station: 'Nayara Energy Highway Hub, Hosur',
    driver_name: 'Anand Rao',
    receipt_number: 'NYR-5541',
    calculated_efficiency: 4.3,
    notes: 'Slightly higher consumption due to monsoon highway diversions.'
  }
];

const INITIAL_EXPENSES: Expense[] = [
  { id: 'exp-1', category: 'revenue', type: 'revenue', amount: 345000, date: '2026-10-10', description: 'Passenger Ticket Bookings (Online & Counter)', payment_method: 'Bank Transfer', reference_number: 'TXN-REV-1010' },
  { id: 'exp-2', category: 'revenue', type: 'revenue', amount: 185000, date: '2026-10-08', description: 'Tech Corp Monthly Staff Shuttle Charter Contract', payment_method: 'Bank Transfer', reference_number: 'TXN-REV-1008' },
  { id: 'exp-3', category: 'revenue', type: 'revenue', amount: 412000, date: '2026-10-05', description: 'Festival Weekend Advance Ticket Sales', payment_method: 'UPI', reference_number: 'TXN-REV-1005' },
  { id: 'exp-4', category: 'fuel', type: 'expense', amount: 62950, date: '2026-10-10', description: 'Weekly Fleet Fuel Settlement (BPCL & IOCL)', bus_number: 'Multiple Buses', payment_method: 'Bank Transfer', reference_number: 'TXN-EXP-01' },
  { id: 'exp-5', category: 'maintenance', type: 'expense', amount: 52700, date: '2026-10-09', description: 'Workshop Repairs & Spare Parts Installation', bus_number: 'FM-103', payment_method: 'Bank Transfer', reference_number: 'TXN-EXP-02' },
  { id: 'exp-6', category: 'driver_salary', type: 'expense', amount: 175000, date: '2026-10-01', description: 'Monthly Fleet Drivers & Support Staff Payroll', payment_method: 'Bank Transfer', reference_number: 'TXN-EXP-03' },
  { id: 'exp-7', category: 'emi', type: 'expense', amount: 168400, date: '2026-10-05', description: 'HDFC & ICICI Vehicle Loan Monthly Instalments', bus_number: 'FM-101 / FM-102', payment_method: 'Bank Transfer', reference_number: 'TXN-EXP-04' },
  { id: 'exp-8', category: 'tolls', type: 'expense', amount: 24800, date: '2026-10-07', description: 'FASTag Fleet RFID Fast Recharge (NHAI)', bus_number: 'Multiple Buses', payment_method: 'UPI', reference_number: 'TXN-EXP-05' },
  { id: 'exp-9', category: 'insurance', type: 'expense', amount: 45000, date: '2026-09-28', description: 'Annual Comprehensive Vehicle Insurance Installment', bus_number: 'FM-107', payment_method: 'Bank Transfer', reference_number: 'TXN-EXP-06' }
];

const INITIAL_LOANS: EmiLoan[] = [
  {
    id: 'loan-1',
    loan_id: 'LN-HDFC-9901',
    lender: 'HDFC Bank Commercial Vehicle Division',
    bus_number: 'FM-101',
    principal_amount: 5500000,
    interest_rate: 8.75,
    loan_start_date: '2023-04-01',
    term_months: 60,
    monthly_emi: 113642,
    total_paid: 4772964,
    outstanding_balance: 2045500,
    next_due_date: '2026-10-15', // Due in 3 days!
    status: 'active',
    installments_paid: 42,
    installments_total: 60
  },
  {
    id: 'loan-2',
    loan_id: 'LN-ICICI-8812',
    lender: 'ICICI Bank Transport Finance',
    bus_number: 'FM-102',
    principal_amount: 4800000,
    interest_rate: 9.0,
    loan_start_date: '2022-09-01',
    term_months: 60,
    monthly_emi: 99650,
    total_paid: 4882850,
    outstanding_balance: 1095000,
    next_due_date: '2026-10-18',
    status: 'active',
    installments_paid: 49,
    installments_total: 60
  },
  {
    id: 'loan-3',
    loan_id: 'LN-TATA-3321',
    lender: 'Tata Motors Finance Limited',
    bus_number: 'FM-103',
    principal_amount: 6500000,
    interest_rate: 7.9,
    loan_start_date: '2024-03-01',
    term_months: 72,
    monthly_emi: 113700,
    total_paid: 3524700,
    outstanding_balance: 4650000,
    next_due_date: '2026-11-01',
    status: 'active',
    installments_paid: 31,
    installments_total: 72
  },
  {
    id: 'loan-4',
    loan_id: 'LN-AXIS-2210',
    lender: 'Axis Bank Infrastructure Finance',
    bus_number: 'FM-104',
    principal_amount: 3200000,
    interest_rate: 8.5,
    loan_start_date: '2023-11-01',
    term_months: 48,
    monthly_emi: 78820,
    total_paid: 2758700,
    outstanding_balance: 1025000,
    next_due_date: '2026-11-05',
    status: 'active',
    installments_paid: 35,
    installments_total: 48
  }
];

const INITIAL_GPS_VEHICLES: GpsVehicle[] = [
  {
    bus_id: 'bus-1',
    bus_number: 'FM-101',
    model: 'Volvo 9600 B11R',
    driver_name: 'Rajesh Kumar',
    lat: 18.7512,
    lng: 73.4076, // Mumbai-Pune Expressway near Khandala
    speed: 78,
    heading: 135,
    status: 'active',
    battery_level: 96,
    fuel_level: 72,
    last_updated: 'Just now',
    current_route: 'Mumbai - Pune Express',
    destination: 'Pune Swargate'
  },
  {
    bus_id: 'bus-2',
    bus_number: 'FM-102',
    model: 'Scania Metrolink HD',
    driver_name: 'Amit Sharma',
    lat: 28.6139,
    lng: 77.2090, // Delhi Kashmere Gate depot
    speed: 0,
    heading: 0,
    status: 'active',
    battery_level: 99,
    fuel_level: 85,
    last_updated: '2 mins ago',
    current_route: 'Delhi - Jaipur Highway',
    destination: 'Depot Standby'
  },
  {
    bus_id: 'bus-3',
    bus_number: 'FM-103',
    model: 'Tata Starbus Ultra EV',
    driver_name: 'Suresh Patel',
    lat: 12.9716,
    lng: 77.5946, // Bengaluru Central Workshop
    speed: 0,
    heading: 0,
    status: 'maintenance',
    battery_level: 42,
    fuel_level: 0,
    last_updated: '5 mins ago',
    current_route: 'Bengaluru Workshop',
    destination: 'Under Service'
  },
  {
    bus_id: 'bus-4',
    bus_number: 'FM-104',
    model: 'BharatBenz 1624',
    driver_name: 'Vikram Singh',
    lat: 27.8129,
    lng: 76.2711, // Highway near Kotputli
    speed: 74,
    heading: 210,
    status: 'active',
    battery_level: 94,
    fuel_level: 68,
    last_updated: 'Just now',
    current_route: 'Delhi - Jaipur Highway',
    destination: 'Jaipur Sindhi Camp'
  },
  {
    bus_id: 'bus-5',
    bus_number: 'FM-105',
    model: 'Ashok Leyland Lynx',
    driver_name: 'Mohammad Faizan',
    lat: 17.3850,
    lng: 78.4867, // Hyderabad MGBS
    speed: 0,
    heading: 90,
    status: 'active',
    battery_level: 95,
    fuel_level: 80,
    last_updated: '4 mins ago',
    current_route: 'Hyderabad - Vijayawada',
    destination: 'Boarding Gate 4'
  },
  {
    bus_id: 'bus-6',
    bus_number: 'FM-106',
    model: 'Eicher Skyline Pro',
    driver_name: 'Ramesh Joshi',
    lat: 23.0225,
    lng: 72.5714, // Ahmedabad Workshop
    speed: 0,
    heading: 0,
    status: 'inactive',
    battery_level: 88,
    fuel_level: 45,
    last_updated: '12 mins ago',
    current_route: 'Ahmedabad Maintenance Yard',
    destination: 'Yard Bay 2'
  },
  {
    bus_id: 'bus-7',
    bus_number: 'FM-107',
    model: 'Force Urbania Executive',
    driver_name: 'Harpreet Singh',
    lat: 18.5204,
    lng: 73.8567, // Pune Wakdewadi
    speed: 0,
    heading: 315,
    status: 'active',
    battery_level: 98,
    fuel_level: 88,
    last_updated: '1 min ago',
    current_route: 'Mumbai - Pune Express',
    destination: 'Depot Standby'
  },
  {
    bus_id: 'bus-8',
    bus_number: 'FM-108',
    model: 'Tata Marcopolo Prime',
    driver_name: 'Anand Rao',
    lat: 12.8399,
    lng: 79.1325, // Vellore Bypass NH48
    speed: 70,
    heading: 85,
    status: 'active',
    battery_level: 93,
    fuel_level: 61,
    last_updated: 'Just now',
    current_route: 'Bengaluru - Chennai Expressway',
    destination: 'Chennai CMBT'
  }
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Overdue Maintenance Required',
    message: 'Bus FM-103 (Tata Starbus Ultra EV) was due for quarterly battery inspection on Oct 1, 2026.',
    type: 'maintenance',
    severity: 'critical',
    read: false,
    date: '2026-10-12T07:30:00Z',
    link: '/maintenance'
  },
  {
    id: 'notif-2',
    title: 'Driving Licence Expiring Soon',
    message: 'Driver Suresh Patel licence (GJ01 20110034112) expires in 14 days (Oct 26, 2026).',
    type: 'license',
    severity: 'warning',
    read: false,
    date: '2026-10-12T06:00:00Z',
    link: '/drivers'
  },
  {
    id: 'notif-3',
    title: 'Low Inventory Stock Alert',
    message: 'Heavy Duty Disc Brake Pads (BP-HD-2950) stock dropped to 4 units (Minimum threshold: 8 units).',
    type: 'inventory',
    severity: 'warning',
    read: false,
    date: '2026-10-11T16:20:00Z',
    link: '/inventory'
  },
  {
    id: 'notif-4',
    title: 'Upcoming Vehicle Loan EMI Due',
    message: 'Loan LN-HDFC-9901 for Bus FM-101 has an EMI payment of ₹1,13,642 due on Oct 15, 2026.',
    type: 'emi',
    severity: 'info',
    read: false,
    date: '2026-10-11T10:00:00Z',
    link: '/emi'
  },
  {
    id: 'notif-5',
    title: 'Insurance Policy Expiry Alert',
    message: 'Bus FM-104 (BharatBenz 1624) commercial insurance policy expires on Oct 25, 2026.',
    type: 'insurance',
    severity: 'warning',
    read: true,
    date: '2026-10-10T09:15:00Z',
    link: '/buses'
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'aud-1', timestamp: '2026-10-12T09:15:22Z', user: 'Tejeshwar (Fleet Manager)', action: 'TRIP_DISPATCHED', entity_type: 'Trip', entity_id: 'TRP-901', details: 'Dispatched Bus FM-101 with Driver Rajesh Kumar on Mumbai - Pune Express.' },
  { id: 'aud-2', timestamp: '2026-10-12T08:42:10Z', user: 'Tejeshwar (Fleet Manager)', action: 'TELEMATICS_SYNC', entity_type: 'GPS', entity_id: 'All-Fleet', details: 'Synced real-time GPS coordinates for 8 active telematics transponders.' },
  { id: 'aud-3', timestamp: '2026-10-11T17:10:04Z', user: 'Ajay Patil (Chief Tech)', action: 'SERVICE_LOGGED', entity_type: 'Maintenance', entity_id: 'srv-1', details: 'Initiated battery cell recalibration for Bus FM-103.' },
  { id: 'aud-4', timestamp: '2026-10-10T14:20:50Z', user: 'Accounts Dept', action: 'TRANSACTION_RECORDED', entity_type: 'Finance', entity_id: 'exp-1', details: 'Recorded ₹3,45,000 passenger revenue for weekend operations.' },
  { id: 'aud-5', timestamp: '2026-10-09T11:05:30Z', user: 'Inventory Store', action: 'STOCK_CHECK', entity_type: 'Inventory', entity_id: 'inv-1', details: 'Audited Disc Brake Pads physical stock; identified low threshold.' }
];

const INITIAL_DEMO_PROFILE: UserProfile = {
  id: 'usr-demo',
  full_name: 'Tejeshwar Reddy',
  email: 'tejeshwar@fleetmind.ai',
  phone: '+91 98490 12345',
  job_title: 'Director of Fleet Operations & Logistics',
  company_name: 'FleetMind Transport Solutions Ltd.',
  role: 'Fleet Manager',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
};

const EMPTY_GUEST_PROFILE: UserProfile = {
  id: '',
  full_name: '',
  email: '',
  phone: '',
  job_title: 'Fleet Operations',
  company_name: 'FleetMind Logistics',
  role: 'Guest'
};

const INITIAL_SETTINGS: SystemSettings = {
  company_name: 'FleetMind Transport Solutions Ltd.',
  currency: 'INR',
  currency_symbol: '₹',
  timezone: 'Asia/Kolkata (IST +5:30)',
  date_format: 'DD/MM/YYYY',
  fuel_efficiency_alert_threshold: 4.0,
  maintenance_reminder_days: 14,
  low_stock_warning_threshold: 5,
  notifications_email: true,
  notifications_browser: true
};

// Generic LocalStorage helper
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(currentStoragePrefix + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function generateEntityId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(currentStoragePrefix + key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${key} to storage:`, err);
  }
}

// In-Memory store initialized with localStorage or fallback
class FleetStore {
  private listeners: Set<() => void> = new Set();

  currentUserId: string | null = initialAuthOnLoad ? initialAuthOnLoad.id : null;
  currentUserEmail: string | null = initialAuthOnLoad ? (initialAuthOnLoad.email || null) : null;
  currentOrgId: string = initialAuthOnLoad ? '' : '00000000-0000-0000-0000-000000000001';
  isDemoMode: boolean = !initialAuthOnLoad;
  organization: { id: string; name: string; slug: string; billing_tier: string } | null = null;
  dbError: string | null = null;
  isLoadingDb: boolean = false;

  buses: Bus[] = [];
  drivers: Driver[] = [];
  mechanics: Mechanic[] = [];
  serviceRecords: ServiceRecord[] = [];
  inventory: InventoryItem[] = [];
  inventoryMovements: InventoryMovement[] = [];
  routes: Route[] = [];
  trips: Trip[] = [];
  fuelRecords: FuelRecord[] = [];
  expenses: Expense[] = [];
  loans: EmiLoan[] = [];
  emiPayments: EmiPayment[] = [];
  gpsVehicles: GpsVehicle[] = [];
  notifications: NotificationItem[] = [];
  auditLogs: AuditLog[] = [];
  profile: UserProfile = initialAuthOnLoad ? {
    id: initialAuthOnLoad.id,
    full_name: initialAuthOnLoad.full_name || formatNameFromEmail(initialAuthOnLoad.email || ''),
    email: initialAuthOnLoad.email || '',
    phone: '',
    job_title: 'Director of Fleet Operations',
    company_name: 'FleetMind Logistics',
    role: 'Normal User'
  } : EMPTY_GUEST_PROFILE;
  settings: SystemSettings = INITIAL_SETTINGS;
  lastUpdated: string = new Date().toISOString();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.lastUpdated = new Date().toISOString();
    saveToStorage('last_updated', this.lastUpdated);
    this.listeners.forEach(l => l());
  }

  refresh(): void {
    this.notify();
  }

  setUser(userId: string | null, userEmail?: string | null, customProfile?: UserProfile | null) {
    if (userId) {
      this.currentUserId = userId;
      this.currentUserEmail = userEmail || null;
      this.isDemoMode = false;
      currentStoragePrefix = `fleetmind_user_${userId}_`;
      this.currentOrgId = customProfile?.organization_id || '';

      const resolvedName = customProfile?.full_name || (userEmail ? formatNameFromEmail(userEmail) : 'Fleet Manager');
      const resolvedRole = customProfile?.role || 'Normal User';

      this.profile = loadFromStorage('profile', {
        id: userId,
        full_name: resolvedName,
        email: userEmail || '',
        phone: customProfile?.phone || '',
        job_title: customProfile?.job_title || 'Director of Fleet Operations',
        company_name: customProfile?.company_name || 'FleetMind Logistics',
        role: resolvedRole,
        organization_id: this.currentOrgId
      });

      // Immediately reset all in-memory operational state to empty arrays for authenticated accounts
      this.buses = [];
      this.drivers = [];
      this.mechanics = [];
      this.serviceRecords = [];
      this.inventory = [];
      this.inventoryMovements = [];
      this.routes = [];
      this.trips = [];
      this.fuelRecords = [];
      this.expenses = [];
      this.loans = [];
      this.emiPayments = [];
      this.gpsVehicles = [];
      this.notifications = [];
      this.auditLogs = [];
      this.settings = loadFromStorage('settings', {
        ...INITIAL_SETTINGS,
        company_name: this.profile.company_name || 'FleetMind Logistics'
      });

      saveToStorage('profile', this.profile);
      this.isLoadingDb = true;
      this.syncFromSupabase();
    } else {
      this.currentUserId = null;
      this.currentUserEmail = null;
      this.isDemoMode = false;
      currentStoragePrefix = 'fleetmind_guest_';
      this.currentOrgId = '';

      this.buses = [];
      this.drivers = [];
      this.mechanics = [];
      this.serviceRecords = [];
      this.inventory = [];
      this.inventoryMovements = [];
      this.routes = [];
      this.trips = [];
      this.fuelRecords = [];
      this.expenses = [];
      this.loans = [];
      this.emiPayments = [];
      this.gpsVehicles = [];
      this.notifications = [];
      this.auditLogs = [];
      this.profile = EMPTY_GUEST_PROFILE;
      this.settings = INITIAL_SETTINGS;
    }
    this.notify();
  }

  loadDemoData(): void {
    this.currentUserId = null;
    this.currentUserEmail = null;
    this.isDemoMode = true;
    currentStoragePrefix = 'fleetmind_demo_';
    this.currentOrgId = '00000000-0000-0000-0000-000000000001';

    this.buses = loadFromStorage('buses', INITIAL_BUSES);
    this.drivers = loadFromStorage('drivers', INITIAL_DRIVERS);
    this.mechanics = loadFromStorage('mechanics', INITIAL_MECHANICS);
    this.serviceRecords = loadFromStorage('serviceRecords', INITIAL_SERVICE_RECORDS);
    this.inventory = loadFromStorage('inventory', INITIAL_INVENTORY);
    this.inventoryMovements = loadFromStorage('inventoryMovements', INITIAL_INVENTORY_MOVEMENTS);
    this.routes = loadFromStorage('routes', INITIAL_ROUTES);
    this.trips = loadFromStorage('trips', INITIAL_TRIPS);
    this.fuelRecords = loadFromStorage('fuelRecords', INITIAL_FUEL_RECORDS);
    this.expenses = loadFromStorage('expenses', INITIAL_EXPENSES);
    this.loans = loadFromStorage('loans', INITIAL_LOANS);
    this.emiPayments = loadFromStorage('emiPayments', []);
    this.gpsVehicles = loadFromStorage('gpsVehicles', INITIAL_GPS_VEHICLES);
    this.notifications = loadFromStorage('notifications', INITIAL_NOTIFICATIONS);
    this.auditLogs = loadFromStorage('auditLogs', INITIAL_AUDIT_LOGS);
    this.profile = loadFromStorage('profile', INITIAL_DEMO_PROFILE);
    this.settings = loadFromStorage('settings', INITIAL_SETTINGS);
    this.notify();
  }

  loadStarterTemplate() {
    const starterBuses: Bus[] = [
      {
        id: `bus-starter-1`,
        bus_number: 'FM-201',
        registration_number: 'KA-01-EQ-1001',
        model: 'Volvo 9600 B11R Multi-Axle',
        manufacturer: 'Volvo Buses',
        year: 2024,
        capacity: 48,
        status: 'active',
        fuel_type: 'Diesel',
        odometer: 14500,
        assigned_driver: 'Ramesh Gowda',
        route: 'Bengaluru - Hyderabad Express',
        insurance_expiry: '2027-11-20',
        registration_expiry: '2029-05-15',
        last_service_date: '2026-09-10',
        next_service_date: '2026-12-10',
        notes: 'Starter fleet flagship coach.'
      },
      {
        id: `bus-starter-2`,
        bus_number: 'FM-202',
        registration_number: 'KA-02-MH-2002',
        model: 'Tata Starbus Ultra EV',
        manufacturer: 'Tata Motors',
        year: 2024,
        capacity: 34,
        status: 'active',
        fuel_type: 'Electric',
        odometer: 8200,
        assigned_driver: 'Sunil Kumar',
        route: 'Bengaluru Airport Corridor',
        insurance_expiry: '2027-08-15',
        registration_expiry: '2029-08-15',
        last_service_date: '2026-09-01',
        next_service_date: '2026-12-01',
        notes: 'Electric airport express coach.'
      },
      {
        id: `bus-starter-3`,
        bus_number: 'FM-203',
        registration_number: 'KA-03-TR-3003',
        model: 'Scania Metrolink HD',
        manufacturer: 'Scania',
        year: 2023,
        capacity: 53,
        status: 'maintenance',
        fuel_type: 'Diesel',
        odometer: 42000,
        route: 'Bengaluru - Chennai Expressway',
        insurance_expiry: '2027-04-10',
        registration_expiry: '2028-10-20',
        last_service_date: '2026-08-15',
        next_service_date: '2026-11-15',
        notes: 'Undergoing routine brake pad service.'
      }
    ];

    const starterDrivers: Driver[] = [
      {
        id: 'drv-starter-1',
        name: 'Ramesh Gowda',
        phone: '+91 98450 11223',
        email: 'ramesh.gowda@transport.in',
        license_number: 'KA01 20160012345',
        license_expiry: '2028-06-15',
        joining_date: '2024-01-10',
        assigned_bus: 'FM-201',
        status: 'active',
        today_availability: 'available',
        experience_years: 8,
        total_trips: 140,
        distance_km: 42000,
        safety_score: 96
      },
      {
        id: 'drv-starter-2',
        name: 'Sunil Kumar',
        phone: '+91 98450 44556',
        email: 'sunil.kumar@transport.in',
        license_number: 'KA02 20180054321',
        license_expiry: '2029-03-20',
        joining_date: '2024-03-01',
        assigned_bus: 'FM-202',
        status: 'active',
        today_availability: 'on_trip',
        experience_years: 6,
        total_trips: 98,
        distance_km: 29000,
        safety_score: 94
      }
    ];

    const starterRoutes: Route[] = [
      {
        id: 'rt-starter-1',
        route_name: 'Bengaluru - Hyderabad Express',
        route_code: 'EXP-BLR-HYD',
        start_point: 'Bengaluru Majestic',
        end_point: 'Hyderabad MGBS',
        distance_km: 570,
        estimated_time: '8h 30m',
        fare: 1150,
        assigned_buses: ['FM-201'],
        assigned_drivers: ['Ramesh Gowda'],
        stops: ['Hebbal', 'Anantapur Midway', 'Kurnool Toll', 'Shamshabad', 'MGBS'],
        status: 'active'
      }
    ];

    this.buses = starterBuses;
    this.drivers = starterDrivers;
    this.routes = starterRoutes;
    saveToStorage('buses', this.buses);
    saveToStorage('drivers', this.drivers);
    saveToStorage('routes', this.routes);
    this.logAudit('STARTER_TEMPLATE_LOADED', 'System', 'Workspace', 'Loaded 3 starter fleet vehicles and 2 drivers.');
    this.notify();

    starterBuses.forEach(b => this.syncBusToSupabase(b));
    starterDrivers.forEach(d => this.syncDriverToSupabase(d));
  }

  clearUserData() {
    this.buses = [];
    this.drivers = [];
    this.mechanics = [];
    this.serviceRecords = [];
    this.inventory = [];
    this.inventoryMovements = [];
    this.routes = [];
    this.trips = [];
    this.fuelRecords = [];
    this.expenses = [];
    this.loans = [];
    this.gpsVehicles = [];
    this.notifications = [];
    this.auditLogs = [];
    saveToStorage('buses', []);
    saveToStorage('drivers', []);
    saveToStorage('mechanics', []);
    saveToStorage('serviceRecords', []);
    saveToStorage('inventory', []);
    saveToStorage('inventoryMovements', []);
    saveToStorage('routes', []);
    saveToStorage('trips', []);
    saveToStorage('fuelRecords', []);
    saveToStorage('expenses', []);
    saveToStorage('loans', []);
    saveToStorage('gpsVehicles', []);
    saveToStorage('notifications', []);
    saveToStorage('auditLogs', []);
    this.logAudit('WORKSPACE_CLEARED', 'System', 'Workspace', 'Cleared fleet records in current workspace.');
    this.notify();
  }

  handleDbError(context: string, error: any) {
    if (!error) return;
    const isRls = error.code === '42501' ||
      (typeof error.message === 'string' && (
        error.message.includes('violates row-level security policy') ||
        error.message.includes('permission denied')
      ));

    const msg = isRls
      ? `Permission Denied [${context}]: Your account role (${this.profile.role}) is not authorized for this operation under PostgreSQL security policies.`
      : `Database Notice [${context}]: ${error.message || 'Operation failed'}`;

    console.warn(`[Supabase Database] ${msg}`);
    this.dbError = msg;

    if (this.currentUserId && !this.isDemoMode) {
      this.addNotification(
        isRls ? 'Security Policy Violation' : 'Database Error',
        msg,
        'system',
        isRls ? 'warning' : 'critical'
      );
    }
  }

  async syncFromSupabase() {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) {
      this.isLoadingDb = false;
      return;
    }
    this.isLoadingDb = true;

    try {
      // 1. Organization info
      try {
        const { data: orgData, error: orgErr } = await (supabase.from('organizations') as any)
          .select('*')
          .limit(1)
          .maybeSingle();
        if (!orgErr && orgData) {
          this.organization = {
            id: orgData.id,
            name: orgData.name,
            slug: orgData.slug,
            billing_tier: orgData.billing_tier
          };
          if (orgData.id) this.currentOrgId = orgData.id;
        }
      } catch (e) {
        console.warn('[Sync] Organizations check notice:', e);
      }

      // 2. Profile
      try {
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', this.currentUserId)
          .maybeSingle();
        if (!profErr && profData) {
          this.profile = {
            id: profData.id,
            full_name: profData.full_name,
            email: profData.email,
            phone: profData.phone || '',
            job_title: profData.job_title || 'Fleet Operator',
            company_name: profData.company_name || 'FleetMind Logistics',
            avatar_url: profData.avatar_url || undefined,
            role: (profData.role as UserProfile['role']) || 'Normal User',
            organization_id: (profData as any).organization_id || this.currentOrgId
          };
          if ((profData as any).organization_id) {
            this.currentOrgId = (profData as any).organization_id;
          }
          saveToStorage('profile', this.profile);
        }
      } catch (e) {
        console.warn('[Sync] Profile check notice:', e);
      }

      // 3. Buses
      let busesQuery = supabase.from('buses').select('*');
      if (this.currentOrgId) {
        busesQuery = busesQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: busesData, error: busesErr } = await busesQuery.order('created_at', { ascending: false });
      if (!busesErr && busesData) {
        this.buses = busesData.map(b => ({
          id: b.id,
          bus_number: b.bus_number,
          registration_number: b.registration_number,
          model: b.model,
          manufacturer: b.manufacturer,
          year: b.year,
          capacity: b.capacity,
          status: b.status as any,
          fuel_type: b.fuel_type as any,
          odometer: b.odometer,
          assigned_driver: b.assigned_driver || undefined,
          route: b.route || undefined,
          insurance_expiry: b.insurance_expiry,
          registration_expiry: b.registration_expiry,
          last_service_date: b.last_service_date,
          next_service_date: b.next_service_date,
          notes: b.notes || undefined,
          created_at: b.created_at,
          updated_at: b.updated_at
        }));
        saveToStorage('buses', this.buses);
      } else if (busesErr) {
        this.handleDbError('buses', busesErr);
        this.buses = [];
        saveToStorage('buses', []);
      }

      // 4. Drivers
      let driversQuery = supabase.from('drivers').select('*');
      if (this.currentOrgId) {
        driversQuery = driversQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: driversData, error: driversErr } = await driversQuery.order('created_at', { ascending: false });
      if (!driversErr && driversData) {
        this.drivers = driversData.map(d => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          email: d.email,
          license_number: d.license_number,
          license_expiry: d.license_expiry,
          joining_date: d.joining_date,
          assigned_bus: d.assigned_bus || undefined,
          status: d.status as any,
          today_availability: d.today_availability as any,
          experience_years: d.experience_years || 0,
          total_trips: d.total_trips || 0,
          distance_km: d.distance_km || 0,
          safety_score: d.safety_score || 95,
          profile_photo: d.profile_photo || undefined,
          emergency_contact: d.emergency_contact || undefined,
          created_at: d.created_at,
          updated_at: d.updated_at
        }));
        saveToStorage('drivers', this.drivers);
      } else if (driversErr) {
        this.handleDbError('drivers', driversErr);
        this.drivers = [];
        saveToStorage('drivers', []);
      }

      // 5. Mechanics
      let mechanicsQuery = supabase.from('mechanics').select('*');
      if (this.currentOrgId) {
        mechanicsQuery = mechanicsQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: mechanicsData, error: mechanicsErr } = await mechanicsQuery.order('created_at', { ascending: false });
      if (!mechanicsErr && mechanicsData) {
        this.mechanics = mechanicsData.map(m => ({
          id: m.id,
          name: m.name,
          phone: m.phone,
          specialty: m.specialty,
          status: m.status as any,
          active_tasks: m.active_tasks || 0,
          hourly_rate: Number(m.hourly_rate) || 0
        }));
        saveToStorage('mechanics', this.mechanics);
      } else if (mechanicsErr) {
        this.handleDbError('mechanics', mechanicsErr);
        this.mechanics = [];
        saveToStorage('mechanics', []);
      }

      // 6. Routes
      let routesQuery = supabase.from('routes').select('*');
      if (this.currentOrgId) {
        routesQuery = routesQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: routesData, error: routesErr } = await routesQuery.order('created_at', { ascending: false });
      if (!routesErr && routesData) {
        this.routes = routesData.map(r => ({
          id: r.id,
          route_name: r.route_name,
          route_code: r.route_code,
          start_point: r.start_point,
          end_point: r.end_point,
          distance_km: r.distance_km,
          estimated_time: r.estimated_time,
          fare: Number(r.fare),
          assigned_buses: r.assigned_buses || [],
          assigned_drivers: r.assigned_drivers || [],
          stops: r.stops || [],
          status: r.status as any,
          created_at: r.created_at
        }));
        saveToStorage('routes', this.routes);
      } else if (routesErr) {
        this.handleDbError('routes', routesErr);
        this.routes = [];
        saveToStorage('routes', []);
      }

      // 7. Trips
      let tripsQuery = supabase.from('trips').select('*');
      if (this.currentOrgId) {
        tripsQuery = tripsQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: tripsData, error: tripsErr } = await tripsQuery.order('date', { ascending: false });
      if (!tripsErr && tripsData) {
        this.trips = tripsData.map(t => ({
          id: t.id,
          trip_code: t.trip_code,
          route_id: t.route_id,
          route_name: t.route_name,
          bus_id: t.bus_id,
          bus_number: t.bus_number,
          driver_id: t.driver_id,
          driver_name: t.driver_name,
          date: t.date,
          start_time: t.start_time,
          end_time: t.end_time,
          start_point: t.start_point,
          end_point: t.end_point,
          fare: Number(t.fare) || 0,
          passenger_count: t.passenger_count || 0,
          status: t.status as any,
          created_at: t.created_at
        }));
        saveToStorage('trips', this.trips);
      } else if (tripsErr) {
        this.handleDbError('trips', tripsErr);
        this.trips = [];
        saveToStorage('trips', []);
      }

      // 8. Service Records (Maintenance)
      let srvQuery = supabase.from('service_records').select('*');
      if (this.currentOrgId) {
        srvQuery = srvQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: srvData, error: srvErr } = await srvQuery.order('service_date', { ascending: false });
      if (!srvErr && srvData) {
        this.serviceRecords = srvData.map((s: any) => ({
          id: s.id,
          bus_number: s.bus_number,
          service_type: s.service_type as any,
          service_date: s.service_date,
          cost: Number(s.cost) || 0,
          parts_used: s.parts_used || '',
          mechanic_notes: s.mechanic_notes || '',
          next_service_prediction: s.next_service_prediction || '',
          mechanic_name: s.mechanic_name || 'Fleet Mechanic',
          priority: s.priority as any,
          status: s.status as any,
          created_at: s.created_at
        }));
        saveToStorage('serviceRecords', this.serviceRecords);
      } else if (srvErr) {
        this.handleDbError('service_records', srvErr);
        this.serviceRecords = [];
        saveToStorage('serviceRecords', []);
      }

      // 9. Inventory
      let invQuery = supabase.from('inventory').select('*');
      if (this.currentOrgId) {
        invQuery = invQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: invData, error: invErr } = await invQuery.order('item_name');
      if (!invErr && invData) {
        this.inventory = invData.map((i: any) => ({
          id: i.id,
          item_name: i.item_name,
          sku: i.sku,
          category: i.category as any,
          current_stock: Number(i.current_stock) || 0,
          minimum_stock: Number(i.minimum_stock) || 0,
          purchase_price: Number(i.purchase_price) || 0,
          vendor: i.vendor,
          unit: i.unit || 'Pcs',
          storage_location: i.storage_location || 'Main Warehouse',
          last_updated: i.last_updated
        }));
        saveToStorage('inventory', this.inventory);
      } else if (invErr) {
        this.handleDbError('inventory', invErr);
        this.inventory = [];
        saveToStorage('inventory', []);
      }

      // 10. Inventory Movements
      let movQuery = supabase.from('inventory_movements').select('*');
      if (this.currentOrgId) {
        movQuery = movQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: movData, error: movErr } = await movQuery.order('created_at', { ascending: false });
      if (!movErr && movData) {
        this.inventoryMovements = movData.map((m: any) => ({
          id: m.id,
          item_id: m.item_id,
          item_name: m.item_name,
          type: m.type as any,
          quantity: Number(m.quantity) || 0,
          bus_number: m.bus_number || undefined,
          date: m.date,
          notes: m.notes || ''
        }));
        saveToStorage('inventoryMovements', this.inventoryMovements);
      } else if (movErr) {
        this.handleDbError('inventory_movements', movErr);
        this.inventoryMovements = [];
        saveToStorage('inventoryMovements', []);
      }

      // 11. Fuel Records
      let fuelQuery = supabase.from('fuel_records').select('*');
      if (this.currentOrgId) {
        fuelQuery = fuelQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: fuelData, error: fuelErr } = await fuelQuery.order('date', { ascending: false });
      if (!fuelErr && fuelData) {
        this.fuelRecords = fuelData.map((f: any) => ({
          id: f.id,
          bus_number: f.bus_number,
          date: f.date,
          liters: Number(f.liters),
          amount: Number(f.amount),
          price_per_liter: Number(f.price_per_liter),
          odometer_reading: Number(f.odometer_reading) || 0,
          fuel_station: f.fuel_station,
          driver_name: f.driver_name,
          receipt_number: f.receipt_number || undefined,
          notes: f.notes || undefined,
          calculated_efficiency: f.calculated_efficiency ? Number(f.calculated_efficiency) : undefined,
          created_at: f.created_at
        }));
        saveToStorage('fuelRecords', this.fuelRecords);
      } else if (fuelErr) {
        this.handleDbError('fuel_records', fuelErr);
        this.fuelRecords = [];
        saveToStorage('fuelRecords', []);
      }

      // 12. Expenses (Financial Ledger)
      let expQuery = supabase.from('expenses').select('*');
      if (this.currentOrgId) {
        expQuery = expQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: expData, error: expErr } = await expQuery.order('date', { ascending: false });
      if (!expErr && expData) {
        this.expenses = expData.map((e: any) => ({
          id: e.id,
          category: e.category as any,
          type: e.type as any,
          amount: Number(e.amount),
          date: e.date,
          description: e.description,
          bus_number: e.bus_number || undefined,
          payment_method: e.payment_method as any,
          reference_number: e.reference_number || undefined,
          created_at: e.created_at
        }));
        saveToStorage('expenses', this.expenses);
      } else if (expErr) {
        if (expErr.code !== '42501') this.handleDbError('expenses', expErr);
        this.expenses = [];
        saveToStorage('expenses', []);
      }

      // 13. EMI Loans
      let loanQuery = supabase.from('loans').select('*');
      if (this.currentOrgId) {
        loanQuery = loanQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: loanData, error: loanErr } = await loanQuery.order('created_at', { ascending: false });
      if (!loanErr && loanData) {
        this.loans = loanData.map((l: any) => ({
          id: l.id,
          loan_id: l.loan_id,
          lender: l.lender,
          bus_number: l.bus_number,
          principal_amount: Number(l.principal_amount),
          interest_rate: Number(l.interest_rate),
          loan_start_date: l.loan_start_date,
          term_months: Number(l.term_months),
          monthly_emi: Number(l.monthly_emi),
          total_paid: Number(l.total_paid) || 0,
          outstanding_balance: Number(l.outstanding_balance),
          next_due_date: l.next_due_date,
          status: l.status as any,
          installments_paid: Number(l.installments_paid) || 0,
          installments_total: Number(l.installments_total)
        }));
        saveToStorage('loans', this.loans);
      } else if (loanErr) {
        if (loanErr.code !== '42501') this.handleDbError('loans', loanErr);
        this.loans = [];
        saveToStorage('loans', []);
      }

      // 14. EMI Payments
      let pmtQuery = supabase.from('emi_payments').select('*');
      if (this.currentOrgId) {
        pmtQuery = pmtQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: pmtData, error: pmtErr } = await pmtQuery.order('payment_date', { ascending: false });
      if (!pmtErr && pmtData) {
        this.emiPayments = pmtData.map((p: any) => ({
          id: p.id,
          loan_id: p.loan_id,
          installment_number: Number(p.installment_number),
          due_date: p.due_date,
          payment_date: p.payment_date,
          amount: Number(p.amount),
          status: p.status as any,
          reference: p.reference || undefined
        }));
        saveToStorage('emiPayments', this.emiPayments);
      } else if (pmtErr) {
        if (pmtErr.code !== '42501') this.handleDbError('emi_payments', pmtErr);
        this.emiPayments = [];
        saveToStorage('emiPayments', []);
      }

      // 15. GPS Vehicles (Isolated to user's buses)
      const userBusNumbers = new Set(this.buses.map(b => b.bus_number));
      const userBusIds = new Set(this.buses.map(b => b.id));
      const { data: gpsData, error: gpsErr } = await supabase
        .from('gps_vehicles')
        .select('*');
      if (!gpsErr && gpsData) {
        // Only include GPS telemetry for buses that belong to this organization
        const orgGpsData = this.buses.length > 0
          ? gpsData.filter((g: any) => userBusNumbers.has(g.bus_number) || userBusIds.has(g.bus_id))
          : [];
        this.gpsVehicles = orgGpsData.map((g: any) => {
          const matchedBus = this.buses.find(b => b.id === g.bus_id || b.bus_number === g.bus_number);
          return {
            bus_id: g.bus_id,
            bus_number: g.bus_number,
            model: matchedBus?.model || 'Commercial Coach',
            driver_name: matchedBus?.assigned_driver || 'Assigned Driver',
            lat: Number(g.lat),
            lng: Number(g.lng),
            speed: Number(g.speed),
            heading: Number(g.heading) || 0,
            status: g.status as any,
            battery_level: Number(g.battery_level) || 100,
            fuel_level: Number(g.fuel_level) || 100,
            last_updated: g.last_updated,
            current_route: g.current_route || undefined,
            destination: g.destination || undefined
          };
        });
        saveToStorage('gpsVehicles', this.gpsVehicles);
      } else if (gpsErr) {
        this.handleDbError('gps_vehicles', gpsErr);
        this.gpsVehicles = [];
        saveToStorage('gpsVehicles', []);
      }

      // 16. Notifications
      let notifQuery = supabase.from('notifications').select('*');
      if (this.currentOrgId) {
        notifQuery = notifQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: notifData, error: notifErr } = await notifQuery.order('date', { ascending: false });
      if (!notifErr && notifData) {
        this.notifications = notifData.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type as any,
          severity: n.severity as any,
          read: Boolean(n.read),
          date: n.date,
          link: n.link || undefined
        }));
        saveToStorage('notifications', this.notifications);
      } else if (notifErr) {
        this.handleDbError('notifications', notifErr);
        this.notifications = [];
        saveToStorage('notifications', []);
      }

      // 17. Audit Logs
      let auditQuery = supabase.from('audit_logs').select('*');
      if (this.currentOrgId) {
        auditQuery = auditQuery.eq('organization_id', this.currentOrgId);
      }
      const { data: auditData, error: auditErr } = await auditQuery.order('timestamp', { ascending: false }).limit(100);
      if (!auditErr && auditData) {
        this.auditLogs = auditData.map((a: any) => ({
          id: a.id,
          timestamp: a.timestamp,
          user: a.user_name || 'Fleet Operator',
          action: a.action,
          entity_type: a.entity_type,
          entity_id: a.entity_id,
          details: a.details
        }));
        saveToStorage('auditLogs', this.auditLogs);
      } else if (auditErr) {
        if (auditErr.code !== '42501') {
          this.handleDbError('audit_logs', auditErr);
        }
        this.auditLogs = [];
        saveToStorage('auditLogs', []);
      }

      // 18. Settings
      const { data: settData, error: settErr } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (!settErr && settData) {
        this.settings = {
          company_name: settData.company_name,
          currency: settData.currency,
          currency_symbol: settData.currency_symbol,
          timezone: settData.timezone,
          date_format: settData.date_format,
          fuel_efficiency_alert_threshold: Number(settData.fuel_efficiency_alert_threshold),
          maintenance_reminder_days: Number(settData.maintenance_reminder_days),
          low_stock_warning_threshold: Number(settData.low_stock_warning_threshold),
          notifications_email: Boolean(settData.notifications_email),
          notifications_browser: Boolean(settData.notifications_browser)
        };
        saveToStorage('settings', this.settings);
      } else if (settErr) {
        this.handleDbError('settings', settErr);
      }
    } catch (err: any) {
      console.warn('[Supabase Sync Exception]', err);
    } finally {
      this.isLoadingDb = false;
      this.notify();
    }
  }

  // ============================================================================
  // DATABASE SYNCHRONIZATION HELPERS (POSTGRES CRUD VIA SUPABASE CLIENT)
  // ============================================================================

  async syncBusToSupabase(bus: Bus) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      const payload: any = {
        bus_number: bus.bus_number,
        registration_number: bus.registration_number,
        model: bus.model,
        manufacturer: bus.manufacturer,
        year: Number(bus.year),
        capacity: Number(bus.capacity),
        status: bus.status,
        fuel_type: bus.fuel_type,
        odometer: Number(bus.odometer) || 0,
        assigned_driver: bus.assigned_driver || null,
        route: bus.route || null,
        insurance_expiry: bus.insurance_expiry,
        registration_expiry: bus.registration_expiry,
        last_service_date: bus.last_service_date,
        next_service_date: bus.next_service_date,
        notes: bus.notes || null,
        organization_id: this.currentOrgId
      };
      if (isUuid(bus.id)) payload.id = bus.id;

      const { data, error } = await (supabase.from('buses') as any).upsert(payload, {
        onConflict: 'organization_id,bus_number'
      }).select().maybeSingle();

      if (error) {
        this.handleDbError('buses.upsert', error);
      } else if (data?.id) {
        const idx = this.buses.findIndex(b => b.bus_number === bus.bus_number);
        if (idx !== -1 && this.buses[idx].id !== data.id) {
          this.buses[idx].id = data.id;
          saveToStorage('buses', this.buses);
        }
      }
    } catch (err: any) {
      this.handleDbError('buses.sync', err);
    }
  }

  async deleteBusFromSupabase(busIdOrNumber: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let query = supabase.from('buses').delete();
      if (isUuid(busIdOrNumber)) {
        query = query.eq('id', busIdOrNumber);
      } else {
        query = query.eq('bus_number', busIdOrNumber);
      }
      const { error } = await query;
      if (error) this.handleDbError('buses.delete', error);
    } catch (err: any) {
      this.handleDbError('buses.delete', err);
    }
  }

  async syncDriverToSupabase(driver: Driver) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      const payload: any = {
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        license_number: driver.license_number,
        license_expiry: driver.license_expiry,
        joining_date: driver.joining_date,
        assigned_bus: driver.assigned_bus || null,
        status: driver.status,
        today_availability: driver.today_availability,
        experience_years: Number(driver.experience_years) || 0,
        total_trips: Number(driver.total_trips) || 0,
        distance_km: Number(driver.distance_km) || 0,
        safety_score: Number(driver.safety_score) || 95,
        profile_photo: driver.profile_photo || null,
        emergency_contact: driver.emergency_contact || null,
        organization_id: this.currentOrgId
      };
      if (isUuid(driver.id)) payload.id = driver.id;

      const { data, error } = await (supabase.from('drivers') as any).upsert(payload, {
        onConflict: 'organization_id,license_number'
      }).select().maybeSingle();

      if (error) {
        this.handleDbError('drivers.upsert', error);
      } else if (data?.id) {
        const idx = this.drivers.findIndex(d => d.license_number === driver.license_number);
        if (idx !== -1 && this.drivers[idx].id !== data.id) {
          this.drivers[idx].id = data.id;
          saveToStorage('drivers', this.drivers);
        }
      }
    } catch (err: any) {
      this.handleDbError('drivers.sync', err);
    }
  }

  async deleteDriverFromSupabase(driverIdOrName: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let query = supabase.from('drivers').delete();
      if (isUuid(driverIdOrName)) {
        query = query.eq('id', driverIdOrName);
      } else {
        query = query.eq('name', driverIdOrName);
      }
      const { error } = await query;
      if (error) this.handleDbError('drivers.delete', error);
    } catch (err: any) {
      this.handleDbError('drivers.delete', err);
    }
  }

  async syncMechanicToSupabase(mechanic: Mechanic) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      const payload: any = {
        name: mechanic.name,
        phone: mechanic.phone,
        specialty: mechanic.specialty,
        status: mechanic.status,
        active_tasks: Number(mechanic.active_tasks) || 0,
        hourly_rate: Number(mechanic.hourly_rate) || 0,
        organization_id: this.currentOrgId
      };
      if (isUuid(mechanic.id)) payload.id = mechanic.id;

      const { data, error } = await (supabase.from('mechanics') as any).upsert(payload).select().maybeSingle();
      if (error) {
        this.handleDbError('mechanics.upsert', error);
      } else if (data?.id) {
        const idx = this.mechanics.findIndex(m => m.name === mechanic.name);
        if (idx !== -1 && this.mechanics[idx].id !== data.id) {
          this.mechanics[idx].id = data.id;
          saveToStorage('mechanics', this.mechanics);
        }
      }
    } catch (err: any) {
      this.handleDbError('mechanics.sync', err);
    }
  }

  async deleteMechanicFromSupabase(id: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      if (isUuid(id)) {
        const { error } = await supabase.from('mechanics').delete().eq('id', id);
        if (error) this.handleDbError('mechanics.delete', error);
      }
    } catch (err: any) {
      this.handleDbError('mechanics.delete', err);
    }
  }

  async syncRouteToSupabase(route: Route) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      const payload: any = {
        route_name: route.route_name,
        route_code: route.route_code,
        start_point: route.start_point,
        end_point: route.end_point,
        distance_km: Number(route.distance_km),
        estimated_time: route.estimated_time,
        fare: Number(route.fare),
        assigned_buses: route.assigned_buses || [],
        assigned_drivers: route.assigned_drivers || [],
        stops: route.stops || [],
        status: route.status,
        organization_id: this.currentOrgId
      };
      if (isUuid(route.id)) payload.id = route.id;

      const { data, error } = await (supabase.from('routes') as any).upsert(payload, {
        onConflict: 'organization_id,route_code'
      }).select().maybeSingle();

      if (error) {
        this.handleDbError('routes.upsert', error);
      } else if (data?.id) {
        const idx = this.routes.findIndex(r => r.route_code === route.route_code);
        if (idx !== -1 && this.routes[idx].id !== data.id) {
          this.routes[idx].id = data.id;
          saveToStorage('routes', this.routes);
        }
      }
    } catch (err: any) {
      this.handleDbError('routes.sync', err);
    }
  }

  async deleteRouteFromSupabase(routeIdOrCode: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let query = supabase.from('routes').delete();
      if (isUuid(routeIdOrCode)) {
        query = query.eq('id', routeIdOrCode);
      } else {
        query = query.eq('route_code', routeIdOrCode);
      }
      const { error } = await query;
      if (error) this.handleDbError('routes.delete', error);
    } catch (err: any) {
      this.handleDbError('routes.delete', err);
    }
  }

  async syncTripToSupabase(trip: Trip) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let busId: string | null = null;
      if (isUuid(trip.bus_id)) {
        busId = trip.bus_id;
      } else {
        const matched = this.buses.find(b => b.bus_number === trip.bus_number);
        if (matched && isUuid(matched.id)) busId = matched.id;
      }

      let routeId: string | null = null;
      if (isUuid(trip.route_id)) {
        routeId = trip.route_id;
      } else {
        const matched = this.routes.find(r => r.route_name === trip.route_name || r.route_code === trip.route_id);
        if (matched && isUuid(matched.id)) routeId = matched.id;
      }

      let driverId: string | null = null;
      if (isUuid(trip.driver_id)) {
        driverId = trip.driver_id;
      } else {
        const matched = this.drivers.find(d => d.name === trip.driver_name);
        if (matched && isUuid(matched.id)) driverId = matched.id;
      }

      const payload: any = {
        trip_code: trip.trip_code,
        route_name: trip.route_name,
        bus_number: trip.bus_number,
        driver_name: trip.driver_name,
        date: trip.date,
        start_time: trip.start_time.length === 5 ? `${trip.start_time}:00` : trip.start_time,
        end_time: trip.end_time.length === 5 ? `${trip.end_time}:00` : trip.end_time,
        start_point: trip.start_point,
        end_point: trip.end_point,
        fare: Number(trip.fare) || 0,
        passenger_count: Number(trip.passenger_count) || 0,
        status: trip.status,
        organization_id: this.currentOrgId
      };
      if (busId) payload.bus_id = busId;
      if (routeId) payload.route_id = routeId;
      if (driverId) payload.driver_id = driverId;
      if (isUuid(trip.id)) payload.id = trip.id;

      const { data, error } = await (supabase.from('trips') as any).upsert(payload, {
        onConflict: 'organization_id,trip_code'
      }).select().maybeSingle();

      if (error) {
        this.handleDbError('trips.upsert', error);
      } else if (data?.id) {
        const idx = this.trips.findIndex(t => t.trip_code === trip.trip_code);
        if (idx !== -1 && this.trips[idx].id !== data.id) {
          this.trips[idx].id = data.id;
          saveToStorage('trips', this.trips);
        }
      }
    } catch (err: any) {
      this.handleDbError('trips.sync', err);
    }
  }

  async deleteTripFromSupabase(tripIdOrCode: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let query = supabase.from('trips').delete();
      if (isUuid(tripIdOrCode)) {
        query = query.eq('id', tripIdOrCode);
      } else {
        query = query.eq('trip_code', tripIdOrCode);
      }
      const { error } = await query;
      if (error) this.handleDbError('trips.delete', error);
    } catch (err: any) {
      this.handleDbError('trips.delete', err);
    }
  }

  async syncServiceRecordToSupabase(record: ServiceRecord) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let busId: string | null = null;
      const matched = this.buses.find(b => b.bus_number === record.bus_number);
      if (matched && isUuid(matched.id)) busId = matched.id;

      const payload: any = {
        bus_number: record.bus_number,
        service_type: record.service_type,
        service_date: record.service_date,
        cost: Number(record.cost) || 0,
        parts_used: record.parts_used || '',
        mechanic_notes: record.mechanic_notes || '',
        next_service_prediction: record.next_service_prediction || null,
        mechanic_name: record.mechanic_name || 'Fleet Mechanic',
        priority: record.priority || 'medium',
        status: record.status || 'scheduled',
        organization_id: this.currentOrgId
      };
      if (busId) payload.bus_id = busId;
      if (isUuid(record.id)) payload.id = record.id;

      const { data, error } = await (supabase.from('service_records') as any).upsert(payload).select().maybeSingle();
      if (error) {
        this.handleDbError('service_records.upsert', error);
      } else if (data?.id) {
        const idx = this.serviceRecords.findIndex(s => s.id === record.id);
        if (idx !== -1 && this.serviceRecords[idx].id !== data.id) {
          this.serviceRecords[idx].id = data.id;
          saveToStorage('serviceRecords', this.serviceRecords);
        }
      }
    } catch (err: any) {
      this.handleDbError('service_records.sync', err);
    }
  }

  async deleteServiceRecordFromSupabase(id: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      if (isUuid(id)) {
        const { error } = await supabase.from('service_records').delete().eq('id', id);
        if (error) this.handleDbError('service_records.delete', error);
      }
    } catch (err: any) {
      this.handleDbError('service_records.delete', err);
    }
  }

  async syncInventoryItemToSupabase(item: InventoryItem) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      const payload: any = {
        item_name: item.item_name,
        sku: item.sku,
        category: item.category,
        current_stock: Number(item.current_stock) || 0,
        minimum_stock: Number(item.minimum_stock) || 0,
        purchase_price: Number(item.purchase_price) || 0,
        vendor: item.vendor,
        unit: item.unit || 'Pcs',
        storage_location: item.storage_location || 'Main Warehouse',
        organization_id: this.currentOrgId
      };
      if (isUuid(item.id)) payload.id = item.id;

      const { data, error } = await (supabase.from('inventory') as any).upsert(payload, {
        onConflict: 'organization_id,sku'
      }).select().maybeSingle();

      if (error) {
        this.handleDbError('inventory.upsert', error);
      } else if (data?.id) {
        const idx = this.inventory.findIndex(i => i.sku === item.sku);
        if (idx !== -1 && this.inventory[idx].id !== data.id) {
          this.inventory[idx].id = data.id;
          saveToStorage('inventory', this.inventory);
        }
      }
    } catch (err: any) {
      this.handleDbError('inventory.sync', err);
    }
  }

  async deleteInventoryItemFromSupabase(itemIdOrSku: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let query = supabase.from('inventory').delete();
      if (isUuid(itemIdOrSku)) {
        query = query.eq('id', itemIdOrSku);
      } else {
        query = query.eq('sku', itemIdOrSku);
      }
      const { error } = await query;
      if (error) this.handleDbError('inventory.delete', error);
    } catch (err: any) {
      this.handleDbError('inventory.delete', err);
    }
  }

  async syncInventoryMovementToSupabase(mov: InventoryMovement) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let itemId = mov.item_id;
      if (!isUuid(itemId)) {
        const matched = this.inventory.find(i => i.id === mov.item_id || i.item_name === mov.item_name);
        if (matched && isUuid(matched.id)) itemId = matched.id;
      }
      if (!isUuid(itemId)) return;

      const payload: any = {
        item_id: itemId,
        item_name: mov.item_name,
        type: mov.type,
        quantity: Number(mov.quantity),
        bus_number: mov.bus_number || null,
        date: mov.date,
        notes: mov.notes || '',
        organization_id: this.currentOrgId
      };
      if (isUuid(mov.id)) payload.id = mov.id;

      const { error } = await (supabase.from('inventory_movements') as any).insert(payload);
      if (error) this.handleDbError('inventory_movements.insert', error);

      // Sync stock update to inventory
      const currentItem = this.inventory.find(i => i.id === mov.item_id);
      if (currentItem && isUuid(currentItem.id)) {
        await supabase.from('inventory').update({
          current_stock: currentItem.current_stock,
          last_updated: new Date().toISOString()
        }).eq('id', currentItem.id);
      }
    } catch (err: any) {
      this.handleDbError('inventory_movements.sync', err);
    }
  }

  async syncFuelRecordToSupabase(record: FuelRecord) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let busId: string | null = null;
      const matched = this.buses.find(b => b.bus_number === record.bus_number);
      if (matched && isUuid(matched.id)) busId = matched.id;

      const payload: any = {
        bus_number: record.bus_number,
        date: record.date,
        liters: Number(record.liters),
        amount: Number(record.amount),
        price_per_liter: Number(record.price_per_liter),
        odometer_reading: Number(record.odometer_reading) || 0,
        fuel_station: record.fuel_station,
        driver_name: record.driver_name,
        receipt_number: record.receipt_number || null,
        notes: record.notes || null,
        calculated_efficiency: record.calculated_efficiency ? Number(record.calculated_efficiency) : null,
        organization_id: this.currentOrgId
      };
      if (busId) payload.bus_id = busId;
      if (isUuid(record.id)) payload.id = record.id;

      const { data, error } = await (supabase.from('fuel_records') as any).upsert(payload).select().maybeSingle();
      if (error) {
        this.handleDbError('fuel_records.upsert', error);
      } else if (data?.id) {
        const idx = this.fuelRecords.findIndex(f => f.id === record.id);
        if (idx !== -1 && this.fuelRecords[idx].id !== data.id) {
          this.fuelRecords[idx].id = data.id;
          saveToStorage('fuelRecords', this.fuelRecords);
        }
      }
    } catch (err: any) {
      this.handleDbError('fuel_records.sync', err);
    }
  }

  async deleteFuelRecordFromSupabase(id: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      if (isUuid(id)) {
        const { error } = await supabase.from('fuel_records').delete().eq('id', id);
        if (error) this.handleDbError('fuel_records.delete', error);
      }
    } catch (err: any) {
      this.handleDbError('fuel_records.delete', err);
    }
  }

  async syncExpenseToSupabase(expense: Expense) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let busId: string | null = null;
      if (expense.bus_number) {
        const matched = this.buses.find(b => b.bus_number === expense.bus_number);
        if (matched && isUuid(matched.id)) busId = matched.id;
      }

      const payload: any = {
        category: expense.category,
        type: expense.type,
        amount: Number(expense.amount),
        date: expense.date,
        description: expense.description,
        bus_number: expense.bus_number || null,
        payment_method: expense.payment_method,
        reference_number: expense.reference_number || null,
        organization_id: this.currentOrgId
      };
      if (busId) payload.bus_id = busId;
      if (isUuid(expense.id)) payload.id = expense.id;

      const { data, error } = await (supabase.from('expenses') as any).upsert(payload).select().maybeSingle();
      if (error && error.code !== '42501') {
        this.handleDbError('expenses.upsert', error);
      } else if (data?.id) {
        const idx = this.expenses.findIndex(e => e.id === expense.id);
        if (idx !== -1 && this.expenses[idx].id !== data.id) {
          this.expenses[idx].id = data.id;
          saveToStorage('expenses', this.expenses);
        }
      }
    } catch (err: any) {
      this.handleDbError('expenses.sync', err);
    }
  }

  async deleteExpenseFromSupabase(id: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      if (isUuid(id)) {
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error && error.code !== '42501') this.handleDbError('expenses.delete', error);
      }
    } catch (err: any) {
      this.handleDbError('expenses.delete', err);
    }
  }

  async syncLoanToSupabase(loan: EmiLoan) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let busId: string | null = null;
      const matched = this.buses.find(b => b.bus_number === loan.bus_number);
      if (matched && isUuid(matched.id)) busId = matched.id;

      const payload: any = {
        loan_id: loan.loan_id,
        lender: loan.lender,
        bus_number: loan.bus_number,
        principal_amount: Number(loan.principal_amount),
        interest_rate: Number(loan.interest_rate),
        loan_start_date: loan.loan_start_date,
        term_months: Number(loan.term_months),
        monthly_emi: Number(loan.monthly_emi),
        total_paid: Number(loan.total_paid) || 0,
        outstanding_balance: Number(loan.outstanding_balance),
        next_due_date: loan.next_due_date,
        status: loan.status,
        installments_paid: Number(loan.installments_paid) || 0,
        installments_total: Number(loan.installments_total),
        organization_id: this.currentOrgId
      };
      if (busId) payload.bus_id = busId;
      if (isUuid(loan.id)) payload.id = loan.id;

      const { data, error } = await (supabase.from('loans') as any).upsert(payload, {
        onConflict: 'organization_id,loan_id'
      }).select().maybeSingle();

      if (error && error.code !== '42501') {
        this.handleDbError('loans.upsert', error);
      } else if (data?.id) {
        const idx = this.loans.findIndex(l => l.loan_id === loan.loan_id);
        if (idx !== -1 && this.loans[idx].id !== data.id) {
          this.loans[idx].id = data.id;
          saveToStorage('loans', this.loans);
        }
      }
    } catch (err: any) {
      this.handleDbError('loans.sync', err);
    }
  }

  async deleteLoanFromSupabase(loanIdOrCode: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      let query = supabase.from('loans').delete();
      if (isUuid(loanIdOrCode)) {
        query = query.eq('id', loanIdOrCode);
      } else {
        query = query.eq('loan_id', loanIdOrCode);
      }
      const { error } = await query;
      if (error && error.code !== '42501') this.handleDbError('loans.delete', error);
    } catch (err: any) {
      this.handleDbError('loans.delete', err);
    }
  }

  async syncEmiPaymentToSupabase(payment: EmiPayment) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      if (!isUuid(payment.loan_id)) return;
      const payload: any = {
        loan_id: payment.loan_id,
        installment_number: Number(payment.installment_number),
        due_date: payment.due_date,
        payment_date: payment.payment_date,
        amount: Number(payment.amount),
        status: payment.status,
        reference: payment.reference || null,
        organization_id: this.currentOrgId
      };
      if (isUuid(payment.id)) payload.id = payment.id;

      const { error } = await (supabase.from('emi_payments') as any).insert(payload);
      if (error && error.code !== '42501') {
        this.handleDbError('emi_payments.insert', error);
      }
    } catch (err: any) {
      this.handleDbError('emi_payments.sync', err);
    }
  }

  async syncGpsVehicleToSupabase(gps: GpsVehicle) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      if (!isUuid(gps.bus_id)) return;
      const payload: any = {
        bus_id: gps.bus_id,
        bus_number: gps.bus_number,
        lat: Number(gps.lat),
        lng: Number(gps.lng),
        speed: Number(gps.speed),
        heading: Number(gps.heading) || 0,
        status: gps.status,
        battery_level: Number(gps.battery_level) || 100,
        fuel_level: Number(gps.fuel_level) || 100,
        current_route: gps.current_route || null,
        destination: gps.destination || null,
        last_updated: new Date().toISOString()
      };
      const { error } = await (supabase.from('gps_vehicles') as any).upsert(payload);
      if (error) this.handleDbError('gps_vehicles.upsert', error);
    } catch (err: any) {
      this.handleDbError('gps_vehicles.sync', err);
    }
  }

  async syncNotificationToSupabase(notif: NotificationItem) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      const payload: any = {
        title: notif.title,
        message: notif.message,
        type: notif.type,
        severity: notif.severity,
        read: Boolean(notif.read),
        date: notif.date,
        link: notif.link || null,
        user_id: this.currentUserId,
        organization_id: this.currentOrgId
      };
      if (isUuid(notif.id)) payload.id = notif.id;
      const { error } = await (supabase.from('notifications') as any).insert(payload);
      if (error && error.code !== '42501') {
        console.warn('[Notification Sync Notice]', error.message);
      }
    } catch (err: any) {
      console.warn('[Notification Sync Exception]', err);
    }
  }

  async syncNotificationReadToSupabase(id: string, read: boolean) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      if (isUuid(id)) {
        await supabase.from('notifications').update({ read }).eq('id', id);
      }
    } catch (err: any) {
      console.warn('[Notification Read Exception]', err);
    }
  }

  async syncAllNotificationsReadToSupabase() {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      await supabase.from('notifications').update({ read: true }).eq('organization_id', this.currentOrgId);
    } catch (err: any) {
      console.warn('[Notification Mark All Exception]', err);
    }
  }

  async deleteNotificationFromSupabase(id: string) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      if (isUuid(id)) {
        await supabase.from('notifications').delete().eq('id', id);
      }
    } catch (err: any) {
      console.warn('[Notification Delete Exception]', err);
    }
  }

  async syncAuditLogToSupabase(log: AuditLog) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      const payload: any = {
        timestamp: log.timestamp,
        user_name: log.user,
        user_id: this.currentUserId,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        details: log.details,
        organization_id: this.currentOrgId
      };
      if (isUuid(log.id)) payload.id = log.id;
      const { error } = await (supabase.from('audit_logs') as any).insert(payload);
      if (error && error.code !== '42501') {
        console.warn('[Audit Log Notice]', error.message);
      }
    } catch (err: any) {
      console.warn('[Audit Log Exception]', err);
    }
  }

  async syncSettingsToSupabase(settings: SystemSettings) {
    if (!isSupabaseConfigured || !supabase || !this.currentUserId) return;
    try {
      const { error } = await (supabase.from('settings') as any).update({
        company_name: settings.company_name,
        currency: settings.currency,
        currency_symbol: settings.currency_symbol,
        timezone: settings.timezone,
        date_format: settings.date_format,
        fuel_efficiency_alert_threshold: settings.fuel_efficiency_alert_threshold,
        maintenance_reminder_days: settings.maintenance_reminder_days,
        low_stock_warning_threshold: settings.low_stock_warning_threshold,
        notifications_email: settings.notifications_email,
        notifications_browser: settings.notifications_browser,
        updated_at: new Date().toISOString()
      }).eq('organization_id', this.currentOrgId);

      if (error) this.handleDbError('settings.update', error);
    } catch (err: any) {
      this.handleDbError('settings.sync', err);
    }
  }

  // ============================================================================
  // AUDIT LOG & NOTIFICATIONS LOGGING
  // ============================================================================

  logAudit(action: string, entity_type: string, entity_id: string, details: string) {
    const newLog: AuditLog = {
      id: generateEntityId(),
      timestamp: new Date().toISOString(),
      user: this.profile.full_name || 'Fleet Manager',
      action,
      entity_type,
      entity_id,
      details
    };
    this.auditLogs = [newLog, ...this.auditLogs];
    saveToStorage('auditLogs', this.auditLogs);
    this.syncAuditLogToSupabase(newLog);
    this.notify();
  }

  addNotification(title: string, message: string, type: NotificationItem['type'], severity: NotificationItem['severity'], link?: string) {
    const newNotif: NotificationItem = {
      id: generateEntityId(),
      title,
      message,
      type,
      severity,
      read: false,
      date: new Date().toISOString(),
      link
    };
    this.notifications = [newNotif, ...this.notifications];
    saveToStorage('notifications', this.notifications);
    this.syncNotificationToSupabase(newNotif);
    this.notify();
  }

  // ============================================================================
  // 1. BUSES CRUD
  // ============================================================================
  addBus(bus: Omit<Bus, 'id'>): Bus {
    const newBus: Bus = {
      ...bus,
      id: generateEntityId(),
      created_at: new Date().toISOString()
    };
    this.buses = [newBus, ...this.buses];
    saveToStorage('buses', this.buses);
    this.logAudit('BUS_CREATED', 'Bus', newBus.bus_number, `Added new vehicle ${newBus.bus_number} (${newBus.registration_number})`);
    this.syncBusToSupabase(newBus);
    this.notify();
    return newBus;
  }

  updateBus(id: string, busData: Partial<Bus>): Bus | null {
    const idx = this.buses.findIndex(b => b.id === id || b.bus_number === id);
    if (idx === -1) return null;
    const updated = { ...this.buses[idx], ...busData, updated_at: new Date().toISOString() };
    this.buses[idx] = updated;
    saveToStorage('buses', this.buses);
    this.logAudit('BUS_UPDATED', 'Bus', updated.bus_number, `Updated details for vehicle ${updated.bus_number}`);
    this.syncBusToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteBus(id: string): boolean {
    const bus = this.buses.find(b => b.id === id || b.bus_number === id);
    if (!bus) return false;
    this.buses = this.buses.filter(b => b.id !== bus.id);
    saveToStorage('buses', this.buses);
    this.logAudit('BUS_DELETED', 'Bus', bus.bus_number, `Deleted vehicle ${bus.bus_number} from fleet.`);
    this.deleteBusFromSupabase(bus.id || bus.bus_number);
    this.notify();
    return true;
  }

  // ============================================================================
  // 2. DRIVERS CRUD
  // ============================================================================
  addDriver(driver: Omit<Driver, 'id'>): Driver {
    const newDriver: Driver = {
      ...driver,
      id: generateEntityId(),
      created_at: new Date().toISOString()
    };
    this.drivers = [newDriver, ...this.drivers];
    saveToStorage('drivers', this.drivers);
    this.logAudit('DRIVER_ADDED', 'Driver', newDriver.name, `Onboarded driver ${newDriver.name} (Licence: ${newDriver.license_number})`);
    this.syncDriverToSupabase(newDriver);
    this.notify();
    return newDriver;
  }

  updateDriver(id: string, driverData: Partial<Driver>): Driver | null {
    const idx = this.drivers.findIndex(d => d.id === id || d.license_number === id);
    if (idx === -1) return null;
    const updated = { ...this.drivers[idx], ...driverData, updated_at: new Date().toISOString() };
    this.drivers[idx] = updated;
    saveToStorage('drivers', this.drivers);
    this.logAudit('DRIVER_UPDATED', 'Driver', updated.name, `Updated profile/availability for driver ${updated.name}`);
    this.syncDriverToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteDriver(id: string): boolean {
    const driver = this.drivers.find(d => d.id === id || d.name === id);
    if (!driver) return false;
    this.drivers = this.drivers.filter(d => d.id !== driver.id);
    saveToStorage('drivers', this.drivers);
    this.logAudit('DRIVER_REMOVED', 'Driver', driver.name, `De-registered driver ${driver.name}.`);
    this.deleteDriverFromSupabase(driver.id || driver.name);
    this.notify();
    return true;
  }

  // ============================================================================
  // 3. MECHANICS CRUD
  // ============================================================================
  addMechanic(mechanic: Omit<Mechanic, 'id'>): Mechanic {
    const newMechanic: Mechanic = {
      ...mechanic,
      id: generateEntityId()
    };
    this.mechanics = [newMechanic, ...this.mechanics];
    saveToStorage('mechanics', this.mechanics);
    this.logAudit('MECHANIC_ADDED', 'Mechanic', newMechanic.name, `Added mechanic ${newMechanic.name} (${newMechanic.specialty})`);
    this.syncMechanicToSupabase(newMechanic);
    this.notify();
    return newMechanic;
  }

  updateMechanic(id: string, mechanicData: Partial<Mechanic>): Mechanic | null {
    const idx = this.mechanics.findIndex(m => m.id === id || m.name === id);
    if (idx === -1) return null;
    const updated = { ...this.mechanics[idx], ...mechanicData };
    this.mechanics[idx] = updated;
    saveToStorage('mechanics', this.mechanics);
    this.logAudit('MECHANIC_UPDATED', 'Mechanic', updated.name, `Updated mechanic details for ${updated.name}`);
    this.syncMechanicToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteMechanic(id: string): boolean {
    const mechanic = this.mechanics.find(m => m.id === id || m.name === id);
    if (!mechanic) return false;
    this.mechanics = this.mechanics.filter(m => m.id !== mechanic.id);
    saveToStorage('mechanics', this.mechanics);
    this.logAudit('MECHANIC_REMOVED', 'Mechanic', mechanic.name, `Removed mechanic ${mechanic.name}.`);
    this.deleteMechanicFromSupabase(mechanic.id);
    this.notify();
    return true;
  }

  // ============================================================================
  // 4. ROUTES CRUD
  // ============================================================================
  addRoute(route: Omit<Route, 'id'>): Route {
    const newRoute: Route = {
      ...route,
      id: generateEntityId(),
      created_at: new Date().toISOString()
    };
    this.routes = [newRoute, ...this.routes];
    saveToStorage('routes', this.routes);
    this.logAudit('ROUTE_CREATED', 'Route', newRoute.route_code, `Configured new route ${newRoute.route_name}`);
    this.syncRouteToSupabase(newRoute);
    this.notify();
    return newRoute;
  }

  updateRoute(id: string, routeData: Partial<Route>): Route | null {
    const idx = this.routes.findIndex(r => r.id === id || r.route_code === id);
    if (idx === -1) return null;
    const updated = { ...this.routes[idx], ...routeData };
    this.routes[idx] = updated;
    saveToStorage('routes', this.routes);
    this.logAudit('ROUTE_UPDATED', 'Route', updated.route_code, `Updated route details for ${updated.route_name}`);
    this.syncRouteToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteRoute(id: string): boolean {
    const route = this.routes.find(r => r.id === id || r.route_code === id);
    if (!route) return false;
    this.routes = this.routes.filter(r => r.id !== route.id);
    saveToStorage('routes', this.routes);
    this.logAudit('ROUTE_DELETED', 'Route', route.route_code, `Removed route ${route.route_name}`);
    this.deleteRouteFromSupabase(route.id || route.route_code);
    this.notify();
    return true;
  }

  // ============================================================================
  // 5. TRIPS CRUD
  // ============================================================================
  addTrip(trip: Omit<Trip, 'id'>): { success: boolean; message: string; trip?: Trip } {
    const vehicleConflict = this.trips.find(t =>
      t.bus_id === trip.bus_id &&
      t.date === trip.date &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    );
    if (vehicleConflict) {
      return {
        success: false,
        message: `Schedule Conflict: Bus ${trip.bus_number} is already assigned to Trip ${vehicleConflict.trip_code} on ${trip.date}.`
      };
    }

    const driverConflict = this.trips.find(t =>
      t.driver_id === trip.driver_id &&
      t.date === trip.date &&
      t.status !== 'completed' &&
      t.status !== 'cancelled'
    );
    if (driverConflict) {
      return {
        success: false,
        message: `Driver Conflict: Driver ${trip.driver_name} is already assigned to Trip ${driverConflict.trip_code} on ${trip.date}.`
      };
    }

    const newTrip: Trip = {
      ...trip,
      id: generateEntityId(),
      created_at: new Date().toISOString()
    };
    this.trips = [newTrip, ...this.trips];
    saveToStorage('trips', this.trips);

    if (newTrip.status === 'in_progress') {
      const driver = this.drivers.find(d => d.id === newTrip.driver_id || d.name === newTrip.driver_name);
      if (driver) {
        this.updateDriver(driver.id, { today_availability: 'on_trip' });
      }
    }

    this.logAudit('TRIP_SCHEDULED', 'Trip', newTrip.trip_code, `Scheduled trip ${newTrip.trip_code} for ${newTrip.bus_number} (${newTrip.route_name})`);
    this.syncTripToSupabase(newTrip);
    this.notify();
    return { success: true, message: 'Trip successfully scheduled.', trip: newTrip };
  }

  updateTrip(id: string, tripData: Partial<Trip>): Trip | null {
    const idx = this.trips.findIndex(t => t.id === id || t.trip_code === id);
    if (idx === -1) return null;
    const updated = { ...this.trips[idx], ...tripData };
    this.trips[idx] = updated;
    saveToStorage('trips', this.trips);

    if (updated.status === 'completed') {
      const driver = this.drivers.find(d => d.id === updated.driver_id || d.name === updated.driver_name);
      if (driver && driver.today_availability === 'on_trip') {
        this.updateDriver(driver.id, { today_availability: 'available', total_trips: driver.total_trips + 1 });
      }
    }

    this.logAudit('TRIP_UPDATED', 'Trip', updated.trip_code, `Updated trip status to ${updated.status}`);
    this.syncTripToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteTrip(id: string): boolean {
    const trip = this.trips.find(t => t.id === id || t.trip_code === id);
    if (!trip) return false;
    this.trips = this.trips.filter(t => t.id !== trip.id);
    saveToStorage('trips', this.trips);
    this.logAudit('TRIP_DELETED', 'Trip', trip.trip_code, `Cancelled trip ${trip.trip_code}`);
    this.deleteTripFromSupabase(trip.id || trip.trip_code);
    this.notify();
    return true;
  }

  // ============================================================================
  // 6. SERVICE RECORDS (MAINTENANCE) CRUD
  // ============================================================================
  addServiceRecord(record: Omit<ServiceRecord, 'id'>): ServiceRecord {
    const newRecord: ServiceRecord = {
      ...record,
      id: generateEntityId(),
      created_at: new Date().toISOString()
    };
    this.serviceRecords = [newRecord, ...this.serviceRecords];
    saveToStorage('serviceRecords', this.serviceRecords);

    if (newRecord.status === 'in_progress' || newRecord.status === 'scheduled') {
      const bus = this.buses.find(b => b.bus_number === newRecord.bus_number);
      if (bus && bus.status !== 'maintenance') {
        this.updateBus(bus.id, { status: 'maintenance' });
      }
    }

    this.addExpense({
      category: 'maintenance',
      type: 'expense',
      amount: newRecord.cost,
      date: newRecord.service_date,
      description: `Service Record: ${newRecord.service_type} on ${newRecord.bus_number}`,
      bus_number: newRecord.bus_number,
      payment_method: 'Bank Transfer'
    });

    this.logAudit('SERVICE_SCHEDULED', 'Maintenance', newRecord.bus_number, `Created ${newRecord.service_type} service for ${newRecord.bus_number}`);
    this.syncServiceRecordToSupabase(newRecord);
    this.notify();
    return newRecord;
  }

  updateServiceRecord(id: string, recordData: Partial<ServiceRecord>): ServiceRecord | null {
    const idx = this.serviceRecords.findIndex(s => s.id === id);
    if (idx === -1) return null;
    const updated = { ...this.serviceRecords[idx], ...recordData };
    this.serviceRecords[idx] = updated;
    saveToStorage('serviceRecords', this.serviceRecords);

    if (updated.status === 'completed') {
      const pending = this.serviceRecords.filter(s => s.bus_number === updated.bus_number && (s.status === 'in_progress' || s.status === 'scheduled') && s.id !== id);
      if (pending.length === 0) {
        const bus = this.buses.find(b => b.bus_number === updated.bus_number);
        if (bus && bus.status === 'maintenance') {
          this.updateBus(bus.id, { status: 'active', last_service_date: updated.service_date, next_service_date: updated.next_service_prediction });
        }
      }
    }

    this.logAudit('SERVICE_UPDATED', 'Maintenance', updated.bus_number, `Updated maintenance record #${id} to status ${updated.status}`);
    this.syncServiceRecordToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteServiceRecord(id: string): boolean {
    const record = this.serviceRecords.find(s => s.id === id);
    if (!record) return false;
    this.serviceRecords = this.serviceRecords.filter(s => s.id !== id);
    saveToStorage('serviceRecords', this.serviceRecords);
    this.logAudit('SERVICE_DELETED', 'Maintenance', record.bus_number, `Deleted maintenance record for ${record.bus_number}`);
    this.deleteServiceRecordFromSupabase(id);
    this.notify();
    return true;
  }

  // ============================================================================
  // 7. INVENTORY CRUD & STOCK MOVEMENTS
  // ============================================================================
  addInventoryItem(item: Omit<InventoryItem, 'id'>): InventoryItem {
    const newItem: InventoryItem = {
      ...item,
      id: generateEntityId(),
      last_updated: new Date().toISOString().split('T')[0]
    };
    this.inventory = [newItem, ...this.inventory];
    saveToStorage('inventory', this.inventory);
    this.logAudit('INVENTORY_ITEM_ADDED', 'Inventory', newItem.sku, `Added spare part ${newItem.item_name} (${newItem.sku})`);
    this.syncInventoryItemToSupabase(newItem);
    this.notify();
    return newItem;
  }

  updateInventoryItem(id: string, itemData: Partial<InventoryItem>): InventoryItem | null {
    const idx = this.inventory.findIndex(i => i.id === id || i.sku === id);
    if (idx === -1) return null;
    const updated = { ...this.inventory[idx], ...itemData, last_updated: new Date().toISOString().split('T')[0] };
    this.inventory[idx] = updated;
    saveToStorage('inventory', this.inventory);
    this.logAudit('INVENTORY_ITEM_UPDATED', 'Inventory', updated.sku, `Updated inventory for ${updated.item_name}`);
    this.syncInventoryItemToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteInventoryItem(id: string): boolean {
    const item = this.inventory.find(i => i.id === id || i.sku === id);
    if (!item) return false;
    this.inventory = this.inventory.filter(i => i.id !== item.id);
    saveToStorage('inventory', this.inventory);
    this.logAudit('INVENTORY_ITEM_DELETED', 'Inventory', item.sku, `Removed ${item.item_name} from catalogue.`);
    this.deleteInventoryItemFromSupabase(item.id || item.sku);
    this.notify();
    return true;
  }

  recordInventoryMovement(movement: Omit<InventoryMovement, 'id'>): { success: boolean; message: string } {
    const item = this.inventory.find(i => i.id === movement.item_id);
    if (!item) return { success: false, message: 'Item not found in inventory catalogue.' };

    if (movement.type === 'issued') {
      if (movement.quantity > item.current_stock) {
        return {
          success: false,
          message: `Cannot issue ${movement.quantity} units. Only ${item.current_stock} ${item.unit} available in stock.`
        };
      }
      item.current_stock -= movement.quantity;
      if (item.current_stock <= item.minimum_stock) {
        this.addNotification(
          'Low Stock Warning',
          `${item.item_name} stock dropped to ${item.current_stock} ${item.unit} (Minimum: ${item.minimum_stock} ${item.unit}).`,
          'inventory',
          'warning',
          '/inventory'
        );
      }
    } else {
      item.current_stock += movement.quantity;
    }

    item.last_updated = movement.date;
    saveToStorage('inventory', this.inventory);

    const newMov: InventoryMovement = {
      ...movement,
      id: generateEntityId()
    };
    this.inventoryMovements = [newMov, ...this.inventoryMovements];
    saveToStorage('inventoryMovements', this.inventoryMovements);

    this.logAudit(
      movement.type === 'issued' ? 'STOCK_ISSUED' : 'STOCK_RECEIVED',
      'Inventory',
      item.sku,
      `${movement.type === 'issued' ? 'Issued' : 'Received'} ${movement.quantity} ${item.unit} of ${item.item_name}`
    );
    this.syncInventoryMovementToSupabase(newMov);
    this.notify();
    return { success: true, message: `Successfully recorded stock ${movement.type}.` };
  }

  // ============================================================================
  // 8. FUEL RECORDS CRUD
  // ============================================================================
  addFuelRecord(record: Omit<FuelRecord, 'id'>): FuelRecord {
    const calculatedCost = record.amount > 0 ? record.amount : record.liters * record.price_per_liter;
    const newRecord: FuelRecord = {
      ...record,
      amount: calculatedCost,
      id: generateEntityId(),
      created_at: new Date().toISOString()
    };
    this.fuelRecords = [newRecord, ...this.fuelRecords];
    saveToStorage('fuelRecords', this.fuelRecords);

    this.addExpense({
      category: 'fuel',
      type: 'expense',
      amount: newRecord.amount,
      date: newRecord.date,
      description: `Fuel purchase for ${newRecord.bus_number} (${newRecord.liters}L @ ₹${newRecord.price_per_liter}/L)`,
      bus_number: newRecord.bus_number,
      payment_method: 'Card'
    });

    this.logAudit('FUEL_LOGGED', 'Fuel', newRecord.bus_number, `Logged ${newRecord.liters}L fuel purchase for ${newRecord.bus_number}`);
    this.syncFuelRecordToSupabase(newRecord);
    this.notify();
    return newRecord;
  }

  updateFuelRecord(id: string, recordData: Partial<FuelRecord>): FuelRecord | null {
    const idx = this.fuelRecords.findIndex(f => f.id === id);
    if (idx === -1) return null;
    const updated = { ...this.fuelRecords[idx], ...recordData };
    this.fuelRecords[idx] = updated;
    saveToStorage('fuelRecords', this.fuelRecords);
    this.syncFuelRecordToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteFuelRecord(id: string): boolean {
    const record = this.fuelRecords.find(f => f.id === id);
    if (!record) return false;
    this.fuelRecords = this.fuelRecords.filter(f => f.id !== id);
    saveToStorage('fuelRecords', this.fuelRecords);
    this.logAudit('FUEL_DELETED', 'Fuel', record.bus_number, `Deleted fuel entry for ${record.bus_number}`);
    this.deleteFuelRecordFromSupabase(id);
    this.notify();
    return true;
  }

  // ============================================================================
  // 9. EXPENSES CRUD
  // ============================================================================
  addExpense(expense: Omit<Expense, 'id'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: generateEntityId(),
      created_at: new Date().toISOString()
    };
    this.expenses = [newExpense, ...this.expenses];
    saveToStorage('expenses', this.expenses);
    this.logAudit(
      newExpense.type === 'revenue' ? 'REVENUE_RECORDED' : 'EXPENSE_RECORDED',
      'Finance',
      newExpense.category,
      `${newExpense.type === 'revenue' ? 'Income' : 'Expense'} of ₹${newExpense.amount.toLocaleString()} for ${newExpense.description}`
    );
    this.syncExpenseToSupabase(newExpense);
    this.notify();
    return newExpense;
  }

  updateExpense(id: string, expenseData: Partial<Expense>): Expense | null {
    const idx = this.expenses.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const updated = { ...this.expenses[idx], ...expenseData };
    this.expenses[idx] = updated;
    saveToStorage('expenses', this.expenses);
    this.syncExpenseToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteExpense(id: string): boolean {
    const expense = this.expenses.find(e => e.id === id);
    if (!expense) return false;
    this.expenses = this.expenses.filter(e => e.id !== id);
    saveToStorage('expenses', this.expenses);
    this.deleteExpenseFromSupabase(id);
    this.notify();
    return true;
  }

  // ============================================================================
  // 10. EMI LOANS & PAYMENTS CRUD
  // ============================================================================
  addLoan(loan: Omit<EmiLoan, 'id'>): EmiLoan {
    const calculatedEmi = calculateEmi(loan.principal_amount, loan.interest_rate, loan.term_months);
    const newLoan: EmiLoan = {
      ...loan,
      monthly_emi: calculatedEmi > 0 ? calculatedEmi : loan.monthly_emi,
      outstanding_balance: loan.principal_amount,
      total_paid: 0,
      installments_paid: 0,
      installments_total: loan.term_months,
      id: generateEntityId()
    };
    this.loans = [newLoan, ...this.loans];
    saveToStorage('loans', this.loans);
    this.logAudit('LOAN_ADDED', 'EMI', newLoan.loan_id, `Registered commercial loan for ${newLoan.bus_number} (Principal: ₹${newLoan.principal_amount.toLocaleString()})`);
    this.syncLoanToSupabase(newLoan);
    this.notify();
    return newLoan;
  }

  updateLoan(id: string, loanData: Partial<EmiLoan>): EmiLoan | null {
    const idx = this.loans.findIndex(l => l.id === id || l.loan_id === id);
    if (idx === -1) return null;
    const updated = { ...this.loans[idx], ...loanData };
    this.loans[idx] = updated;
    saveToStorage('loans', this.loans);
    this.syncLoanToSupabase(updated);
    this.notify();
    return updated;
  }

  deleteLoan(id: string): boolean {
    const loan = this.loans.find(l => l.id === id || l.loan_id === id);
    if (!loan) return false;
    this.loans = this.loans.filter(l => l.id !== loan.id);
    saveToStorage('loans', this.loans);
    this.logAudit('LOAN_DELETED', 'EMI', loan.loan_id, `Cancelled loan agreement ${loan.loan_id}`);
    this.deleteLoanFromSupabase(loan.id || loan.loan_id);
    this.notify();
    return true;
  }

  recordEmiPayment(loanId: string, amount: number, paymentDate: string): { success: boolean; message: string } {
    const loan = this.loans.find(l => l.id === loanId || l.loan_id === loanId);
    if (!loan) return { success: false, message: 'Loan not found.' };

    const paymentAmount = amount > 0 ? amount : loan.monthly_emi;
    loan.total_paid += paymentAmount;
    loan.installments_paid += 1;
    loan.outstanding_balance = Math.max(0, loan.outstanding_balance - paymentAmount);

    const nextDate = new Date(loan.next_due_date || paymentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    loan.next_due_date = nextDate.toISOString().split('T')[0];

    if (loan.installments_paid >= loan.installments_total || loan.outstanding_balance === 0) {
      loan.status = 'completed';
    }

    saveToStorage('loans', this.loans);

    const paymentRecord: EmiPayment = {
      id: generateEntityId(),
      loan_id: loan.id,
      installment_number: loan.installments_paid,
      due_date: loan.next_due_date,
      payment_date: paymentDate,
      amount: paymentAmount,
      status: 'paid',
      reference: `EMI-INST-${loan.installments_paid}`
    };
    this.emiPayments = [paymentRecord, ...this.emiPayments];
    saveToStorage('emiPayments', this.emiPayments);

    this.addExpense({
      category: 'emi',
      type: 'expense',
      amount: paymentAmount,
      date: paymentDate,
      description: `EMI Payment #${loan.installments_paid} for ${loan.bus_number} (${loan.lender})`,
      bus_number: loan.bus_number,
      payment_method: 'Bank Transfer'
    });

    this.logAudit('EMI_PAYMENT_RECORDED', 'EMI', loan.loan_id, `Recorded EMI installment of ₹${paymentAmount.toLocaleString()} for ${loan.bus_number}`);
    this.syncLoanToSupabase(loan);
    this.syncEmiPaymentToSupabase(paymentRecord);
    this.notify();
    return { success: true, message: `EMI payment recorded. Remaining installments: ${loan.installments_total - loan.installments_paid}` };
  }

  // ============================================================================
  // 11. GPS VEHICLES
  // ============================================================================
  updateGpsVehicle(gpsData: GpsVehicle) {
    const idx = this.gpsVehicles.findIndex(g => g.bus_id === gpsData.bus_id || g.bus_number === gpsData.bus_number);
    if (idx !== -1) {
      this.gpsVehicles[idx] = { ...this.gpsVehicles[idx], ...gpsData, last_updated: new Date().toISOString() };
    } else {
      this.gpsVehicles.push(gpsData);
    }
    saveToStorage('gpsVehicles', this.gpsVehicles);
    this.syncGpsVehicleToSupabase(gpsData);
    this.notify();
  }

  // ============================================================================
  // 12. NOTIFICATIONS MANAGEMENT
  // ============================================================================
  markNotificationAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      saveToStorage('notifications', this.notifications);
      this.syncNotificationReadToSupabase(id, true);
      this.notify();
    }
  }

  markAllNotificationsAsRead() {
    this.notifications.forEach(n => n.read = true);
    saveToStorage('notifications', this.notifications);
    this.syncAllNotificationsReadToSupabase();
    this.notify();
  }

  deleteNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    saveToStorage('notifications', this.notifications);
    this.deleteNotificationFromSupabase(id);
    this.notify();
  }

  // ============================================================================
  // 13. USER PROFILE & SYSTEM SETTINGS
  // ============================================================================
  updateProfile(profileData: Partial<UserProfile>) {
    // Role update is omitted to prevent client-side privilege escalation
    const { role: _omittedRole, ...safeData } = profileData;
    this.profile = { ...this.profile, ...safeData };
    saveToStorage('profile', this.profile);
    this.logAudit('PROFILE_UPDATED', 'User', this.profile.email, 'Updated user profile information');
    this.notify();
  }

  updateSettings(settingsData: Partial<SystemSettings>) {
    this.settings = { ...this.settings, ...settingsData };
    saveToStorage('settings', this.settings);
    this.logAudit('SETTINGS_CHANGED', 'System', 'Global', 'Updated system preferences and alert thresholds');
    this.syncSettingsToSupabase(this.settings);
    this.notify();
  }

  // ============================================================================
  // DEMO MODE ISOLATED RESET
  // ============================================================================
  resetToDemo() {
    if (this.currentUserId && !this.isDemoMode) {
      this.clearUserData();
      return;
    }
    this.buses = INITIAL_BUSES;
    this.drivers = INITIAL_DRIVERS;
    this.mechanics = INITIAL_MECHANICS;
    this.serviceRecords = INITIAL_SERVICE_RECORDS;
    this.inventory = INITIAL_INVENTORY;
    this.inventoryMovements = INITIAL_INVENTORY_MOVEMENTS;
    this.routes = INITIAL_ROUTES;
    this.trips = INITIAL_TRIPS;
    this.fuelRecords = INITIAL_FUEL_RECORDS;
    this.expenses = INITIAL_EXPENSES;
    this.loans = INITIAL_LOANS;
    this.emiPayments = [];
    this.gpsVehicles = INITIAL_GPS_VEHICLES;
    this.notifications = INITIAL_NOTIFICATIONS;
    this.auditLogs = INITIAL_AUDIT_LOGS;
    this.profile = INITIAL_DEMO_PROFILE;
    this.settings = INITIAL_SETTINGS;
    saveToStorage('buses', this.buses);
    saveToStorage('drivers', this.drivers);
    saveToStorage('mechanics', this.mechanics);
    saveToStorage('serviceRecords', this.serviceRecords);
    saveToStorage('inventory', this.inventory);
    saveToStorage('inventoryMovements', this.inventoryMovements);
    saveToStorage('routes', this.routes);
    saveToStorage('trips', this.trips);
    saveToStorage('fuelRecords', this.fuelRecords);
    saveToStorage('expenses', this.expenses);
    saveToStorage('loans', this.loans);
    saveToStorage('emiPayments', this.emiPayments);
    saveToStorage('gpsVehicles', this.gpsVehicles);
    saveToStorage('notifications', this.notifications);
    saveToStorage('auditLogs', this.auditLogs);
    saveToStorage('profile', this.profile);
    saveToStorage('settings', this.settings);
    this.notify();
  }
}

export const fleetStore = new FleetStore();
