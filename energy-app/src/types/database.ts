// Types Supabase écrits à la main pour le MVP.
// À terme, remplacer par `supabase gen types typescript` une fois le
// projet Supabase provisionné (voir supabase/migrations/0001_init.sql).

export type EnergyType = "electricity" | "gas";
export type ImportSource = "fluvius_csv" | "p1_realtime";
export type ContractType = "fixed" | "variable" | "dynamic";

export interface Database {
  public: {
    Tables: {
      csv_imports: {
        Row: {
          id: string;
          user_id: string;
          source: ImportSource;
          energy_type: EnergyType;
          filename: string;
          row_count: number;
          period_start: string | null;
          period_end: string | null;
          imported_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["csv_imports"]["Row"],
          "id" | "imported_at"
        > & { id?: string; imported_at?: string };
        Update: Partial<Database["public"]["Tables"]["csv_imports"]["Insert"]>;
      };
      consumption_readings: {
        Row: {
          id: string;
          user_id: string;
          energy_type: EnergyType;
          reading_at: string;
          value_kwh: number;
          source: ImportSource;
          import_id: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["consumption_readings"]["Row"],
          "id" | "created_at"
        > & { id?: string; created_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["consumption_readings"]["Insert"]
        >;
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
          price_elec_kwh_exclusive_night: number | null;
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
      };
      contract_simulations: {
        Row: {
          id: string;
          user_id: string;
          contract_id: string;
          import_id: string | null;
          annual_cost_estimate: number;
          vs_current_diff_eur: number | null;
          simulated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["contract_simulations"]["Row"],
          "id" | "simulated_at"
        > & { id?: string; simulated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["contract_simulations"]["Insert"]
        >;
      };
      alert_settings: {
        Row: {
          id: string;
          user_id: string;
          threshold_eur_per_year: number;
          notify_email: string | null;
          enabled: boolean;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["alert_settings"]["Row"],
          "id" | "updated_at"
        > & { id?: string; updated_at?: string };
        Update: Partial<
          Database["public"]["Tables"]["alert_settings"]["Insert"]
        >;
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
      };
    };
  };
}
