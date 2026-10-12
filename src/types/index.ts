export type VehicleStatus = 'active' | 'maintenance' | 'inactive';
export type FuelType = 'Diesel' | 'Electric' | 'CNG' | 'Petrol' | 'Hybrid';
export type DriverStatus = 'active' | 'inactive' | 'on_leave';
export type DriverAvailability = 'available' | 'on_trip' | 'off_duty';
export type ServiceType = 'oil_change' | 'brake_repair' | 'engine_tuneup' | 'tire_replacement' | 'battery' | 'inspection' | 'other';
export type ServiceStatus = 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
export type TransactionType = 'revenue' | 'expense';
export type ExpenseCategory = 'revenue' | 'fuel' | 'maintenance' | 'driver_salary' | 'insurance' | 'tolls' | 'parts' | 'emi' | 'other';
export type NotificationType = 'maintenance' | 'insurance' | 'license' | 'inventory' | 'emi' | 'trip' | 'system';

export interface Bus {
  id: string;
  bus_number: string;
  registration_number: string;
  model: string;
  manufacturer: string;
  year: number;
  capacity: number;
  status: VehicleStatus;
  fuel_type: FuelType;
  odometer: number;
  assigned_driver?: string;
  route?: string;
  insurance_expiry: string;
  registration_expiry: string;
  last_service_date: string;
  next_service_date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  license_number: string;
  license_expiry: string;
  joining_date: string;
  assigned_bus?: string;
  status: DriverStatus;
  today_availability: DriverAvailability;
  experience_years: number;
  total_trips: number;
  distance_km: number;
  safety_score: number;
  profile_photo?: string;
  emergency_contact?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Mechanic {
  id: string;
  name: string;
  phone: string;
  specialty: string;
  status: 'available' | 'busy' | 'off_duty';
  active_tasks: number;
  hourly_rate: number;
}

export interface ServiceRecord {
  id: string;
  bus_number: string;
  service_type: ServiceType;
  service_date: string;
  cost: number;
  parts_used: string;
  mechanic_notes: string;
  next_service_prediction: string;
  mechanic_name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: ServiceStatus;
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  sku: string;
  category: 'engine' | 'brakes' | 'electrical' | 'tires' | 'fluids' | 'suspension' | 'other';
  current_stock: number;
  minimum_stock: number;
  purchase_price: number;
  vendor: string;
  unit: string;
  storage_location: string;
  last_updated?: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  item_name: string;
  type: 'received' | 'issued';
  quantity: number;
  bus_number?: string;
  date: string;
  notes: string;
}

export interface RouteStop {
  stop_name: string;
  sequence: number;
  estimated_mins: number;
}

export interface Route {
  id: string;
  route_name: string;
  route_code: string;
  start_point: string;
  end_point: string;
  distance_km: number;
  estimated_time: string;
  fare: number;
  assigned_buses?: string[];
  assigned_drivers?: string[];
  stops?: string[];
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface Trip {
  id: string;
  trip_code: string;
  route_id: string;
  route_name: string;
  bus_id: string;
  bus_number: string;
  driver_id: string;
  driver_name: string;
  date: string;
  start_time: string;
  end_time: string;
  start_point: string;
  end_point: string;
  fare: number;
  passenger_count?: number;
  status: TripStatus;
  created_at?: string;
}

export interface FuelRecord {
  id: string;
  bus_number: string;
  date: string;
  liters: number;
  amount: number;
  price_per_liter: number;
  odometer_reading: number;
  fuel_station: string;
  driver_name: string;
  receipt_number?: string;
  notes?: string;
  calculated_efficiency?: number; // km per liter
  created_at?: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  bus_number?: string;
  payment_method: 'Cash' | 'Bank Transfer' | 'Card' | 'UPI';
  reference_number?: string;
  created_at?: string;
}

export interface EmiLoan {
  id: string;
  loan_id: string;
  lender: string;
  bus_number: string;
  principal_amount: number;
  interest_rate: number; // annual percentage, e.g. 9.5%
  loan_start_date: string;
  term_months: number;
  monthly_emi: number;
  total_paid: number;
  outstanding_balance: number;
  next_due_date: string;
  status: 'active' | 'completed' | 'overdue';
  installments_paid: number;
  installments_total: number;
}

export interface EmiPayment {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  payment_date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  reference?: string;
}

export interface GpsVehicle {
  bus_id: string;
  bus_number: string;
  model: string;
  driver_name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: VehicleStatus;
  battery_level: number;
  fuel_level: number;
  last_updated: string;
  current_route?: string;
  destination?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  date: string;
  link?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  job_title: string;
  company_name: string;
  avatar_url?: string;
  role: 'Fleet Manager' | 'Admin' | 'Dispatcher' | 'Accountant';
}

export interface SystemSettings {
  company_name: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
  fuel_efficiency_alert_threshold: number; // km/L
  maintenance_reminder_days: number;
  low_stock_warning_threshold: number;
  notifications_email: boolean;
  notifications_browser: boolean;
}
