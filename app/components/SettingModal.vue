<script setup lang="ts">
import { useSettingsStore } from "#imports";

const emit = defineEmits<{
  close: [];
}>();

const settingsStore = useSettingsStore();

onMounted(() => {
  settingsStore.loadSettings();
});

const saveAndClose = () => {
  settingsStore.saveSettings();
  emit("close");
};
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl p-8 w-[460px] max-w-[94vw]">
      <h2 class="text-2xl font-bold mb-6">Settings</h2>

      <div class="mb-4">
        <label class="block mb-2 font-bold">Hotel / Restaurant Name</label>
        <input
          v-model="settingsStore.restaurantName"
          type="text"
          class="w-full border rounded-lg p-3"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="mb-4">
          <label class="block mb-2 font-bold">Default Time Limit</label>
          <input
            v-model.number="settingsStore.defaultTimeLimit"
            type="number"
            min="0"
            class="w-full border rounded-lg p-3"
          />
        </div>

        <div class="mb-4">
          <label class="block mb-2 font-bold">Warning Minutes</label>
          <input
            v-model.number="settingsStore.warningBeforeMinutes"
            type="number"
            min="0"
            class="w-full border rounded-lg p-3"
          />
        </div>

        <div class="mb-4">
          <label class="block mb-2 font-bold">Tax Rate (%)</label>
          <input
            v-model.number="settingsStore.taxRate"
            type="number"
            min="0"
            max="100"
            class="w-full border rounded-lg p-3"
          />
        </div>

        <div class="mb-4">
          <label class="block mb-2 font-bold">Currency Label</label>
          <input
            v-model="settingsStore.currencyLabel"
            type="text"
            class="w-full border rounded-lg p-3"
          />
        </div>
      </div>

      <label class="flex items-center gap-3 mb-6 cursor-pointer">
        <input v-model="settingsStore.enableSoundAlert" type="checkbox" />
        <span class="font-bold">Enable sound alert</span>
      </label>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-center my-3">
        <NuxtLink
          to="/admin/category"
          class="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Categories
        </NuxtLink>

        <NuxtLink
          to="/admin/menu"
          class="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Menu
        </NuxtLink>

        <NuxtLink
          to="/admin/table"
          class="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Tables
        </NuxtLink>

        <NuxtLink
          to="/admin/billing"
          class="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          Billing
        </NuxtLink>
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <button
          class="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg"
          @click="$emit('close')"
        >
          Cancel
        </button>

        <button
          class="bg-blue-500 text-white px-4 py-2 rounded-lg"
          @click="saveAndClose"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>
