/**
 * Hand-written to match supabase/migrations/*.sql exactly, because
 * `supabase gen types typescript` requires a live, linked project — once
 * one exists, regenerate this file for real and diff it against this one:
 *
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 *
 * Shape follows what the generator emits (and what supabase-js's
 * `GenericSchema` requires): a `type` alias (not an `interface` — an
 * interface has no implicit index signature, so it can't satisfy
 * `Record<string, GenericTable>`), a `Relationships` array on every table
 * (one entry per foreign key in the migrations, which is also what types
 * embedded selects like `plans(slug)` / `tools!inner(...)`), and
 * `Views`/`Enums`/`CompositeTypes` even though this schema has none.
 * The first real `next build` (Phase 1) showed that without these,
 * supabase-js resolves every table to `never` — i.e. the earlier version
 * of this file typed nothing at all.
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          plan_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          plan_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "users_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      company_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          niche: string | null;
          tone_of_voice: string | null;
          target_audience: string | null;
          usp: string | null;
          website_url: string | null;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          niche?: string | null;
          tone_of_voice?: string | null;
          target_audience?: string | null;
          usp?: string | null;
          website_url?: string | null;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "company_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      guest_sessions: {
        Row: {
          id: string;
          session_token: string;
          company_profile_draft: Record<string, unknown> | null;
          created_at: string;
          expires_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_token: string;
          company_profile_draft?: Record<string, unknown> | null;
          created_at?: string;
          expires_at: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["guest_sessions"]["Insert"]>;
        Relationships: [];
      };
      tools: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          icon: string | null;
          category: string | null;
          config_schema: Record<string, unknown>;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          category?: string | null;
          config_schema?: Record<string, unknown>;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tools"]["Insert"]>;
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          tool_id: string;
          slug: string;
          name: string;
          category: string;
          prompt_template: string;
          required_fields: unknown[];
          is_premium: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tool_id: string;
          slug: string;
          name: string;
          category: string;
          prompt_template?: string;
          required_fields?: unknown[];
          is_premium?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["templates"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "templates_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          slug: "free" | "pro" | "enterprise";
          name: string;
          price_month: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: "free" | "pro" | "enterprise";
          name: string;
          price_month?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plans"]["Insert"]>;
        Relationships: [];
      };
      plan_limits: {
        Row: {
          id: string;
          plan_id: string;
          max_generations_per_month: number | null;
          max_saved_results: number | null;
          max_company_profiles: number | null;
          allowed_tool_ids: "all" | string[];
          allowed_ai_models: "all" | string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          max_generations_per_month?: number | null;
          max_saved_results?: number | null;
          max_company_profiles?: number | null;
          allowed_tool_ids?: "all" | string[];
          allowed_ai_models?: "all" | string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["plan_limits"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "plan_limits_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: true;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_counters: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          generations_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_start: string;
          period_end: string;
          generations_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["usage_counters"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "usage_counters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          status: "active" | "trialing" | "past_due" | "canceled";
          provider_ref: string | null;
          period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          status?: "active" | "trialing" | "past_due" | "canceled";
          provider_ref?: string | null;
          period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      generations: {
        Row: {
          id: string;
          user_id: string | null;
          guest_session_id: string | null;
          company_profile_id: string | null;
          tool_id: string;
          template_id: string | null;
          ai_provider: string;
          ai_model: string;
          input_params: Record<string, unknown>;
          output: string;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          guest_session_id?: string | null;
          company_profile_id?: string | null;
          tool_id: string;
          template_id?: string | null;
          ai_provider: string;
          ai_model: string;
          input_params?: Record<string, unknown>;
          output?: string;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["generations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "generations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_guest_session_id_fkey";
            columns: ["guest_session_id"];
            isOneToOne: false;
            referencedRelation: "guest_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_company_profile_id_fkey";
            columns: ["company_profile_id"];
            isOneToOne: false;
            referencedRelation: "company_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_tool_id_fkey";
            columns: ["tool_id"];
            isOneToOne: false;
            referencedRelation: "tools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generations_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      /**
       * Matches supabase/migrations/0011_increment_usage_counter.sql.
       * service_role only — see that file for why it's revoked from
       * anon/authenticated.
       */
      increment_usage_counter: {
        Args: {
          p_user_id: string;
          p_period_start: string;
          p_period_end: string;
        };
        Returns: Database["public"]["Tables"]["usage_counters"]["Row"];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
