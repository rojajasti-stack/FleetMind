import {
  Bus, Driver, Mechanic, ServiceRecord, InventoryItem, InventoryMovement,
  Route, Trip, FuelRecord, Expense, EmiLoan, GpsVehicle,
  NotificationItem, AuditLog, UserProfile, SystemSettings
} from '../types';
import { calculateEmi } from '../utils/formatters';

const STORAGE_KEY_PREFIX = 'fleetmind_v1_';

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

const INITIAL_PROFILE: UserProfile = {
  id: 'usr-1',
  full_name: 'Tejeshwar Reddy',
  email: 'tejeshwar@fleetmind.ai',
  phone: '+91 98490 12345',
  job_title: 'Director of Fleet Operations & Logistics',
  company_name: 'FleetMind Transport Solutions Ltd.',
  role: 'Fleet Manager',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
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
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to save ${key} to storage:`, err);
  }
}

// In-Memory store initialized with localStorage or fallback
class FleetStore {
  private listeners: Set<() => void> = new Set();

  buses: Bus[] = loadFromStorage('buses', INITIAL_BUSES);
  drivers: Driver[] = loadFromStorage('drivers', INITIAL_DRIVERS);
  mechanics: Mechanic[] = loadFromStorage('mechanics', INITIAL_MECHANICS);
  serviceRecords: ServiceRecord[] = loadFromStorage('serviceRecords', INITIAL_SERVICE_RECORDS);
  inventory: InventoryItem[] = loadFromStorage('inventory', INITIAL_INVENTORY);
  inventoryMovements: InventoryMovement[] = loadFromStorage('inventoryMovements', INITIAL_INVENTORY_MOVEMENTS);
  routes: Route[] = loadFromStorage('routes', INITIAL_ROUTES);
  trips: Trip[] = loadFromStorage('trips', INITIAL_TRIPS);
  fuelRecords: FuelRecord[] = loadFromStorage('fuelRecords', INITIAL_FUEL_RECORDS);
  expenses: Expense[] = loadFromStorage('expenses', INITIAL_EXPENSES);
  loans: EmiLoan[] = loadFromStorage('loans', INITIAL_LOANS);
  gpsVehicles: GpsVehicle[] = loadFromStorage('gpsVehicles', INITIAL_GPS_VEHICLES);
  notifications: NotificationItem[] = loadFromStorage('notifications', INITIAL_NOTIFICATIONS);
  auditLogs: AuditLog[] = loadFromStorage('auditLogs', INITIAL_AUDIT_LOGS);
  profile: UserProfile = loadFromStorage('profile', INITIAL_PROFILE);
  settings: SystemSettings = loadFromStorage('settings', INITIAL_SETTINGS);

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // Audit Log helper
  logAudit(action: string, entity_type: string, entity_id: string, details: string) {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      user: this.profile.full_name || 'Fleet Manager',
      action,
      entity_type,
      entity_id,
      details
    };
    this.auditLogs = [newLog, ...this.auditLogs];
    saveToStorage('auditLogs', this.auditLogs);
    this.notify();
  }

  // Notification helper
  addNotification(title: string, message: string, type: NotificationItem['type'], severity: NotificationItem['severity'], link?: string) {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
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
    this.notify();
  }

  // BUSES CRUD
  addBus(bus: Omit<Bus, 'id'>): Bus {
    const newBus: Bus = {
      ...bus,
      id: `bus-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.buses = [newBus, ...this.buses];
    saveToStorage('buses', this.buses);
    this.logAudit('BUS_CREATED', 'Bus', newBus.bus_number, `Added new vehicle ${newBus.bus_number} (${newBus.registration_number})`);
    this.notify();
    return newBus;
  }

  updateBus(id: string, busData: Partial<Bus>): Bus | null {
    const idx = this.buses.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const updated = { ...this.buses[idx], ...busData, updated_at: new Date().toISOString() };
    this.buses[idx] = updated;
    saveToStorage('buses', this.buses);
    this.logAudit('BUS_UPDATED', 'Bus', updated.bus_number, `Updated details for vehicle ${updated.bus_number}`);
    this.notify();
    return updated;
  }

  deleteBus(id: string): boolean {
    const bus = this.buses.find(b => b.id === id);
    if (!bus) return false;
    this.buses = this.buses.filter(b => b.id !== id);
    saveToStorage('buses', this.buses);
    this.logAudit('BUS_DELETED', 'Bus', bus.bus_number, `Deleted vehicle ${bus.bus_number} from fleet.`);
    this.notify();
    return true;
  }

  // DRIVERS CRUD
  addDriver(driver: Omit<Driver, 'id'>): Driver {
    const newDriver: Driver = {
      ...driver,
      id: `drv-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.drivers = [newDriver, ...this.drivers];
    saveToStorage('drivers', this.drivers);
    this.logAudit('DRIVER_ADDED', 'Driver', newDriver.name, `Onboarded driver ${newDriver.name} (Licence: ${newDriver.license_number})`);
    this.notify();
    return newDriver;
  }

  updateDriver(id: string, driverData: Partial<Driver>): Driver | null {
    const idx = this.drivers.findIndex(d => d.id === id);
    if (idx === -1) return null;
    const updated = { ...this.drivers[idx], ...driverData, updated_at: new Date().toISOString() };
    this.drivers[idx] = updated;
    saveToStorage('drivers', this.drivers);
    this.logAudit('DRIVER_UPDATED', 'Driver', updated.name, `Updated profile/availability for driver ${updated.name}`);
    this.notify();
    return updated;
  }

  deleteDriver(id: string): boolean {
    const driver = this.drivers.find(d => d.id === id);
    if (!driver) return false;
    this.drivers = this.drivers.filter(d => d.id !== id);
    saveToStorage('drivers', this.drivers);
    this.logAudit('DRIVER_REMOVED', 'Driver', driver.name, `De-registered driver ${driver.name}.`);
    this.notify();
    return true;
  }

  // SERVICE RECORDS CRUD
  addServiceRecord(record: Omit<ServiceRecord, 'id'>): ServiceRecord {
    const newRecord: ServiceRecord = {
      ...record,
      id: `srv-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.serviceRecords = [newRecord, ...this.serviceRecords];
    saveToStorage('serviceRecords', this.serviceRecords);

    // If scheduled/in_progress, update bus status to maintenance
    if (newRecord.status === 'in_progress' || newRecord.status === 'scheduled') {
      const bus = this.buses.find(b => b.bus_number === newRecord.bus_number);
      if (bus && bus.status !== 'maintenance') {
        this.updateBus(bus.id, { status: 'maintenance' });
      }
    }

    // Also record expense in Finance
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
    this.notify();
    return newRecord;
  }

  updateServiceRecord(id: string, recordData: Partial<ServiceRecord>): ServiceRecord | null {
    const idx = this.serviceRecords.findIndex(s => s.id === id);
    if (idx === -1) return null;
    const updated = { ...this.serviceRecords[idx], ...recordData };
    this.serviceRecords[idx] = updated;
    saveToStorage('serviceRecords', this.serviceRecords);

    // If marked completed, update bus status back to active if all other services are complete
    if (updated.status === 'completed') {
      const pendingServices = this.serviceRecords.filter(s => s.bus_number === updated.bus_number && (s.status === 'in_progress' || s.status === 'scheduled') && s.id !== id);
      if (pendingServices.length === 0) {
        const bus = this.buses.find(b => b.bus_number === updated.bus_number);
        if (bus && bus.status === 'maintenance') {
          this.updateBus(bus.id, { status: 'active', last_service_date: updated.service_date, next_service_date: updated.next_service_prediction });
        }
      }
    }

    this.logAudit('SERVICE_UPDATED', 'Maintenance', updated.bus_number, `Updated maintenance record #${id} to status ${updated.status}`);
    this.notify();
    return updated;
  }

  deleteServiceRecord(id: string): boolean {
    this.serviceRecords = this.serviceRecords.filter(s => s.id !== id);
    saveToStorage('serviceRecords', this.serviceRecords);
    this.notify();
    return true;
  }

  // INVENTORY CRUD
  addInventoryItem(item: Omit<InventoryItem, 'id'>): InventoryItem {
    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}`,
      last_updated: new Date().toISOString().split('T')[0]
    };
    this.inventory = [newItem, ...this.inventory];
    saveToStorage('inventory', this.inventory);
    this.logAudit('INVENTORY_ITEM_ADDED', 'Inventory', newItem.sku, `Added spare part ${newItem.item_name} (${newItem.sku})`);
    this.notify();
    return newItem;
  }

  updateInventoryItem(id: string, itemData: Partial<InventoryItem>): InventoryItem | null {
    const idx = this.inventory.findIndex(i => i.id === id);
    if (idx === -1) return null;
    const updated = { ...this.inventory[idx], ...itemData, last_updated: new Date().toISOString().split('T')[0] };
    this.inventory[idx] = updated;
    saveToStorage('inventory', this.inventory);
    this.logAudit('INVENTORY_ITEM_UPDATED', 'Inventory', updated.sku, `Updated inventory for ${updated.item_name}`);
    this.notify();
    return updated;
  }

  deleteInventoryItem(id: string): boolean {
    const item = this.inventory.find(i => i.id === id);
    if (!item) return false;
    this.inventory = this.inventory.filter(i => i.id !== id);
    saveToStorage('inventory', this.inventory);
    this.logAudit('INVENTORY_ITEM_DELETED', 'Inventory', item.sku, `Removed ${item.item_name} from catalogue.`);
    this.notify();
    return true;
  }

  // Inventory Stock Movements (Receipt and Issuance with validation preventing negative stock)
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
      // Received
      item.current_stock += movement.quantity;
    }

    item.last_updated = movement.date;
    saveToStorage('inventory', this.inventory);

    const newMov: InventoryMovement = {
      ...movement,
      id: `mov-${Date.now()}`
    };
    this.inventoryMovements = [newMov, ...this.inventoryMovements];
    saveToStorage('inventoryMovements', this.inventoryMovements);

    this.logAudit(
      movement.type === 'issued' ? 'STOCK_ISSUED' : 'STOCK_RECEIVED',
      'Inventory',
      item.sku,
      `${movement.type === 'issued' ? 'Issued' : 'Received'} ${movement.quantity} ${item.unit} of ${item.item_name}`
    );
    this.notify();
    return { success: true, message: `Successfully recorded stock ${movement.type}.` };
  }

  // ROUTES CRUD
  addRoute(route: Omit<Route, 'id'>): Route {
    const newRoute: Route = {
      ...route,
      id: `rt-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.routes = [newRoute, ...this.routes];
    saveToStorage('routes', this.routes);
    this.logAudit('ROUTE_CREATED', 'Route', newRoute.route_code, `Configured new route ${newRoute.route_name}`);
    this.notify();
    return newRoute;
  }

  updateRoute(id: string, routeData: Partial<Route>): Route | null {
    const idx = this.routes.findIndex(r => r.id === id);
    if (idx === -1) return null;
    const updated = { ...this.routes[idx], ...routeData };
    this.routes[idx] = updated;
    saveToStorage('routes', this.routes);
    this.logAudit('ROUTE_UPDATED', 'Route', updated.route_code, `Updated route details for ${updated.route_name}`);
    this.notify();
    return updated;
  }

  deleteRoute(id: string): boolean {
    this.routes = this.routes.filter(r => r.id !== id);
    saveToStorage('routes', this.routes);
    this.notify();
    return true;
  }

  // TRIPS CRUD (With Schedule Conflict Prevention!)
  addTrip(trip: Omit<Trip, 'id'>): { success: boolean; message: string; trip?: Trip } {
    // Conflict check: Check if vehicle is already assigned to an ongoing or scheduled trip at the same date and overlapping time
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

    // Driver conflict check
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
      id: `trp-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.trips = [newTrip, ...this.trips];
    saveToStorage('trips', this.trips);

    // If trip in progress, mark driver on_trip
    if (newTrip.status === 'in_progress') {
      const driver = this.drivers.find(d => d.id === newTrip.driver_id);
      if (driver) {
        this.updateDriver(driver.id, { today_availability: 'on_trip' });
      }
    }

    this.logAudit('TRIP_SCHEDULED', 'Trip', newTrip.trip_code, `Scheduled trip ${newTrip.trip_code} for ${newTrip.bus_number} (${newTrip.route_name})`);
    this.notify();
    return { success: true, message: 'Trip successfully scheduled.', trip: newTrip };
  }

  updateTrip(id: string, tripData: Partial<Trip>): Trip | null {
    const idx = this.trips.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const updated = { ...this.trips[idx], ...tripData };
    this.trips[idx] = updated;
    saveToStorage('trips', this.trips);

    if (updated.status === 'completed') {
      // Free driver availability
      const driver = this.drivers.find(d => d.id === updated.driver_id);
      if (driver && driver.today_availability === 'on_trip') {
        this.updateDriver(driver.id, { today_availability: 'available', total_trips: driver.total_trips + 1 });
      }
    }

    this.logAudit('TRIP_UPDATED', 'Trip', updated.trip_code, `Updated trip status to ${updated.status}`);
    this.notify();
    return updated;
  }

  deleteTrip(id: string): boolean {
    this.trips = this.trips.filter(t => t.id !== id);
    saveToStorage('trips', this.trips);
    this.notify();
    return true;
  }

  // FUEL RECORDS CRUD
  addFuelRecord(record: Omit<FuelRecord, 'id'>): FuelRecord {
    const calculatedCost = record.amount > 0 ? record.amount : record.liters * record.price_per_liter;
    const newRecord: FuelRecord = {
      ...record,
      amount: calculatedCost,
      id: `fuel-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    this.fuelRecords = [newRecord, ...this.fuelRecords];
    saveToStorage('fuelRecords', this.fuelRecords);

    // Also record expense in Finance
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
    this.notify();
    return newRecord;
  }

  updateFuelRecord(id: string, recordData: Partial<FuelRecord>): FuelRecord | null {
    const idx = this.fuelRecords.findIndex(f => f.id === id);
    if (idx === -1) return null;
    const updated = { ...this.fuelRecords[idx], ...recordData };
    this.fuelRecords[idx] = updated;
    saveToStorage('fuelRecords', this.fuelRecords);
    this.notify();
    return updated;
  }

  deleteFuelRecord(id: string): boolean {
    this.fuelRecords = this.fuelRecords.filter(f => f.id !== id);
    saveToStorage('fuelRecords', this.fuelRecords);
    this.notify();
    return true;
  }

  // EXPENSES / TRANSACTIONS CRUD
  addExpense(expense: Omit<Expense, 'id'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
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
    this.notify();
    return newExpense;
  }

  updateExpense(id: string, expenseData: Partial<Expense>): Expense | null {
    const idx = this.expenses.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const updated = { ...this.expenses[idx], ...expenseData };
    this.expenses[idx] = updated;
    saveToStorage('expenses', this.expenses);
    this.notify();
    return updated;
  }

  deleteExpense(id: string): boolean {
    this.expenses = this.expenses.filter(e => e.id !== id);
    saveToStorage('expenses', this.expenses);
    this.notify();
    return true;
  }

  // EMI LOANS CRUD & Payment Recording
  addLoan(loan: Omit<EmiLoan, 'id'>): EmiLoan {
    const calculatedEmi = calculateEmi(loan.principal_amount, loan.interest_rate, loan.term_months);
    const newLoan: EmiLoan = {
      ...loan,
      monthly_emi: calculatedEmi > 0 ? calculatedEmi : loan.monthly_emi,
      outstanding_balance: loan.principal_amount,
      total_paid: 0,
      installments_paid: 0,
      installments_total: loan.term_months,
      id: `loan-${Date.now()}`
    };
    this.loans = [newLoan, ...this.loans];
    saveToStorage('loans', this.loans);
    this.logAudit('LOAN_ADDED', 'EMI', newLoan.loan_id, `Registered commercial loan for ${newLoan.bus_number} (Principal: ₹${newLoan.principal_amount.toLocaleString()})`);
    this.notify();
    return newLoan;
  }

  updateLoan(id: string, loanData: Partial<EmiLoan>): EmiLoan | null {
    const idx = this.loans.findIndex(l => l.id === id);
    if (idx === -1) return null;
    const updated = { ...this.loans[idx], ...loanData };
    this.loans[idx] = updated;
    saveToStorage('loans', this.loans);
    this.notify();
    return updated;
  }

  // Record an actual EMI installment payment
  recordEmiPayment(loanId: string, amount: number, paymentDate: string): { success: boolean; message: string } {
    const loan = this.loans.find(l => l.id === loanId);
    if (!loan) return { success: false, message: 'Loan not found.' };

    const paymentAmount = amount > 0 ? amount : loan.monthly_emi;
    loan.total_paid += paymentAmount;
    loan.installments_paid += 1;
    loan.outstanding_balance = Math.max(0, loan.outstanding_balance - paymentAmount);

    // Calculate next due date (add 1 month)
    const nextDate = new Date(loan.next_due_date || paymentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    loan.next_due_date = nextDate.toISOString().split('T')[0];

    if (loan.installments_paid >= loan.installments_total || loan.outstanding_balance === 0) {
      loan.status = 'completed';
    }

    saveToStorage('loans', this.loans);

    // Record as Finance Expense
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
    this.notify();
    return { success: true, message: `EMI payment recorded. Remaining installments: ${loan.installments_total - loan.installments_paid}` };
  }

  // NOTIFICATIONS
  markNotificationAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      saveToStorage('notifications', this.notifications);
      this.notify();
    }
  }

  markAllNotificationsAsRead() {
    this.notifications.forEach(n => n.read = true);
    saveToStorage('notifications', this.notifications);
    this.notify();
  }

  deleteNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    saveToStorage('notifications', this.notifications);
    this.notify();
  }

  // PROFILE & SETTINGS
  updateProfile(profileData: Partial<UserProfile>) {
    this.profile = { ...this.profile, ...profileData };
    saveToStorage('profile', this.profile);
    this.logAudit('PROFILE_UPDATED', 'User', this.profile.email, 'Updated user profile information');
    this.notify();
  }

  updateSettings(settingsData: Partial<SystemSettings>) {
    this.settings = { ...this.settings, ...settingsData };
    saveToStorage('settings', this.settings);
    this.logAudit('SETTINGS_CHANGED', 'System', 'Global', 'Updated system preferences and alert thresholds');
    this.notify();
  }

  // RESET TO DEMO DATA
  resetToDemo() {
    localStorage.clear();
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
    this.gpsVehicles = INITIAL_GPS_VEHICLES;
    this.notifications = INITIAL_NOTIFICATIONS;
    this.auditLogs = INITIAL_AUDIT_LOGS;
    this.profile = INITIAL_PROFILE;
    this.settings = INITIAL_SETTINGS;
    this.notify();
  }
}

export const fleetStore = new FleetStore();
