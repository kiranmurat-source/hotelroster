export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          description: string | null
          id: string
          name: string
          threshold_points: number
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          threshold_points: number
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          threshold_points?: number
        }
        Relationships: []
      }
      extra_hours_requests: {
        Row: {
          created_at: string
          date: string
          department: string
          hours: number
          id: string
          reason: string
          staff_id: string
          staff_name: string
          status: string
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          created_at?: string
          date: string
          department: string
          hours: number
          id?: string
          reason: string
          staff_id: string
          staff_name: string
          status?: string
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          created_at?: string
          date?: string
          department?: string
          hours?: number
          id?: string
          reason?: string
          staff_id?: string
          staff_name?: string
          status?: string
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: []
      }
      extra_staff_requests: {
        Row: {
          created_at: string
          date: string
          department: string
          id: string
          number_of_staff: number
          reason: string
          requested_by: string
          shift: string
          status: string
          submitted_at: string
          submitted_by: string
        }
        Insert: {
          created_at?: string
          date: string
          department: string
          id?: string
          number_of_staff: number
          reason: string
          requested_by: string
          shift: string
          status?: string
          submitted_at?: string
          submitted_by: string
        }
        Update: {
          created_at?: string
          date?: string
          department?: string
          id?: string
          number_of_staff?: number
          reason?: string
          requested_by?: string
          shift?: string
          status?: string
          submitted_at?: string
          submitted_by?: string
        }
        Relationships: []
      }
      forecasts: {
        Row: {
          created_at: string
          days: Json
          end_date: string
          id: string
          start_date: string
          uploaded_at: string
          user_id: string
          week_label: string
        }
        Insert: {
          created_at?: string
          days: Json
          end_date: string
          id?: string
          start_date: string
          uploaded_at?: string
          user_id: string
          week_label: string
        }
        Update: {
          created_at?: string
          days?: Json
          end_date?: string
          id?: string
          start_date?: string
          uploaded_at?: string
          user_id?: string
          week_label?: string
        }
        Relationships: []
      }
      kudos: {
        Row: {
          category: string
          created_at: string
          from_user_id: string
          id: string
          message: string
          to_user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          from_user_id: string
          id?: string
          message: string
          to_user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          to_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      roster_shifts: {
        Row: {
          created_at: string
          custom_end_time: string | null
          custom_start_time: string | null
          date: string
          department: string
          id: string
          shift: string
          shift_type_id: string | null
          staff_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_end_time?: string | null
          custom_start_time?: string | null
          date: string
          department: string
          id?: string
          shift: string
          shift_type_id?: string | null
          staff_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_end_time?: string | null
          custom_start_time?: string | null
          date?: string
          department?: string
          id?: string
          shift?: string
          shift_type_id?: string | null
          staff_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roster_shifts_shift_type_id_fkey"
            columns: ["shift_type_id"]
            isOneToOne: false
            referencedRelation: "shift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_types: {
        Row: {
          code: string
          color: string
          created_at: string | null
          end_time: string | null
          id: string
          is_editable_time: boolean
          is_off: boolean
          label: string
          sort_order: number
          start_time: string | null
        }
        Insert: {
          code: string
          color?: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_editable_time?: boolean
          is_off?: boolean
          label: string
          sort_order?: number
          start_time?: string | null
        }
        Update: {
          code?: string
          color?: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_editable_time?: boolean
          is_off?: boolean
          label?: string
          sort_order?: number
          start_time?: string | null
        }
        Relationships: []
      }
      staff_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          staff_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          staff_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_points: {
        Row: {
          staff_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          staff_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          staff_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_kudos: {
        Args: {
          _category: string
          _from_user_id: string
          _message: string
          _to_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "staff"],
    },
  },
} as const
