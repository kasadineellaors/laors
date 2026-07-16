export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SystemRole =
  | "owner"
  | "manager"
  | "worker"
  | "accountant"
  | "veterinarian"
  | "viewer"
  | "stocker_owner";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          default_org_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          default_org_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          default_org_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          phone: string | null;
          logo_url: string | null;
          timezone: string;
          enabled_modes: string[];
          settings: Json;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          timezone?: string;
          enabled_modes?: string[];
          settings?: Json;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          timezone?: string;
          enabled_modes?: string[];
          settings?: Json;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          system_role: SystemRole;
          ranch_role_id: string | null;
          is_active: boolean;
          invited_email: string | null;
          invited_at: string | null;
          joined_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          system_role?: SystemRole;
          ranch_role_id?: string | null;
          is_active?: boolean;
          invited_email?: string | null;
          invited_at?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          system_role?: SystemRole;
          ranch_role_id?: string | null;
          is_active?: boolean;
          invited_email?: string | null;
          invited_at?: string | null;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ranch_roles: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          base_system_role: SystemRole;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          base_system_role: SystemRole;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          base_system_role?: SystemRole;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          description: string;
          category: string;
        };
        Insert: {
          id: string;
          description: string;
          category: string;
        };
        Update: {
          id?: string;
          description?: string;
          category?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          system_role: SystemRole;
          permission_id: string;
        };
        Insert: {
          system_role: SystemRole;
          permission_id: string;
        };
        Update: {
          system_role?: SystemRole;
          permission_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          organization_id: string | null;
          user_id: string | null;
          action: string;
          table_name: string;
          record_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          user_id?: string | null;
          action?: string;
          table_name?: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      location_types: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          plural_name: string | null;
          tier: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          plural_name?: string | null;
          tier: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          plural_name?: string | null;
          tier?: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      location_statuses: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          color: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          color?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          color?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          organization_id: string;
          location_type_id: string;
          parent_id: string | null;
          name: string;
          acres: number | null;
          capacity_head: number | null;
          status_id: string | null;
          metadata: Json;
          notes: string | null;
          path: string | null;
          depth: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          location_type_id: string;
          parent_id?: string | null;
          name: string;
          acres?: number | null;
          capacity_head?: number | null;
          status_id?: string | null;
          metadata?: Json;
          notes?: string | null;
          depth?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          location_type_id?: string;
          parent_id?: string | null;
          name?: string;
          acres?: number | null;
          capacity_head?: number | null;
          status_id?: string | null;
          metadata?: Json;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      cattle_classifications: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          short_code: string | null;
          sort_order: number;
          tracks_individual: boolean;
          color: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          short_code?: string | null;
          sort_order?: number;
          tracks_individual?: boolean;
          color?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          short_code?: string | null;
          sort_order?: number;
          tracks_individual?: boolean;
          color?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      ownership_groups: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          ownership_type: string | null;
          contact_name: string | null;
          phone: string | null;
          email: string | null;
          billing_address: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          ownership_type?: string | null;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          billing_address?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          ownership_type?: string | null;
          contact_name?: string | null;
          phone?: string | null;
          email?: string | null;
          billing_address?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      cattle_groups: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          location_id: string | null;
          ownership_group_id: string | null;
          customer_id: string | null;
          origin_group_id: string | null;
          is_active: boolean;
          notes: string | null;
          lot_number: string | null;
          enterprise_type: string;
          lot_status: string;
          opened_at: string | null;
          closed_at: string | null;
          purchase_date: string | null;
          arrival_date: string | null;
          starting_head: number | null;
          pay_weight_lbs: number | null;
          avg_weight_lbs: number | null;
          purchase_price_per_lb: number | null;
          landed_cost: number | null;
          seller_name: string | null;
          source_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          location_id?: string | null;
          ownership_group_id?: string | null;
          customer_id?: string | null;
          origin_group_id?: string | null;
          is_active?: boolean;
          notes?: string | null;
          lot_number?: string | null;
          enterprise_type?: string;
          lot_status?: string;
          opened_at?: string | null;
          closed_at?: string | null;
          purchase_date?: string | null;
          arrival_date?: string | null;
          starting_head?: number | null;
          pay_weight_lbs?: number | null;
          avg_weight_lbs?: number | null;
          purchase_price_per_lb?: number | null;
          landed_cost?: number | null;
          seller_name?: string | null;
          source_name?: string | null;
        };
        Update: {
          name?: string;
          location_id?: string | null;
          ownership_group_id?: string | null;
          customer_id?: string | null;
          is_active?: boolean;
          notes?: string | null;
          lot_number?: string | null;
          enterprise_type?: string;
          lot_status?: string;
          opened_at?: string | null;
          closed_at?: string | null;
          purchase_date?: string | null;
          arrival_date?: string | null;
          starting_head?: number | null;
          pay_weight_lbs?: number | null;
          avg_weight_lbs?: number | null;
          purchase_price_per_lb?: number | null;
          landed_cost?: number | null;
          seller_name?: string | null;
          source_name?: string | null;
        };
        Relationships: [];
      };
      group_inventory_counts: {
        Row: {
          id: string;
          organization_id: string;
          cattle_group_id: string;
          classification_id: string;
          head_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          cattle_group_id: string;
          classification_id: string;
          head_count?: number;
        };
        Update: {
          head_count?: number;
        };
        Relationships: [];
      };
      movement_reasons: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      };
      adjustment_reasons: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      };
      financial_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          category_type: string;
          parent_category_id: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          category_type: string;
          parent_category_id?: string | null;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      };
      task_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: { name?: string; is_active?: boolean };
        Relationships: [];
      };
      cattle_movements: {
        Row: {
          id: string;
          organization_id: string;
          source_group_id: string;
          destination_group_id: string;
          source_location_id: string | null;
          destination_location_id: string;
          movement_reason_id: string | null;
          total_head: number;
          is_partial: boolean;
          status: string;
          notes: string | null;
          moved_at: string;
          created_by: string | null;
          voided_at: string | null;
          voided_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          source_group_id: string;
          destination_group_id: string;
          source_location_id?: string | null;
          destination_location_id: string;
          movement_reason_id?: string | null;
          total_head?: number;
          is_partial?: boolean;
          status?: string;
          notes?: string | null;
          moved_at?: string;
          created_by?: string | null;
        };
        Update: {
          notes?: string | null;
          movement_reason_id?: string | null;
          status?: string;
          voided_at?: string | null;
          voided_by?: string | null;
        };
        Relationships: [];
      };
      cattle_movement_lines: {
        Row: {
          id: string;
          organization_id: string;
          movement_id: string;
          classification_id: string;
          head_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          movement_id: string;
          classification_id: string;
          head_count: number;
        };
        Update: { head_count?: number };
        Relationships: [];
      };
      processing_events: {
        Row: {
          id: string;
          organization_id: string;
          cattle_group_id: string;
          processed_at: string;
          head_count: number;
          processing_type: string;
          chute_charge: number | null;
          labor_charge: number | null;
          processing_fee: number | null;
          medicine_cost: number | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          cattle_group_id: string;
          processed_at?: string;
          head_count: number;
          processing_type?: string;
          chute_charge?: number | null;
          labor_charge?: number | null;
          processing_fee?: number | null;
          medicine_cost?: number | null;
          notes?: string | null;
          created_by?: string | null;
          is_active?: boolean;
        };
        Update: {
          processed_at?: string;
          head_count?: number;
          processing_type?: string;
          chute_charge?: number | null;
          labor_charge?: number | null;
          processing_fee?: number | null;
          medicine_cost?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      mortality_records: {
        Row: {
          id: string;
          organization_id: string;
          cattle_group_id: string;
          died_at: string;
          head_count: number;
          cause: string | null;
          disposal_method: string | null;
          value_lost: number | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          cattle_group_id: string;
          died_at?: string;
          head_count?: number;
          cause?: string | null;
          disposal_method?: string | null;
          value_lost?: number | null;
          notes?: string | null;
          created_by?: string | null;
          is_active?: boolean;
        };
        Update: {
          died_at?: string;
          head_count?: number;
          cause?: string | null;
          disposal_method?: string | null;
          value_lost?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      lot_expenses: {
        Row: {
          id: string;
          organization_id: string;
          cattle_group_id: string;
          financial_category_id: string | null;
          expense_date: string;
          amount: number;
          description: string | null;
          vendor_name: string | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          cattle_group_id: string;
          financial_category_id?: string | null;
          expense_date?: string;
          amount: number;
          description?: string | null;
          vendor_name?: string | null;
          notes?: string | null;
          created_by?: string | null;
          is_active?: boolean;
        };
        Update: {
          amount?: number;
          description?: string | null;
          vendor_name?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      inventory_adjustments: {
        Row: {
          id: string;
          organization_id: string;
          cattle_group_id: string;
          classification_id: string;
          adjustment_reason_id: string | null;
          previous_count: number;
          new_count: number;
          delta: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          cattle_group_id: string;
          classification_id: string;
          adjustment_reason_id?: string | null;
          previous_count: number;
          new_count: number;
          delta: number;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          category_id: string | null;
          location_id: string | null;
          cattle_group_id: string | null;
          status: string;
          priority: string;
          due_date: string | null;
          assigned_to: string | null;
          created_by: string | null;
          completed_at: string | null;
          completed_by: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          category_id?: string | null;
          location_id?: string | null;
          cattle_group_id?: string | null;
          status?: string;
          priority?: string;
          due_date?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          notes?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          category_id?: string | null;
          location_id?: string | null;
          cattle_group_id?: string | null;
          status?: string;
          priority?: string;
          due_date?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      treatment_records: {
        Row: {
          id: string;
          organization_id: string;
          cattle_group_id: string | null;
          location_id: string | null;
          product_name: string;
          treatment_type: string | null;
          reason: string | null;
          head_count: number | null;
          treatment_date: string;
          notes: string | null;
          administered_by: string | null;
          created_by: string | null;
          medicine_item_id: string | null;
          quantity_used: number | null;
          invoiced_at: string | null;
          invoice_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          cattle_group_id?: string | null;
          location_id?: string | null;
          product_name: string;
          treatment_type?: string | null;
          reason?: string | null;
          head_count?: number | null;
          treatment_date?: string;
          notes?: string | null;
          administered_by?: string | null;
          created_by?: string | null;
          medicine_item_id?: string | null;
          quantity_used?: number | null;
          invoiced_at?: string | null;
          invoice_id?: string | null;
        };
        Update: {
          cattle_group_id?: string | null;
          location_id?: string | null;
          product_name?: string;
          treatment_type?: string | null;
          reason?: string | null;
          head_count?: number | null;
          treatment_date?: string;
          notes?: string | null;
          administered_by?: string | null;
          medicine_item_id?: string | null;
          quantity_used?: number | null;
          invoiced_at?: string | null;
          invoice_id?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      medicine_items: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          unit: string;
          quantity_on_hand: number;
          price_per_cc: number | null;
          reorder_at: number | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          unit?: string;
          quantity_on_hand?: number;
          price_per_cc?: number | null;
          reorder_at?: number | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          unit?: string;
          quantity_on_hand?: number;
          price_per_cc?: number | null;
          reorder_at?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      medicine_stock_adjustments: {
        Row: {
          id: string;
          organization_id: string;
          medicine_item_id: string;
          previous_quantity: number;
          new_quantity: number;
          delta: number;
          adjustment_type: string;
          treatment_record_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          medicine_item_id: string;
          previous_quantity: number;
          new_quantity: number;
          delta: number;
          adjustment_type?: string;
          treatment_record_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      time_entries: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          clock_in_at: string;
          clock_out_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          clock_in_at?: string;
          clock_out_at?: string | null;
          notes?: string | null;
        };
        Update: {
          clock_out_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      rainfall_records: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string | null;
          recorded_date: string;
          amount_inches: number;
          notes: string | null;
          recorded_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          location_id?: string | null;
          recorded_date?: string;
          amount_inches: number;
          notes?: string | null;
          recorded_by?: string | null;
        };
        Update: {
          location_id?: string | null;
          recorded_date?: string;
          amount_inches?: number;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      sales_records: {
        Row: {
          id: string;
          organization_id: string;
          sale_date: string;
          buyer_name: string | null;
          customer_id: string | null;
          cattle_group_id: string | null;
          location_id: string | null;
          head_count: number;
          total_amount: number | null;
          price_per_head: number | null;
          financial_category_id: string | null;
          inventory_deducted: boolean;
          individual_animal_id: string | null;
          seedstock_sale_type: string | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sale_date?: string;
          buyer_name?: string | null;
          customer_id?: string | null;
          cattle_group_id?: string | null;
          location_id?: string | null;
          head_count: number;
          total_amount?: number | null;
          price_per_head?: number | null;
          financial_category_id?: string | null;
          inventory_deducted?: boolean;
          individual_animal_id?: string | null;
          seedstock_sale_type?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          sale_date?: string;
          buyer_name?: string | null;
          customer_id?: string | null;
          location_id?: string | null;
          total_amount?: number | null;
          price_per_head?: number | null;
          financial_category_id?: string | null;
          individual_animal_id?: string | null;
          seedstock_sale_type?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      breeding_records: {
        Row: {
          id: string;
          organization_id: string;
          bred_at: string;
          breeding_context: string;
          cattle_group_id: string | null;
          location_id: string | null;
          dam_id: string | null;
          dam_tag: string | null;
          bull_id: string | null;
          sire_tag: string | null;
          embryo_donor_tag: string | null;
          embryo_recipient_tag: string | null;
          breeding_method: string;
          expected_calving_date: string | null;
          pregnancy_status: string;
          pregnancy_check_date: string | null;
          calving_record_id: string | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          bred_at?: string;
          breeding_context?: string;
          cattle_group_id?: string | null;
          location_id?: string | null;
          dam_id?: string | null;
          dam_tag?: string | null;
          bull_id?: string | null;
          sire_tag?: string | null;
          embryo_donor_tag?: string | null;
          embryo_recipient_tag?: string | null;
          breeding_method?: string;
          expected_calving_date?: string | null;
          pregnancy_status?: string;
          pregnancy_check_date?: string | null;
          calving_record_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          bred_at?: string;
          breeding_context?: string;
          cattle_group_id?: string | null;
          location_id?: string | null;
          dam_id?: string | null;
          dam_tag?: string | null;
          bull_id?: string | null;
          sire_tag?: string | null;
          embryo_donor_tag?: string | null;
          embryo_recipient_tag?: string | null;
          breeding_method?: string;
          expected_calving_date?: string | null;
          pregnancy_status?: string;
          pregnancy_check_date?: string | null;
          calving_record_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          starts_at: string;
          ends_at: string | null;
          all_day: boolean;
          event_type: string;
          location_id: string | null;
          cattle_group_id: string | null;
          color: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          starts_at: string;
          ends_at?: string | null;
          all_day?: boolean;
          event_type?: string;
          location_id?: string | null;
          cattle_group_id?: string | null;
          color?: string | null;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          starts_at?: string;
          ends_at?: string | null;
          all_day?: boolean;
          event_type?: string;
          location_id?: string | null;
          cattle_group_id?: string | null;
          color?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      calving_records: {
        Row: {
          id: string;
          organization_id: string;
          calved_at: string;
          calving_context: string;
          location_id: string | null;
          cattle_group_id: string | null;
          dam_id: string | null;
          dam_tag: string | null;
          bull_id: string | null;
          sire_tag: string | null;
          calf_id: string | null;
          calf_tag: string | null;
          calf_sex: string;
          birth_weight_lbs: number | null;
          outcome: string;
          calving_ease_score: number | null;
          assistance_type: string | null;
          loss_cause: string | null;
          breeding_record_id: string | null;
          classification_id: string | null;
          add_to_inventory: boolean;
          inventory_added: boolean;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          calved_at?: string;
          calving_context?: string;
          location_id?: string | null;
          cattle_group_id?: string | null;
          dam_id?: string | null;
          dam_tag?: string | null;
          bull_id?: string | null;
          sire_tag?: string | null;
          calf_id?: string | null;
          calf_tag?: string | null;
          calf_sex?: string;
          birth_weight_lbs?: number | null;
          outcome?: string;
          calving_ease_score?: number | null;
          assistance_type?: string | null;
          loss_cause?: string | null;
          breeding_record_id?: string | null;
          classification_id?: string | null;
          add_to_inventory?: boolean;
          inventory_added?: boolean;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          calved_at?: string;
          calving_context?: string;
          location_id?: string | null;
          cattle_group_id?: string | null;
          dam_id?: string | null;
          dam_tag?: string | null;
          bull_id?: string | null;
          sire_tag?: string | null;
          calf_id?: string | null;
          calf_tag?: string | null;
          calf_sex?: string;
          birth_weight_lbs?: number | null;
          outcome?: string;
          calving_ease_score?: number | null;
          assistance_type?: string | null;
          loss_cause?: string | null;
          breeding_record_id?: string | null;
          classification_id?: string | null;
          add_to_inventory?: boolean;
          inventory_added?: boolean;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      individual_animals: {
        Row: {
          id: string;
          organization_id: string;
          tag_number: string;
          name: string | null;
          animal_type: string;
          registry_context: string;
          registration_number: string | null;
          breed: string | null;
          sire_tag: string | null;
          dam_tag: string | null;
          pedigree: string | null;
          epd_birth_weight: number | null;
          epd_weaning_weight: number | null;
          epd_yearling_weight: number | null;
          epd_milk: number | null;
          epd_cea: number | null;
          epd_doc: number | null;
          epd_scrotal: number | null;
          epd_marbling: number | null;
          epd_calving_ease: number | null;
          dam_id: string | null;
          sire_id: string | null;
          cattle_group_id: string | null;
          location_id: string | null;
          status: string;
          birth_date: string | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          tag_number: string;
          name?: string | null;
          animal_type?: string;
          registry_context?: string;
          registration_number?: string | null;
          breed?: string | null;
          sire_tag?: string | null;
          dam_tag?: string | null;
          pedigree?: string | null;
          epd_birth_weight?: number | null;
          epd_weaning_weight?: number | null;
          epd_yearling_weight?: number | null;
          epd_milk?: number | null;
          epd_cea?: number | null;
          epd_doc?: number | null;
          epd_scrotal?: number | null;
          epd_marbling?: number | null;
          epd_calving_ease?: number | null;
          dam_id?: string | null;
          sire_id?: string | null;
          cattle_group_id?: string | null;
          location_id?: string | null;
          status?: string;
          birth_date?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          tag_number?: string;
          name?: string | null;
          animal_type?: string;
          registry_context?: string;
          registration_number?: string | null;
          breed?: string | null;
          sire_tag?: string | null;
          dam_tag?: string | null;
          pedigree?: string | null;
          epd_birth_weight?: number | null;
          epd_weaning_weight?: number | null;
          epd_yearling_weight?: number | null;
          epd_milk?: number | null;
          epd_cea?: number | null;
          epd_doc?: number | null;
          epd_scrotal?: number | null;
          epd_marbling?: number | null;
          epd_calving_ease?: number | null;
          dam_id?: string | null;
          sire_id?: string | null;
          cattle_group_id?: string | null;
          location_id?: string | null;
          status?: string;
          birth_date?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      exposure_records: {
        Row: {
          id: string;
          organization_id: string;
          breeding_context: string;
          dam_id: string | null;
          dam_tag: string | null;
          bull_id: string | null;
          sire_tag: string | null;
          exposure_start: string;
          exposure_end: string | null;
          location_id: string | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          breeding_context?: string;
          dam_id?: string | null;
          dam_tag?: string | null;
          bull_id?: string | null;
          sire_tag?: string | null;
          exposure_start: string;
          exposure_end?: string | null;
          location_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          breeding_context?: string;
          dam_id?: string | null;
          dam_tag?: string | null;
          bull_id?: string | null;
          sire_tag?: string | null;
          exposure_start?: string;
          exposure_end?: string | null;
          location_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      weaning_records: {
        Row: {
          id: string;
          organization_id: string;
          calving_record_id: string | null;
          dam_id: string | null;
          calf_id: string | null;
          calf_tag: string | null;
          weaned_at: string;
          weaning_weight_lbs: number | null;
          retained_as_heifer: boolean;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          calving_record_id?: string | null;
          dam_id?: string | null;
          calf_id?: string | null;
          calf_tag?: string | null;
          weaned_at?: string;
          weaning_weight_lbs?: number | null;
          retained_as_heifer?: boolean;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          calving_record_id?: string | null;
          dam_id?: string | null;
          calf_id?: string | null;
          calf_tag?: string | null;
          weaned_at?: string;
          weaning_weight_lbs?: number | null;
          retained_as_heifer?: boolean;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          yardage_rate_per_head_day: number | null;
          medicine_markup_percent: number | null;
          feed_markup_percent: number | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          yardage_rate_per_head_day?: number | null;
          medicine_markup_percent?: number | null;
          feed_markup_percent?: number | null;
          notes?: string | null;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          yardage_rate_per_head_day?: number | null;
          medicine_markup_percent?: number | null;
          feed_markup_percent?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      feed_rations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          unit: string;
          price_per_unit: number | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          unit?: string;
          price_per_unit?: number | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          unit?: string;
          price_per_unit?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      feed_items: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          unit: string;
          quantity_on_hand: number;
          reorder_at: number | null;
          price_per_unit: number | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          unit?: string;
          quantity_on_hand?: number;
          reorder_at?: number | null;
          price_per_unit?: number | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          unit?: string;
          quantity_on_hand?: number;
          reorder_at?: number | null;
          price_per_unit?: number | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      feed_stock_adjustments: {
        Row: {
          id: string;
          organization_id: string;
          feed_item_id: string;
          previous_quantity: number;
          new_quantity: number;
          delta: number;
          adjustment_type: string;
          feeding_record_id: string | null;
          feed_purchase_id: string | null;
          unit_cost: number | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          feed_item_id: string;
          previous_quantity: number;
          new_quantity: number;
          delta: number;
          adjustment_type: string;
          feeding_record_id?: string | null;
          feed_purchase_id?: string | null;
          unit_cost?: number | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      feed_purchases: {
        Row: {
          id: string;
          organization_id: string;
          feed_item_id: string;
          purchased_at: string;
          vendor_name: string | null;
          quantity: number;
          unit_cost: number;
          total_cost: number;
          invoice_ref: string | null;
          notes: string | null;
          feed_stock_adjustment_id: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          feed_item_id: string;
          purchased_at?: string;
          vendor_name?: string | null;
          quantity: number;
          unit_cost: number;
          total_cost: number;
          invoice_ref?: string | null;
          notes?: string | null;
          feed_stock_adjustment_id?: string | null;
          created_by?: string | null;
          is_active?: boolean;
        };
        Update: {
          is_active?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      feed_ration_ingredients: {
        Row: {
          id: string;
          organization_id: string;
          feed_ration_id: string;
          feed_item_id: string;
          quantity_per_ration_unit: number;
          inclusion_percent: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          feed_ration_id: string;
          feed_item_id: string;
          quantity_per_ration_unit: number;
          inclusion_percent?: number | null;
        };
        Update: {
          quantity_per_ration_unit?: number;
          inclusion_percent?: number | null;
        };
        Relationships: [];
      };
      feeding_records: {
        Row: {
          id: string;
          organization_id: string;
          fed_at: string;
          feeding_context: string;
          feed_ration_id: string;
          cattle_group_id: string | null;
          location_id: string | null;
          ownership_group_id: string | null;
          quantity: number;
          head_count: number | null;
          fed_by: string | null;
          notes: string | null;
          created_by: string | null;
          invoiced_at: string | null;
          invoice_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          fed_at?: string;
          feeding_context?: string;
          feed_ration_id: string;
          cattle_group_id?: string | null;
          location_id?: string | null;
          ownership_group_id?: string | null;
          quantity: number;
          head_count?: number | null;
          fed_by?: string | null;
          notes?: string | null;
          created_by?: string | null;
          invoiced_at?: string | null;
          invoice_id?: string | null;
        };
        Update: {
          fed_at?: string;
          feeding_context?: string;
          feed_ration_id?: string;
          cattle_group_id?: string | null;
          location_id?: string | null;
          ownership_group_id?: string | null;
          quantity?: number;
          head_count?: number | null;
          fed_by?: string | null;
          notes?: string | null;
          invoiced_at?: string | null;
          invoice_id?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          invoice_number: string;
          customer_name: string;
          customer_email: string | null;
          customer_address: string | null;
          invoice_date: string;
          due_date: string | null;
          status: string;
          subtotal: number;
          sales_record_id: string | null;
          customer_id: string | null;
          notes: string | null;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          invoice_number: string;
          customer_name: string;
          customer_email?: string | null;
          customer_address?: string | null;
          invoice_date?: string;
          due_date?: string | null;
          status?: string;
          subtotal?: number;
          sales_record_id?: string | null;
          customer_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          invoice_number?: string;
          customer_name?: string;
          customer_email?: string | null;
          customer_address?: string | null;
          customer_id?: string | null;
          invoice_date?: string;
          due_date?: string | null;
          status?: string;
          subtotal?: number;
          sales_record_id?: string | null;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      invoice_lines: {
        Row: {
          id: string;
          organization_id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          line_total: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          invoice_id: string;
          description: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          sort_order?: number;
        };
        Update: {
          description?: string;
          quantity?: number;
          unit_price?: number;
          line_total?: number;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: { org_id: string; roles: SystemRole[] };
        Returns: boolean;
      };
      current_user_orgs: {
        Args: Record<string, never>;
        Returns: string[];
      };
      seed_ranch_defaults: {
        Args: { p_org_id: string; p_modes?: string[] };
        Returns: undefined;
      };
      create_ranch_organization: {
        Args: {
          p_name: string;
          p_slug: string;
          p_state: string;
          p_timezone: string;
        };
        Returns: string;
      };
      execute_cattle_move: {
        Args: { p_payload: Json };
        Returns: string;
      };
      void_cattle_move: {
        Args: { p_movement_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember =
  Database["public"]["Tables"]["organization_members"]["Row"];
