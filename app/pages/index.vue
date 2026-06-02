<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

import { useTableStore } from "#imports";
import { useSettingsStore } from "#imports";

import TableSessionModal from "~/components/TableSessionModal.vue";
import TableQrModal from "~/components/TableQrModal.vue";
import SettingModal from "~/components/SettingModal.vue";
import CheckoutModal from "~/components/CheckoutModal.vue";

import { useSupabase } from "~/lib/supabase";

const supabase = useSupabase();

import { useOrderStore } from "~/stores/order";

type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

interface RestaurantTable {
  id: number;
  name: string;
  seats: number;
  status: TableStatus;
  customerCount?: number;
  startTime?: string;
  timeLimit?: number;
}

let interval: ReturnType<typeof setInterval>;

const currentTime = ref(Date.now());
const selectedTable = ref<RestaurantTable | null>(null);

const settingsStore = useSettingsStore();
const tableStore = useTableStore();
const orderStore = useOrderStore();

const showSettings = ref(false);
const orders = ref<any[]>([]);

const qrTableName = ref("");
const checkoutTable = ref<RestaurantTable | null>(null);

const openQr = (tableName: string) => {
  qrTableName.value = tableName;
};

const fetchOrders = async () => {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .in("status", ["pending", "preparing"])
    .order("created_at", {
      ascending: false,
    });

  orders.value = data || [];
};

onMounted(async () => {
  tableStore.loadTables();
  await fetchOrders();
  interval = setInterval(() => {
    currentTime.value = Date.now();
  }, 1000);
  supabase
    .channel("orders-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
      },
      async () => {
        await fetchOrders();
      },
    )
    .subscribe();
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
  selectedTable.value = table;

  console.log('muji',table)
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

const updateOrderStatus = async (orderId: number, status: string) => {
  const { error } = await supabase
    .from("orders")
    .update({
      status,
    })
    .eq("id", orderId);

  if (error) {
    console.error(error);
  }
};

const handleCheckout = () => {
  if (!selectedTable.value) return;

  checkoutTable.value = { ...selectedTable.value };
  selectedTable.value = null;
};

const handlePaid = () => {
  if (!checkoutTable.value) return;

  tableStore.setCleaning(checkoutTable.value.id);
  checkoutTable.value = null;
};

const showAddTableModal = ref(false);
const newTableName = ref("");

const handleAddTable = () => {
  if (!newTableName.value.trim()) return;

  const exists = tableStore.tables.some(
    (table) =>
      String(table.name).toLowerCase() === newTableName.value.toLowerCase(),
  );

  if (exists) {
    alert("Table already exists");
    return;
  }

  tableStore.addTable(newTableName.value.trim());

  newTableName.value = "";
  showAddTableModal.value = false;
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="flex justify-between">
      <h1 class="text-4xl font-bold mb-8">Restaurant Dashboard</h1>

      <div class="flex justify-end mb-6">
        <button
          class="bg-black text-white px-4 py-2 rounded-lg"
          @click="showSettings = true"
        >
          ⚙️ Settings
        </button>
      </div>
    </div>

    <!-- TABLE GRID -->
    <div class="grid grid-cols-4 gap-4">
      <div
        v-for="table in tableStore.tables"
        :key="table.id"
        class="rounded-xl shadow-lg p-6 text-white cursor-pointer transition hover:scale-105"
        :class="getTableColor(table)"
        @click="openTableModal(table)"
      >
        <h2 class="text-2xl font-bold">{{ table.name }}</h2>

        <!-- <p class="mt-2">Seats: {{ table.seats }}</p> -->

        <p class="mt-4 font-bold capitalize">
          {{ table.status }}
        </p>

        <div class="mt-2 h-6">
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

        <button
          class="mt-4 bg-white text-black px-3 py-2 rounded-lg text-sm"
          @click.stop="openQr(table.name)"
          v-if="table.status === 'occupied'"
        >
          📱 QR Code
        </button>
      </div>
    </div>

    <!-- ADD TABLE -->

    <button
      class="px-4 py-2 bg-red-500 rounded-lg mt-3"
      @click="showAddTableModal = true"
    >
      ADD TABLE
    </button>

    <div
      v-if="showAddTableModal"
      class="fixed inset-0 bg-black/50 flex items-center justify-center"
    >
      <div class="bg-white p-6 rounded-xl w-[400px]">
        <h2 class="text-2xl font-bold mb-4">Add Table</h2>

        <input
          v-model="newTableName"
          placeholder="Example: A1"
          class="w-full border p-3 rounded-lg mb-4"
        />

        <div class="flex justify-end gap-2">
          <button
            class="px-4 py-2 bg-gray-300 rounded-lg"
            @click="showAddTableModal = false"
          >
            Cancel
          </button>

          <button
            class="px-4 py-2 bg-green-500 text-white rounded-lg"
            @click="handleAddTable"
          >
            Add
          </button>
        </div>
      </div>
    </div>

    <!-- KITCHEN PANEL -->
    <div class="mt-10">
      <h2 class="text-4xl font-bold mb-6">🍳 Kitchen Orders</h2>

      <div class="grid grid-cols-3 gap-4">
        <div
          v-for="order in orders"
          :key="order.id"
          class="bg-white rounded-3xl p-6 shadow-xl"
        >
          <!-- HEADER -->
          <div class="flex justify-between items-center mb-4">
            <div>
              <h3 class="text-2xl font-bold">
                Table
                {{ order.tableName }}
              </h3>

              <p class="text-gray-500">
                {{ new Date(order.createdAt).toLocaleTimeString() }}
              </p>
            </div>

            <!-- STATUS -->
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
          <div
            v-for="item in order.items"
            :key="item.id"
            class="flex justify-between mb-2"
          >
            <span>
              {{ item.name }}
            </span>

            <span> x{{ item.quantity }} </span>
          </div>

          <!-- TOTAL -->
          <div
            class="mt-4 pt-4 border-t flex justify-between text-xl font-bold"
          >
            <span>Total</span>

            <span> ¥{{ order.totalPrice }} </span>
          </div>

          <!-- ACTIONS -->
          <div class="flex gap-2 mt-6">
            <button
              class="flex-1 bg-blue-500 text-white py-2 rounded-xl"
              @click="updateOrderStatus(order.id, 'preparing')"
            >
              Preparing
            </button>

            <button
              class="flex-1 bg-green-500 text-white py-2 rounded-xl"
              @click="updateOrderStatus(order.id, 'completed')"
            >
              Completed
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL COMPONENT -->
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
