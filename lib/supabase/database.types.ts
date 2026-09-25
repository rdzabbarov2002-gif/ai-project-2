/**
 * Hand-written to match supabase/migrations/*.sql exactly, because
 * `supabase gen types typescript` requires a live, linked project and
 * network access — neither available in this environment. Once the
 * project exists (after running Stage 3's migrations), regenerate this
 * file for real:
 *
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 *
 * and diff it against this version — they should match. Until then, this
 * is what gives `createClient<Database>()` real autocomplete and type
 * checking instead of `any`.
 */

export interface Database {
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
      };
    };
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
  };
}
