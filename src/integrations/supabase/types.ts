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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coffee_lots: {
        Row: {
          acidity: number | null
          body: number | null
          created_at: string
          currency: string
          flavor_notes: string[]
          harvest_year: number | null
          humidity_pct: number | null
          id: string
          name: string
          photo_url: string | null
          price_per_kg: number
          process: Database["public"]["Enums"]["process_method"] | null
          producer_id: string
          producer_notes: string | null
          sca_score: number | null
          status: Database["public"]["Enums"]["lot_status"]
          sweetness: number | null
          updated_at: string
          variety: string | null
          volume_kg: number
        }
        Insert: {
          acidity?: number | null
          body?: number | null
          created_at?: string
          currency?: string
          flavor_notes?: string[]
          harvest_year?: number | null
          humidity_pct?: number | null
          id?: string
          name: string
          photo_url?: string | null
          price_per_kg: number
          process?: Database["public"]["Enums"]["process_method"] | null
          producer_id: string
          producer_notes?: string | null
          sca_score?: number | null
          status?: Database["public"]["Enums"]["lot_status"]
          sweetness?: number | null
          updated_at?: string
          variety?: string | null
          volume_kg: number
        }
        Update: {
          acidity?: number | null
          body?: number | null
          created_at?: string
          currency?: string
          flavor_notes?: string[]
          harvest_year?: number | null
          humidity_pct?: number | null
          id?: string
          name?: string
          photo_url?: string | null
          price_per_kg?: number
          process?: Database["public"]["Enums"]["process_method"] | null
          producer_id?: string
          producer_notes?: string | null
          sca_score?: number | null
          status?: Database["public"]["Enums"]["lot_status"]
          sweetness?: number | null
          updated_at?: string
          variety?: string | null
          volume_kg?: number
        }
        Relationships: []
      }
      lot_favorites: {
        Row: {
          created_at: string
          id: string
          lot_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lot_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lot_favorites_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "coffee_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_favorites: {
        Row: {
          created_at: string
          id: string
          producer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          producer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          producer_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          altitude_m: number | null
          certifications: Database["public"]["Enums"]["certification"][]
          city: string | null
          company: string | null
          country: string | null
          created_at: string
          description: string | null
          first_name: string | null
          full_name: string | null
          id: string
          legal_name: string | null
          photo_url: string | null
          region: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sourcing_preferences: Json
          trust_level: Database["public"]["Enums"]["trust_level"]
          updated_at: string
          vat_country_code: string | null
          vat_number: string | null
          vat_verified: boolean
          vat_verified_at: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          website_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          altitude_m?: number | null
          certifications?: Database["public"]["Enums"]["certification"][]
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          legal_name?: string | null
          photo_url?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sourcing_preferences?: Json
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string
          vat_country_code?: string | null
          vat_number?: string | null
          vat_verified?: boolean
          vat_verified_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          altitude_m?: number | null
          certifications?: Database["public"]["Enums"]["certification"][]
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          legal_name?: string | null
          photo_url?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sourcing_preferences?: Json
          trust_level?: Database["public"]["Enums"]["trust_level"]
          updated_at?: string
          vat_country_code?: string | null
          vat_number?: string | null
          vat_verified?: boolean
          vat_verified_at?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          website_url?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      verification_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["verification_status"] | null
          notes: string | null
          previous_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["verification_status"] | null
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["verification_status"] | null
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id: string
          mime_type: string | null
          original_filename: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["verification_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["document_type"]
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["verification_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["document_type"]
          id?: string
          mime_type?: string | null
          original_filename?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["verification_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_directory_profile: {
        Args: { profile_id: string }
        Returns: {
          altitude_m: number
          certifications: Database["public"]["Enums"]["certification"][]
          city: string
          company: string
          country: string
          created_at: string
          description: string
          first_name: string
          full_name: string
          id: string
          photo_url: string
          region: string
          trust_level: Database["public"]["Enums"]["trust_level"]
          website_url: string
        }[]
      }
      get_directory_profiles: {
        Args: {
          result_limit?: number
          result_offset?: number
          search_country?: string
          search_query?: string
        }
        Returns: {
          altitude_m: number
          certifications: Database["public"]["Enums"]["certification"][]
          city: string
          company: string
          country: string
          created_at: string
          description: string
          first_name: string
          full_name: string
          id: string
          photo_url: string
          region: string
          trust_level: Database["public"]["Enums"]["trust_level"]
          website_url: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_lot_publicly_visible: { Args: { _lot_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "producteur" | "torrefacteur" | "shop" | "barista" | "admin"
      certification:
        | "organic"
        | "fairtrade"
        | "rainforest_alliance"
        | "utz"
        | "demeter"
        | "direct_trade"
        | "none"
      document_type:
        | "business_registration"
        | "vat_certificate"
        | "organic_certification"
        | "fairtrade_certification"
        | "farm_photo"
        | "shop_photo"
        | "id_document"
        | "other"
      lot_status: "draft" | "available" | "reserved" | "sold_out"
      process_method:
        | "washed"
        | "natural"
        | "honey"
        | "anaerobic"
        | "wet_hulled"
        | "carbonic_maceration"
        | "other"
      trust_level: "none" | "bronze" | "silver" | "gold"
      verification_status: "pending" | "in_review" | "verified" | "rejected"
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
      app_role: ["producteur", "torrefacteur", "shop", "barista", "admin"],
      certification: [
        "organic",
        "fairtrade",
        "rainforest_alliance",
        "utz",
        "demeter",
        "direct_trade",
        "none",
      ],
      document_type: [
        "business_registration",
        "vat_certificate",
        "organic_certification",
        "fairtrade_certification",
        "farm_photo",
        "shop_photo",
        "id_document",
        "other",
      ],
      lot_status: ["draft", "available", "reserved", "sold_out"],
      process_method: [
        "washed",
        "natural",
        "honey",
        "anaerobic",
        "wet_hulled",
        "carbonic_maceration",
        "other",
      ],
      trust_level: ["none", "bronze", "silver", "gold"],
      verification_status: ["pending", "in_review", "verified", "rejected"],
    },
  },
} as const
