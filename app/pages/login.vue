<script setup lang="ts">
const authStore = useAuthStore();

const toastStore = useToastStore();

const email = ref("");

const password = ref("");

const loading = ref(false);

const submit = async () => {
  loading.value = true;

  const result =
    await authStore.login(
      email.value,
      password.value
    );

  loading.value = false;

  if (!result.success) {
    toastStore.open(
      result.message,
      "error"
    );

    return;
  }

  toastStore.open(
    result.message,
    "success"
  );

  navigateTo("/");
};
</script>

<template>
  <div
    class="min-h-screen flex justify-center items-center bg-gray-100"
  >
    <div
      class="bg-white p-8 rounded-xl shadow-xl w-[400px]"
    >
      <h1
        class="text-3xl font-bold mb-6 text-center"
      >
        QRTaste Login
      </h1>

      <input
        v-model="email"
        type="email"
        placeholder="Email"
        class="w-full border p-3 rounded-lg mb-4"
      />

      <input
        v-model="password"
        type="password"
        placeholder="Password"
        class="w-full border p-3 rounded-lg mb-6"
      />

      <button
        :disabled="loading"
        class="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600"
        @click="submit"
      >
        Login
      </button>
    </div>
  </div>
</template>