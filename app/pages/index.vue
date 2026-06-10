<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

import { useSettingsStore, useTableStore } from "#imports";
import { useOrderStore } from "~/stores/order";

import TableSessionModal from "~/components/TableSessionModal.vue";
import TableQrModal from "~/components/TableQrModal.vue";
import SettingModal from "~/components/SettingModal.vue";
import CheckoutModal from "~/components/CheckoutModal.vue";

import type { RestaurantTable } from "#imports";
import type { OrderStatus } from "~/types/order.js";

let interval: ReturnType<typeof setInterval>;

const currentTime = ref(Date.now());
const selectedTable = ref<RestaurantTable | null>(null);

const billStore = useBillStore();
const settingsStore = useSettingsStore();
const tableStore = useTableStore();
const orderStore = useOrderStore();
const authStore = useAuthStore();
const categoryStore = useCategoryStore();
const toastStore = useToastStore();
const reservationStore = useReservationStore();

const showSettings = ref(false);
const qrTableName = ref("");
const checkoutTable = ref<RestaurantTable | null>(null);

const openQr = (tableName: string) => {
  qrTableName.value = tableName;
};

onMounted(async () => {
  settingsStore.loadSettings();
  await tableStore.loadTables();
  await billStore.loadBills();
  await categoryStore.loadCategories();
  await orderStore.loadOrders();
  await reservationStore.loadReservations();
  orderStore.subscribeOrders();

  interval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(interval);
});

const getElapsedSeconds = (table: RestaurantTable) => {
  if (!table.startTime) return 0;

  const start = new Date(table.startTime).getTime();

  return Math.max(0, Math.floor((currentTime.value - start) / 1000));
};

const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const openTableModal = (table: RestaurantTable) => {
  if (table.status === "cleaning") {
    tableStore.resetTable(table.id);
    return;
  }
  selectedTable.value = table;
};

const getTodayReservations = (tableId: number) =>
  reservationStore.getReservationsForTableToday(tableId);

const getNextReservation = (tableId: number) =>
  reservationStore.getNextReservationForTableToday(tableId);

const formatReservationTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const closeModal = () => {
  selectedTable.value = null;
};

const startSession = async (payload: {
  customerCount: number;
  timeLimit?: number;
}) => {
  if (!selectedTable.value) return;

  const result = await tableStore.startSession(selectedTable.value.id, payload);
  toastStore.open(
    result?.message ?? "Session started",
    result?.success ? "success" : "error",
  );

  if (result?.success) closeModal();
};

const updateSession = async (payload: {
  customerCount: number;
  timeLimit?: number;
}) => {
  if (!selectedTable.value) return;

  const result = await tableStore.updateSession(selectedTable.value.id, payload);
  toastStore.open(
    result?.message ?? "Session updated",
    result?.success ? "success" : "error",
  );

  if (result?.success) closeModal();
};

const orders = computed(() =>
  orderStore.orders.filter(
    (order) => order.status === "pending" || order.status === "preparing",
  ),
);

const getOrderItems = (order: { items: any }) =>
  Array.isArray(order.items) ? order.items : order.items ? [order.items] : [];

const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
  const result = await orderStore.updateStatus(orderId, status);
  toastStore.open(result.message, result.success ? "success" : "error");
};

const printKitchenOrder = (orderId: number) => {
  const printable = document.getElementById(`kitchen-order-${orderId}`);
  if (!printable) return;

  const printWindow = window.open("", "_blank", "width=420,height=640");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Kitchen Order #${orderId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
          .no-print { display: none; }
          h3 { font-size: 24px; margin: 0 0 8px; }
          .line { display: flex; justify-content: space-between; font-size: 18px; padding: 6px 0; }
        </style>
      </head>
      <body>${printable.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const getTableColor = (table: RestaurantTable) => {
  if (table.status === "occupied") {
    if (!table.timeLimit) return "bg-yellow-500";

    const elapsed = getElapsedSeconds(table);

    if (elapsed >= table.timeLimit * 60) return "bg-red-600";

    if (
      elapsed >=
      (table.timeLimit - settingsStore.warningBeforeMinutes) * 60
    ) {
      return "bg-orange-500";
    }

    return "bg-yellow-500";
  }

  switch (table.status) {
    case "available":
      return "bg-green-500";
    case "reserved":
      return "bg-purple-500";
    case "cleaning":
      return "bg-blue-500";
    default:
      return "bg-gray-500";
  }
};

const handleCheckout = () => {
  if (!selectedTable.value) return;

  checkoutTable.value = { ...selectedTable.value };
  selectedTable.value = null;
};

const currentTables = computed(() => tableStore.tables);

const dashboardStats = computed(() => ({
  totalTables: tableStore.tables.length,
  occupiedTables: tableStore.tables.filter((table) => table.status === "occupied")
    .length,
  availableTables: tableStore.tables.filter((table) => table.status === "available")
    .length,
  activeOrders: orders.value.length,
  paidRevenue: billStore.totalRevenue,
  cleaningTables: tableStore.tables.filter((table) => table.status === "cleaning")
    .length,
  reservedToday: tableStore.tables.filter(
    (table) => getTodayReservations(table.id).length > 0,
  ).length,
}));

const quickLinks = [
  { label: "Tables", to: "/admin/table" },
  { label: "Reservations", to: "/admin/reservation" },
  { label: "Menu", to: "/admin/menu" },
  { label: "Categories", to: "/admin/category" },
  { label: "Billing", to: "/admin/billing" },
];

const handlePaid = async () => {
  if (!checkoutTable.value) return;

  const result = await tableStore.setCleaning(checkoutTable.value.id);
  toastStore.open(
    result?.message ?? "Table moved to cleaning",
    result?.success ? "success" : "error",
  );

  if (result?.success) checkoutTable.value = null;
};
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <div class="max-w-7xl mx-auto p-6">
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
      >
        <div>
          <p class="text-sm uppercase tracking-wide text-gray-500 font-bold">
            Live Operations
          </p>
          <h1 class="text-4xl font-bold">
            {{ settingsStore.restaurantName }}
          </h1>
        </div>

        <div class="flex gap-3">
          <button
            class="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
            @click="showSettings = true"
          >
            Settings
          </button>

          <button
            class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            @click="authStore.logout()"
          >
            Logout
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
        <div class="bg-white rounded-lg p-4 shadow border-l-4 border-gray-900">
          <p class="text-sm text-gray-500">Tables</p>
          <p class="text-3xl font-bold">{{ dashboardStats.totalTables }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow border-l-4 border-green-500">
          <p class="text-sm text-gray-500">Available</p>
          <p class="text-3xl font-bold text-green-600">
            {{ dashboardStats.availableTables }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow border-l-4 border-amber-500">
          <p class="text-sm text-gray-500">Occupied</p>
          <p class="text-3xl font-bold text-amber-600">
            {{ dashboardStats.occupiedTables }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow border-l-4 border-blue-500">
          <p class="text-sm text-gray-500">Cleaning</p>
          <p class="text-3xl font-bold text-blue-600">
            {{ dashboardStats.cleaningTables }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow border-l-4 border-red-500">
          <p class="text-sm text-gray-500">Kitchen Queue</p>
          <p class="text-3xl font-bold text-red-600">
            {{ dashboardStats.activeOrders }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow border-l-4 border-purple-500">
          <p class="text-sm text-gray-500">Reserved Today</p>
          <p class="text-3xl font-bold">
            {{ dashboardStats.reservedToday }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-8">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">Management Shortcuts</h2>
            <p class="text-gray-500">
              Jump straight into the core hotel service controls.
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <NuxtLink
              v-for="link in quickLinks"
              :key="link.to"
              :to="link.to"
              class="bg-gray-900 text-white px-4 py-3 rounded-lg text-center hover:bg-gray-800"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Table Floor</h2>
        <p class="text-sm text-gray-500">Click a table to manage its session.</p>
      </div>

      <div
        v-if="currentTables.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="table in currentTables"
          :key="table.id"
          class="rounded-xl shadow-lg p-6 text-white cursor-pointer transition hover:scale-[1.02] min-h-[220px] flex flex-col justify-between"
          :class="getTableColor(table)"
          @click="openTableModal(table)"
        >
          <div>
            <div class="flex items-start justify-between gap-3">
              <h2 class="text-2xl font-bold">{{ table.name }}</h2>

              <span
                v-if="getTodayReservations(table.id).length"
                class="bg-white text-purple-700 text-xs font-bold px-2 py-1 rounded-full"
              >
                Reserved
              </span>
            </div>
            <p class="mt-4 font-bold capitalize">{{ table.status }}</p>

            <p
              v-if="getNextReservation(table.id)"
              class="mt-2 text-sm font-semibold bg-black/15 rounded-lg px-2 py-1"
            >
              Next reservation:
              {{ formatReservationTime(getNextReservation(table.id)!.reserved_at) }}
              -
              {{ getNextReservation(table.id)!.customer_name }}
              ({{ getNextReservation(table.id)!.guest_count }})
            </p>

            <div class="mt-3 h-6">
              <span v-if="table.customerCount">
                {{ table.customerCount }} customers
              </span>
            </div>

            <div class="mt-2 h-6 font-bold">
              <span v-if="table.startTime">
                {{ formatTime(getElapsedSeconds(table)) }}
              </span>
              <span v-else>Unlimited</span>
            </div>
          </div>

          <button
            v-if="table.status === 'occupied'"
            class="mt-4 bg-white text-black px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
            @click.stop="openQr(table.name)"
          >
            Print QR
          </button>
        </div>
      </div>

      <div v-else class="bg-white rounded-lg p-10 text-center text-gray-500 shadow">
        No tables have been created yet.
      </div>

      <div class="mt-12">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-3xl font-bold">Kitchen Orders</h2>
          <p class="text-sm text-gray-500">
            Pending and preparing orders refresh from Supabase.
          </p>
        </div>

        <div
          v-if="orders.length"
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <div
            v-for="order in orders"
            :id="`kitchen-order-${order.id}`"
            :key="order.id"
            class="bg-white rounded-3xl p-6 shadow-xl min-h-[320px] flex flex-col"
          >
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-2xl font-bold">Table {{ order.table_name }}</h3>
                <p class="text-gray-500">
                  {{ new Date(order.created_at).toLocaleTimeString() }}
                </p>
              </div>

              <div
                class="px-4 py-2 rounded-full text-white font-bold capitalize"
                :class="{
                  'bg-red-500 animate-pulse': order.status === 'pending',
                  'bg-yellow-400 text-black': order.status === 'preparing',
                }"
              >
                {{ order.status }}
              </div>
            </div>

            <div class="flex-1">
              <div
                v-for="item in getOrderItems(order)"
                :key="`${item.menuItemId}-${item.name}`"
                class="flex justify-between py-1 text-xl"
              >
                <span>{{ item.name }}</span>
                <span>x{{ item.quantity }}</span>
              </div>
            </div>

            <div
              class="mt-4 pt-4 border-t flex justify-between text-xl font-bold"
            >
              <span>Total</span>
              <span>{{ settingsStore.currencyLabel }} {{ order.total_price }}</span>
            </div>

            <div class="flex gap-2 mt-6 no-print">
              <button
                class="flex-1 bg-gray-900 text-white py-2 rounded-xl hover:bg-gray-800 transition"
                @click="printKitchenOrder(order.id)"
              >
                Print
              </button>

              <button
                class="flex-1 bg-blue-500 text-white py-2 rounded-xl hover:bg-blue-600 transition"
                @click="updateOrderStatus(order.id, 'preparing')"
              >
                Preparing
              </button>

              <button
                class="flex-1 bg-green-500 text-white py-2 rounded-xl hover:bg-green-600 transition"
                @click="updateOrderStatus(order.id, 'completed')"
              >
                Completed
              </button>
            </div>
          </div>
        </div>

        <div v-else class="bg-white rounded-lg p-10 text-center text-gray-500 shadow">
          No active kitchen orders right now.
        </div>
      </div>
    </div>

    <TableSessionModal
      v-if="selectedTable"
      :table="selectedTable"
      @close="closeModal"
      @start="startSession"
      @update="updateSession"
      @checkout="handleCheckout"
    />

    <CheckoutModal
      v-if="checkoutTable"
      :table="checkoutTable"
      @close="checkoutTable = null"
      @paid="handlePaid"
    />

    <SettingModal v-if="showSettings" @close="showSettings = false" />

    <TableQrModal
      v-if="qrTableName"
      :table-name="qrTableName"
      @close="qrTableName = ''"
    />
  </div>
</template>
