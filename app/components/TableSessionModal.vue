<script setup lang="ts">
import { ref } from "vue";
import type { RestaurantTable } from "#imports";

const props = defineProps<{
  table: RestaurantTable;
}>();

const emit = defineEmits<{
  close: [];
  start: [
    {
      customerCount: number;
      timeLimit?: number;
    },
  ];
  update: [
    {
      customerCount: number;
      timeLimit?: number;
    },
  ];
}>();

const settings = useSettingsStore();
const tableStore = useTableStore();

const localCustomerCount = ref(props.table.customerCount ?? 1);

const localTimeLimit = ref(props.table.timeLimit ?? settings.defaultTimeLimit);

const enableTimeLimit = ref(Boolean(props.table?.timeLimit));

const alreadyLimitedTIme = computed(() => props.table.timeLimit != null);

const isExistingSession = props.table.status === "occupied";

const decidedTimeLimit = () => {
  return enableTimeLimit.value ? localTimeLimit.value : undefined;
};

const handleStartSession = () => {
  emit("start", {
    customerCount: localCustomerCount.value,
    timeLimit: decidedTimeLimit(),
  });
};

const handleUpdateSession = () => {
  emit("update", {
    customerCount: localCustomerCount.value,
    timeLimit: decidedTimeLimit(),
  });
};

const enableTimeLimitHR = () => {
  enableTimeLimit.value = !enableTimeLimit.value;
};
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div
      class="bg-white rounded-3xl p-8 w-[420px] text-black shadow-2xl border border-gray-100"
    >
      {{ props.table }}

      <h2 class="text-2xl font-bold mb-6">{{ table.name }}</h2>

      <!-- CUSTOMER COUNT -->
      <div class="mb-4">
        <label class="block mb-2 font-bold"> Customer Count </label>

        <input
          v-model.number="localCustomerCount"
          type="number"
          class="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      <div class="mb-4 flex items-center gap-2" @click="enableTimeLimitHR">
        <input type="checkbox" v-model="enableTimeLimit" />

        <label class="font-bold"> Enable Time Limit </label>
      </div>

      <!-- TIME LIMIT -->
      <div class="mb-6" v-show="enableTimeLimit">
        <label class="block mb-2 font-bold"> Time Limit (minutes) </label>

        <input
          v-model.number="localTimeLimit"
          type="number"
          class="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400"
        />
      </div>

      <!-- BUTTONS -->
      <div class="flex flex-col gap-3">
        <button
          class="bg-gray-300 px-4 py-2 rounded-lg"
          @click="$emit('close')"
        >
          Cancel
        </button>

        <div v-if="isExistingSession" class="flex flex-col gap-3 mt-4">
          <!-- CLEANING -->
          <button
            class="bg-blue-500 text-white px-4 py-2 rounded-lg"
            @click.stop="tableStore.setCleaning(table.id)"
          >
            Cleaning
          </button>

          <!-- AVAILABLE -->
          <button
            class="bg-gray-700 text-white px-4 py-2 rounded-lg"
            @click.stop="tableStore.resetTable(table.id)"
          >
            Available
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <!-- UPDATE -->
          <button
            v-if="isExistingSession"
            class="bg-green-500 text-white px-4 py-2 rounded-lg"
            @click="handleUpdateSession"
          >
            {{ "Update Session" }}
          </button>

          <!-- START  -->
          <button
            v-else
            class="bg-green-500 text-white px-4 py-2 rounded-lg"
            @click="handleStartSession"
          >
            {{ "Start Session" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
