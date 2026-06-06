<script setup lang="ts">
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
  checkout: [];
}>();

const settings = useSettingsStore();
const tableStore = useTableStore();
const orderStore = useOrderStore();
const toastStore = useToastStore();

const localCustomerCount = ref(props.table.customerCount ?? 1);
const localTimeLimit = ref(props.table.timeLimit ?? settings.defaultTimeLimit);
const enableTimeLimit = ref(Boolean(props.table?.timeLimit));
const selectedMoveTargetId = ref<number>();
const selectedMergeTargetId = ref<number>();
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval>;

const isOccupied = computed(() => props.table.status === "occupied");
const isCleaning = computed(() => props.table.status === "cleaning");

const availableMoveTargets = computed(() =>
  tableStore.tables.filter(
    (table) => table.id !== props.table.id && table.status === "available",
  ),
);

const occupiedMergeTargets = computed(() =>
  tableStore.tables.filter(
    (table) => table.id !== props.table.id && table.status === "occupied",
  ),
);

const unbilledSessionOrders = computed(() => {
  if (!isOccupied.value) return [];

  return orderStore.orders.filter((order) => {
    if (order.table_name !== props.table.name) return false;
    if (order.is_billed) return false;

    if (props.table.startTime) {
      return (
        new Date(order.created_at).getTime() >=
        new Date(props.table.startTime).getTime()
      );
    }

    return true;
  });
});

const hasUnpaidOrders = computed(() => unbilledSessionOrders.value.length > 0);

const elapsedSeconds = computed(() => {
  if (!props.table.startTime) return 0;
  return Math.max(
    0,
    Math.floor((now.value - new Date(props.table.startTime).getTime()) / 1000),
  );
});

const elapsedLabel = computed(() => {
  const hrs = Math.floor(elapsedSeconds.value / 3600);
  const mins = Math.floor((elapsedSeconds.value % 3600) / 60);
  const secs = elapsedSeconds.value % 60;

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
});

const decidedTimeLimit = () =>
  enableTimeLimit.value ? localTimeLimit.value : undefined;

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

const setCleaning = async () => {
  if (isOccupied.value && hasUnpaidOrders.value) {
    toastStore.open(
      "This table has unpaid orders. Checkout, move, or merge before cleaning.",
      "error",
    );
    return;
  }

  const result = await tableStore.setCleaning(props.table.id);
  toastStore.open(result?.message ?? "Table set to cleaning", result?.success ? "success" : "error");
  if (result?.success) emit("close");
};

const setAvailable = async () => {
  if (isOccupied.value && hasUnpaidOrders.value) {
    toastStore.open(
      "This table has unpaid orders. Checkout, move, or merge before making it available.",
      "error",
    );
    return;
  }

  const result = await tableStore.resetTable(props.table.id);
  toastStore.open(result?.message ?? "Table is available", result?.success ? "success" : "error");
  if (result?.success) emit("close");
};

const moveSession = async () => {
  if (!selectedMoveTargetId.value) {
    toastStore.open("Select a table to move this session", "error");
    return;
  }

  const result = await tableStore.moveSession(
    props.table.id,
    selectedMoveTargetId.value,
  );
  toastStore.open(result.message, result.success ? "success" : "error");
  if (result.success) emit("close");
};

const mergeSession = async () => {
  if (!selectedMergeTargetId.value) {
    toastStore.open("Select an occupied table to merge with", "error");
    return;
  }

  const result = await tableStore.mergeSession(
    props.table.id,
    selectedMergeTargetId.value,
  );
  toastStore.open(result.message, result.success ? "success" : "error");
  if (result.success) emit("close");
};

onMounted(() => {
  orderStore.loadOrders();
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
    <div
      class="bg-white rounded-2xl w-[760px] max-w-[96vw] max-h-[92vh] overflow-y-auto shadow-2xl"
    >
      <div class="bg-gray-950 text-white p-6 rounded-t-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm uppercase tracking-wide text-gray-400">
              Table Session
            </p>
            <h2 class="text-4xl font-bold">{{ table.name }}</h2>
          </div>

          <button
            class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20"
            @click="$emit('close')"
          >
            x
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div class="bg-white/10 rounded-lg p-3">
            <p class="text-xs text-gray-300">Status</p>
            <p class="font-bold capitalize">{{ table.status }}</p>
          </div>

          <div class="bg-white/10 rounded-lg p-3">
            <p class="text-xs text-gray-300">Guests</p>
            <p class="font-bold">{{ table.customerCount ?? localCustomerCount }}</p>
          </div>

          <div class="bg-white/10 rounded-lg p-3">
            <p class="text-xs text-gray-300">Elapsed</p>
            <p class="font-bold">{{ table.startTime ? elapsedLabel : "Not started" }}</p>
          </div>

          <div class="bg-white/10 rounded-lg p-3">
            <p class="text-xs text-gray-300">Limit</p>
            <p class="font-bold">{{ table.timeLimit ? `${table.timeLimit} min` : "Unlimited" }}</p>
          </div>
        </div>

        <div
          v-if="isOccupied && hasUnpaidOrders"
          class="mt-4 bg-amber-400 text-amber-950 rounded-lg p-3 font-semibold"
        >
          This table has {{ unbilledSessionOrders.length }} unpaid order(s). Checkout, move, or merge before cleaning or clearing the table.
        </div>
      </div>

      <div class="p-6 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5">
        <section class="bg-gray-50 rounded-xl p-4 border">
          <h3 class="font-bold text-lg mb-4">Session Details</h3>

          <label class="block mb-2 font-bold">Customer Count</label>
          <input
            v-model.number="localCustomerCount"
            type="number"
            min="1"
            class="w-full border border-gray-200 rounded-xl p-3 bg-white mb-4"
          />

          <label class="mb-4 flex items-center gap-2 cursor-pointer">
            <input v-model="enableTimeLimit" type="checkbox" />
            <span class="font-bold">Enable Time Limit</span>
          </label>

          <div v-show="enableTimeLimit">
            <label class="block mb-2 font-bold">Time Limit (minutes)</label>
            <input
              v-model.number="localTimeLimit"
              type="number"
              min="1"
              class="w-full border border-gray-200 rounded-xl p-3 bg-white"
            />
          </div>
        </section>

        <section class="bg-gray-50 rounded-xl p-4 border">
          <h3 class="font-bold text-lg mb-4">Real World Actions</h3>

          <div v-if="isOccupied" class="space-y-4">
            <div>
              <label class="block mb-2 text-sm font-bold">Move to table</label>
              <div class="flex gap-2">
                <select
                  v-model="selectedMoveTargetId"
                  class="flex-1 border border-gray-200 rounded-xl p-3 bg-white"
                >
                  <option :value="undefined">Select target</option>
                  <option
                    v-for="target in availableMoveTargets"
                    :key="target.id"
                    :value="target.id"
                  >
                    {{ target.name }} - {{ target.status }}
                  </option>
                </select>

                <button
                  class="bg-indigo-600 text-white px-4 rounded-xl hover:bg-indigo-700"
                  @click="moveSession"
                >
                  Move
                </button>
              </div>
            </div>

            <div>
              <label class="block mb-2 text-sm font-bold">
                Merge bill/orders into occupied table
              </label>
              <div class="flex gap-2">
                <select
                  v-model="selectedMergeTargetId"
                  class="flex-1 border border-gray-200 rounded-xl p-3 bg-white"
                >
                  <option :value="undefined">Select table to merge into</option>
                  <option
                    v-for="target in occupiedMergeTargets"
                    :key="target.id"
                    :value="target.id"
                  >
                    {{ target.name }} - {{ target.customerCount ?? 0 }} guests
                  </option>
                </select>

                <button
                  class="bg-purple-600 text-white px-4 rounded-xl hover:bg-purple-700"
                  @click="mergeSession"
                >
                  Merge
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-gray-500">
            Start a session to move or merge table orders.
          </div>
        </section>
      </div>

      <div class="p-6 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          class="bg-gray-200 px-4 py-3 rounded-xl font-bold hover:bg-gray-300"
          @click="$emit('close')"
        >
          Cancel
        </button>

        <button
          v-if="isOccupied"
          class="bg-amber-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-amber-600"
          @click="$emit('checkout')"
        >
          Checkout
        </button>

        <button
          v-if="isOccupied"
          class="bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-600"
          @click="setCleaning"
        >
          Cleaning
        </button>

        <button
          v-if="isOccupied || isCleaning"
          class="bg-gray-800 text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-900"
          @click="setAvailable"
        >
          Available
        </button>

        <button
          v-if="isOccupied"
          class="bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600"
          @click="handleUpdateSession"
        >
          Update
        </button>

        <button
          v-else-if="!isCleaning"
          class="bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600"
          @click="handleStartSession"
        >
          Start Session
        </button>
      </div>
    </div>
  </div>
</template>
