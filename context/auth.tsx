import React, { createContext, useContext, useState, useEffect } from 'react';
import { router, useSegments, useRootNavigationState } from 'expo-router';
import { Platform, View, Text } from 'react-native';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { LoadingScreen } from '../components/LoadingScreen';

type User = Database['public']['Tables']['users']['Row'];

type AuthContextType = {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: 'client' | 'employee') => Promise<void>;
  signOut: () => void;
  user: User | null;
  isLoading: boolean;
  updateUserProfile: (userData: Partial<User>) => Promise<{ success: boolean; error: any }>;
  createUser: (userData: Partial<User>, password: string) => Promise<{ success: boolean; error: any }>;
  isAdmin: () => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return authContext;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to safely fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return { profile: null, error };
      }
      
      return { profile: data, error: null };
    } catch (err) {
      console.error('Exception fetching user profile:', err);
      return { profile: null, error: err };
    }
  };

  // Helper function to safely create user profile
  const createUserProfile = async (userId: string, email: string, name: string, userRole: string) => {
    try {
      // Check if profile already exists to avoid duplicate key errors
      const { profile: existingProfile } = await fetchUserProfile(userId);
      if (existingProfile) {
        return { profile: existingProfile, error: null };
      }
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email || '',
          name: name || email?.split('@')[0] || 'User',
          role: userRole as any || 'client',
          status: 'active'
        })
        .select('*')
        .single();
      
      if (error) {
        // If it's a duplicate key error, try to fetch the profile instead
        if (error.code === '23505') {
          const { profile } = await fetchUserProfile(userId);
          if (profile) {
            return { profile, error: null };
          }
        }
        console.error('Error creating user profile:', error);
        return { profile: null, error };
      }
      
      return { profile: data, error: null };
    } catch (err) {
      console.error('Exception creating user profile:', err);
      return { profile: null, error: err };
    }
  };

  // Only call useProtectedRoute after initialization
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  
  useEffect(() => {
    if (isInitialized && navigationState?.key) {
      const inAuthGroup = segments[0] === '(auth)';
  
      if (!user && !inAuthGroup) {
        // Redirect to the sign-in page.
        router.replace('/sign-in');
      } else if (user && inAuthGroup) {
        // Redirect to the appropriate initial route based on user role
        switch (user.role) {
          case 'admin':
            router.replace('/dashboard');
            break;
          case 'client':
            router.replace('/services');
            break;
          case 'employee':
            router.replace('/tasks');
            break;
          default:
            router.replace('/sign-in');
        }
      }
    }
  }, [user, segments, navigationState?.key, isInitialized]);

  useEffect(() => {
    let isMounted = true;

    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      setError('Missing Supabase configuration');
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    async function initialize() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          // Handle session error by signing out and redirecting to sign in
          await supabase.auth.signOut();
          setUser(null);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        if (!isMounted) return;

        if (session?.user) {
          const { profile, error: profileError } = await fetchUserProfile(session.user.id);

          if (profileError) {
            setError('Error loading user profile');
          } else if (!profile) {
            // If profile doesn't exist, create it based on auth data
            const { profile: newProfile, error: createError } = await createUserProfile(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata.name || '',
              session.user.user_metadata.role || 'client'
            );

            if (createError) {
              setError('Error creating user profile');
            } else if (newProfile) {
              setUser(newProfile);
            }
          } else {
            setUser(profile);
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Handle initialization error by redirecting to sign in
        await supabase.auth.signOut();
        setUser(null);
      } finally {
        if (isMounted) { 
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setUser(null);
        router.replace('/sign-in');
        return;
      }

      if (session?.user && isMounted) {
        const { profile, error: profileError } = await fetchUserProfile(session.user.id);

        if (profileError) {
          setError('Error loading user profile');
          return;
        }

        if (profile) {
          setUser(profile);
          setError(null);
        } else {
          // If profile doesn't exist, create it
          const { profile: newProfile, error: createError } = await createUserProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata.name || '',
            session.user.user_metadata.role || 'client'
          );

          if (createError) {
            setError('Error creating user profile');
          } else if (newProfile) {
            setUser(newProfile);
            setError(null);
          }
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'client' | 'employee') => {
    setIsLoading(true);
    try {
      // First, create the auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          }
        }
      });

      if (authError) throw authError;
      if (!authUser) throw new Error('Failed to create user');

      // Wait a moment for the trigger to potentially create the user
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to create the user profile (this will handle the case if it already exists)
      const { profile, error: profileError } = await createUserProfile(
        authUser.id,
        email,
        name,
        role
      );

      if (profileError && !profileError.code?.includes('23505')) {
        throw profileError;
      }

      // Sign in after successful signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    await supabase.auth.signOut();
    setUser(null);
    router.replace('/sign-in');
  };

  const updateUserProfile = async (userData: Partial<User>) => {
    try {
      if (!user?.id) {
        return { success: false, error: 'No user logged in' };
      }

      const dataToUpdate = {
        ...userData,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('users')
        .update(dataToUpdate)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating user profile:', error);
        return { success: false, error };
      }

      // Refresh user data
      const { profile, error: fetchError } = await fetchUserProfile(user.id);
      if (fetchError) {
        return { success: false, error: fetchError };
      }

      if (profile) {
        setUser(profile);
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Exception updating user profile:', error);
      return { success: false, error };
    }
  };

  const createUser = async (userData: Partial<User>, password: string) => {
    try {
      if (!isAdmin()) {
        return { success: false, error: 'Only administrators can create users' };
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: userData.email!,
        password: password,
        options: {
          data: {
            name: userData.name,
            role: userData.role
          }
        }
      });

      if (signUpError) {
        console.error('Error creating auth user:', signUpError);
        return { success: false, error: signUpError };
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user' };
      }

      const { profile, error: profileError } = await createUserProfile(
        data.user.id,
        userData.email!,
        userData.name!,
        userData.role || 'client'
      );

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return { success: false, error: profileError };
      }

      if (profile) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            ...userData,
            id: profile.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error updating user details:', updateError);
          return { success: false, error: updateError };
        }
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Exception creating user:', error);
      return { success: false, error };
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin';
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#FF3B30', textAlign: 'center', padding: 20 }}>{error}</Text>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      signIn, 
      signUp, 
      signOut, 
      user, 
      isLoading, 
      updateUserProfile, 
      createUser,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
}