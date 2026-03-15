// QuantEdge Supabase TypeScript Types
// Matches the schema defined in supabase/schema.sql

export type UserRole = 'analyst' | 'associate' | 'vp' | 'director' | 'md'
export type OrgRole = 'owner' | 'admin' | 'vp' | 'associate' | 'analyst' | 'viewer'

export interface Profile {
    id: string
    full_name: string
    email: string
    company: string | null
    role: UserRole
    avatar_url: string | null
    current_org_id: string | null
    is_platform_admin: boolean
    created_at: string
    updated_at: string
}

export interface Organization {
    id: string
    name: string
    sidebar_label: string | null
    slug: string
    domain: string | null
    logo_url: string | null
    primary_color: string
    accent_color: string
    plan: 'free' | 'pro' | 'enterprise'
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    subscription_status: string
    seat_limit: number
    ai_calls_limit: number
    ai_calls_used: number
    billing_cycle_start: string
    allow_public_deals: boolean
    require_2fa: boolean
    created_at: string
    updated_at: string
}

export interface OrgMember {
    id: string
    org_id: string
    user_id: string
    role: OrgRole
    department: string | null
    title: string | null
    is_active: boolean
    invited_by: string | null
    joined_at: string
}

export interface OrgInvitation {
    id: string
    org_id: string
    invited_by: string
    email: string
    role: OrgRole
    token: string
    status: 'pending' | 'accepted' | 'expired' | 'revoked'
    expires_at: string
    created_at: string
}

export interface SavedDeal {
    id: string
    user_id: string
    deal_name: string
    deal_data: Record<string, unknown>
    result_snapshot: Record<string, unknown> | null
    is_public: boolean
    tags: string[] | null
    org_id: string | null
    visibility: 'private' | 'org' | 'public'
    parent_deal_id: string | null
    created_by: string | null
    last_edited_by: string | null
    is_pinned: boolean | null
    created_at: string
    updated_at: string
}

export interface DcfModel {
    id: string
    user_id: string
    model_name: string
    ticker: string | null
    model_data: Record<string, unknown>
    result_snapshot: Record<string, unknown> | null
    is_public: boolean
    org_id: string | null
    visibility: 'private' | 'org' | 'public'
    created_by: string | null
    last_edited_by: string | null
    created_at: string
    updated_at: string
}

export interface WatchlistItem {
    id: string
    user_id: string
    ticker: string
    company_name: string | null
    added_at: string
}

export interface AiChatMessage {
    id: string
    user_id: string
    session_id: string
    role: 'user' | 'assistant'
    content: string
    context_type: 'merger' | 'dcf' | 'general' | null
    context_data: Record<string, unknown> | null
    created_at: string
}

export interface ActivityLogEntry {
    id: string
    org_id: string | null
    user_id: string | null
    action: string
    resource_type: string | null
    resource_id: string | null
    metadata: Record<string, unknown> | null
    ip_address: string | null
    created_at: string
}

// Supabase Database type for the client
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile
                Insert: Omit<Profile, 'created_at' | 'updated_at'>
                Update: Partial<Omit<Profile, 'id' | 'created_at'>>
            }
            organizations: {
                Row: Organization
                Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at' | 'stripe_customer_id' | 'stripe_subscription_id' | 'sidebar_label'> & {
                    sidebar_label?: string | null
                }
                Update: Partial<Omit<Organization, 'id' | 'created_at'>>
            }
            org_members: {
                Row: OrgMember
                Insert: Omit<OrgMember, 'id' | 'joined_at'>
                Update: Partial<Omit<OrgMember, 'id' | 'org_id' | 'user_id' | 'joined_at'>>
            }
            org_invitations: {
                Row: OrgInvitation
                Insert: Omit<OrgInvitation, 'id' | 'token' | 'created_at'>
                Update: Partial<Omit<OrgInvitation, 'id' | 'org_id' | 'invited_by' | 'created_at'>>
            }
            activity_log: {
                Row: ActivityLogEntry
                Insert: Omit<ActivityLogEntry, 'id' | 'created_at'>
                Update: never
            }
            saved_deals: {
                Row: SavedDeal
                Insert: Omit<SavedDeal, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<SavedDeal, 'id' | 'user_id' | 'created_at'>>
            }
            dcf_models: {
                Row: DcfModel
                Insert: Omit<DcfModel, 'id' | 'created_at' | 'updated_at'>
                Update: Partial<Omit<DcfModel, 'id' | 'user_id' | 'created_at'>>
            }
            watchlist: {
                Row: WatchlistItem
                Insert: Omit<WatchlistItem, 'id' | 'added_at'>
                Update: Partial<Omit<WatchlistItem, 'id' | 'user_id'>>
            }
            ai_chat_history: {
                Row: AiChatMessage
                Insert: Omit<AiChatMessage, 'id' | 'created_at'>
                Update: never
            }
        }
    }
}
