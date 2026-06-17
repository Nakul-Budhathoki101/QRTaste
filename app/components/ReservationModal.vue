<script setup lang="ts">
import type { RestaurantTable } from "#imports";

const props = withDefaults(
  defineProps<{
    initialTableId?: number;
    lockTable?: boolean;
  }>(),
  {
    initialTableId: undefined,
    lockTable: false,
  },
);

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const reservationStore = useReservationStore();
const tableStore = useTableStore();
const toastStore = useToastStore();

const form = ref({
  table_id: props.initialTableId,
  customer_name: "",
  customer_phone: "",
  guest_count: 1,
  reserved_at: "",
  notes: "",
});

const availableTables = computed(() =>
  tableStore.tables
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
);

const selectedTable = computed<RestaurantTable | null>(() => {
  if (!form.value.table_id) return null;
  return availableTables.value.find((table) => table.id === form.value.table_id) || null;
});

watch(
  () => props.initialTableId,
  (tableId) => {
    if (props.lockTable) form.value.table_id = tableId;
  },
);

const saveReservation = async () => {
  const table = selectedTable.value;

  if (!table) {
    toastStore.open("Select a table", "error");
    return;
  }

  const customerName = form.value.customer_name.trim();

  if (!customerName) {
    toastStore.open("Customer name is required", "error");
    return;
  }

  if (!form.value.reserved_at) {
    toastStore.open("Reservation time is required", "error");
    return;
  }

  if (form.value.guest_count < 1) {
    toastStore.open("Guest count must be at least 1", "error");
    return;
  }

  if (form.value.guest_count > table.seats) {
    toastStore.open(
      `${table.name} only has ${table.seats} seat(s). Choose a larger table.`,
      "error",
    );
    return;
  }

  const reservedAt = new Date(form.value.reserved_at);

  if (reservedAt.getTime() <= Date.now()) {
    toastStore.open("Reservation time must be in the future", "error");
    return;
  }

  if (reservationStore.hasReservationConflict(table.id, reservedAt.toISOString())) {
    toastStore.open(`${table.name} already has a reservation at this time.`, "error");
    return;
  }

  const result = await reservationStore.createReservation({
    table_id: table.id,
    table_name: table.name,
    customer_name: customerName,
    customer_phone: form.value.customer_phone.trim() || null,
    guest_count: form.value.guest_count,
    reserved_at: reservedAt.toISOString(),
    status: "reserved",
    notes: form.value.notes.trim() || null,
  });

  toastStore.open(result.message, result.success ? "success" : "error");

  if (!result.success) return;

  emit("saved");
  emit("close");
};

onMounted(async () => {
  await Promise.all([
    tableStore.loadTables(),
    reservationStore.loadReservations(),
  ]);

  if (props.initialTableId) {
    form.value.table_id = props.initialTableId;
    form.value.guest_count = selectedTable.value?.seats || 1;
  }
});
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4">
    <div class="bg-white p-6 rounded-xl w-[620px] max-w-[96vw] shadow-2xl">
      <div class="flex items-start justify-between gap-4 mb-4">
        <div>
          <p class="text-sm text-gray-500">Schedule table service</p>
          <h2 class="text-2xl font-bold">Add Reservation</h2>
        </div>

        <button class="text-2xl leading-none" @click="$emit('close')">x</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block">
          <span class="block text-sm font-bold mb-1">Table</span>
          <select
            v-model="form.table_id"
            class="w-full border rounded-lg p-3 bg-white disabled:bg-gray-100"
            :disabled="lockTable"
          >
            <option :value="undefined">Select table</option>
            <option
              v-for="table in availableTables"
              :key="table.id"
              :value="table.id"
            >
              {{ table.name }} - {{ table.seats }} seats
            </option>
          </select>
        </label>

        <label class="block">
          <span class="block text-sm font-bold mb-1">Guests</span>
          <input
            v-model.number="form.guest_count"
            type="number"
            min="1"
            class="w-full border rounded-lg p-3"
          />
        </label>

        <label class="block">
          <span class="block text-sm font-bold mb-1">Customer Name</span>
          <input v-model="form.customer_name" class="w-full border rounded-lg p-3" />
        </label>

        <label class="block">
          <span class="block text-sm font-bold mb-1">Phone</span>
          <input v-model="form.customer_phone" class="w-full border rounded-lg p-3" />
        </label>

        <label class="block sm:col-span-2">
          <span class="block text-sm font-bold mb-1">Reservation Time</span>
          <input
            v-model="form.reserved_at"
            type="datetime-local"
            class="w-full border rounded-lg p-3"
          />
        </label>
      </div>

      <label class="block mt-3">
        <span class="block text-sm font-bold mb-1">Notes</span>
        <textarea v-model="form.notes" class="w-full border rounded-lg p-3" />
      </label>

      <div class="flex justify-end gap-3 mt-4">
        <button class="bg-gray-200 px-4 py-2 rounded-lg" @click="$emit('close')">
          Cancel
        </button>

        <button
          class="px-5 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
          @click="saveReservation"
        >
          Save Reservation
        </button>
      </div>
    </div>
  </div>
</template>
