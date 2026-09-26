
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "company_profiles": {
                  Row: {
                    "created_at": string,"id": string,"logo_url": string | null,"name": string,"niche": string | null,"target_audience": string | null,"tone_of_voice": string | null,"updated_at": string,"user_id": string,"usp": string | null,"website_url": string | null
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"logo_url"?: string | null,"name": string,"niche"?: string | null,"target_audience"?: string | null,"tone_of_voice"?: string | null,"updated_at"?: string,"user_id": string,"usp"?: string | null,"website_url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"logo_url"?: string | null,"name"?: string,"niche"?: string | null,"target_audience"?: string | null,"tone_of_voice"?: string | null,"updated_at"?: string,"user_id"?: string,"usp"?: string | null,"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_profiles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback": {
                  Row: {
                    "created_at": string,"id": string,"message": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"message": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"message"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"generations": {
                  Row: {
                    "ai_model": string,"ai_provider": string,"company_profile_id": string | null,"created_at": string,"duration_ms": number | null,"guest_session_id": string | null,"id": string,"input_params": NonNullable<Json>,"input_tokens": number | null,"is_favorite": boolean,"output": string,"output_tokens": number | null,"template_id": string | null,"tool_id": string,"updated_at": string,"user_id": string | null
                  }
                  Insert: {
                    "ai_model": string,"ai_provider": string,"company_profile_id"?: string | null,"created_at"?: string,"duration_ms"?: number | null,"guest_session_id"?: string | null,"id"?: string,"input_params"?: NonNullable<Json>,"input_tokens"?: number | null,"is_favorite"?: boolean,"output"?: string,"output_tokens"?: number | null,"template_id"?: string | null,"tool_id": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "ai_model"?: string,"ai_provider"?: string,"company_profile_id"?: string | null,"created_at"?: string,"duration_ms"?: number | null,"guest_session_id"?: string | null,"id"?: string,"input_params"?: NonNullable<Json>,"input_tokens"?: number | null,"is_favorite"?: boolean,"output"?: string,"output_tokens"?: number | null,"template_id"?: string | null,"tool_id"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "generations_company_profile_id_fkey"
      columns: ["company_profile_id"]
isOneToOne: false
      referencedRelation: "company_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_guest_session_id_fkey"
      columns: ["guest_session_id"]
isOneToOne: false
      referencedRelation: "guest_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_tool_id_fkey"
      columns: ["tool_id"]
isOneToOne: false
      referencedRelation: "tools"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "generations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"guest_sessions": {
                  Row: {
                    "company_profile_draft": Json | null,"created_at": string,"expires_at": string,"id": string,"session_token": string,"updated_at": string
                  }
                  Insert: {
                    "company_profile_draft"?: Json | null,"created_at"?: string,"expires_at": string,"id"?: string,"session_token": string,"updated_at"?: string
                  }
                  Update: {
                    "company_profile_draft"?: Json | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"session_token"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plan_limits": {
                  Row: {
                    "allowed_ai_models": NonNullable<Json>,"allowed_tool_ids": NonNullable<Json>,"created_at": string,"id": string,"max_company_profiles": number | null,"max_generations_per_month": number | null,"max_saved_results": number | null,"plan_id": string,"premium_templates": boolean,"updated_at": string
                  }
                  Insert: {
                    "allowed_ai_models"?: NonNullable<Json>,"allowed_tool_ids"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"max_company_profiles"?: number | null,"max_generations_per_month"?: number | null,"max_saved_results"?: number | null,"plan_id": string,"premium_templates"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "allowed_ai_models"?: NonNullable<Json>,"allowed_tool_ids"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"max_company_profiles"?: number | null,"max_generations_per_month"?: number | null,"max_saved_results"?: number | null,"plan_id"?: string,"premium_templates"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "plan_limits_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: true
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"name": string,"price_month": number | null,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"price_month"?: number | null,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"price_month"?: number | null,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"id": string,"period_end": string | null,"plan_id": string,"provider_ref": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"period_end"?: string | null,"plan_id": string,"provider_ref"?: string | null,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"period_end"?: string | null,"plan_id"?: string,"provider_ref"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"templates": {
                  Row: {
                    "category": string,"config_schema": Json | null,"created_at": string,"id": string,"is_default": boolean,"is_premium": boolean,"name": string,"prompt_template": string,"required_fields": NonNullable<Json>,"slug": string,"tool_id": string,"updated_at": string
                  }
                  Insert: {
                    "category": string,"config_schema"?: Json | null,"created_at"?: string,"id"?: string,"is_default"?: boolean,"is_premium"?: boolean,"name": string,"prompt_template"?: string,"required_fields"?: NonNullable<Json>,"slug": string,"tool_id": string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"config_schema"?: Json | null,"created_at"?: string,"id"?: string,"is_default"?: boolean,"is_premium"?: boolean,"name"?: string,"prompt_template"?: string,"required_fields"?: NonNullable<Json>,"slug"?: string,"tool_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "templates_tool_id_fkey"
      columns: ["tool_id"]
isOneToOne: false
      referencedRelation: "tools"
      referencedColumns: ["id"]
    }
                  ]
                },"tools": {
                  Row: {
                    "category": string | null,"config_schema": NonNullable<Json>,"created_at": string,"description": string | null,"icon": string | null,"id": string,"is_active": boolean,"name": string,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "category"?: string | null,"config_schema"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string | null,"config_schema"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"usage_counters": {
                  Row: {
                    "created_at": string,"generations_count": number,"id": string,"period_end": string,"period_start": string,"updated_at": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"generations_count"?: number,"id"?: string,"period_end": string,"period_start": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"generations_count"?: number,"id"?: string,"period_end"?: string,"period_start"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "usage_counters_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"users": {
                  Row: {
                    "created_at": string,"email": string,"id": string,"plan_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"email": string,"id": string,"plan_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"id"?: string,"plan_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "users_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "increment_usage_counter":
{ Args: { "p_period_end": string,"p_period_start": string,"p_user_id": string }; Returns: {
              "created_at": string,
"generations_count": number,
"id": string,
"period_end": string,
"period_start": string,
"updated_at": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "usage_counters"
        isOneToOne: true
        isSetofReturn: false
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const

