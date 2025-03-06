/// <reference types="expo" />

declare module '@env' {
  export const EXPO_PUBLIC_SUPABASE_URL: string;
  export const EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_ADMIN_KEY: string;
    }
  }
}