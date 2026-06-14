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
          platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok'
          account_name: string
          access_token: string
          platform_id: string | null
          avatar_url: string | null
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
          status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          scheduled_at: string | null
          published_at: string | null
          external_id: string | null
          publish_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          platform: string
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          scheduled_at?: string | null
          published_at?: string | null
          external_id?: string | null
          publish_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          platform?: string
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          scheduled_at?: string | null
          published_at?: string | null
          external_id?: string | null
          publish_error?: string | null
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
    Views: {}
    Functions: {}
    Enums: {}
  }
}
