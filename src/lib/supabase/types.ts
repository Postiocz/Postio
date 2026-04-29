export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
          created_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: string
          user_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin'
          account_name: string
          access_token: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin'
          account_name: string
          access_token: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: 'instagram' | 'facebook' | 'twitter' | 'linkedin'
          account_name?: string
          access_token?: string
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
          platforms: string[]
          scheduled_at: string | null
          status: 'draft' | 'scheduled' | 'published' | 'failed'
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          media_urls?: string[]
          platforms: string[]
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          media_urls?: string[]
          platforms?: string[]
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'published' | 'failed'
          published_at?: string | null
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
          recorded_at: string
        }
        Insert: {
          id?: string
          post_id: string
          impressions?: number
          engagements?: number
          recorded_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          impressions?: number
          engagements?: number
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
    Views: {}
    Functions: {}
    Enums: {}
  }
}
