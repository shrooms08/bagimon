import type { Mood } from '@bagimon/shared';

export type BagimonCreatedVia = 'discord' | 'web';

export type Bagimon = {
  id: string;
  discord_server_id: string | null;
  discord_server_name: string | null;
  coin_mint: string;
  coin_symbol: string | null;
  coin_name: string | null;
  current_mood: Mood;
  is_alive: boolean;
  born_at: string;
  died_at: string | null;
  last_activity_at: string;
  spawned_by_discord_user_id: string | null;
  created_via: BagimonCreatedVia;
  owner_wallet: string | null;
  claimed_at: string | null;
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
  lifetime_fees_lamports: number | null;
  lifetime_fees_sol: number | null;
  creator_provider: string | null;
  creator_username: string | null;
  creator_provider_username: string | null;
  creator_wallet: string | null;
  creator_pfp: string | null;
  creator_royalty_bps: number | null;
  bags_synced_at: string | null;
  bags_sync_error: string | null;
  times_fed: number;
  times_pet: number;
  last_fed_at: string | null;
  last_fed_by: string | null;
  last_interaction_at: string | null;
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
  holding_percent_of_supply: number | null;
  snapshot_at: string;
  first_became_parent_at: string;
  updated_at: string;
};

export type BagimonParentInsert = {
  bagimon_id: string;
  wallet_address: string;
  rank: number;
  holding_amount: number;
  holding_percent_of_supply?: number | null;
  snapshot_at: string;
};

export type BagimonInsert = {
  discord_server_id?: string | null;
  discord_server_name?: string | null;
  coin_mint: string;
  coin_symbol?: string | null;
  coin_name?: string | null;
  current_mood?: Mood;
  spawned_by_discord_user_id?: string | null;
  created_via?: BagimonCreatedVia;
};

export type MoodTransitionInsert = {
  bagimon_id: string;
  from_mood: Mood | null;
  to_mood: Mood;
  trigger_reason: string | null;
  created_at?: string;
};

export type InteractionChannel = 'discord' | 'web';
export type InteractionAction = 'pet' | 'feed';

export type Interaction = {
  id: string;
  bagimon_id: string;
  petter_discord_user_id: string | null;
  petter_discord_display_name: string | null;
  response_text: string;
  source: 'haiku' | 'fallback';
  channel: InteractionChannel;
  actor_wallet: string | null;
  action_type: InteractionAction;
  created_at: string;
};

export type InteractionInsert = {
  bagimon_id: string;
  petter_discord_user_id?: string | null;
  petter_discord_display_name?: string | null;
  response_text: string;
  source: 'haiku' | 'fallback';
  channel?: InteractionChannel;
  actor_wallet?: string | null;
  action_type?: InteractionAction;
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
        Insert: BagimonParentInsert;
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
