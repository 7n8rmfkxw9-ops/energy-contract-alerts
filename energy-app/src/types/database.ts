// Types Supabase écrits à la main pour le MVP.
// À terme, remplacer par `supabase gen types typescript` une fois le
// projet Supabase provisionné (voir supabase/migrations/0001_init.sql).

export type ContractType = "fixed" | "variable" | "dynamic";

export interface Database {
  public: {
    Tables: {
      meter_readings: {
        Row: {
          id: string;
          user_id: string;
          reading_date: string;
          elec_day_index: number | null;
          elec_night_index: number | null;
          gas_index_m3: number | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["meter_readings"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["meter_readings"]["Insert"]
        >;
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          offer_name: string;
          contract_type: ContractType;
          price_elec_kwh_day: number;
          price_elec_kwh_night: number | null;
          price_gas_kwh: number;
          fixed_fee_elec_annual: number;
          fixed_fee_gas_annual: number;
          commitment_months: number;
          source_url: string | null;
          tariff_updated_at: string;
          is_current_contract: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["contracts"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["contracts"]["Insert"]>;
        Relationships: [];
      };
      contract_simulations: {
        Row: {
          id: string;
          user_id: string;
          contract_id: string;
          annual_cost_estimate: number;
          vs_current_diff_eur: number | null;
          period_start: string | null;
          period_end: string | null;
          simulated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["contract_simulations"]["Row"],
          "id" | "simulated_at"
        > & { id?: string; simulated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["contract_simulations"]["Insert"]
        >;
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          threshold_eur_per_year: number;
          notify_email: string | null;
          alerts_enabled: boolean;
          reading_reminder_days: number;
          gas_kwh_per_m3: number;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["user_settings"]["Row"],
          "id" | "updated_at"
        > & { id?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["user_settings"]["Insert"]
        >;
        Relationships: [];
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          contract_id: string;
          simulation_id: string | null;
          threshold_eur: number;
          savings_eur: number;
          channel: "email";
          status: "sent" | "failed" | "skipped";
          message: string | null;
          sent_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["alerts"]["Row"],
          "id" | "sent_at"
        > & { id?: string; sent_at?: string };
        Update: Partial<Database["public"]["Tables"]["alerts"]["Insert"]>;
        Relationships: [];
      };
      market_offers: {
        Row: {
          id: string;
          provider: string;
          offer_name: string;
          contract_type: ContractType;
          price_elec_kwh_day: number;
          price_elec_kwh_night: number | null;
          price_gas_kwh: number;
          fixed_fee_elec_annual: number;
          fixed_fee_gas_annual: number;
          commitment_months: number;
          source_url: string | null;
          tariff_updated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["market_offers"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["market_offers"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
