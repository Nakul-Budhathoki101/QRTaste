export default defineNuxtRouteMiddleware(async () => {
  console.log("muji AUTH MIDDLEWARE RUNNING");

  const authStore = useAuthStore();

  await authStore.init();

  console.log("muji USER", authStore.user);

  if (!authStore.user) {
    return navigateTo("/login");
  }
});
