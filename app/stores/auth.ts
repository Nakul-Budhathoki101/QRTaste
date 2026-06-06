import { defineStore } from "pinia";
import { useSupabase } from "~/lib/supabase";

export const useAuthStore = defineStore("auth", () => {
  const supabase = useSupabase();

  const user = useState<any | null>("auth-user", () => null);
  const initialized = useState("auth-initialized", () => false);
  let unsubscribe: (() => void) | null = null;

  const init = async () => {
    if (!import.meta.client) return;
    if (initialized.value) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    user.value = session?.user ?? null;

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null;
    });

    unsubscribe = data.subscription.unsubscribe;
    initialized.value = true;
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    user.value = data.user;

    return {
      success: true,
      message: "Login successful",
    };
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      return;
    }

    user.value = null;
    initialized.value = false;
    unsubscribe?.();
    unsubscribe = null;

    await navigateTo("/login");
  };
  const loadUser = async () => {
    if (!import.meta.client) return;

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    user.value = authUser;
  };

  return {
    user,
    initialized,

    init,
    login,
    logout,

    loadUser,
  };
});
