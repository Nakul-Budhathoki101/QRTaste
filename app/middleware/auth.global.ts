export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) {
    return;
  }

  const authStore = useAuthStore();

  if (to.path === "/login" && authStore.user) {
    return navigateTo("/");
  }

  if (to.path !== "/login" && !authStore.user) {
    return navigateTo("/login");
  }
});
