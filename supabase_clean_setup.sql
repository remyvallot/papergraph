-- ============================================================================
-- Papergraph - Complete Supabase Setup (Clean Install)
-- ============================================================================
-- This script sets up everything from scratch in the correct order.
-- Safe to run on a completely empty Supabase project.
--
-- Run this in Supabase SQL Editor:
-- 1. Dashboard > SQL Editor > New Query
-- 2. Copy/paste this entire file
-- 3. Click "Run"
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE TABLES (No RLS policies yet)
-- ============================================================================

-- 1.1 Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.profiles IS 'Extended user profile information';
COMMENT ON COLUMN public.profiles.username IS 'Unique username for @mentions';

-- 1.2 Projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    data JSONB DEFAULT '{"nodes": [], "edges": [], "zones": [], "positions": {}, "edgeControlPoints": {}}'::jsonb,
    share_token TEXT UNIQUE,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.projects IS 'User research projects with graph data';
COMMENT ON COLUMN public.projects.share_token IS 'Unique token for /share/abc123 links';
COMMENT ON COLUMN public.projects.is_public IS 'If true, anyone with link can view';

-- 1.3 Project members table
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(project_id, user_id)
);

COMMENT ON TABLE public.project_members IS 'Project sharing and role-based access';
COMMENT ON COLUMN public.project_members.role IS 'owner=full control | editor=can edit | viewer=read-only';

-- 1.4 Pending invites table (for users who don't have accounts yet)
CREATE TABLE IF NOT EXISTS public.pending_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    invite_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (timezone('utc'::text, now()) + interval '7 days') NOT NULL,
    UNIQUE(project_id, email)
);

COMMENT ON TABLE public.pending_invites IS 'Email invitations for users who don''t have accounts yet';

-- 1.5 Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('project_invite', 'project_share', 'mention')),
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.notifications IS 'User notifications for invites, shares, and mentions';


-- ============================================================================
-- STEP 2: CREATE INDEXES
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_share_token ON public.projects(share_token);
CREATE INDEX IF NOT EXISTS idx_projects_data_gin ON public.projects USING GIN (data);

-- Project members indexes
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS project_members_role_idx ON public.project_members(role);

-- Pending invites indexes
CREATE INDEX IF NOT EXISTS pending_invites_project_id_idx ON public.pending_invites(project_id);
CREATE INDEX IF NOT EXISTS pending_invites_email_idx ON public.pending_invites(email);
CREATE INDEX IF NOT EXISTS pending_invites_token_idx ON public.pending_invites(invite_token);
CREATE INDEX IF NOT EXISTS pending_invites_expires_at_idx ON public.pending_invites(expires_at);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);


-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- STEP 4: CREATE RLS POLICIES (Now all tables exist)
-- ============================================================================

-- ===== PROFILES POLICIES =====
CREATE POLICY "Profiles viewable by authenticated users"
    ON public.profiles FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- ===== PROJECTS POLICIES =====
-- Simple policy: Users can only manage their own projects
-- Members access will be handled via SECURITY DEFINER functions
CREATE POLICY "Users can view and manage own projects"
    ON public.projects
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Allow viewing public projects (for share links)
CREATE POLICY "Users can view public projects"
    ON public.projects FOR SELECT TO authenticated
    USING (is_public = true);

-- ===== PROJECT MEMBERS POLICIES =====
-- Simple policies without recursion
-- Members can view other members through SECURITY DEFINER functions

CREATE POLICY "Project owners can manage members"
    ON public.project_members
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id 
            AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_members.project_id 
            AND p.user_id = auth.uid()
        )
    );

-- ===== PENDING INVITES POLICIES =====
CREATE POLICY "Project owners can manage pending invites"
    ON public.pending_invites
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = pending_invites.project_id 
            AND p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = pending_invites.project_id 
            AND p.user_id = auth.uid()
        )
    );

-- ===== NOTIFICATIONS POLICIES =====
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT TO authenticated
    WITH CHECK (true);


-- ============================================================================
-- STEP 5: CREATE FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-add project creator as owner (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
    -- Use SECURITY DEFINER to bypass RLS and avoid infinite recursion
    INSERT INTO public.project_members (project_id, user_id, role, added_by)
    VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail project creation
    RAISE WARNING 'Failed to add project owner: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate unique share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
    token_exists BOOLEAN;
BEGIN
    LOOP
        token := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 12));
        SELECT EXISTS(SELECT 1 FROM public.projects WHERE share_token = token) INTO token_exists;
        EXIT WHEN NOT token_exists;
    END LOOP;
    RETURN token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all projects for user (owned + shared)
-- SECURITY DEFINER bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_projects(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    is_owner BOOLEAN,
    role TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    node_count INTEGER,
    edge_count INTEGER,
    owner_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        (p.user_id = user_uuid) as is_owner,
        COALESCE(pm.role, 'owner') as role,
        p.created_at,
        p.updated_at,
        COALESCE(jsonb_array_length(p.data->'nodes'), 0)::INTEGER as node_count,
        COALESCE(jsonb_array_length(p.data->'edges'), 0)::INTEGER as edge_count,
        profiles.email as owner_email
    FROM public.projects p
    LEFT JOIN public.project_members pm ON pm.project_id = p.id AND pm.user_id = user_uuid
    LEFT JOIN public.profiles ON profiles.id = p.user_id
    WHERE p.user_id = user_uuid OR pm.user_id = user_uuid
    ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get project by share token (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_project_by_share_token(token TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    data JSONB,
    is_public BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.user_id, p.name, p.data, p.is_public, p.created_at, p.updated_at
    FROM public.projects p
    WHERE p.share_token = token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Get project by ID if user has access (owner or member)
-- Bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.get_project_if_member(proj_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    data JSONB,
    is_public BOOLEAN,
    share_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Check if user is owner or member
    IF EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id = proj_id AND p.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = proj_id AND pm.user_id = auth.uid()
    ) THEN
        RETURN QUERY
        SELECT p.id, p.user_id, p.name, p.data, p.is_public, p.share_token, p.created_at, p.updated_at
        FROM public.projects p
        WHERE p.id = proj_id;
    ELSE
        -- Return empty result if no access
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update project if user is owner or editor
-- Bypasses RLS to avoid recursion
CREATE OR REPLACE FUNCTION public.update_project_if_member(
    proj_id UUID,
    project_name TEXT DEFAULT NULL,
    project_data JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    user_role TEXT;
    is_owner BOOLEAN;
BEGIN
    -- Check if user is owner
    SELECT EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id = proj_id AND p.user_id = auth.uid()
    ) INTO is_owner;
    
    IF is_owner THEN
        user_role := 'owner';
    ELSE
        -- Check if user is a member and get their role
        SELECT pm.role INTO user_role
        FROM public.project_members pm
        WHERE pm.project_id = proj_id AND pm.user_id = auth.uid();
    END IF;
    
    -- Only owner and editor can update
    IF user_role NOT IN ('owner', 'editor') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Update project
    IF project_name IS NOT NULL AND project_data IS NOT NULL THEN
        UPDATE public.projects
        SET name = project_name, data = project_data, updated_at = timezone('utc'::text, now())
        WHERE id = proj_id;
    ELSIF project_name IS NOT NULL THEN
        UPDATE public.projects
        SET name = project_name, updated_at = timezone('utc'::text, now())
        WHERE id = proj_id;
    ELSIF project_data IS NOT NULL THEN
        UPDATE public.projects
        SET data = project_data, updated_at = timezone('utc'::text, now())
        WHERE id = proj_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'role', user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Share project by email (handles both existing users and pending invites)
CREATE OR REPLACE FUNCTION public.share_project_by_email(
    proj_id UUID,
    target_email TEXT,
    target_role TEXT DEFAULT 'viewer'
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    project_name TEXT;
    inviter_name TEXT;
    invite_token TEXT;
BEGIN
    -- Check if requester is owner
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = proj_id AND user_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM public.project_members 
        WHERE project_id = proj_id AND user_id = auth.uid() AND role = 'owner'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Get project and inviter info
    SELECT name INTO project_name FROM public.projects WHERE id = proj_id;
    SELECT COALESCE(full_name, email) INTO inviter_name FROM public.profiles WHERE id = auth.uid();
    
    -- Find user by email
    SELECT id INTO target_user_id FROM public.profiles WHERE email = target_email;
    
    IF target_user_id IS NOT NULL THEN
        -- User exists - add directly and create notification
        INSERT INTO public.project_members (project_id, user_id, role, added_by)
        VALUES (proj_id, target_user_id, target_role, auth.uid())
        ON CONFLICT (project_id, user_id) 
        DO UPDATE SET role = EXCLUDED.role, added_at = timezone('utc'::text, now());
        
        -- Create notification
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            target_user_id,
            'project_invite',
            inviter_name || ' invited you to a project',
            'You have been invited to collaborate on "' || project_name || '"',
            jsonb_build_object('project_id', proj_id, 'role', target_role, 'inviter_id', auth.uid())
        );
        
        RETURN jsonb_build_object('success', true, 'user_id', target_user_id, 'user_exists', true);
    ELSE
        -- User doesn't exist - create pending invite
        invite_token := lower(substring(md5(random()::text || clock_timestamp()::text || target_email) from 1 for 32));
        
        INSERT INTO public.pending_invites (project_id, email, role, invited_by, invite_token)
        VALUES (proj_id, target_email, target_role, auth.uid(), invite_token)
        ON CONFLICT (project_id, email)
        DO UPDATE SET role = EXCLUDED.role, invite_token = EXCLUDED.invite_token, 
                     created_at = timezone('utc'::text, now()),
                     expires_at = timezone('utc'::text, now()) + interval '7 days';
        
        RETURN jsonb_build_object(
            'success', true, 
            'user_exists', false, 
            'invite_token', invite_token,
            'invite_url', '/invite/' || invite_token
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Share project by username
CREATE OR REPLACE FUNCTION public.share_project_by_username(
    proj_id UUID,
    target_username TEXT,
    target_role TEXT DEFAULT 'viewer'
)
RETURNS JSONB AS $$
DECLARE
    target_user_id UUID;
    target_email TEXT;
    project_name TEXT;
    inviter_name TEXT;
BEGIN
    -- Find user by username
    SELECT id, email INTO target_user_id, target_email 
    FROM public.profiles 
    WHERE username = target_username;
    
    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;
    
    -- Check if requester is owner
    IF NOT EXISTS (
        SELECT 1 FROM public.projects WHERE id = proj_id AND user_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM public.project_members 
        WHERE project_id = proj_id AND user_id = auth.uid() AND role = 'owner'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
    
    -- Get project and inviter info
    SELECT name INTO project_name FROM public.projects WHERE id = proj_id;
    SELECT COALESCE(full_name, email) INTO inviter_name FROM public.profiles WHERE id = auth.uid();
    
    -- Add member
    INSERT INTO public.project_members (project_id, user_id, role, added_by)
    VALUES (proj_id, target_user_id, target_role, auth.uid())
    ON CONFLICT (project_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role, added_at = timezone('utc'::text, now());
    
    -- Create notification
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
        target_user_id,
        'project_invite',
        inviter_name || ' invited you to a project',
        'You have been invited to collaborate on "' || project_name || '"',
        jsonb_build_object('project_id', proj_id, 'role', target_role, 'inviter_id', auth.uid())
    );
    
    RETURN jsonb_build_object('success', true, 'user_id', target_user_id, 'email', target_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user notifications
CREATE OR REPLACE FUNCTION public.get_notifications(unread_only BOOLEAN DEFAULT false)
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    data JSONB,
    read BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF unread_only THEN
        RETURN QUERY
        SELECT n.id, n.type, n.title, n.message, n.data, n.read, n.created_at
        FROM public.notifications n
        WHERE n.user_id = auth.uid() AND n.read = false
        ORDER BY n.created_at DESC;
    ELSE
        RETURN QUERY
        SELECT n.id, n.type, n.title, n.message, n.data, n.read, n.created_at
        FROM public.notifications n
        WHERE n.user_id = auth.uid()
        ORDER BY n.created_at DESC
        LIMIT 50;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notif_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.notifications
    SET read = true
    WHERE id = notif_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    UPDATE public.notifications
    SET read = true
    WHERE user_id = auth.uid() AND read = false;
    
    GET DIAGNOSTICS count = ROW_COUNT;
    RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get project members (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_project_members(proj_id UUID)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    user_id UUID,
    role TEXT,
    added_at TIMESTAMP WITH TIME ZONE,
    added_by UUID
) AS $$
BEGIN
    -- Check if user has access (owner or member)
    IF EXISTS (
        SELECT 1 FROM public.projects p 
        WHERE p.id = proj_id AND p.user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.project_members pm
        WHERE pm.project_id = proj_id AND pm.user_id = auth.uid()
    ) THEN
        RETURN QUERY
        SELECT pm.id, pm.project_id, pm.user_id, pm.role, pm.added_at, pm.added_by
        FROM public.project_members pm
        WHERE pm.project_id = proj_id;
    ELSE
        -- Return empty result if no access
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- STEP 6: CREATE TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
CREATE TRIGGER on_project_created
    AFTER INSERT ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.add_project_owner();


-- ============================================================================
-- STEP 7: ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.project_members TO authenticated;
GRANT ALL ON public.pending_invites TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check tables created
SELECT 'Tables created:' as status;
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'projects', 'project_members', 'pending_invites', 'notifications')
ORDER BY table_name;

-- Check RLS enabled
SELECT 'RLS enabled:' as status;
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'projects', 'project_members', 'pending_invites', 'notifications')
ORDER BY tablename;

-- Check policies count
SELECT 'Policies created:' as status;
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- ✅ SETUP COMPLETE!
-- ============================================================================
-- Next steps:
-- 1. Authentication > Providers: Enable GitHub/Google OAuth
-- 2. Update js/auth/config.js with your Supabase URL and anon key
-- 3. Test by signing up and creating a project
-- ============================================================================
