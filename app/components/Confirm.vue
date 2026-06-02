<script setup lang="ts">
const confirmStore = useConfirmStore();
</script>

<template>
  <Transition>
    <div
      v-if="confirmStore.show"
      class="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999]"
    >
      <div class="bg-white p-6 rounded-xl w-[400px]">
        <h2 class="text-xl font-bold mb-3">
          {{ confirmStore.title }}
        </h2>

        <p class="mb-6">
          {{ confirmStore.message }}
        </p>

        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
            @click="confirmStore.cancel()"
          >
            Cancel
          </button>

          <button
            class="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
            @click="confirmStore.accept()"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
