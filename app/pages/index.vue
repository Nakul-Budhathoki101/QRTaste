<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

import { useTableStore } from "#imports";
import { useSettingsStore } from "#imports";
import { useSupabase } from "~/lib/supabase";
import { useOrderStore } from "~/stores/order";

import TableSessionModal from "~/components/TableSessionModal.vue";
import TableQrModal from "~/components/TableQrModal.vue";
import SettingModal from "~/components/SettingModal.vue";
import CheckoutModal from "~/components/CheckoutModal.vue";

import type { RestaurantTable, TableStatus } from "#imports";
import Category from "./admin/category.vue";
import type { OrderStatus } from "~/types/order.js";

let interval: ReturnType<typeof setInterval>;

const currentTime = ref(Date.now());
const selectedTable = ref<RestaurantTable | null>(null);

const supabase = useSupabase();
const billStore = useBillStore();
const settingsStore = useSettingsStore();
const tableStore = useTableStore();
const orderStore = useOrderStore();
const authStore = useAuthStore();
const categoryStore = useCategoryStore();
const toastStore = useToastStore();

const showSettings = ref(false);

const qrTableName = ref("");
const checkoutTable = ref<RestaurantTable | null>(null);

const openQr = (tableName: string) => {
  qrTableName.value = tableName;
};

onMounted(async () => {
  await tableStore.loadTables();
  await billStore.loadBills();
  await categoryStore.loadCategories();
  await orderStore.loadOrders();
  orderStore.subscribeOrders();
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
const closeModal = () => {
  selectedTable.value = null;
};

const startSession = (payload: {
  customerCount: number;
  timeLimit?: number;
}) => {
  if (!selectedTable.value) return;

  selectedTable.value.status = "occupied";
  selectedTable.value.customerCount = payload.customerCount;
  selectedTable.value.timeLimit = payload.timeLimit;
  selectedTable.value.startTime = new Date().toISOString();

  closeModal();
};

const updateSession = (payload: {
  customerCount: number;
  timeLimit?: number;
}) => {
  if (!selectedTable.value) return;

  selectedTable.value.customerCount = payload.customerCount;
  selectedTable.value.timeLimit = payload.timeLimit;

  closeModal();
};

// ORDER RELATED

const orders = computed(() =>
  orderStore.orders.filter(
    (x) => x.status == "pending" || x.status === "preparing",
  ),
);

const updateOrderStatus = async (orderId: number, conditon: OrderStatus) => {
  const result = await orderStore.updateStatus(orderId, conditon);
  toastStore.open(result.message, result.success ? "success" : "error");
};

const getTableColor = (table: RestaurantTable) => {
  if (table.status === "occupied") {
    // no limit
    if (!table.timeLimit) {
      return "bg-yellow-500";
    }

    const elapsed = getElapsedSeconds(table);

    // full red
    if (elapsed >= table.timeLimit * 60) {
      return "bg-red-600";
    }

    // orange warning
    if (
      elapsed >=
      (table.timeLimit - settingsStore.warningBeforeMinutes) * 60
    ) {
      return "bg-orange-500";
    }

    // occupied
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

const handlePaid = () => {
  if (!checkoutTable.value) return;

  tableStore.setCleaning(checkoutTable.value.id);
  checkoutTable.value = null;
};
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <div class="max-w-7xl mx-auto p-6">
      <!-- HEADER -->
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
      >
        <h1 class="text-4xl font-bold">Restaurant Dashboard</h1>

        <div class="flex gap-3">
          <button
            class="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
            @click="showSettings = true"
          >
            ⚙️ Settings
          </button>

          <button
            class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            @click="authStore.logout()"
          >
            Logout
          </button>
        </div>
      </div>

      <!-- TABLE GRID -->
      <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        <div
          v-for="table in currentTables"
          :key="table.id"
          class="rounded-xl shadow-lg p-6 text-white cursor-pointer transition hover:scale-105 min-h-[220px] flex flex-col justify-between"
          :class="getTableColor(table)"
          @click="openTableModal(table)"
        >
          <div>
            <h2 class="text-2xl font-bold">
              {{ table.name }}
            </h2>

            <p class="mt-4 font-bold capitalize">
              {{ table.status }}
            </p>

            <div class="mt-3 h-6">
              <span v-if="table.customerCount">
                👥 {{ table.customerCount }} customers
              </span>
            </div>

            <div class="mt-2 h-6 font-bold">
              <span v-if="table.startTime">
                ⏳
                {{ formatTime(getElapsedSeconds(table)) }}
              </span>

              <span v-else> ∞ Unlimited </span>
            </div>
          </div>

          <button
            v-if="table.status === 'occupied'"
            class="mt-4 bg-white text-black px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition"
            @click.stop="openQr(table.name)"
          >
            📱 QR Code
          </button>
        </div>
      </div>

      <!-- KITCHEN ORDERS -->
      <div class="mt-12">
        <h2 class="text-4xl font-bold mb-6">🍳 Kitchen Orders</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="order in orders"
            :key="order.id"
            class="bg-white rounded-3xl p-6 shadow-xl min-h-[320px] flex flex-col"
          >
            <!-- HEADER -->
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-2xl font-bold">
                  Table
                  {{ order.table_name }}
                </h3>

                <p class="text-gray-500">
                  {{ new Date(order.created_at).toLocaleTimeString() }}
                </p>
              </div>

              <div
                class="px-4 py-2 rounded-full text-white font-bold"
                :class="{
                  'bg-red-500 animate-pulse': order.status === 'pending',

                  'bg-yellow-400 text-black': order.status === 'preparing',
                }"
              >
                {{ order.status }}
              </div>
            </div>

            <!-- ITEMS -->
            <div class="flex-1">
              <div class="flex justify-between py-1 text-xl">
                <span>
                  {{ order.items.name }}
                </span>

                <span> x{{ order.items.quantity }} </span>
              </div>
            </div>

            <!-- <div class="flex-1">
              <div
                v-for="item in order.items"
                :key="item.name"
                class="flex justify-between py-1"
              >
                <span>
                  {{ item.name }}
                </span>

                <span> x{{ item.quantity }} </span>
              </div>
            </div> -->

            <!-- TOTAL -->
            <div
              class="mt-4 pt-4 border-t flex justify-between text-xl font-bold"
            >
              <span>Total</span>

              <span> ¥{{ order.total_price }} </span>
            </div>

            <!-- ACTIONS -->
            <div class="flex gap-2 mt-6">
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
      </div>
    </div>

    <!-- MODALS -->

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
