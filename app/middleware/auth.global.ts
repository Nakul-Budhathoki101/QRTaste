export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;

  const authStore = useAuthStore();

  await authStore.init();

  const publicRoutes = ["/login"];

  if (to.path.startsWith("/order")) {
    return;
  }

  if (publicRoutes.includes(to.path)) {
    if (authStore.user) {
      return navigateTo("/");
    }

    return;
  }

  if (!authStore.user) {
    return navigateTo("/login");
  }
});
