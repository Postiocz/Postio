export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type PostingSchedule = {
  enabled: boolean
  "0": string[] // Sunday
  "1": string[] // Monday
  "2": string[] // Tuesday
  "3": string[] // Wednesday
  "4": string[] // Thursday
  "5": string[] // Friday
  "6": string[] // Saturday
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          plan: 'free' | 'creator' | 'pro'
          language: 'cs' | 'en' | 'uk'
          streak: number
          onboarded: boolean
          timezone: string | null
          time_format: '12' | '24' | null
          start_of_week: 'sunday' | 'monday' | null
          default_posting_time: string | null
          posting_schedule: PostingSchedule | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          plan?: 'free' | 'creator' | 'pro'
          language?: 'cs' | 'en' | 'uk'
          streak?: number
          onboarded?: boolean
          timezone?: string | null
          time_format?: '12' | '24' | null
          start_of_week?: 'sunday' | 'monday' | null
          default_posting_time?: string | null
          posting_schedule?: PostingSchedule | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          plan?: 'free' | 'creator' | 'pro'
          language?: 'cs' | 'en' | 'uk'
          streak?: number
          onboarded?: boolean
          timezone?: string | null
          time_format?: '12' | '24' | null
          start_of_week?: 'sunday' | 'monday' | null
          default_posting_time?: string | null
          posting_schedule?: PostingSchedule | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          created_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: string
          user_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok'
          account_name: string
          access_token: string
          platform_id: string | null
          avatar_url: string | null
          token_expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok'
          account_name: string
          access_token: string
          platform_id?: string | null
          avatar_url?: string | null
          token_expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok'
          account_name?: string
          access_token?: string
          platform_id?: string | null
          avatar_url?: string | null
          token_expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string
          media_urls: string[]
          location: string | null
          tags: string[]
          created_at: string
          updated_at: string
          auto_delete_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          media_urls?: string[]
          location?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          auto_delete_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          media_urls?: string[]
          location?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
          auto_delete_at?: string | null
        }
      }
      post_platforms: {
        Row: {
          id: string
          post_id: string
          platform: string
          status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'removed_externally' | 'archived'
          scheduled_at: string | null
          published_at: string | null
          external_id: string | null
          publish_error: string | null
          metadata: Record<string, unknown>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          platform: string
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'removed_externally' | 'archived'
          scheduled_at?: string | null
          published_at?: string | null
          external_id?: string | null
          publish_error?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          platform?: string
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'removed_externally' | 'archived'
          scheduled_at?: string | null
          published_at?: string | null
          external_id?: string | null
          publish_error?: string | null
          metadata?: Record<string, unknown>
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      post_tags: {
        Row: {
          id: string
          post_id: string
          tag_id: string
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          tag_id: string
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          tag_id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          user_id: string
          name: string
          content: string
          is_premium: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          content: string
          is_premium?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          content?: string
          is_premium?: boolean
          created_at?: string
        }
      }
      analytics: {
        Row: {
          id: string
          post_id: string
          impressions: number
          engagements: number
          likes: number
          comments: number
          shares: number
          clicks: number
          saves: number
          recorded_at: string
        }
        Insert: {
          id?: string
          post_id: string
          impressions?: number
          engagements?: number
          likes?: number
          comments?: number
          shares?: number
          clicks?: number
          saves?: number
          recorded_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          impressions?: number
          engagements?: number
          likes?: number
          comments?: number
          shares?: number
          clicks?: number
          saves?: number
          recorded_at?: string
        }
      }
      cookie_consents: {
        Row: {
          id: string
          user_id: string
          necessary: boolean
          analytics: boolean
          marketing: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          necessary?: boolean
          analytics?: boolean
          marketing?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          necessary?: boolean
          analytics?: boolean
          marketing?: boolean
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
