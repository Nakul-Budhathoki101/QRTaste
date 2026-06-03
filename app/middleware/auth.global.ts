export default defineNuxtRouteMiddleware(async (to) => {
  const authStore = useAuthStore();

  await authStore.init();

  const publicRoutes = ["/login"];

  if (to.path.startsWith("/table")) {
    return;
  }

  if (publicRoutes.includes(to.path)) {
    return;
  }

  if (!authStore.user) {
    return navigateTo("/login");
  }
});
