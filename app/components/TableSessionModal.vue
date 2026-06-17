<script setup lang="ts">
import type { RestaurantTable } from "#imports";
import type { TableReservation } from "~/types";

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
const reservationStore = useReservationStore();

const getInitialCustomerCount = () =>
  props.table.customerCount ?? props.table.seats ?? 1;

const getInitialTimeLimit = () => {
  if (props.table.timeLimit && props.table.timeLimit > 0) {
    return props.table.timeLimit;
  }

  if (settings.defaultTimeLimit && settings.defaultTimeLimit > 0) {
    return settings.defaultTimeLimit;
  }

  return 1;
};

const shouldEnableTimeLimit = () => Boolean(props.table.timeLimit);

const localCustomerCount = ref(getInitialCustomerCount());
const localTimeLimit = ref(getInitialTimeLimit());
const enableTimeLimit = ref(shouldEnableTimeLimit());
const selectedMoveTargetId = ref<number>();
const selectedMergeTargetId = ref<number>();
const now = ref(Date.now());
const showReservationModal = ref(false);
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

const todayReservations = computed(() =>
  reservationStore.getReservationsForTableToday(props.table.id),
);

const nextReservation = computed(() =>
  reservationStore.getNextReservationForTableToday(props.table.id),
);

const formatReservationTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getReservationTimeState = (value: string) => {
  const minutesFromNow = Math.floor(
    (new Date(value).getTime() - Date.now()) / 60000,
  );

  if (minutesFromNow < -15) return "late";
  if (minutesFromNow <= 10) return "due";
  return "upcoming";
};

const getReservationTimeLabel = (value: string) => {
  const state = getReservationTimeState(value);

  if (state === "late") return "Late / no-show window";
  if (state === "due") return "Due now";
  return "Upcoming";
};

const getNextReservationAfter = (reservationId: number) => {
  const nowMs = Date.now();

  return (
    todayReservations.value
      .filter((reservation) => reservation.id !== reservationId)
      .filter(
        (reservation) => new Date(reservation.reserved_at).getTime() > nowMs,
      )
      .sort(
        (a, b) =>
          new Date(a.reserved_at).getTime() - new Date(b.reserved_at).getTime(),
      )[0] || null
  );
};

const getSafeTimeLimitForSeatedReservation = (reservationId: number) => {
  const laterReservation = getNextReservationAfter(reservationId);

  if (!laterReservation) return undefined;

  const latestEnd =
    new Date(laterReservation.reserved_at).getTime() - 10 * 60 * 1000;
  const maxMinutes = Math.floor((latestEnd - Date.now()) / 60000);

  if (maxMinutes <= 0) return 0;

  return Math.min(settings.defaultTimeLimit, maxMinutes);
};

const maxSessionMinutesBeforeReservation = computed(() => {
  if (!nextReservation.value) return null;

  const latestEnd =
    new Date(nextReservation.value.reserved_at).getTime() - 10 * 60 * 1000;
  const minutes = Math.floor((latestEnd - Date.now()) / 60000);

  return Math.max(0, minutes);
});

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
  enableTimeLimit.value && Number(localTimeLimit.value) > 0
    ? Number(localTimeLimit.value)
    : undefined;

const resetSessionForm = () => {
  localCustomerCount.value = getInitialCustomerCount();
  localTimeLimit.value = getInitialTimeLimit();
  enableTimeLimit.value = shouldEnableTimeLimit();
};

const handleTimeLimitToggle = () => {
  if (!enableTimeLimit.value) return;

  localTimeLimit.value = getInitialTimeLimit();
};

const validateReservationTimeLimit = () => {
  if (!nextReservation.value) return true;

  const maxMinutes = maxSessionMinutesBeforeReservation.value ?? 0;

  if (!enableTimeLimit.value) {
    toastStore.open(
      "This table has a reservation today. Set a time limit before starting.",
      "error",
    );
    return false;
  }

  if (Number(localTimeLimit.value) > maxMinutes) {
    toastStore.open(
      `Time limit must end 10 minutes before the ${formatReservationTime(
        nextReservation.value.reserved_at,
      )} reservation. Max allowed: ${maxMinutes} minutes.`,
      "error",
    );
    return false;
  }

  return true;
};

const handleStartSession = () => {
  if (!validateReservationTimeLimit()) return;

  emit("start", {
    customerCount: localCustomerCount.value,
    timeLimit: decidedTimeLimit(),
  });
};

const handleUpdateSession = () => {
  if (!validateReservationTimeLimit()) return;

  emit("update", {
    customerCount: localCustomerCount.value,
    timeLimit: decidedTimeLimit(),
  });
};

const seatReservation = async (reservation: TableReservation) => {
  if (isOccupied.value) {
    toastStore.open("This table already has an active session.", "error");
    return;
  }

  if (isCleaning.value) {
    toastStore.open(
      "Make this table available before seating the reservation.",
      "error",
    );
    return;
  }

  const safeTimeLimit = getSafeTimeLimitForSeatedReservation(reservation.id);

  if (safeTimeLimit === 0) {
    toastStore.open(
      "The next reservation is too close. Cancel, move, or wait before seating.",
      "error",
    );
    return;
  }

  const result = await reservationStore.updateReservationStatus(
    reservation.id,
    "seated",
  );

  toastStore.open(
    result.success
      ? `${reservation.customer_name} is seated at ${props.table.name}.`
      : result.message,
    result.success ? "success" : "error",
  );

  if (!result.success) return;

  emit("start", {
    customerCount: reservation.guest_count,
    timeLimit: safeTimeLimit,
  });
};

const cancelReservation = async (reservation: TableReservation) => {
  const result = await reservationStore.updateReservationStatus(
    reservation.id,
    "cancelled",
  );

  toastStore.open(
    result.success
      ? `${reservation.customer_name}'s reservation was cancelled/no-show.`
      : result.message,
    result.success ? "success" : "error",
  );
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
  toastStore.open(
    result?.message ?? "Table set to cleaning",
    result?.success ? "success" : "error",
  );
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
  toastStore.open(
    result?.message ?? "Table is available",
    result?.success ? "success" : "error",
  );
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
  settings.loadSettings();
  resetSessionForm();
  orderStore.loadOrders();
  reservationStore.loadReservations();
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

watch(
  () => [
    props.table.id,
    props.table.customerCount,
    props.table.seats,
    props.table.timeLimit,
    props.table.status,
    settings.defaultTimeLimit,
  ],
  resetSessionForm,
);

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<template>
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
  >
    <div
      class="bg-white rounded-2xl w-[760px] max-w-[96vw] max-h-[92vh] overflow-y-auto shadow-2xl"
    >
      <div class="bg-gray-950 text-white p-6 rounded-t-2xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <!-- <p class="text-sm uppercase tracking-wide text-gray-400">
              Table Session
            </p> -->
            <h2 class="text-4xl font-bold">
              {{ table.name }}
            </h2>
          </div>

          <button
            class="group flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg shadow-black/20 transition hover:rotate-90 hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-white/60"
            aria-label="Close table session modal"
            @click="$emit('close')"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                stroke-width="2.6"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          <div class="bg-white/10 rounded-lg p-3">
            <p class="text-xs text-gray-300">Status</p>
            <p class="font-bold capitalize">{{ table.status }}</p>
          </div>

          <div class="bg-white/10 rounded-lg p-3">
            <p class="text-xs text-gray-300">Guests</p>
            <p class="font-bold">
              {{ table.customerCount ?? localCustomerCount }}
            </p>
          </div>

          <div class="bg-white/10 rounded-lg p-3">
            <p class="text-xs text-gray-300">Elapsed</p>
            <p class="font-bold">
              {{ table.startTime ? elapsedLabel : "Not started" }}
            </p>
          </div>

          <div class="bg-white/10 rounded-lg p-3">
            <p class="text-xs text-gray-300">Limit</p>
            <p class="font-bold">
              {{ table.timeLimit ? `${table.timeLimit} min` : "Unlimited" }}
            </p>
          </div>

          <div v-if="table.sessionPin" class="bg-emerald-500/20 rounded-lg p-3">
            <p class="text-xs text-emerald-100">Order PIN</p>
            <p class="font-bold text-2xl tracking-widest">
              {{ table.sessionPin }}
            </p>
          </div>
        </div>

        <div
          v-if="isOccupied && hasUnpaidOrders"
          class="mt-4 bg-amber-400 text-amber-950 rounded-lg p-3 font-semibold"
        >
          This table has {{ unbilledSessionOrders.length }} unpaid order(s).
          Checkout, move, or merge before cleaning or clearing the table.
        </div>

        <div
          v-else-if="!isOccupied && nextReservation"
          class="mt-4 bg-purple-400 text-purple-950 rounded-lg p-3 font-semibold"
        >
          Reserved today at
          {{ formatReservationTime(nextReservation.reserved_at) }}. Session time
          must end 10 minutes before this reservation.
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
            <input
              v-model="enableTimeLimit"
              type="checkbox"
              @change="handleTimeLimitToggle"
            />
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
          <h3 class="font-bold text-lg mb-4">
            {{ isOccupied ? "Merge | Move the tables" : "Reservations Today" }}
          </h3>

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

          <div v-else class="space-y-4">
            <div
              v-if="todayReservations.length"
              class="space-y-2 max-h-44 overflow-y-auto"
            >
              <div
                v-for="reservation in todayReservations"
                :key="reservation.id"
                class="bg-white rounded-xl border p-3 shadow-sm"
              >
                <div class="flex justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="font-bold">{{ reservation.customer_name }}</p>
                      <span
                        class="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        :class="{
                          'bg-red-100 text-red-700':
                            getReservationTimeState(reservation.reserved_at) ===
                            'late',
                          'bg-amber-100 text-amber-700':
                            getReservationTimeState(reservation.reserved_at) ===
                            'due',
                          'bg-purple-100 text-purple-700':
                            getReservationTimeState(reservation.reserved_at) ===
                            'upcoming',
                        }"
                      >
                        {{ getReservationTimeLabel(reservation.reserved_at) }}
                      </span>
                    </div>
                    <p class="text-sm text-gray-500">
                      {{ reservation.guest_count }} guests
                      <span v-if="reservation.customer_phone">
                        | {{ reservation.customer_phone }}
                      </span>
                    </p>
                  </div>

                  <p class="font-bold text-purple-700">
                    {{ formatReservationTime(reservation.reserved_at) }}
                  </p>
                </div>

                <p v-if="reservation.notes" class="text-sm text-gray-500 mt-2">
                  {{ reservation.notes }}
                </p>

                <div class="grid grid-cols-2 gap-2 mt-3">
                  <button
                    class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"
                    @click="seatReservation(reservation)"
                  >
                    Seat
                  </button>

                  <button
                    class="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-black"
                    @click="cancelReservation(reservation)"
                  >
                    Cancel / No-show
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="text-gray-500 bg-white border rounded-lg p-3">
              No reservations for this table today.
            </div>

            <div class="border-t pt-4">
              <button
                class="w-full bg-purple-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-purple-700"
                @click="showReservationModal = true"
              >
                Add Reservation
              </button>
            </div>
          </div>
        </section>
      </div>

      <div class="flex flex-wrap justify-end gap-3 p-6 pt-0">
        <button
          v-if="isOccupied"
          class="w-full bg-amber-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-amber-600 sm:w-auto sm:min-w-32"
          @click="$emit('checkout')"
        >
          Checkout
        </button>

        <button
          v-if="isOccupied"
          class="w-full bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-600 sm:w-auto sm:min-w-32"
          @click="setCleaning"
        >
          Cleaning
        </button>

        <button
          v-if="isOccupied || isCleaning"
          class="w-full bg-gray-800 text-white px-4 py-3 rounded-xl font-bold hover:bg-gray-900 sm:w-auto sm:min-w-32"
          @click="setAvailable"
        >
          Available
        </button>

        <button
          v-if="isOccupied"
          class="w-full bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 sm:w-auto sm:min-w-32"
          @click="handleUpdateSession"
        >
          Update
        </button>

        <button
          v-else-if="!isCleaning"
          class="w-full bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 sm:w-auto sm:min-w-40"
          @click="handleStartSession"
        >
          Start Session
        </button>
      </div>
    </div>

    <ReservationModal
      v-if="showReservationModal"
      :initial-table-id="table.id"
      lock-table
      @close="showReservationModal = false"
      @saved="reservationStore.loadReservations()"
    />
  </div>
</template>
