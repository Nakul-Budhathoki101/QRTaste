<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "~/lib/supabase";
import { useSettingsStore } from "#imports";

interface RestaurantTable {
  id: number;
  name: string;
  seats: number;
  status: string;
  customerCount?: number;
  startTime?: string;
  timeLimit?: number;
}

interface AggregatedItem {
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

const props = defineProps<{
  table: RestaurantTable;
}>();

const emit = defineEmits<{
  close: [];
  paid: [];
}>();

const supabase = useSupabase();
const settingsStore = useSettingsStore();
const billStore = useBillStore();

const loading = ref(true);
const paying = ref(false);
const error = ref("");
const orders = ref<any[]>([]);

const billableOrders = computed(() =>
  orders.value.filter((o) => o.status === "preparing" || o.status === "completed")
);

const pendingCount = computed(() =>
  orders.value.filter((o) => o.status === "pending").length
);

const aggregatedItems = computed<AggregatedItem[]>(() => {
  const itemMap = new Map<string, AggregatedItem>();

  for (const order of billableOrders.value) {
    const item = order.items;
    if (!item) continue;

    const key = `${item.name}_${item.price}`;
    const existing = itemMap.get(key);

    if (existing) {
      existing.quantity += item.quantity;
      existing.lineTotal = existing.price * existing.quantity;
    } else {
      itemMap.set(key, {
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        lineTotal: item.price * item.quantity,
      });
    }
  }

  return Array.from(itemMap.values());
});

const subtotal = computed(() => {
  return aggregatedItems.value.reduce((sum, item) => sum + item.lineTotal, 0);
});

const taxAmount = computed(() => {
  return Math.round(subtotal.value * (settingsStore.taxRate / 100));
});

const grandTotal = computed(() => {
  return subtotal.value + taxAmount.value;
});

const sessionDuration = computed(() => {
  if (!props.table.startTime) return "—";

  const start = new Date(props.table.startTime).getTime();
  const now = Date.now();
  const seconds = Math.floor((now - start) / 1000);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
});

const fetchOrders = async () => {
  loading.value = true;
  error.value = "";

  let query = supabase
    .from("orders")
    .select("*")
    .eq("table_name", props.table.name)
    .order("created_at", { ascending: true });

  // Scope to current session if we have a start time
  if (props.table.startTime) {
    query = query.gte("created_at", props.table.startTime);
  }

  const { data, error: fetchError } = await query;

  if (fetchError) {
    error.value = "Failed to load orders";
    console.error(fetchError);
  } else {
    orders.value = data || [];
  }

  loading.value = false;
};

const markAsPaid = async () => {
  paying.value = true;

  const billItems = aggregatedItems.value.map((item) => ({
    menuItemId: 0,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const result = await billStore.createBill({
    tableId: props.table.id,
    tableName: props.table.name,
    items: billItems,
    subtotal: subtotal.value,
    tax: taxAmount.value,
    total: grandTotal.value,
    status: "paid",
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
  });

  if (!result.success) {
    error.value = `Failed to save bill: ${result.message}`;
    paying.value = false;
    return;
  }

  // Discard any remaining pending orders for this table
  const pendingOrders = orders.value.filter((o) => o.status === "pending");
  for (const order of pendingOrders) {
    await supabase.from("orders").delete().eq("id", order.id);
  }

  paying.value = false;
  emit("paid");
};

onMounted(fetchOrders);
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div
      class="bg-white rounded-3xl shadow-2xl w-[480px] max-h-[90vh] flex flex-col overflow-hidden"
    >
      <!-- HEADER -->
      <div class="bg-gray-900 text-white p-6">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-2xl font-bold">💰 Checkout</h2>
            <p class="text-gray-300 mt-1">Table {{ table.name }}</p>
          </div>

          <button
            class="text-gray-400 hover:text-white text-2xl"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>

        <!-- Session Info -->
        <div class="flex gap-6 mt-4 text-sm text-gray-300">
          <span v-if="table.customerCount">
            👥 {{ table.customerCount }} customers
          </span>

          <span> ⏱️ {{ sessionDuration }} </span>

          <span> 📋 {{ orders.length }} orders </span>
        </div>
      </div>

      <!-- BODY -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- Loading -->
        <div v-if="loading" class="text-center py-8 text-gray-400">
          Loading orders...
        </div>

        <!-- Error -->
        <div v-else-if="error" class="text-center py-8 text-red-500">
          {{ error }}
        </div>

        <!-- Content -->
        <div v-else>
          <!-- Pending Notice -->
          <div
            v-if="pendingCount > 0"
            class="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm"
          >
            ⚠️ {{ pendingCount }} pending order(s) not included in the bill.
          </div>

          <!-- Empty -->
          <div
            v-if="aggregatedItems.length === 0"
            class="text-center py-8 text-gray-400"
          >
            No billable orders found. All orders may still be pending.
          </div>

          <!-- Items -->
          <div v-else>
          <div class="space-y-3">
            <div
              v-for="(item, index) in aggregatedItems"
              :key="index"
              class="flex justify-between items-center py-2 border-b border-gray-100"
            >
              <div class="flex-1">
                <p class="font-medium">{{ item.name }}</p>
                <p class="text-sm text-gray-400">
                  ¥{{ item.price }} × {{ item.quantity }}
                </p>
              </div>

              <span class="font-bold"> ¥{{ item.lineTotal }} </span>
            </div>
          </div>

          <!-- Totals -->
          <div class="mt-6 pt-4 border-t-2 border-gray-200 space-y-2">
            <div class="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>¥{{ subtotal }}</span>
            </div>

            <div class="flex justify-between text-gray-600">
              <span>Tax ({{ settingsStore.taxRate }}%)</span>
              <span>¥{{ taxAmount }}</span>
            </div>

            <div
              class="flex justify-between text-2xl font-bold pt-2 border-t border-gray-200"
            >
              <span>Total</span>
              <span>¥{{ grandTotal }}</span>
            </div>
          </div>
        </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="p-6 border-t bg-gray-50">
        <div class="flex gap-3">
          <button
            class="flex-1 border border-gray-300 py-3 rounded-xl font-medium hover:bg-gray-100"
            @click="$emit('close')"
          >
            Cancel
          </button>

          <button
            class="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="paying || aggregatedItems.length === 0"
            @click="markAsPaid"
          >
            {{ paying ? "Processing..." : "✅ Mark as Paid" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
