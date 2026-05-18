export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AdminRole = 'admin' | 'super_admin' | 'owner' | 'dispatcher' | 'viewer'
export type CanonicalAdminRole = 'owner' | 'admin' | 'dispatcher' | 'viewer'
export type VehicleType = 'truck' | 'trailer'
export type OrderStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type PermitStatus = 'pending' | 'in_progress' | 'submitted' | 'issued' | 'rejected' | 'not_needed'
export type InvoiceStatus = 'draft' | 'sent' | 'overdue' | 'paid' | 'void'

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: { user_id: string; role: AdminRole; created_at: string }
        Insert: { user_id: string; role?: AdminRole; created_at?: string }
        Update: { role?: AdminRole }
        Relationships: []
      }
      operator_profiles: {
        Row: {
          user_id: string
          full_name: string | null
          last_login_at: string | null
          failed_login_count: number
          locked_until: string | null
          totp_secret_enc: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          full_name?: string | null
          last_login_at?: string | null
          failed_login_count?: number
          locked_until?: string | null
          totp_secret_enc?: string | null
        }
        Update: {
          full_name?: string | null
          last_login_at?: string | null
          failed_login_count?: number
          locked_until?: string | null
          totp_secret_enc?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          id: string
          actor_user_id: string
          actor_role: string
          action: string
          target_table: string
          target_id: string | null
          metadata: Json
          ip: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_audit_logs']['Row'], 'id' | 'created_at'> & {
          metadata?: Json
        }
        Update: never
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          dba_name: string | null
          usdot: string | null
          mc_number: string | null
          fein: string | null
          fein_ciphertext: string | null
          fein_iv: string | null
          fein_tag: string | null
          ifta_number: string | null
          email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_email: string | null
          billing_email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state_code: string | null
          zip: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
        Relationships: []
      }
      trucks: {
        Row: {
          id: string
          customer_id: string
          unit_number: string
          year: number | null
          make: string | null
          model: string | null
          plate: string | null
          plate_state: string | null
          plate_expiry: string | null
          vin: string | null
          registered_weight: number | null
          active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['trucks']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['trucks']['Insert']>
        Relationships: []
      }
      trailers: {
        Row: {
          id: string
          customer_id: string
          unit_number: string
          year: number | null
          make: string | null
          plate: string | null
          plate_state: string | null
          plate_expiry: string | null
          vin: string | null
          trailer_type: string | null
          active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['trailers']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['trailers']['Insert']>
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          customer_id: string
          unit_number: string
          vin: string | null
          plate_number: string | null
          make: string | null
          year: number | null
          vehicle_type: VehicleType
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['vehicles']['Insert']>
        Relationships: []
      }
      customer_credentials: {
        Row: {
          id: string
          customer_id: string
          jurisdiction: string
          state_code: string | null
          username: string
          password_ciphertext: string
          password_iv: string
          password_tag: string
          password_last_rotated_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customer_credentials']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customer_credentials']['Insert']>
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string
          truck_id: string | null
          trailer_id: string | null
          vehicle_id: string | null
          driver_name: string | null
          status: OrderStatus
          origin: string | null
          destination: string | null
          route_states: string[]
          trip_date: string | null
          dimensions: Json | null
          service_fee_cents: number
          notes: string | null
          assigned_operator_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'order_number' | 'created_at' | 'updated_at'> & {
          service_fee_cents?: number
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
        Relationships: []
      }
      permits: {
        Row: {
          id: string
          order_id: string
          jurisdiction: string
          state_code: string | null
          status: PermitStatus
          cost: number | null
          sort_order: number
          permit_number: string | null
          document_url: string | null
          document_s3_key: string | null
          issue_date: string | null
          valid_from: string | null
          valid_until: string | null
          submitted_at: string | null
          submitted_by_operator_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['permits']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          sort_order?: number
        }
        Update: Partial<Database['public']['Tables']['permits']['Insert']>
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          customer_id: string
          order_id: string | null
          subtotal: number
          tax: number
          total_amount: number
          status: InvoiceStatus
          issue_date: string
          due_date: string | null
          paid_at: string | null
          notes: string | null
          line_items_snapshot: Json | null
          pdf_s3_key: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'invoice_number' | 'total_amount' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
        Relationships: []
      }
      invoice_settings: {
        Row: {
          id: boolean
          company_name: string
          company_address: string | null
          company_logo_url: string | null
          sender_name: string | null
          sender_email: string | null
          invoice_number_prefix: string
          next_invoice_number: number
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          company_name?: string
          company_address?: string | null
          company_logo_url?: string | null
          sender_name?: string | null
          sender_email?: string | null
          invoice_number_prefix?: string
          next_invoice_number?: number
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['invoice_settings']['Insert']>
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          subtotal: number
          position: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoice_line_items']['Row'], 'id' | 'subtotal' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invoice_line_items']['Insert']>
        Relationships: []
      }
      us_states: {
        Row: { code: string; name: string }
        Insert: { code: string; name: string }
        Update: { name?: string }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_order_with_permits: {
        Args: { p_order: Json; p_permits: Json }
        Returns: Json
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_secs: number }
        Returns: boolean
      }
      record_failed_login: {
        Args: { p_user_id: string; p_max_attempts?: number; p_lockout_mins?: number }
        Returns: void
      }
    }
  }
}
