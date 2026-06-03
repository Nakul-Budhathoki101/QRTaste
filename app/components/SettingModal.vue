<script setup lang="ts">
import { useSettingsStore } from "#imports";

defineEmits<{
  close: [];
}>();

const settingsStore = useSettingsStore();
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-white rounded-xl p-8 w-[400px]">
      <h2 class="text-2xl font-bold mb-6">Settings</h2>

      <!-- DEFAULT TIME -->
      <div class="mb-4">
        <label class="block mb-2 font-bold"> Default Time Limit </label>

        <input
          v-model.number="settingsStore.defaultTimeLimit"
          type="number"
          class="w-full border rounded-lg p-3"
        />
      </div>

      <!-- WARNING -->
      <div class="mb-6">
        <label class="block mb-2 font-bold"> Warning Before Minutes </label>

        <input
          v-model.number="settingsStore.warningBeforeMinutes"
          type="number"
          class="w-full border rounded-lg p-3"
        />
      </div>

      <!-- TAX RATE -->
      <div class="mb-6">
        <label class="block mb-2 font-bold"> Tax Rate (%) </label>

        <input
          v-model.number="settingsStore.taxRate"
          type="number"
          min="0"
          max="100"
          class="w-full border rounded-lg p-3"
        />
      </div>

      <div class="flex flex-col gap-3 text-center my-3">
        <NuxtLink
          to="/admin/menu"
          class="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          MENU Management
        </NuxtLink>

        <NuxtLink
          to="/admin/table"
          class="bg-green-500 text-white px-4 py-2 rounded-lg"
        >
          TABLE Management
        </NuxtLink>
      </div>

      <div class="flex justify-end">
        <button
          class="bg-blue-500 text-white px-4 py-2 rounded-lg"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
