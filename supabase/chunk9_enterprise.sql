CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN IF NOT EXISTS (
  SELECT 1
  FROM pg_type
  WHERE typname = 'org_role'
) THEN CREATE TYPE public.org_role AS ENUM (
  'owner',
  'admin',
  'vp',
  'associate',
  'analyst',
  'viewer'
);
END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sidebar_label TEXT,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#f97316',
  accent_color TEXT DEFAULT '#06b6d4',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  seat_limit INT DEFAULT 5,
  ai_calls_limit INT DEFAULT 100,
  ai_calls_used INT DEFAULT 0,
  billing_cycle_start TIMESTAMPTZ DEFAULT NOW(),
  allow_public_deals BOOLEAN DEFAULT FALSE,
  require_2fa BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role public.org_role NOT NULL DEFAULT 'analyst',
  department TEXT,
  title TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  invited_by UUID REFERENCES public.profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.org_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) NOT NULL,
  email TEXT NOT NULL,
  role public.org_role NOT NULL DEFAULT 'analyst',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'expired', 'revoked')
  ),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS current_org_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS sidebar_label TEXT;
ALTER TABLE public.saved_deals
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'org', 'public')),
  ADD COLUMN IF NOT EXISTS parent_deal_id UUID REFERENCES public.saved_deals(id),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.dcf_models
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'org', 'public')),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES public.profiles(id);
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcf_models ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.user_has_org_role(
    p_user_id UUID,
    p_org_id UUID,
    p_min_role public.org_role
  ) RETURNS BOOLEAN AS $$
DECLARE role_hierarchy INT;
user_role_level INT;
BEGIN
SELECT CASE
    role
    WHEN 'owner' THEN 6
    WHEN 'admin' THEN 5
    WHEN 'vp' THEN 4
    WHEN 'associate' THEN 3
    WHEN 'analyst' THEN 2
    WHEN 'viewer' THEN 1
  END INTO user_role_level
FROM public.org_members
WHERE user_id = p_user_id
  AND org_id = p_org_id
  AND is_active = TRUE
LIMIT 1;
SELECT CASE
    p_min_role
    WHEN 'owner' THEN 6
    WHEN 'admin' THEN 5
    WHEN 'vp' THEN 4
    WHEN 'associate' THEN 3
    WHEN 'analyst' THEN 2
    WHEN 'viewer' THEN 1
  END INTO role_hierarchy;
RETURN COALESCE(user_role_level >= role_hierarchy, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
CREATE OR REPLACE FUNCTION public.org_has_no_members(p_org_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.org_members
    WHERE org_id = p_org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;
DROP POLICY IF EXISTS "org_members_can_view" ON public.organizations;
DROP POLICY IF EXISTS "auth_users_can_lookup_by_domain" ON public.organizations;
DROP POLICY IF EXISTS "org_owners_admins_can_update" ON public.organizations;
DROP POLICY IF EXISTS "org_members_can_insert" ON public.organizations;
DROP POLICY IF EXISTS "org_members_can_view_profiles_in_org" ON public.profiles;
DROP POLICY IF EXISTS "members_can_view_org_members" ON public.org_members;
DROP POLICY IF EXISTS "owners_admins_can_manage_members" ON public.org_members;
DROP POLICY IF EXISTS "bootstrap_org_owner_membership" ON public.org_members;
DROP POLICY IF EXISTS "members_can_view_org_invitations" ON public.org_invitations;
DROP POLICY IF EXISTS "auth_users_can_lookup_pending_invites" ON public.org_invitations;
DROP POLICY IF EXISTS "owners_admins_can_manage_invitations" ON public.org_invitations;
DROP POLICY IF EXISTS "org_deals_select_access" ON public.saved_deals;
DROP POLICY IF EXISTS "org_deals_insert_access" ON public.saved_deals;
DROP POLICY IF EXISTS "org_deals_update_access" ON public.saved_deals;
DROP POLICY IF EXISTS "org_deals_delete_access" ON public.saved_deals;
DROP POLICY IF EXISTS "org_models_select_access" ON public.dcf_models;
DROP POLICY IF EXISTS "org_models_insert_access" ON public.dcf_models;
DROP POLICY IF EXISTS "org_models_update_access" ON public.dcf_models;
DROP POLICY IF EXISTS "org_models_delete_access" ON public.dcf_models;
DROP POLICY IF EXISTS "members_can_view_activity" ON public.activity_log;
DROP POLICY IF EXISTS "members_can_insert_activity" ON public.activity_log;
CREATE POLICY "org_members_can_view" ON public.organizations FOR
SELECT USING (
    public.user_has_org_role(auth.uid(), id, 'viewer')
  );
CREATE POLICY "auth_users_can_lookup_by_domain" ON public.organizations FOR
SELECT USING (
    auth.uid() IS NOT NULL
    AND domain IS NOT NULL
  );
CREATE POLICY "org_owners_admins_can_update" ON public.organizations FOR
UPDATE USING (
    public.user_has_org_role(auth.uid(), id, 'admin')
  );
CREATE POLICY "org_members_can_insert" ON public.organizations FOR
INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "org_members_can_view_profiles_in_org" ON public.profiles FOR
SELECT USING (
    id = auth.uid()
    OR (
      current_org_id IS NOT NULL
      AND public.user_has_org_role(auth.uid(), current_org_id, 'viewer')
    )
  );
CREATE POLICY "members_can_view_org_members" ON public.org_members FOR
SELECT USING (
    public.user_has_org_role(auth.uid(), org_id, 'viewer')
  );
CREATE POLICY "bootstrap_org_owner_membership" ON public.org_members FOR
INSERT WITH CHECK (
    user_id = auth.uid()
    AND role = 'owner'
    AND invited_by = auth.uid()
    AND public.org_has_no_members(org_id)
  );
CREATE POLICY "owners_admins_can_manage_members" ON public.org_members FOR ALL USING (
  public.user_has_org_role(auth.uid(), org_id, 'admin')
) WITH CHECK (
  public.user_has_org_role(auth.uid(), org_id, 'admin')
);
CREATE POLICY "members_can_view_org_invitations" ON public.org_invitations FOR
SELECT USING (
    public.user_has_org_role(auth.uid(), org_id, 'viewer')
  );
CREATE POLICY "auth_users_can_lookup_pending_invites" ON public.org_invitations FOR
SELECT USING (
    auth.uid() IS NOT NULL
    AND status = 'pending'
    AND expires_at > NOW()
  );
CREATE POLICY "owners_admins_can_manage_invitations" ON public.org_invitations FOR ALL USING (
  public.user_has_org_role(auth.uid(), org_id, 'admin')
) WITH CHECK (
  public.user_has_org_role(auth.uid(), org_id, 'admin')
);
CREATE POLICY "org_deals_select_access" ON public.saved_deals FOR
SELECT USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'org'
      AND org_id IS NOT NULL
      AND public.user_has_org_role(auth.uid(), org_id, 'viewer')
    )
  );
CREATE POLICY "org_deals_insert_access" ON public.saved_deals FOR
INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      org_id IS NULL
      OR public.user_has_org_role(auth.uid(), org_id, 'analyst')
    )
  );
CREATE POLICY "org_deals_update_access" ON public.saved_deals FOR
UPDATE USING (
    user_id = auth.uid()
    OR (
      org_id IS NOT NULL
      AND public.user_has_org_role(auth.uid(), org_id, 'vp')
    )
  );
CREATE POLICY "org_deals_delete_access" ON public.saved_deals FOR DELETE USING (
  user_id = auth.uid()
  OR (
    org_id IS NOT NULL
    AND public.user_has_org_role(auth.uid(), org_id, 'admin')
  )
);
CREATE POLICY "org_models_select_access" ON public.dcf_models FOR
SELECT USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (
      visibility = 'org'
      AND org_id IS NOT NULL
      AND public.user_has_org_role(auth.uid(), org_id, 'viewer')
    )
  );
CREATE POLICY "org_models_insert_access" ON public.dcf_models FOR
INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      org_id IS NULL
      OR public.user_has_org_role(auth.uid(), org_id, 'analyst')
    )
  );
CREATE POLICY "org_models_update_access" ON public.dcf_models FOR
UPDATE USING (
    user_id = auth.uid()
    OR (
      org_id IS NOT NULL
      AND public.user_has_org_role(auth.uid(), org_id, 'vp')
    )
  );
CREATE POLICY "org_models_delete_access" ON public.dcf_models FOR DELETE USING (
  user_id = auth.uid()
  OR (
    org_id IS NOT NULL
    AND public.user_has_org_role(auth.uid(), org_id, 'admin')
  )
);
CREATE POLICY "members_can_view_activity" ON public.activity_log FOR
SELECT USING (
    org_id IS NOT NULL
    AND public.user_has_org_role(auth.uid(), org_id, 'viewer')
  );
CREATE POLICY "members_can_insert_activity" ON public.activity_log FOR
INSERT WITH CHECK (
    user_id = auth.uid()
    AND (
      org_id IS NULL
      OR public.user_has_org_role(auth.uid(), org_id, 'viewer')
    )
  );
NOTIFY pgrst,
'reload schema';
