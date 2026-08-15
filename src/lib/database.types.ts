// Database types for the StreakPact Supabase schema.
//
// Hand-written to match supabase/migration.sql, in the same shape that
// `supabase gen types typescript` produces. When the Supabase CLI is available,
// regenerate with:
//   supabase gen types typescript --project-id <project-ref> > src/lib/database.types.ts
// and this file can be replaced wholesale.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          year_month: string | null;
          challenge_id: string | null;
          title: string;
          type: string;
          target_value: number;
          unit: string;
          carried_over: boolean;
          edit_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year_month?: string | null;
          challenge_id?: string | null;
          title: string;
          type: string;
          target_value: number;
          unit: string;
          carried_over?: boolean;
          edit_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year_month?: string | null;
          challenge_id?: string | null;
          title?: string;
          type?: string;
          target_value?: number;
          unit?: string;
          carried_over?: boolean;
          edit_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_logs: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          log_date: string;
          value: number;
          notes: string | null;
          backfilled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          log_date: string;
          value: number;
          notes?: string | null;
          backfilled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          log_date?: string;
          value?: number;
          notes?: string | null;
          backfilled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_logs_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_settlements: {
        Row: {
          id: string;
          user_id: string;
          year_month: string;
          week_number: number;
          week_start: string;
          is_success: boolean;
          settled_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year_month: string;
          week_number: number;
          week_start: string;
          is_success: boolean;
          settled_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year_month?: string;
          week_number?: number;
          week_start?: string;
          is_success?: boolean;
          settled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_settlements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_settlements: {
        Row: {
          id: string;
          user_id: string;
          year_month: string;
          weeks_success: number;
          result: string;
          settled_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year_month: string;
          weeks_success: number;
          result: string;
          settled_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year_month?: string;
          weeks_success?: number;
          result?: string;
          settled_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_settlements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reward_plans: {
        Row: {
          id: string;
          user_id: string;
          year_month: string;
          week_number: number | null;
          success_reward: string | null;
          failure_penalty: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          year_month: string;
          week_number?: number | null;
          success_reward?: string | null;
          failure_penalty?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          year_month?: string;
          week_number?: number | null;
          success_reward?: string | null;
          failure_penalty?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reward_plans_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reward_ledger: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          content: string;
          source: string;
          status: string;
          used_progress: string | null;
          expiry_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          content: string;
          source: string;
          status?: string;
          used_progress?: string | null;
          expiry_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          content?: string;
          source?: string;
          status?: string;
          used_progress?: string | null;
          expiry_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reward_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenges: {
        Row: {
          id: string;
          start_date: string;
          weeks: number;
          initiator: string;
          mode: string;
          team_reward: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          start_date: string;
          weeks?: number;
          initiator: string;
          mode?: string;
          team_reward?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          start_date?: string;
          weeks?: number;
          initiator?: string;
          mode?: string;
          team_reward?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenges_initiator_fkey";
            columns: ["initiator"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      challenge_members: {
        Row: {
          id: string;
          challenge_id: string;
          user_id: string;
          deposit_stake: string | null;
          deposit_execution: string | null;
          result: string | null;
          settled_at: string | null;
          edited_at: string | null;
          abort_requested_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          challenge_id: string;
          user_id: string;
          deposit_stake?: string | null;
          deposit_execution?: string | null;
          result?: string | null;
          settled_at?: string | null;
          edited_at?: string | null;
          abort_requested_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          challenge_id?: string;
          user_id?: string;
          deposit_stake?: string | null;
          deposit_execution?: string | null;
          result?: string | null;
          settled_at?: string | null;
          edited_at?: string | null;
          abort_requested_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_members_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "challenges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "challenge_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      checkin_days: {
        Row: {
          id: string;
          user_id: string;
          day: string;
          backfilled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day: string;
          backfilled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          day?: string;
          backfilled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkin_days_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      coin_ledger: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          source: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          reason: string;
          source?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          reason?: string;
          source?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coin_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_items: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          kind: string;
          price: number;
          payload: string | null;
          repeatable: boolean;
          sort_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          name: string;
          description?: string | null;
          kind: string;
          price: number;
          payload?: string | null;
          repeatable?: boolean;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          name?: string;
          description?: string | null;
          kind?: string;
          price?: number;
          payload?: string | null;
          repeatable?: boolean;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      shop_redemptions: {
        Row: {
          id: string;
          user_id: string;
          item_id: string | null;
          item_key: string;
          item_name: string;
          kind: string;
          price: number;
          payload: string | null;
          source: string;
          equipped: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id?: string | null;
          item_key: string;
          item_name: string;
          kind: string;
          price: number;
          payload?: string | null;
          source: string;
          equipped?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string | null;
          item_key?: string;
          item_name?: string;
          kind?: string;
          price?: number;
          payload?: string | null;
          source?: string;
          equipped?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shop_redemptions_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "shop_items";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

// Convenience aliases for app code.
type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
