export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],

  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],

  devtools: {
    enabled: true
  }
})