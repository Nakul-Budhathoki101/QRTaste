export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],

  modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss"],

  devtools: {
    enabled: true,
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_KEY,
    },
  },
});
