<script setup lang="ts">
const toastStore = useToastStore();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <Transition
    enter-active-class="transition duration-300"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div
      v-if="toastStore.show"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 rounded-xl shadow-2xl text-white min-w-[300px]"
      :class="{
        'bg-green-500': toastStore.type === 'success',
        'bg-red-500': toastStore.type === 'error',
        'bg-blue-500': toastStore.type === 'info',
      }"
    >
      <div class="flex justify-between items-center gap-4">
        <span>
          {{ toastStore.message }}
        </span>

        <button class="font-bold" @click="emit('close')">x</button>
      </div>
    </div>
  </Transition>
</template>
