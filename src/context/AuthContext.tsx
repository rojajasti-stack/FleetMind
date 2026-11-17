/**
 * Supabase Authentication Context & Hook
 *
 * Provides comprehensive session management, email/password auth, Google OAuth,
 * password recovery, MFA support, rate limiting, and graceful offline fallback.
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { User, Session, AuthError, Factor } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { fleetStore, formatNameFromEmail } from '../services/store';
import { rateLimiter } from '../utils/rateLimiter';
import type { UserProfile } from '../types';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isSupabaseConfigured: boolean;
  authMode: 'supabase' | 'demo';
  profileError: string | null;
  
  // Auth Operations
  signInWithEmail: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    metadata: { fullName: string; companyName?: string },
    captchaToken?: string
  ) => Promise<{ error: string | null; needsEmailVerification?: boolean }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string, captchaToken?: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  
  // Profile & MFA
  refreshProfile: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<{ error: string | null }>;
  enrollMfaTotp: () => Promise<{ factorId?: string; qrCode?: string; secret?: string; error: string | null }>;
  verifyMfaTotp: (factorId: string, code: string) => Promise<{ error: string | null }>;
  unenrollMfaTotp: (factorId: string) => Promise<{ error: string | null }>;
  getMfaFactors: () => Promise<{ all: Factor[]; totp: Factor[] }>;
  
  // Role-Based Authorization
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isNormalUser: boolean;
  isGuest: boolean;
  canAccessFinance: boolean;
  hasRole: (allowedRoles: string[]) => boolean;
  changeUserRole: (targetUserId: string, newRole: string) => Promise<{ success: boolean; error: string | null }>;

  // Demo Mode Switch
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoLoggedIn, setDemoLoggedIn] = useState<boolean>(() => {
    // Clear legacy mock demo token if present
    if (typeof window !== 'undefined' && localStorage.getItem('fleetmind_auth_token') === 'demo_session_active') {
      localStorage.removeItem('fleetmind_auth_token');
    }
    return sessionStorage.getItem('fleetmind_demo_session') === 'active' ||
           localStorage.getItem('fleetmind_demo_mode') === 'true';
  });
  const [profileError, setProfileError] = useState<string | null>(null);

  const authMode: 'supabase' | 'demo' = demoLoggedIn ? 'demo' : 'supabase';

  // Load profile from Supabase with strict security (never assign Super Admin or upsert privileged roles)
  const loadProfile = useCallback(async (userId?: string, userEmail?: string, authUser?: User | null) => {
    setProfileError(null);
    if (isSupabaseConfigured && supabase && userId) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('[Auth Security] Profile query error:', error.message);
          setProfileError(`Could not load profile from database: ${error.message}`);
          // Secure fallback: least-privilege 'Normal User', NEVER elevate to Super Admin
          const fallbackProfile: UserProfile = {
            id: userId,
            full_name: userEmail ? formatNameFromEmail(userEmail) : 'Fleet Operator',
            email: userEmail || '',
            phone: '',
            job_title: 'Fleet Operations',
            company_name: 'FleetMind Logistics',
            role: 'Normal User'
          };
          setProfile(fallbackProfile);
          fleetStore.setUser(userId, userEmail, fallbackProfile);
          return;
        }

        if (data) {
          // Retrieve the user's actual role strictly from public.profiles
          const verifiedRole = (data.role as UserProfile['role']) || 'Normal User';
          const loaded: UserProfile = {
            id: data.id,
            full_name: data.full_name || (userEmail ? formatNameFromEmail(userEmail) : 'Fleet Operator'),
            email: data.email || userEmail || '',
            phone: data.phone || '',
            job_title: data.job_title || 'Fleet Operations',
            company_name: data.company_name || 'FleetMind Logistics',
            avatar_url: data.avatar_url || authUser?.user_metadata?.avatar_url || undefined,
            role: verifiedRole,
            organization_id: (data as any).organization_id || undefined
          };
          setProfile(loaded);
          fleetStore.setUser(userId, userEmail, loaded);
          return;
        } else {
          // Profile record missing in PostgreSQL: Fail securely!
          // NEVER automatically assign Super Admin.
          // NEVER upsert privileged roles from frontend code.
          console.warn('[Auth Security] No profile row exists in public.profiles for user:', userId);
          setProfileError('Your user profile has not been provisioned by an administrator yet. Restricted read view applied.');
          const unprovisionedProfile: UserProfile = {
            id: userId,
            full_name: authUser?.user_metadata?.full_name || (userEmail ? formatNameFromEmail(userEmail) : 'Fleet Operator'),
            email: userEmail || '',
            phone: authUser?.phone || '',
            job_title: 'Unprovisioned User',
            company_name: 'FleetMind Logistics',
            avatar_url: authUser?.user_metadata?.avatar_url || undefined,
            role: 'Normal User'
          };
          setProfile(unprovisionedProfile);
          fleetStore.setUser(userId, userEmail, unprovisionedProfile);
          return;
        }
      } catch (err: any) {
        console.error('[Auth Security] Profile load exception:', err);
        setProfileError('An unexpected error occurred while loading profile.');
        const safeProfile: UserProfile = {
          id: userId,
          full_name: userEmail ? formatNameFromEmail(userEmail) : 'Fleet Operator',
          email: userEmail || '',
          phone: '',
          job_title: 'Fleet Operations',
          company_name: 'FleetMind Logistics',
          role: 'Normal User'
        };
        setProfile(safeProfile);
        fleetStore.setUser(userId, userEmail, safeProfile);
        return;
      }
    }

    // Default profile only for guest/demo mode
    if (demoLoggedIn) {
      setProfile(fleetStore.profile);
    }
  }, [demoLoggedIn]);

  // Initialize Session
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session: initialSession }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('[Auth] Session retrieval warning:', error.message);
          }

          if (mounted) {
            if (initialSession?.user) {
              // Real cloud session active: clear demo flags
              localStorage.removeItem('fleetmind_auth_token');
              localStorage.removeItem('fleetmind_demo_mode');
              sessionStorage.removeItem('fleetmind_demo_session');
              setDemoLoggedIn(false);
              setSession(initialSession);
              setUser(initialSession.user);
              await loadProfile(initialSession.user.id, initialSession.user.email, initialSession.user);
            } else if (demoLoggedIn) {
              // Running in local demo mode only if explicitly activated
              fleetStore.loadDemoData();
              setProfile(fleetStore.profile);
            } else {
              // No session and no demo mode: secure empty state, will redirect to /login
              fleetStore.setUser(null, null, null);
              setProfile(null);
              setUser(null);
              setSession(null);
            }
          }
        } catch (err) {
          console.warn('[Auth] Initialization error:', err);
        }
      } else {
        // Offline / unconfigured mode
        if (demoLoggedIn) {
          fleetStore.loadDemoData();
          setProfile(fleetStore.profile);
        } else {
          fleetStore.setUser(null, null, null);
          setProfile(null);
          setUser(null);
          setSession(null);
        }
      }

      if (mounted) {
        setLoading(false);
      }
    }

    initializeAuth();

    // Listen to Supabase Auth state changes
    let authListener: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentSession?.user) {
            localStorage.removeItem('fleetmind_auth_token');
            localStorage.removeItem('fleetmind_demo_mode');
            sessionStorage.removeItem('fleetmind_demo_session');
            setDemoLoggedIn(false);
            await loadProfile(currentSession.user.id, currentSession.user.email, currentSession.user);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setDemoLoggedIn(false);
          localStorage.removeItem('fleetmind_auth_token');
          localStorage.removeItem('fleetmind_demo_mode');
          sessionStorage.removeItem('fleetmind_demo_session');
          fleetStore.setUser(null, null, null);
        }
      });
      authListener = data.subscription;
    }

    return () => {
      mounted = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [loadProfile, demoLoggedIn]);

  // 1. Email / Password Sign In
  const signInWithEmail = async (email: string, password: string, captchaToken?: string) => {
    // Check rate limit
    const rateCheck = rateLimiter.check();
    if (!rateCheck.allowed) {
      return {
        error: `Too many login attempts. Please wait ${rateCheck.remainingSeconds} seconds before trying again.`
      };
    }

    if (!isSupabaseConfigured || !supabase) {
      rateLimiter.recordFailure();
      return {
        error: 'Cloud database connection is currently unavailable. Please verify network or Supabase status.'
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: captchaToken ? { captchaToken } : undefined
      });

      if (error) {
        const failure = rateLimiter.recordFailure();
        if (failure.lockedOut) {
          return { error: `Too many failed attempts. Account locked for ${failure.remainingSeconds}s.` };
        }
        return { error: error.message };
      }

      rateLimiter.reset();
      localStorage.removeItem('fleetmind_auth_token');
      localStorage.removeItem('fleetmind_demo_mode');
      sessionStorage.removeItem('fleetmind_demo_session');
      setDemoLoggedIn(false);
      setUser(data.user);
      setSession(data.session);
      await loadProfile(data.user.id, data.user.email, data.user);
      return { error: null };
    } catch (err: unknown) {
      rateLimiter.recordFailure();
      const message = err instanceof Error ? err.message : 'Authentication failed';
      return { error: message };
    }
  };

  // 2. User Registration
  const signUpWithEmail = async (
    email: string,
    password: string,
    metadata: { fullName: string; companyName?: string; role?: UserProfile['role'] },
    captchaToken?: string
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Registration requires an active Supabase cloud connection.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: metadata.fullName,
            company_name: metadata.companyName || 'Fleet Operations'
            // Never trust client-provided role metadata. Database trigger assigns 'Normal User' securely.
          },
          emailRedirectTo: `${window.location.origin}/`,
          ...(captchaToken ? { captchaToken } : {})
        }
      });

      if (error) {
        return { error: error.message };
      }

      // If Supabase has email confirmation enabled, session will be null
      const needsEmailVerification = !data.session;

      if (data.session && data.user) {
        localStorage.removeItem('fleetmind_auth_token');
        localStorage.removeItem('fleetmind_demo_mode');
        sessionStorage.removeItem('fleetmind_demo_session');
        setDemoLoggedIn(false);
        setUser(data.user);
        setSession(data.session);
        await loadProfile(data.user.id, data.user.email, data.user);
      }

      return { error: null, needsEmailVerification };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      return { error: message };
    }
  };

  // 3. Google Sign In
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'Google sign-in requires an active Supabase cloud connection.' };
    }

    try {
      // Pre-flight check: verify if Google provider is configured in Supabase
      const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
      const rawSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

      try {
        const settingsRes = await fetch(`${rawSupabaseUrl}/auth/v1/settings`, {
          headers: { apikey: rawSupabaseAnonKey }
        });
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          if (settings?.external?.google === false) {
            return {
              error: 'Google Sign-In is not yet enabled in your Supabase project. To use it, enable Google in your Supabase Dashboard (Authentication -> Providers). For now, please sign in with your Email & Password or use the Demo Operator login.'
            };
          }
        }
      } catch {
        // If settings endpoint is unreachable, proceed to standard OAuth attempt
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      return { error: message };
    }
  };

  // 4. Sign Out
  const signOut = async () => {
    rateLimiter.reset();
    localStorage.removeItem('fleetmind_auth_token');
    localStorage.removeItem('fleetmind_demo_mode');
    sessionStorage.removeItem('fleetmind_demo_session');
    setDemoLoggedIn(false);
    setUser(null);
    setSession(null);
    setProfile(null);
    fleetStore.setUser(null, null, null);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[Auth] Signout error:', err);
      }
    }
  };

  // 5. Password Reset Request
  const sendPasswordResetEmail = async (email: string, captchaToken?: string) => {
    if (!isSupabaseConfigured || !supabase) {
      // Demo simulated success
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
        ...(captchaToken ? { captchaToken } : {})
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset request failed';
      return { error: message };
    }
  };

  // 6. Update Password
  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password update failed';
      return { error: message };
    }
  };

  // 7. Update User Profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (isSupabaseConfigured && supabase && user) {
      try {
        // Disallow self-assignment or modification of role from client frontend
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: data.full_name,
            phone: data.phone,
            job_title: data.job_title,
            company_name: data.company_name,
            avatar_url: data.avatar_url,
            // role is explicitly omitted to prevent privilege escalation
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) return { error: error.message };
        await loadProfile(user.id, user.email);
        return { error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Profile update failed';
        return { error: message };
      }
    }

    // Demo store fallback
    fleetStore.updateProfile(data);
    setProfile(prev => prev ? { ...prev, ...data } : null);
    return { error: null };
  };

  // 8. Multi-Factor Authentication (TOTP)
  const enrollMfaTotp = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'MFA requires an active Supabase cloud connection.' };
    }

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'FleetMind AI'
      });

      if (error) return { error: error.message };
      return {
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        error: null
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'MFA enrollment failed';
      return { error: message };
    }
  };

  const verifyMfaTotp = async (factorId: string, code: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'MFA requires an active Supabase cloud connection.' };
    }

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) return { error: challenge.error.message };

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code
      });

      if (verify.error) return { error: verify.error.message };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'MFA verification failed';
      return { error: message };
    }
  };

  const unenrollMfaTotp = async (factorId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: 'MFA requires an active Supabase cloud connection.' };
    }

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'MFA removal failed';
      return { error: message };
    }
  };

  const getMfaFactors = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { all: [], totp: [] };
    }

    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error || !data) return { all: [], totp: [] };
      return {
        all: data.all,
        totp: data.totp
      };
    } catch {
      return { all: [], totp: [] };
    }
  };

  // Demo Login Quick Action (EXPLICIT USER INVOCATION ONLY)
  const loginAsDemo = () => {
    localStorage.removeItem('fleetmind_auth_token');
    localStorage.setItem('fleetmind_demo_mode', 'true');
    sessionStorage.setItem('fleetmind_demo_session', 'active');
    setDemoLoggedIn(true);
    fleetStore.loadDemoData();
    setProfile(fleetStore.profile);
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id, user.email);
    }
  }, [user, loadProfile]);

  const isAuthenticated = useMemo(() => {
    return Boolean(session?.user || demoLoggedIn);
  }, [session, demoLoggedIn]);

  const userRole = profile?.role || 'Guest';
  const isSuperAdmin = userRole === 'Super Admin';
  const isAdmin = userRole === 'Admin' || isSuperAdmin;
  const isNormalUser = userRole === 'Normal User' || userRole === 'Dispatcher';
  const isGuest = userRole === 'Guest';
  const canAccessFinance = ['Super Admin', 'Admin', 'Fleet Manager', 'Accountant'].includes(userRole);

  const hasRole = useCallback((allowedRoles: string[]) => {
    if (isSuperAdmin) return true;
    return allowedRoles.includes(userRole);
  }, [isSuperAdmin, userRole]);

  const changeUserRole = useCallback(async (targetUserId: string, newRole: string) => {
    if (!isSupabaseConfigured || !supabase) {
      if (profile && profile.id === targetUserId) {
        setProfile({ ...profile, role: newRole as UserProfile['role'] });
      }
      return { success: true, error: null };
    }

    try {
      const { data, error } = await (supabase.rpc as any)('manage_user_role', {
        p_target_user_id: targetUserId,
        p_new_role: newRole
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (user && user.id === targetUserId) {
        await refreshProfile();
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update user role' };
    }
  }, [profile, user, refreshProfile]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      profileError,
      loading,
      isAuthenticated,
      isSupabaseConfigured,
      authMode,
      isSuperAdmin,
      isAdmin,
      isNormalUser,
      isGuest,
      canAccessFinance,
      hasRole,
      changeUserRole,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      sendPasswordResetEmail,
      updatePassword,
      refreshProfile,
      updateUserProfile,
      enrollMfaTotp,
      verifyMfaTotp,
      unenrollMfaTotp,
      getMfaFactors,
      loginAsDemo
    }),
    [
      user,
      session,
      profile,
      profileError,
      loading,
      isAuthenticated,
      authMode,
      isSuperAdmin,
      isAdmin,
      isNormalUser,
      isGuest,
      canAccessFinance,
      hasRole,
      changeUserRole,
      refreshProfile
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
