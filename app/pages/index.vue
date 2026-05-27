<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

import { useTableStore } from "#imports";
import { useSettingsStore } from "#imports";

import TableSessionModal from "~/components/TableSessionModal.vue";
import TableQrModal from "~/components/TableQrModal.vue";
import SettingModal from "~/components/SettingModal.vue";

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

const showSettings = ref(false);

const qrTableName = ref("");

const openQr = (tableName: string) => {
  qrTableName.value = tableName;
};

onMounted(() => {
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
        <h2 class="text-2xl font-bold">Table {{ table.name }}</h2>

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

    <!-- MODAL COMPONENT -->
    <TableSessionModal
      v-if="selectedTable"
      :table="selectedTable"
      @close="closeModal"
      @start="startSession"
    />

    <SettingModal v-if="showSettings" @close="showSettings = false" />

    <TableQrModal
      v-if="qrTableName"
      :table-name="qrTableName"
      @close="qrTableName = ''"
    />
  </div>
</template>
