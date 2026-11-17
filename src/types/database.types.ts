/**
 * Supabase Database Schema Definitions for FleetMind AI
 * Generated according to official Supabase TypeScript conventions.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  billing_tier: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  organization_id?: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  company_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

export type BusRow = {
  id: string;
  organization_id?: string;
  bus_number: string;
  registration_number: string;
  model: string;
  manufacturer: string;
  year: number;
  capacity: number;
  status: 'active' | 'maintenance' | 'inactive';
  fuel_type: 'Diesel' | 'Electric' | 'CNG' | 'Petrol' | 'Hybrid';
  odometer: number;
  assigned_driver: string | null;
  route: string | null;
  insurance_expiry: string;
  registration_expiry: string;
  last_service_date: string;
  next_service_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverRow = {
  id: string;
  organization_id?: string;
  name: string;
  phone: string;
  email: string;
  license_number: string;
  license_expiry: string;
  joining_date: string;
  assigned_bus: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  today_availability: 'available' | 'on_trip' | 'off_duty';
  experience_years: number;
  total_trips: number;
  distance_km: number;
  safety_score: number;
  profile_photo: string | null;
  emergency_contact: string | null;
  created_at: string;
  updated_at: string;
};

export type MechanicRow = {
  id: string;
  organization_id?: string;
  name: string;
  phone: string;
  specialty: string;
  status: 'available' | 'busy' | 'off_duty';
  active_tasks: number;
  hourly_rate: number;
  created_at: string;
};

export type RouteRow = {
  id: string;
  organization_id?: string;
  route_name: string;
  route_code: string;
  start_point: string;
  end_point: string;
  distance_km: number;
  estimated_time: string;
  fare: number;
  assigned_buses: string[];
  assigned_drivers: string[];
  stops: string[];
  status: 'active' | 'inactive';
  created_at: string;
};

export type TripRow = {
  id: string;
  organization_id?: string;
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
  passenger_count: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'delayed';
  created_at: string;
};

export type ServiceRecordRow = {
  id: string;
  organization_id?: string;
  bus_number: string;
  service_type: string;
  service_date: string;
  cost: number;
  parts_used: string;
  mechanic_notes: string;
  next_service_prediction: string;
  mechanic_name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  created_at: string;
};

export type InventoryRow = {
  id: string;
  organization_id?: string;
  item_name: string;
  sku: string;
  category: string;
  current_stock: number;
  minimum_stock: number;
  purchase_price: number;
  vendor: string;
  unit: string;
  storage_location: string;
  last_updated: string;
  created_at: string;
};

export type InventoryMovementRow = {
  id: string;
  organization_id?: string;
  item_id: string;
  item_name: string;
  type: 'received' | 'issued';
  quantity: number;
  bus_number: string | null;
  date: string;
  notes: string;
  created_at: string;
};

export type FuelRecordRow = {
  id: string;
  organization_id?: string;
  bus_number: string;
  date: string;
  liters: number;
  amount: number;
  price_per_liter: number;
  odometer_reading: number;
  fuel_station: string;
  driver_name: string;
  receipt_number: string | null;
  notes: string | null;
  calculated_efficiency: number | null;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  organization_id?: string;
  category: string;
  type: 'revenue' | 'expense';
  amount: number;
  date: string;
  description: string;
  bus_number: string | null;
  payment_method: string;
  reference_number: string | null;
  created_at: string;
};

export type LoanRow = {
  id: string;
  organization_id?: string;
  loan_id: string;
  lender: string;
  bus_number: string;
  principal_amount: number;
  interest_rate: number;
  loan_start_date: string;
  term_months: number;
  monthly_emi: number;
  total_paid: number;
  outstanding_balance: number;
  next_due_date: string;
  status: 'active' | 'completed' | 'overdue';
  installments_paid: number;
  installments_total: number;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  organization_id?: string;
  timestamp: string;
  user: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
};

export type NotificationRow = {
  id: string;
  organization_id?: string;
  user_id?: string | null;
  title: string;
  message: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  date: string;
  link: string | null;
};

export type SettingRow = {
  id: string;
  company_name: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  date_format: string;
  fuel_efficiency_alert_threshold: number;
  maintenance_reminder_days: number;
  low_stock_warning_threshold: number;
  notifications_email: boolean;
  notifications_browser: boolean;
  updated_at: string;
};

export type GpsVehicleRow = {
  bus_id: string;
  bus_number: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: 'active' | 'maintenance' | 'inactive';
  battery_level: number;
  fuel_level: number;
  current_route: string | null;
  destination: string | null;
  last_updated: string;
};

export type EmiPaymentRow = {
  id: string;
  organization_id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  payment_date: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  reference: string | null;
  notes: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: Omit<OrganizationRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<OrganizationRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; full_name: string; email: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      buses: {
        Row: BusRow;
        Insert: Omit<BusRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<BusRow>;
        Relationships: [];
      };
      drivers: {
        Row: DriverRow;
        Insert: Omit<DriverRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<DriverRow>;
        Relationships: [];
      };
      mechanics: {
        Row: MechanicRow;
        Insert: Omit<MechanicRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<MechanicRow>;
        Relationships: [];
      };
      routes: {
        Row: RouteRow;
        Insert: Omit<RouteRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<RouteRow>;
        Relationships: [];
      };
      trips: {
        Row: TripRow;
        Insert: Omit<TripRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<TripRow>;
        Relationships: [];
      };
      service_records: {
        Row: ServiceRecordRow;
        Insert: Omit<ServiceRecordRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ServiceRecordRow>;
        Relationships: [];
      };
      inventory: {
        Row: InventoryRow;
        Insert: Omit<InventoryRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<InventoryRow>;
        Relationships: [];
      };
      inventory_movements: {
        Row: InventoryMovementRow;
        Insert: Omit<InventoryMovementRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<InventoryMovementRow>;
        Relationships: [];
      };
      fuel_records: {
        Row: FuelRecordRow;
        Insert: Omit<FuelRecordRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<FuelRecordRow>;
        Relationships: [];
      };
      expenses: {
        Row: ExpenseRow;
        Insert: Omit<ExpenseRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ExpenseRow>;
        Relationships: [];
      };
      loans: {
        Row: LoanRow;
        Insert: Omit<LoanRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<LoanRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, 'id'> & { id?: string };
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Omit<NotificationRow, 'id'> & { id?: string };
        Update: Partial<NotificationRow>;
        Relationships: [];
      };
      settings: {
        Row: SettingRow;
        Insert: Partial<SettingRow>;
        Update: Partial<SettingRow>;
        Relationships: [];
      };
      gps_vehicles: {
        Row: GpsVehicleRow;
        Insert: GpsVehicleRow;
        Update: Partial<GpsVehicleRow>;
        Relationships: [];
      };
      emi_payments: {
        Row: EmiPaymentRow;
        Insert: Omit<EmiPaymentRow, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<EmiPaymentRow>;
        Relationships: [];
      };
    };
    Views: {
      emi_loans: {
        Row: LoanRow;
        Relationships: [];
      };
    };
    Functions: {
      manage_user_role: {
        Args: {
          p_target_user_id: string;
          p_new_role: string;
        };
        Returns: {
          success: boolean;
          user_id: string;
          previous_role: string;
          new_role: string;
          updated_by: string;
        };
      };
      record_inventory_movement: {
        Args: {
          p_item_id: string;
          p_type: string;
          p_quantity: number;
          p_bus_number?: string | null;
          p_notes?: string;
        };
        Returns: Record<string, unknown>;
      };
      record_emi_payment: {
        Args: {
          p_loan_id: string;
          p_amount: number;
          p_payment_date?: string;
        };
        Returns: Record<string, unknown>;
      };
    };
    Enums: { [_ in never]: never };
  };
};
