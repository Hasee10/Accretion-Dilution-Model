-- ============================================================
-- QuantEdge Platform — Base Supabase Schema
-- Safe / idempotent version
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- ============================================================
-- 1. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    role TEXT DEFAULT 'analyst',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Users can view their own profile'
) THEN CREATE POLICY "Users can view their own profile" ON public.profiles FOR
SELECT USING (auth.uid() = id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Users can update their own profile'
) THEN CREATE POLICY "Users can update their own profile" ON public.profiles FOR
UPDATE USING (auth.uid() = id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Users can insert their own profile'
) THEN CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = id);
END IF;
END $$;
-- ============================================================
-- 2. SAVED DEALS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    deal_name TEXT NOT NULL,
    deal_data JSONB NOT NULL,
    result_snapshot JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT [],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.saved_deals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'saved_deals'
        AND policyname = 'Users can view their own deals'
) THEN CREATE POLICY "Users can view their own deals" ON public.saved_deals FOR
SELECT USING (
        auth.uid() = user_id
        OR is_public = TRUE
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'saved_deals'
        AND policyname = 'Users can insert their own deals'
) THEN CREATE POLICY "Users can insert their own deals" ON public.saved_deals FOR
INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'saved_deals'
        AND policyname = 'Users can update their own deals'
) THEN CREATE POLICY "Users can update their own deals" ON public.saved_deals FOR
UPDATE USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'saved_deals'
        AND policyname = 'Users can delete their own deals'
) THEN CREATE POLICY "Users can delete their own deals" ON public.saved_deals FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
-- ============================================================
-- 3. DCF MODELS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dcf_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    model_name TEXT NOT NULL,
    ticker TEXT,
    model_data JSONB NOT NULL,
    result_snapshot JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dcf_models ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'dcf_models'
        AND policyname = 'Users can view their own or public DCF models'
) THEN CREATE POLICY "Users can view their own or public DCF models" ON public.dcf_models FOR
SELECT USING (
        auth.uid() = user_id
        OR is_public = TRUE
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'dcf_models'
        AND policyname = 'Users can insert their own DCF models'
) THEN CREATE POLICY "Users can insert their own DCF models" ON public.dcf_models FOR
INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'dcf_models'
        AND policyname = 'Users can update their own DCF models'
) THEN CREATE POLICY "Users can update their own DCF models" ON public.dcf_models FOR
UPDATE USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'dcf_models'
        AND policyname = 'Users can delete their own DCF models'
) THEN CREATE POLICY "Users can delete their own DCF models" ON public.dcf_models FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
-- ============================================================
-- 4. WATCHLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    ticker TEXT NOT NULL,
    company_name TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, ticker)
);
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'watchlist'
        AND policyname = 'Users can view their own watchlist'
) THEN CREATE POLICY "Users can view their own watchlist" ON public.watchlist FOR
SELECT USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'watchlist'
        AND policyname = 'Users can insert into their own watchlist'
) THEN CREATE POLICY "Users can insert into their own watchlist" ON public.watchlist FOR
INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'watchlist'
        AND policyname = 'Users can delete from their own watchlist'
) THEN CREATE POLICY "Users can delete from their own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
-- ============================================================
-- 5. AI CHAT HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    session_id UUID NOT NULL,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    context_type TEXT,
    context_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'ai_chat_history'
        AND policyname = 'Users can view their own chat history'
) THEN CREATE POLICY "Users can view their own chat history" ON public.ai_chat_history FOR
SELECT USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'ai_chat_history'
        AND policyname = 'Users can insert their own chat messages'
) THEN CREATE POLICY "Users can insert their own chat messages" ON public.ai_chat_history FOR
INSERT WITH CHECK (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename = 'ai_chat_history'
        AND policyname = 'Users can delete their own chat history'
) THEN CREATE POLICY "Users can delete their own chat history" ON public.ai_chat_history FOR DELETE USING (auth.uid() = user_id);
END IF;
END $$;
-- ============================================================
-- 6. FMP CACHE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fmp_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticker TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ticker, endpoint)
);
-- ============================================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_saved_deals_updated_at ON public.saved_deals;
CREATE TRIGGER update_saved_deals_updated_at BEFORE
UPDATE ON public.saved_deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_dcf_models_updated_at ON public.dcf_models;
CREATE TRIGGER update_dcf_models_updated_at BEFORE
UPDATE ON public.dcf_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- ============================================================
-- 8. OPTIONAL: BACKFILL PROFILES FOR EXISTING AUTH USERS
-- ============================================================
INSERT INTO public.profiles (id, full_name, email, company, role, avatar_url)
SELECT u.id,
    COALESCE(
        NULLIF(u.raw_user_meta_data->>'full_name', ''),
        NULLIF(u.raw_user_meta_data->>'name', ''),
        split_part(u.email, '@', 1)
    ) AS full_name,
    u.email,
    NULL,
    'analyst',
    NULL
FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
    AND u.email IS NOT NULL;
-- ============================================================
-- 9. STORAGE: AVATARS BUCKET (OPTIONAL, RUN SEPARATELY IF NEEDED)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT DO NOTHING;
-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1
--         FROM pg_policies
--         WHERE schemaname = 'storage'
--           AND tablename = 'objects'
--           AND policyname = 'Avatar images are publicly accessible'
--     ) THEN
--         CREATE POLICY "Avatar images are publicly accessible"
--         ON storage.objects
--         FOR SELECT
--         USING (bucket_id = 'avatars');
--     END IF;
--
--     IF NOT EXISTS (
--         SELECT 1
--         FROM pg_policies
--         WHERE schemaname = 'storage'
--           AND tablename = 'objects'
--           AND policyname = 'Users can upload their own avatar'
--     ) THEN
--         CREATE POLICY "Users can upload their own avatar"
--         ON storage.objects
--         FOR INSERT
--         WITH CHECK (
--             bucket_id = 'avatars'
--             AND auth.uid()::text = (storage.foldername(name))[1]
--         );
--     END IF;
-- END $$;
NOTIFY pgrst,
'reload schema';