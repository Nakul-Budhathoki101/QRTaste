<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";

import { useSettingsStore, useTableStore } from "#imports";
import { useOrderStore } from "~/stores/order";

import TableSessionModal from "~/components/TableSessionModal.vue";
import TableQrModal from "~/components/TableQrModal.vue";
import SettingModal from "~/components/SettingModal.vue";
import CheckoutModal from "~/components/CheckoutModal.vue";

import type { RestaurantTable } from "#imports";
import type { OrderStatus } from "~/types/order.js";

let interval: ReturnType<typeof setInterval>;
let serviceCallPollInterval: ReturnType<typeof setInterval>;
let serviceCallReminderInterval: ReturnType<typeof setInterval> | null = null;
let serviceCallAudioContext: AudioContext | null = null;
const knownServiceCallIds = new Set<number>();
const tableTimeAlertToasts = new Map<number, "warning" | "overdue">();
const tableTimeAlertSounds = new Map<string, number>();

const currentTime = ref(Date.now());
const selectedTable = ref<RestaurantTable | null>(null);
const serviceCallSoundReady = ref(false);

const billStore = useBillStore();
const settingsStore = useSettingsStore();
const tableStore = useTableStore();
const orderStore = useOrderStore();
const authStore = useAuthStore();
const categoryStore = useCategoryStore();
const toastStore = useToastStore();
const reservationStore = useReservationStore();
const serviceCallStore = useServiceCallStore();

const showSettings = ref(false);
const qrTableName = ref("");
const checkoutTable = ref<RestaurantTable | null>(null);

const openQr = (table: RestaurantTable) => {
  qrTableName.value = table.name;
};

const unlockServiceCallSound = async () => {
  if (!import.meta.client || serviceCallSoundReady.value) return;

  const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtor) return;

  serviceCallAudioContext ||= new AudioCtor();

  if (serviceCallAudioContext.state === "suspended") {
    await serviceCallAudioContext.resume();
  }

  serviceCallSoundReady.value = true;
};

const playServiceCallSound = async () => {
  if (!settingsStore.enableSoundAlert || !import.meta.client) return;

  await unlockServiceCallSound();

  if (!serviceCallAudioContext || !serviceCallSoundReady.value) return;

  const now = serviceCallAudioContext.currentTime;
  const gain = serviceCallAudioContext.createGain();
  gain.connect(serviceCallAudioContext.destination);

  [0, 0.18, 0.36].forEach((offset) => {
    const oscillator = serviceCallAudioContext!.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now + offset);
    oscillator.connect(gain);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.11);
  });

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.26, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
};

const playTableTimeSound = async (stage: "warning" | "overdue") => {
  if (!settingsStore.enableSoundAlert || !import.meta.client) return;

  await unlockServiceCallSound();

  if (!serviceCallAudioContext || !serviceCallSoundReady.value) return;

  const now = serviceCallAudioContext.currentTime;
  const gain = serviceCallAudioContext.createGain();
  gain.connect(serviceCallAudioContext.destination);

  const frequencies = stage === "overdue" ? [520, 520, 360, 360] : [660, 660];

  frequencies.forEach((frequency, index) => {
    const oscillator = serviceCallAudioContext!.createOscillator();
    const offset = index * 0.18;
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, now + offset);
    oscillator.connect(gain);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.11);
  });

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
};

const getTableTimeAlertStage = (table: RestaurantTable) => {
  if (table.status !== "occupied" || !table.startTime || !table.timeLimit) {
    return null;
  }

  const elapsed = getElapsedSeconds(table);
  const limitSeconds = table.timeLimit * 60;
  const warningSeconds = Math.max(0, settingsStore.warningBeforeMinutes) * 60;

  if (elapsed >= limitSeconds) return "overdue";
  if (warningSeconds > 0 && limitSeconds - elapsed <= warningSeconds) {
    return "warning";
  }

  return null;
};

const checkTableTimeAlerts = async () => {
  const activeTableIds = new Set<number>();

  for (const table of tableStore.tables) {
    const stage = getTableTimeAlertStage(table);

    if (!stage) {
      tableTimeAlertToasts.delete(table.id);
      continue;
    }

    activeTableIds.add(table.id);

    const previousStage = tableTimeAlertToasts.get(table.id);
    if (previousStage !== stage) {
      tableTimeAlertToasts.set(table.id, stage);
      toastStore.open(
        stage === "overdue"
          ? `${table.name} is over the time limit.`
          : `${table.name} is near the time limit.`,
        stage === "overdue" ? "error" : "warning",
      );
    }

    const soundKey = `${table.id}:${table.startTime}:${stage}`;
    const lastPlayed = tableTimeAlertSounds.get(soundKey) ?? 0;
    const reminderMs = stage === "overdue" ? 20000 : 60000;

    if (currentTime.value - lastPlayed >= reminderMs) {
      tableTimeAlertSounds.set(soundKey, currentTime.value);
      await playTableTimeSound(stage);
    }
  }

  for (const tableId of tableTimeAlertToasts.keys()) {
    if (!activeTableIds.has(tableId)) tableTimeAlertToasts.delete(tableId);
  }
};

onMounted(async () => {
  settingsStore.loadSettings();
  await tableStore.loadTables();
  await billStore.loadBills();
  await categoryStore.loadCategories();
  await orderStore.loadOrders();
  await reservationStore.loadReservations();
  await serviceCallStore.loadServiceCalls();
  serviceCallStore.serviceCalls.forEach((call) =>
    knownServiceCallIds.add(call.id),
  );
  orderStore.subscribeOrders();
  serviceCallStore.subscribeServiceCalls();

  window.addEventListener("pointerdown", unlockServiceCallSound, {
    once: true,
  });
  window.addEventListener("keydown", unlockServiceCallSound, { once: true });

  interval = setInterval(() => {
    currentTime.value = Date.now();
    checkTableTimeAlerts();
  }, 1000);

  serviceCallPollInterval = setInterval(() => {
    serviceCallStore.loadServiceCalls();
  }, 2000);
});

onUnmounted(() => {
  clearInterval(interval);
  clearInterval(serviceCallPollInterval);
  if (serviceCallReminderInterval) clearInterval(serviceCallReminderInterval);
  serviceCallStore.unsubscribeServiceCalls();
  window.removeEventListener("pointerdown", unlockServiceCallSound);
  window.removeEventListener("keydown", unlockServiceCallSound);
  serviceCallAudioContext?.close();
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
  //muji
  if (table.status === "available") {
    selectedTable.value = { ...table, customerCount: 1 };
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

  const result = await tableStore.updateSession(
    selectedTable.value.id,
    payload,
  );
  toastStore.open(
    result?.message ?? "Session updated",
    result?.success ? "success" : "error",
  );

  if (result?.success) closeModal();
};

const orders = computed(() =>
  orderStore.orders.filter(
    (order) =>
      order.status === "pending" ||
      order.status === "preparing" ||
      order.status === "ready",
  ),
);

const serviceCalls = computed(() => serviceCallStore.serviceCalls);

const orderedServiceCalls = computed(() =>
  serviceCalls.value
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
);

const startServiceCallReminder = () => {
  if (serviceCallReminderInterval || !serviceCalls.value.length) return;

  playServiceCallSound();
  serviceCallReminderInterval = setInterval(() => {
    if (!serviceCalls.value.length) return;
    playServiceCallSound();
  }, 3000);
};

const stopServiceCallReminder = () => {
  if (!serviceCallReminderInterval) return;

  clearInterval(serviceCallReminderInterval);
  serviceCallReminderInterval = null;
};

watch(
  serviceCalls,
  async (calls) => {
    const newOpenCalls = calls.filter(
      (call) => call.status === "open" && !knownServiceCallIds.has(call.id),
    );

    calls.forEach((call) => knownServiceCallIds.add(call.id));

    if (!calls.length) {
      stopServiceCallReminder();
      return;
    }

    startServiceCallReminder();

    if (newOpenCalls.length) await playServiceCallSound();
  },
  { deep: true },
);

const serviceCallLabels: Record<string, string> = {
  staff: "Call Staff",
  water: "Need Water",
  bill: "Need Bill",
};

const serviceCallStyles: Record<string, string> = {
  staff: "bg-rose-100 text-rose-700",
  water: "bg-blue-100 text-blue-700",
  bill: "bg-emerald-100 text-emerald-700",
};

const getOrderItems = (order: { items: any }) =>
  Array.isArray(order.items) ? order.items : order.items ? [order.items] : [];

const getItemNotes = (item: any) =>
  [...(item.customizations || []), item.customization_note]
    .filter(Boolean)
    .join(" | ");

const updateOrderStatus = async (orderId: number, status: OrderStatus) => {
  const result = await orderStore.updateStatus(orderId, status);
  toastStore.open(result.message, result.success ? "success" : "error");
};

const updateServiceCallStatus = async (
  callId: number,
  status: "acknowledged" | "resolved",
) => {
  const result = await serviceCallStore.updateServiceCallStatus(callId, status);
  toastStore.open(result.message, result.success ? "success" : "error");
};

const clearAllServiceCalls = async () => {
  const result = await serviceCallStore.resolveOpenServiceCalls();
  toastStore.open(result.message, result.success ? "success" : "error");
  if (result.success) stopServiceCallReminder();
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
  occupiedTables: tableStore.tables.filter(
    (table) => table.status === "occupied",
  ).length,
  availableTables: tableStore.tables.filter(
    (table) => table.status === "available",
  ).length,
  activeOrders: orders.value.length,
  serviceCalls: serviceCalls.value.length,
  paidRevenue: billStore.totalRevenue,
  cleaningTables: tableStore.tables.filter(
    (table) => table.status === "cleaning",
  ).length,
  reservedToday: tableStore.tables.filter(
    (table) => getTodayReservations(table.id).length > 0,
  ).length,
}));

const quickLinks = [
  { label: "Tables", to: "/admin/table" },
  { label: "Reservations", to: "/admin/reservation" },
  { label: "Availability", to: "/admin/inventory" },
  { label: "Menu", to: "/admin/menu" },
  { label: "Categories", to: "/admin/category" },
  { label: "Coupons", to: "/admin/coupon" },
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

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-4 mb-8">
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

        <div class="bg-white rounded-lg p-4 shadow border-l-4 border-rose-500">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-sm text-gray-500">Service Calls</p>
              <p class="text-3xl font-bold text-rose-600">
                {{ dashboardStats.serviceCalls }}
              </p>
            </div>

            <button
              v-if="dashboardStats.serviceCalls"
              class="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700"
              @click="clearAllServiceCalls"
            >
              Clear
            </button>
          </div>
        </div>

        <div
          class="bg-white rounded-lg p-4 shadow border-l-4 border-purple-500"
        >
          <p class="text-sm text-gray-500">Reserved Today</p>
          <p class="text-3xl font-bold">
            {{ dashboardStats.reservedToday }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-8">
        <div
          class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h2 class="text-xl font-bold">Management Shortcuts</h2>
            <p class="text-gray-500">
              Jump straight into the core hotel service controls.
            </p>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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
        <p class="text-sm text-gray-500">
          Click a table to manage its session.
        </p>
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
              {{
                formatReservationTime(getNextReservation(table.id)!.reserved_at)
              }}
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

            <div
              v-if="table.sessionPin"
              class="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 font-bold"
            >
              <span class="text-xs uppercase opacity-80">PIN</span>
              <span class="text-xl tracking-widest">{{
                table.sessionPin
              }}</span>
            </div>
          </div>

          <button
            v-if="table.status === 'occupied'"
            class="mt-4 bg-white text-black px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
            @click.stop="openQr(table)"
          >
            Print QR
          </button>
        </div>
      </div>

      <div
        v-else
        class="bg-white rounded-lg p-10 text-center text-gray-500 shadow"
      >
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
                <span
                  class="inline-flex mt-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold uppercase"
                >
                  {{ order.order_type?.replace("_", " ") || "dine in" }}
                </span>
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
                class="py-1 text-xl"
              >
                <div class="flex justify-between gap-3">
                  <span>{{ item.name }}</span>
                  <span>x{{ item.quantity }}</span>
                </div>
                <p
                  v-if="getItemNotes(item)"
                  class="text-sm text-red-600 font-semibold"
                >
                  {{ getItemNotes(item) }}
                </p>
              </div>
            </div>

            <div
              v-if="order.customer_note"
              class="mt-4 bg-red-50 text-red-700 rounded-xl p-3 font-semibold"
            >
              {{ order.customer_note }}
            </div>

            <div
              class="mt-4 pt-4 border-t flex justify-between text-xl font-bold"
            >
              <span>Total</span>
              <span
                >{{ settingsStore.currencyLabel }} {{ order.total_price }}</span
              >
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
                @click="updateOrderStatus(order.id, 'ready')"
              >
                Ready
              </button>

              <button
                class="flex-1 bg-emerald-700 text-white py-2 rounded-xl hover:bg-emerald-800 transition"
                @click="updateOrderStatus(order.id, 'delivered')"
              >
                Delivered
              </button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="bg-white rounded-lg p-10 text-center text-gray-500 shadow"
        >
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

    <Transition
      enter-active-class="transition duration-300"
      enter-from-class="opacity-0 translate-y-6 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-200"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-6 scale-95"
    >
      <div
        v-if="orderedServiceCalls.length"
        class="fixed inset-x-4 bottom-6 z-[9998] mx-auto max-w-2xl rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-black/10 sm:bottom-auto sm:top-6"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-sm font-bold uppercase tracking-wide text-rose-600">
              Service Calls
            </p>
            <h2 class="mt-1 text-3xl font-bold">
              {{ orderedServiceCalls.length }} Active
            </h2>
          </div>

          <button
            class="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
            @click="clearAllServiceCalls"
          >
            Clear All
          </button>
        </div>

        <div class="mt-5 max-h-[58vh] space-y-3 overflow-y-auto pr-1">
          <button
            v-for="call in orderedServiceCalls"
            :key="call.id"
            class="w-full rounded-2xl border border-rose-100 bg-rose-50 p-4 text-left shadow-sm hover:border-rose-400 hover:bg-rose-100 transition"
            @click="updateServiceCallStatus(call.id, 'resolved')"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-bold text-rose-700">Called At</p>
                <p class="text-lg font-bold text-gray-950">
                  {{ new Date(call.created_at).toLocaleTimeString() }}
                </p>
                <h3 class="mt-1 text-2xl font-bold text-gray-950">
                  Table {{ call.table_name }}
                </h3>
              </div>

              <span
                class="shrink-0 rounded-full px-3 py-1 text-xl font-bold"
                :class="serviceCallStyles[call.call_type]"
              >
                {{ serviceCallLabels[call.call_type] || call.call_type }}
              </span>
            </div>

            <p
              v-if="call.notes"
              class="mt-3 rounded-xl bg-white/80 p-3 font-semibold text-gray-700"
            >
              <span class="block text-xs uppercase text-gray-400"
                >Customer Memo</span
              >
              {{ call.notes }}
            </p>
          </button>
        </div>
      </div>
    </Transition>

    <SettingModal v-if="showSettings" @close="showSettings = false" />

    <TableQrModal
      v-if="qrTableName"
      :table-name="qrTableName"
      @close="qrTableName = ''"
    />
  </div>
</template>
