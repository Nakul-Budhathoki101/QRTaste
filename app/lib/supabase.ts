import { createClient } from "@supabase/supabase-js";

let supabaseClient: ReturnType<typeof createClient> | null = null;

export const useSupabase = () => {
  const config = useRuntimeConfig();

  if (!supabaseClient) {
    supabaseClient = createClient(
      config.public.supabaseUrl,
      config.public.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "restaurant-app-auth",
        },
      },
    );
  }

  return supabaseClient;
};
