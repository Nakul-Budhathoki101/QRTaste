<script setup lang="ts">
import { useSupabase } from "~/lib/supabase";
import type { RestaurantTable, TableStatus } from "#imports";

const supabase = useSupabase();
const tableStore = useTableStore();
const toastStore = useToastStore();
const confirmStore = useConfirmStore();

const tables = computed(() => tableStore.tables);

const loading = ref(false);

const showAddModal = ref(false);
const showEditModal = ref(false);

const showConfirm = ref(false);

const DEFAULT_NEW_TABLE = {
  name: "",
  seats: 1,
  status: "available" as TableStatus,
  customerCount: 0,
  timeLimit: 0,
};
const newTable = ref(DEFAULT_NEW_TABLE);

onMounted(async () => {
  await tableStore.loadTables();
});

const selectedTable = ref<RestaurantTable | null>(null);

const openEditModal = (item: RestaurantTable) => {
  selectedTable.value = {
    ...item,
  };
  showEditModal.value = true;
};

const createTable = async () => {
  const exists = tables.value.some(
    (table: any) =>
      table.name.toLowerCase() === newTable.value.name.toLowerCase(),
  );

  if (exists) {
    alert("Table already exists");
    return;
  }

  const result = await tableStore.addTable(newTable.value);
  toastStore.open(result.message, result.success ? "success" : "error");

  showAddModal.value = false;
  newTable.value = DEFAULT_NEW_TABLE;
};

const updateTable = async () => {
  if (!selectedTable.value) return;

  const result = await tableStore.updateTable(selectedTable.value.id, {
    name: selectedTable.value.name,
    seats: selectedTable.value.seats,
    status: selectedTable.value.status,
  });
  toastStore.open(result.message, result.success ? "success" : "error");

  showEditModal.value = false;
};

const deleteTable = async (id: number) => {
  const table = tables.value.find((x) => x.id === id);

  if (!table) {
    toastStore.open("Table not found", "error");
    return;
  }

  const confirmed = await confirmStore.confirm({
    title: "Delete Table",
    message: `Are you sure you want to delete table "${table.name}"?`,
  });

  if (!confirmed) return;
  const result = await tableStore.removeTable(id);

  toastStore.open(result.message, result.success ? "success" : "error");
};
</script>

<template>
  <div class="p-2 mt-5 mb-5">
    <NuxtLink to="/" class="bg-gray-500 text-white px-4 py-2 rounded-lg">
      ← Dashboard
    </NuxtLink>
  </div>

  <div class="p-2">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">TABLE Management</h1>

      <h2
        class="text-2xl font-bold bg-green-500 p-2 rounded text-gray-800 mb-6 hover:bg-green-400"
        @click="showAddModal = true"
      >
        🍽 Add Table
      </h2>
    </div>

    <div v-if="loading" class="text-center py-12">Loading tables...</div>

    <div
      v-if="!loading && tables.length === 0"
      class="text-center py-12 text-gray-400"
    >
      No tables found....
    </div>

    <!-- TABLES -->
    <div
      v-for="table in tables"
      :key="table.id"
      class="bg-white shadow rounded-xl p-4 mb-4"
    >
      <div class="flex justify-between">
        <div>
          <h2 class="font-bold text-xl">
            {{ table.name }}
          </h2>

          <p>Seats: {{ table.seats }}</p>

          <span
            class="px-3 py-1 rounded-full text-white text-sm"
            :class="{
              'bg-green-500': table.status === 'available',

              'bg-yellow-500': table.status === 'occupied',

              'bg-blue-500': table.status === 'reserved',

              'bg-red-500': table.status === 'cleaning',
            }"
          >
            {{ table.status }}
          </span>

          <p>
            Time Limit:
            {{ table.timeLimit || "-" }}
          </p>
        </div>

        <div class="flex gap-2">
          <button
            @click="openEditModal(table)"
            class="w-20 bg-blue-500 text-white px-3 py-2 rounded-xl transition hover:bg-blue-600 hover:shadow-md"
          >
            Edit
          </button>

          <button
            @click="deleteTable(table.id)"
            class="w-24 bg-red-500 text-white px-3 py-2 rounded-xl transition hover:bg-red-600 hover:shadow-md"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- EDIT TABLE MODAL -->
    <div
      v-if="showEditModal && selectedTable"
      class="fixed inset-0 bg-black/50 flex justify-center items-center"
    >
      <div class="bg-white p-6 rounded-xl w-[500px]">
        <input
          v-model="selectedTable.name"
          placeholder="Table Name"
          class="w-full border p-2 mb-3"
        />

        <input
          v-model.number="selectedTable.seats"
          type="number"
          placeholder="Seats"
          class="w-full border p-2 mb-3"
        />

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>

          <select
            v-model="selectedTable.status"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          >
            <option value="available">🟢 Available</option>
            <option value="occupied">🟡 Occupied</option>
            <option value="reserved">🔵 Reserved</option>
            <option value="cleaning">🔴 Cleaning</option>
          </select>
        </div>

        <div class="flex justify-end gap-3 mt-4">
          <button
            @click="showEditModal = false"
            class="bg-gray-300 px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            @click="updateTable"
            class="px-5 py-2 rounded-lg bg-blue-500 text-white font-medium transition hover:bg-blue-600 hover:shadow-md"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>

    <!-- ADD MENU ITEM MODAL -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/50 flex justify-center items-center"
    >
      <div class="bg-white p-6 rounded-xl w-[500px]">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Table Name
          </label>

          <input
            v-model="newTable.name"
            placeholder="e.g. A1"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Seats
          </label>

          <input
            v-model.number="newTable.seats"
            type="number"
            min="1"
            placeholder="Number of seats"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          />
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>

          <select
            v-model="newTable.status"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
          >
            <option value="available">🟢 Available</option>
            <option value="occupied">🟡 Occupied</option>
            <option value="reserved">🔵 Reserved</option>
            <option value="cleaning">🔴 Cleaning</option>
          </select>
        </div>

        <div class="flex justify-end gap-3 mt-4">
          <button
            @click="showAddModal = false"
            class="px-5 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium transition hover:bg-gray-300"
          >
            Cancel
          </button>

          <button
            @click="createTable"
            class="px-5 py-2 rounded-lg bg-green-500 text-white font-medium transition hover:bg-green-600 hover:shadow-md"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
