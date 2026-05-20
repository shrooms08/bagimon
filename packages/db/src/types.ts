import type { Mood } from '@bagimon/shared';

export type Bagimon = {
  id: string;
  discord_server_id: string;
  discord_server_name: string | null;
  coin_mint: string;
  coin_symbol: string | null;
  coin_name: string | null;
  current_mood: Mood;
  is_alive: boolean;
  born_at: string;
  died_at: string | null;
  last_activity_at: string;
  spawned_by_discord_user_id: string;
  created_at: string;
  updated_at: string;
  last_stats_at: string | null;
  last_price_usd: number | null;
  last_volume24h_usd: number | null;
  last_price_change_24h_pct: number | null;
  death_announced: boolean;
  final_mood: Mood | null;
  final_price_usd: number | null;
  final_volume24h_usd: number | null;
};

export type MoodTransition = {
  id: string;
  bagimon_id: string;
  from_mood: Mood | null;
  to_mood: Mood;
  trigger_reason: string | null;
  created_at: string;
};

export type BagimonParent = {
  id: string;
  bagimon_id: string;
  wallet_address: string;
  rank: number;
  holding_amount: number;
  first_became_parent_at: string;
  updated_at: string;
};

export type BagimonInsert = {
  discord_server_id: string;
  discord_server_name?: string | null;
  coin_mint: string;
  coin_symbol?: string | null;
  coin_name?: string | null;
  current_mood?: Mood;
  spawned_by_discord_user_id: string;
};

export type MoodTransitionInsert = {
  bagimon_id: string;
  from_mood: Mood | null;
  to_mood: Mood;
  trigger_reason: string | null;
  created_at?: string;
};

export type Interaction = {
  id: string;
  bagimon_id: string;
  petter_discord_user_id: string;
  petter_discord_display_name: string;
  response_text: string;
  source: 'haiku' | 'fallback';
  created_at: string;
};

export type InteractionInsert = {
  bagimon_id: string;
  petter_discord_user_id: string;
  petter_discord_display_name: string;
  response_text: string;
  source: 'haiku' | 'fallback';
};

export type AiCall = {
  id: string;
  bagimon_id: string | null;
  discord_user_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd_estimate: number;
  latency_ms: number;
  succeeded: boolean;
  fallback_reason: string | null;
  created_at: string;
};

export type AiCallInsert = {
  bagimon_id: string | null;
  discord_user_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost_usd_estimate: number;
  latency_ms: number;
  succeeded: boolean;
  fallback_reason?: string | null;
};

export type Database = {
  public: {
    Tables: {
      bagimons: {
        Row: Bagimon;
        Insert: BagimonInsert;
        Update: Partial<Bagimon>;
        Relationships: [];
      };
      mood_transitions: {
        Row: MoodTransition;
        Insert: MoodTransitionInsert;
        Update: Partial<MoodTransition>;
        Relationships: [];
      };
      bagimon_parents: {
        Row: BagimonParent;
        Insert: Omit<BagimonParent, 'id' | 'first_became_parent_at' | 'updated_at'>;
        Update: Partial<BagimonParent>;
        Relationships: [];
      };
      interactions: {
        Row: Interaction;
        Insert: InteractionInsert;
        Update: Partial<Interaction>;
        Relationships: [];
      };
      ai_calls: {
        Row: AiCall;
        Insert: AiCallInsert;
        Update: Partial<AiCall>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
