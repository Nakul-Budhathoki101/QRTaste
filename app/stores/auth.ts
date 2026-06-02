import { defineStore } from "pinia";
import { useSupabase } from "~/lib/supabase";

export const useAuthStore = defineStore("auth", () => {
  const supabase = useSupabase();

  const user = useState<any | null>("auth-user", () => null);

  const init = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log('muji auth.ts',session);

    user.value = session?.user ?? null;

    supabase.auth.onAuthStateChange((_event, session) => {
      user.value = session?.user ?? null;
    });
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

    await navigateTo("/login");
  };
  const loadUser = async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    user.value = authUser;
  };

  return {
    user,

    init,
    login,
    logout,

    loadUser,
  };
});
