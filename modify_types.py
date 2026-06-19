import re

with open('src/lib/supabase/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# remove from posts.Row
old_row = """        Row: {
          id: string
          user_id: string
          content: string
          media_urls: string[]
          platforms: string[]
          scheduled_at: string | null
          status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          published_at: string | null
          external_ids: Json | null
          publish_error: string | null
          created_at: string
          updated_at: string
        }"""
new_row = """        Row: {
          id: string
          user_id: string
          content: string
          media_urls: string[]
          location: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }"""
content = content.replace(old_row, new_row)

old_insert = """        Insert: {
          id?: string
          user_id: string
          content: string
          media_urls?: string[]
          platforms: string[]
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          published_at?: string | null
          external_ids?: Json | null
          publish_error?: string | null
          created_at?: string
          updated_at?: string
        }"""
new_insert = """        Insert: {
          id?: string
          user_id: string
          content: string
          media_urls?: string[]
          location?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }"""
content = content.replace(old_insert, new_insert)

old_update = """        Update: {
          id?: string
          user_id?: string
          content?: string
          media_urls?: string[]
          platforms?: string[]
          scheduled_at?: string | null
          status?: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
          published_at?: string | null
          external_ids?: Json | null
          publish_error?: string | null
          created_at?: string
          updated_at?: string
        }"""
new_update = """        Update: {
          id?: string
          user_id?: string
          content?: string
          media_urls?: string[]
          location?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }"""
content = content.replace(old_update, new_update)

with open('src/lib/supabase/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)
