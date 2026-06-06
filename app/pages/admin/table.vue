<script setup lang="ts">
import type { RestaurantTable, TableStatus } from "#imports";

const tableStore = useTableStore();
const toastStore = useToastStore();
const confirmStore = useConfirmStore();

const tables = computed(() => tableStore.tables);
const loading = ref(true);
const showAddModal = ref(false);
const showEditModal = ref(false);
const search = ref("");
const statusFilter = ref<TableStatus | "all">("all");
const seatFilter = ref<"all" | "small" | "medium" | "large">("all");

const createDefaultTable = () => ({
  name: "",
  seats: 1,
  status: "available" as TableStatus,
});

const newTable = ref(createDefaultTable());
const selectedTable = ref<RestaurantTable | null>(null);

const filteredTables = computed(() => {
  const term = search.value.trim().toLowerCase();

  return tables.value.filter((table) => {
    const matchesSearch =
      !term ||
      table.name.toLowerCase().includes(term) ||
      table.status.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter.value === "all" || table.status === statusFilter.value;

    const matchesSeats =
      seatFilter.value === "all" ||
      (seatFilter.value === "small" && table.seats <= 2) ||
      (seatFilter.value === "medium" && table.seats >= 3 && table.seats <= 4) ||
      (seatFilter.value === "large" && table.seats >= 5);

    return matchesSearch && matchesStatus && matchesSeats;
  });
});

const tableCounts = computed(() => ({
  total: tables.value.length,
  available: tables.value.filter((table) => table.status === "available").length,
  occupied: tables.value.filter((table) => table.status === "occupied").length,
  needsCleaning: tables.value.filter((table) => table.status === "cleaning")
    .length,
}));

onMounted(async () => {
  loading.value = true;
  await tableStore.loadTables();
  loading.value = false;
});

const openEditModal = (item: RestaurantTable) => {
  selectedTable.value = { ...item };
  showEditModal.value = true;
};

const createTable = async () => {
  const name = newTable.value.name.trim();

  if (!name) {
    toastStore.open("Table name is required", "error");
    return;
  }

  if (newTable.value.seats < 1) {
    toastStore.open("Seats must be at least 1", "error");
    return;
  }

  const exists = tables.value.some(
    (table) => table.name.toLowerCase() === name.toLowerCase(),
  );

  if (exists) {
    toastStore.open("Table already exists", "error");
    return;
  }

  const result = await tableStore.addTable({
    ...newTable.value,
    name,
  });
  toastStore.open(result.message, result.success ? "success" : "error");

  if (!result.success) return;

  showAddModal.value = false;
  newTable.value = createDefaultTable();
};

const updateTable = async () => {
  if (!selectedTable.value) return;

  const name = selectedTable.value.name.trim();

  if (!name) {
    toastStore.open("Table name is required", "error");
    return;
  }

  if (selectedTable.value.seats < 1) {
    toastStore.open("Seats must be at least 1", "error");
    return;
  }

  const result = await tableStore.updateTable(selectedTable.value.id, {
    name,
    seats: selectedTable.value.seats,
    status: selectedTable.value.status,
  });
  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) showEditModal.value = false;
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
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-5xl mx-auto">
      <div class="mb-5">
        <NuxtLink to="/" class="bg-gray-700 text-white px-4 py-2 rounded-lg">
          Dashboard
        </NuxtLink>
      </div>

      <div
        class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6"
      >
        <div>
          <h1 class="text-3xl font-bold">Table Management</h1>
          <p class="text-gray-500 mt-1">
            Search, filter, and maintain table capacity and service state.
          </p>
        </div>

        <button
          class="font-bold bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          @click="showAddModal = true"
        >
          Add Table
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Total Tables</p>
          <p class="text-2xl font-bold">{{ tableCounts.total }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Available</p>
          <p class="text-2xl font-bold text-green-600">
            {{ tableCounts.available }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Occupied</p>
          <p class="text-2xl font-bold text-amber-600">
            {{ tableCounts.occupied }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Cleaning</p>
          <p class="text-2xl font-bold text-blue-600">
            {{ tableCounts.needsCleaning }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            v-model="search"
            class="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Search table or status"
          />

          <select
            v-model="statusFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
            <option value="cleaning">Cleaning</option>
          </select>

          <select
            v-model="seatFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All capacities</option>
            <option value="small">1 to 2 seats</option>
            <option value="medium">3 to 4 seats</option>
            <option value="large">5+ seats</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">Loading tables...</div>

      <div
        v-else-if="filteredTables.length === 0"
        class="text-center py-12 text-gray-400 bg-white rounded-lg"
      >
        No tables found.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="table in filteredTables"
          :key="table.id"
          class="bg-white shadow rounded-lg p-4"
        >
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="font-bold text-xl">{{ table.name }}</h2>
              <p class="text-gray-500">Seats: {{ table.seats }}</p>

              <span
                class="inline-flex mt-2 px-3 py-1 rounded-full text-white text-sm capitalize"
                :class="{
                  'bg-green-500': table.status === 'available',
                  'bg-yellow-500': table.status === 'occupied',
                  'bg-purple-500': table.status === 'reserved',
                  'bg-blue-500': table.status === 'cleaning',
                }"
              >
                {{ table.status }}
              </span>
            </div>

            <div class="flex gap-2">
              <button
                class="w-20 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600"
                @click="openEditModal(table)"
              >
                Edit
              </button>

              <button
                class="w-24 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
                @click="deleteTable(table.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="showEditModal && selectedTable"
        class="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      >
        <div class="bg-white p-6 rounded-xl w-[500px] max-w-[94vw]">
          <h2 class="text-2xl font-bold mb-4">Edit Table</h2>

          <input
            v-model="selectedTable.name"
            placeholder="Table Name"
            class="w-full border rounded-lg p-3 mb-3"
          />

          <input
            v-model.number="selectedTable.seats"
            type="number"
            min="1"
            placeholder="Seats"
            class="w-full border rounded-lg p-3 mb-3"
          />

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>

          <select
            v-model="selectedTable.status"
            class="w-full rounded-lg border border-gray-300 px-3 py-3 bg-white mb-4"
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
            <option value="cleaning">Cleaning</option>
          </select>

          <div class="flex justify-end gap-3">
            <button
              class="bg-gray-200 px-4 py-2 rounded-lg"
              @click="showEditModal = false"
            >
              Cancel
            </button>

            <button
              class="px-5 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              @click="updateTable"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showAddModal"
        class="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      >
        <div class="bg-white p-6 rounded-xl w-[500px] max-w-[94vw]">
          <h2 class="text-2xl font-bold mb-4">Add Table</h2>

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Table Name
          </label>

          <input
            v-model="newTable.name"
            placeholder="e.g. A1"
            class="w-full rounded-lg border border-gray-300 px-3 py-3 mb-4"
          />

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Seats
          </label>

          <input
            v-model.number="newTable.seats"
            type="number"
            min="1"
            placeholder="Number of seats"
            class="w-full rounded-lg border border-gray-300 px-3 py-3 mb-4"
          />

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>

          <select
            v-model="newTable.status"
            class="w-full rounded-lg border border-gray-300 px-3 py-3 bg-white mb-4"
          >
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="reserved">Reserved</option>
            <option value="cleaning">Cleaning</option>
          </select>

          <div class="flex justify-end gap-3">
            <button
              class="px-5 py-2 rounded-lg bg-gray-200 text-gray-700"
              @click="showAddModal = false"
            >
              Cancel
            </button>

            <button
              class="px-5 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
              @click="createTable"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
