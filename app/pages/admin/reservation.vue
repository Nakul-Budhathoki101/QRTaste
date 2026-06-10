<script setup lang="ts">
import type { ReservationStatus, TableReservation } from "~/types";

type ReservationFilter = ReservationStatus | "all";
type TimeFilter = "all" | "today" | "upcoming" | "past";

const reservationStore = useReservationStore();
const tableStore = useTableStore();
const toastStore = useToastStore();
const confirmStore = useConfirmStore();

const loading = ref(true);
const search = ref("");
const statusFilter = ref<ReservationFilter>("reserved");
const timeFilter = ref<TimeFilter>("today");
const showAddModal = ref(false);
const showEditModal = ref(false);
const selectedReservation = ref<TableReservation | null>(null);

const createReservationForm = () => ({
  table_id: undefined as number | undefined,
  customer_name: "",
  customer_phone: "",
  guest_count: 1,
  reserved_at: "",
  notes: "",
});

const newReservation = ref(createReservationForm());
const editReservation = ref(createReservationForm());

const availableTables = computed(() =>
  tableStore.tables
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
);

const tableById = (tableId?: number | null) =>
  availableTables.value.find((table) => table.id === tableId) || null;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });

const toDateTimeLocal = (value: string) => {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const isSameLocalDay = (value: string, date = new Date()) => {
  const target = new Date(value);

  return (
    target.getFullYear() === date.getFullYear() &&
    target.getMonth() === date.getMonth() &&
    target.getDate() === date.getDate()
  );
};

const getTimeBucket = (reservation: TableReservation) => {
  const time = new Date(reservation.reserved_at).getTime();
  const now = Date.now();

  if (reservation.status === "reserved" && time < now) return "late";
  if (isSameLocalDay(reservation.reserved_at)) return "today";
  if (time > now) return "upcoming";
  return "past";
};

const filteredReservations = computed(() => {
  const term = search.value.trim().toLowerCase();

  return reservationStore.reservations.filter((reservation) => {
    const bucket = getTimeBucket(reservation);
    const matchesSearch =
      !term ||
      reservation.customer_name.toLowerCase().includes(term) ||
      reservation.table_name.toLowerCase().includes(term) ||
      reservation.customer_phone?.toLowerCase().includes(term) ||
      reservation.notes?.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter.value === "all" || reservation.status === statusFilter.value;

    const matchesTime =
      timeFilter.value === "all" ||
      (timeFilter.value === "today" && isSameLocalDay(reservation.reserved_at)) ||
      (timeFilter.value === "upcoming" &&
        new Date(reservation.reserved_at).getTime() > Date.now()) ||
      (timeFilter.value === "past" &&
        new Date(reservation.reserved_at).getTime() < Date.now());

    return matchesSearch && matchesStatus && matchesTime;
  });
});

const reservationStats = computed(() => ({
  today: reservationStore.reservations.filter((reservation) =>
    isSameLocalDay(reservation.reserved_at),
  ).length,
  activeToday: reservationStore.reservations.filter(
    (reservation) =>
      isSameLocalDay(reservation.reserved_at) && reservation.status === "reserved",
  ).length,
  late: reservationStore.reservations.filter(
    (reservation) => getTimeBucket(reservation) === "late",
  ).length,
  seated: reservationStore.reservations.filter(
    (reservation) => reservation.status === "seated",
  ).length,
}));

const getSelectedTable = (tableId?: number) => {
  if (!tableId) return null;

  return tableById(tableId);
};

const validateReservationPayload = (
  payload: ReturnType<typeof createReservationForm>,
  ignoreReservationId?: number,
) => {
  const table = getSelectedTable(payload.table_id);

  if (!table) {
    toastStore.open("Select a table", "error");
    return null;
  }

  const customerName = payload.customer_name.trim();

  if (!customerName) {
    toastStore.open("Customer name is required", "error");
    return null;
  }

  if (!payload.reserved_at) {
    toastStore.open("Reservation time is required", "error");
    return null;
  }

  if (payload.guest_count < 1) {
    toastStore.open("Guest count must be at least 1", "error");
    return null;
  }

  if (payload.guest_count > table.seats) {
    toastStore.open(
      `${table.name} only has ${table.seats} seat(s). Move this reservation to a larger table.`,
      "error",
    );
    return null;
  }

  const reservedAt = new Date(payload.reserved_at).toISOString();

  if (
    reservationStore.hasReservationConflict(
      table.id,
      reservedAt,
      ignoreReservationId,
    )
  ) {
    toastStore.open(
      `${table.name} already has a reservation at this time.`,
      "error",
    );
    return null;
  }

  return {
    table_id: table.id,
    table_name: table.name,
    customer_name: customerName,
    customer_phone: payload.customer_phone.trim() || null,
    guest_count: payload.guest_count,
    reserved_at: reservedAt,
    notes: payload.notes.trim() || null,
  };
};

const createReservation = async () => {
  const payload = validateReservationPayload(newReservation.value);

  if (!payload) return;

  const result = await reservationStore.createReservation({
    ...payload,
    status: "reserved",
  });

  toastStore.open(result.message, result.success ? "success" : "error");

  if (!result.success) return;

  newReservation.value = createReservationForm();
  showAddModal.value = false;
};

const openEditModal = (reservation: TableReservation) => {
  selectedReservation.value = reservation;
  editReservation.value = {
    table_id: reservation.table_id,
    customer_name: reservation.customer_name,
    customer_phone: reservation.customer_phone ?? "",
    guest_count: reservation.guest_count,
    reserved_at: toDateTimeLocal(reservation.reserved_at),
    notes: reservation.notes ?? "",
  };
  showEditModal.value = true;
};

const updateReservation = async () => {
  if (!selectedReservation.value) return;

  const payload = validateReservationPayload(
    editReservation.value,
    selectedReservation.value.id,
  );

  if (!payload) return;

  const result = await reservationStore.updateReservation(
    selectedReservation.value.id,
    payload,
  );

  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) showEditModal.value = false;
};

const updateStatus = async (
  reservation: TableReservation,
  status: ReservationStatus,
) => {
  const result = await reservationStore.updateReservationStatus(
    reservation.id,
    status,
  );

  toastStore.open(result.message, result.success ? "success" : "error");
};

const cancelReservation = async (reservation: TableReservation) => {
  const confirmed = await confirmStore.confirm({
    title: "Cancel Reservation",
    message: `Cancel/no-show "${reservation.customer_name}" for ${reservation.table_name}?`,
  });

  if (!confirmed) return;

  await updateStatus(reservation, "cancelled");
};

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    reservationStore.loadReservations(),
    tableStore.loadTables(),
  ]);
  loading.value = false;
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-7xl mx-auto">
      <div class="mb-5">
        <NuxtLink to="/" class="bg-gray-700 text-white px-4 py-2 rounded-lg">
          Dashboard
        </NuxtLink>
      </div>

      <div
        class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6"
      >
        <div>
          <h1 class="text-3xl font-bold">Reservation Management</h1>
          <p class="text-gray-500 mt-1">
            Search, move tables, update guest counts, and handle no-shows.
          </p>
        </div>

        <button
          class="font-bold bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          @click="showAddModal = true"
        >
          Add Reservation
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Reservations Today</p>
          <p class="text-2xl font-bold">{{ reservationStats.today }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Active Today</p>
          <p class="text-2xl font-bold text-purple-600">
            {{ reservationStats.activeToday }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Late / No-show</p>
          <p class="text-2xl font-bold text-red-600">
            {{ reservationStats.late }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Seated</p>
          <p class="text-2xl font-bold text-emerald-600">
            {{ reservationStats.seated }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            v-model="search"
            class="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Search customer, phone, table, or notes"
          />

          <select
            v-model="statusFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All statuses</option>
            <option value="reserved">Reserved</option>
            <option value="seated">Seated</option>
            <option value="cancelled">Cancelled / No-show</option>
            <option value="completed">Completed</option>
          </select>

          <select
            v-model="timeFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">Loading reservations...</div>

      <div
        v-else-if="filteredReservations.length === 0"
        class="bg-white rounded-lg p-10 text-center text-gray-500 shadow"
      >
        No reservations found.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="reservation in filteredReservations"
          :key="reservation.id"
          class="bg-white shadow rounded-lg p-4"
        >
          <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 flex-1">
              <div>
                <p class="text-sm text-gray-500">Customer</p>
                <h2 class="font-bold text-xl">{{ reservation.customer_name }}</h2>
                <p class="text-sm text-gray-500">
                  {{ reservation.customer_phone || "No phone" }}
                </p>
              </div>

              <div>
                <p class="text-sm text-gray-500">Table</p>
                <p class="font-bold">
                  {{ reservation.table_name }}
                  <span class="text-sm text-gray-500">
                    ({{ tableById(reservation.table_id)?.seats ?? "?" }} seats)
                  </span>
                </p>
                <p
                  v-if="
                    tableById(reservation.table_id) &&
                    reservation.guest_count > tableById(reservation.table_id)!.seats
                  "
                  class="text-sm text-red-600 font-semibold"
                >
                  Needs larger table
                </p>
              </div>

              <div>
                <p class="text-sm text-gray-500">Guests / Time</p>
                <p class="font-bold">{{ reservation.guest_count }} guests</p>
                <p class="text-sm text-gray-600">
                  {{ formatDateTime(reservation.reserved_at) }}
                </p>
              </div>

              <div>
                <p class="text-sm text-gray-500">Status</p>
                <span
                  class="inline-flex px-3 py-1 rounded-full text-white text-sm capitalize"
                  :class="{
                    'bg-purple-600': reservation.status === 'reserved',
                    'bg-emerald-600': reservation.status === 'seated',
                    'bg-gray-700': reservation.status === 'cancelled',
                    'bg-blue-600': reservation.status === 'completed',
                  }"
                >
                  {{ reservation.status === "cancelled" ? "cancelled/no-show" : reservation.status }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 xl:justify-end">
              <button
                class="bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600"
                @click="openEditModal(reservation)"
              >
                Edit / Move
              </button>

              <button
                v-if="reservation.status === 'reserved'"
                class="bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-black"
                @click="cancelReservation(reservation)"
              >
                Cancel / No-show
              </button>

              <button
                v-if="reservation.status === 'seated'"
                class="bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700"
                @click="updateStatus(reservation, 'completed')"
              >
                Complete
              </button>
            </div>
          </div>

          <p
            v-if="reservation.notes"
            class="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3"
          >
            {{ reservation.notes }}
          </p>
        </div>
      </div>

      <div
        v-if="showAddModal"
        class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
      >
        <div class="bg-white p-6 rounded-xl w-[620px] max-w-[96vw]">
          <h2 class="text-2xl font-bold mb-4">Add Reservation</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              v-model="newReservation.table_id"
              class="border rounded-lg p-3 bg-white"
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

            <input
              v-model.number="newReservation.guest_count"
              type="number"
              min="1"
              class="border rounded-lg p-3"
              placeholder="Guests"
            />

            <input
              v-model="newReservation.customer_name"
              class="border rounded-lg p-3"
              placeholder="Customer name"
            />

            <input
              v-model="newReservation.customer_phone"
              class="border rounded-lg p-3"
              placeholder="Phone"
            />

            <input
              v-model="newReservation.reserved_at"
              type="datetime-local"
              class="border rounded-lg p-3 sm:col-span-2"
            />
          </div>

          <textarea
            v-model="newReservation.notes"
            class="w-full border rounded-lg p-3 mt-3"
            placeholder="Notes"
          />

          <div class="flex justify-end gap-3 mt-4">
            <button
              class="bg-gray-200 px-4 py-2 rounded-lg"
              @click="showAddModal = false"
            >
              Cancel
            </button>

            <button
              class="px-5 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              @click="createReservation"
            >
              Save Reservation
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showEditModal && selectedReservation"
        class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
      >
        <div class="bg-white p-6 rounded-xl w-[620px] max-w-[96vw]">
          <h2 class="text-2xl font-bold mb-4">Edit / Move Reservation</h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select
              v-model="editReservation.table_id"
              class="border rounded-lg p-3 bg-white"
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

            <input
              v-model.number="editReservation.guest_count"
              type="number"
              min="1"
              class="border rounded-lg p-3"
              placeholder="Guests"
            />

            <input
              v-model="editReservation.customer_name"
              class="border rounded-lg p-3"
              placeholder="Customer name"
            />

            <input
              v-model="editReservation.customer_phone"
              class="border rounded-lg p-3"
              placeholder="Phone"
            />

            <input
              v-model="editReservation.reserved_at"
              type="datetime-local"
              class="border rounded-lg p-3 sm:col-span-2"
            />
          </div>

          <textarea
            v-model="editReservation.notes"
            class="w-full border rounded-lg p-3 mt-3"
            placeholder="Notes"
          />

          <div class="flex justify-end gap-3 mt-4">
            <button
              class="bg-gray-200 px-4 py-2 rounded-lg"
              @click="showEditModal = false"
            >
              Cancel
            </button>

            <button
              class="px-5 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              @click="updateReservation"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
