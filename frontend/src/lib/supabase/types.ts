export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type VehicleType = 'truck' | 'trailer'
export type OrderStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type PermitStatus = 'pending' | 'submitted' | 'issued'
export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export interface Database {
  public: {
    Tables: {
      admins: {
        Row: { user_id: string; role: string; created_at: string }
        Insert: { user_id: string; role?: string; created_at?: string }
        Update: { role?: string }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          usdot: string | null
          mc_number: string | null
          fein: string | null
          ifta_number: string | null
          email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state_code: string | null
          zip: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
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
          state_code: string
          username: string
          password_ciphertext: string
          password_iv: string
          password_tag: string
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
          vehicle_id: string | null
          status: OrderStatus
          origin: string | null
          destination: string | null
          route_states: string[]
          trip_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'order_number' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
        Relationships: []
      }
      permits: {
        Row: {
          id: string
          order_id: string
          state_code: string
          status: PermitStatus
          cost: number | null
          permit_number: string | null
          document_url: string | null
          issue_date: string | null
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['permits']['Row'], 'id' | 'created_at' | 'updated_at'>
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
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'invoice_number' | 'total_amount' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
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
        Args: {
          p_order: Json
          p_permits: Json
        }
        Returns: { order_id: string; order_number: string }
      }
    }
  }
}
