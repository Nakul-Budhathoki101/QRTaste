<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useSupabase } from "~/lib/supabase";
import { useSettingsStore } from "#imports";
import type { OrderItem, RestaurantTable } from "~/types";

type PaymentMethod = "online" | "barcode" | "credit_card" | "cash" | "other";

interface AggregatedItem {
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
  customizations?: string[];
  customization_note?: string;
}

const props = defineProps<{
  table: RestaurantTable;
}>();

const emit = defineEmits<{
  close: [];
  paid: [];
}>();

const paymentOptions: { label: string; value: PaymentMethod }[] = [
  { label: "Online", value: "online" },
  { label: "Barcode", value: "barcode" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Cash", value: "cash" },
  { label: "Other", value: "other" },
];

const supabase = useSupabase();
const settingsStore = useSettingsStore();
const orderStore = useOrderStore();
const couponStore = useCouponStore();

const loading = ref(true);
const paying = ref(false);
const error = ref("");
const orders = ref<any[]>([]);
const paymentMethod = ref<PaymentMethod>("online");

const normalizeItems = (items: OrderItem | OrderItem[] | null | undefined) => {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
};

const aggregatedItems = computed<AggregatedItem[]>(() => {
  const itemMap = new Map<string, AggregatedItem>();

  for (const order of orders.value) {
    for (const item of normalizeItems(order.items)) {
      const key = `${item.name}_${item.price}_${(item.customizations || []).join(",")}_${item.customization_note || ""}`;
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
          customizations: item.customizations,
          customization_note: item.customization_note,
        });
      }
    }
  }

  return Array.from(itemMap.values());
});

const subtotal = computed(() =>
  aggregatedItems.value.reduce((sum, item) => sum + item.lineTotal, 0),
);

const taxAmount = computed(() =>
  Math.round(taxableSubtotal.value * (settingsStore.taxRate / 100)),
);

const appliedCoupon = computed(() => couponStore.currentAppliedCoupon);

const discountAmount = computed(() =>
  couponStore.calculateDiscount(subtotal.value, appliedCoupon.value),
);

const taxableSubtotal = computed(() =>
  Math.max(0, subtotal.value - discountAmount.value),
);

const grandTotal = computed(() => taxableSubtotal.value + taxAmount.value);

const sessionDuration = computed(() => {
  if (!props.table.startTime) return "Unlimited";

  const start = new Date(props.table.startTime).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
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
    .eq("is_billed", false)
    .order("created_at", { ascending: true });

  if (props.table.startTime) {
    query = query.gte("created_at", props.table.startTime);
  }

  const { data, error: fetchError } = await query;

  if (fetchError) {
    error.value = `Failed to load orders: ${fetchError.message}`;
  } else {
    orders.value = data || [];
  }

  loading.value = false;
};

const printBill = () => {
  const printable = document.getElementById("bill-print-area");
  if (!printable) return;

  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Bill - Table ${props.table.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
          .row { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; }
          .total { border-top: 1px solid #111; margin-top: 12px; padding-top: 12px; font-size: 20px; font-weight: 700; }
          .muted { color: #555; font-size: 12px; }
        </style>
      </head>
      <body>${printable.innerHTML.replaceAll("JPY", settingsStore.currencyLabel)}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const markAsPaid = async () => {
  paying.value = true;
  error.value = "";

  const { error: insertError } = await supabase.from("table_bills").insert([
    {
      table_id: props.table.id,
      table_name: props.table.name,
      items: aggregatedItems.value,
      subtotal: subtotal.value,
      tax_amount: taxAmount.value,
      total_price: grandTotal.value,
      payment_method: paymentMethod.value,
      is_paid: true,
      status: "paid",
      discount_amount: discountAmount.value,
      coupon_code: appliedCoupon.value?.coupon_code || null,
      paid_at: new Date().toISOString(),
    },
  ]);

  if (insertError) {
    error.value = `Failed to save bill: ${insertError.message}`;
    paying.value = false;
    return;
  }

  const billResult = await orderStore.markOrdersBilled(
    orders.value.map((order) => order.id),
  );

  if (!billResult.success) {
    error.value = `Bill saved, but orders were not closed: ${billResult.message}`;
    paying.value = false;
    return;
  }

  if (appliedCoupon.value) {
    await couponStore.redeemAppliedCoupon(appliedCoupon.value.id);
  }

  paying.value = false;
  emit("paid");
};

onMounted(() => {
  settingsStore.loadSettings();
  fetchOrders();
  couponStore.loadAppliedCouponForTable(props.table.name, props.table.startTime);
});
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div
      class="bg-white rounded-3xl shadow-2xl w-[520px] max-w-[94vw] max-h-[90vh] flex flex-col overflow-hidden"
    >
      <div class="bg-gray-900 text-white p-6">
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-2xl font-bold">Checkout</h2>
            <p class="text-gray-300 mt-1">Table {{ table.name }}</p>
          </div>

          <button
            class="text-gray-400 hover:text-white text-2xl"
            @click="$emit('close')"
          >
            x
          </button>
        </div>

        <div class="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-gray-300">
          <span v-if="table.customerCount">
            {{ table.customerCount }} customers
          </span>
          <span>{{ sessionDuration }}</span>
          <span>{{ orders.length }} orders</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="loading" class="text-center py-8 text-gray-400">
          Loading orders...
        </div>

        <div v-else-if="error" class="text-center py-8 text-red-500">
          {{ error }}
        </div>

        <div
          v-else-if="aggregatedItems.length === 0"
          class="text-center py-8 text-gray-400"
        >
          No orders found for this session.
        </div>

        <div v-else id="bill-print-area">
          <div class="mb-5">
            <h3 class="text-xl font-bold">{{ settingsStore.restaurantName }}</h3>
            <p class="text-sm text-gray-500">Table {{ table.name }}</p>
            <p class="text-sm text-gray-500">
              {{ new Date().toLocaleString() }}
            </p>
          </div>

          <div class="space-y-3">
            <div
              v-for="(item, index) in aggregatedItems"
              :key="index"
              class="row flex justify-between items-center py-2 border-b border-gray-100"
            >
            <div class="flex-1">
                <p class="font-medium">{{ item.name }}</p>
                <p class="muted text-sm text-gray-400">
                  {{ settingsStore.currencyLabel }} {{ item.price }} x
                  {{ item.quantity }}
                </p>
                <p
                  v-if="item.customizations?.length || item.customization_note"
                  class="text-sm text-red-600 font-semibold"
                >
                  {{
                    [
                      ...(item.customizations || []),
                      item.customization_note,
                    ]
                      .filter(Boolean)
                      .join(" | ")
                  }}
                </p>
              </div>

              <span class="font-bold">
                {{ settingsStore.currencyLabel }} {{ item.lineTotal }}
              </span>
            </div>
          </div>

          <div class="mt-6 pt-4 border-t-2 border-gray-200 space-y-2">
            <div class="row flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{{ settingsStore.currencyLabel }} {{ subtotal }}</span>
            </div>

            <div
              v-if="discountAmount"
              class="row flex justify-between text-green-700 font-semibold"
            >
              <span>
                Discount
                <span v-if="appliedCoupon">({{ appliedCoupon.coupon_code }})</span>
              </span>
              <span>- {{ settingsStore.currencyLabel }} {{ discountAmount }}</span>
            </div>

            <div class="row flex justify-between text-gray-600">
              <span>Tax ({{ settingsStore.taxRate }}%)</span>
              <span>{{ settingsStore.currencyLabel }} {{ taxAmount }}</span>
            </div>

            <div
              class="row total flex justify-between text-2xl font-bold pt-2 border-t border-gray-200"
            >
              <span>Total</span>
              <span>{{ settingsStore.currencyLabel }} {{ grandTotal }}</span>
            </div>

            <div class="row flex justify-between text-gray-600">
              <span>Payment</span>
              <span class="capitalize">
                {{ paymentMethod.replace("_", " ") }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="aggregatedItems.length" class="mt-6">
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Payment Method
          </label>

          <select
            v-model="paymentMethod"
            class="w-full border border-gray-300 rounded-xl px-3 py-3 bg-white"
          >
            <option
              v-for="option in paymentOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="p-6 border-t bg-gray-50">
        <div class="flex gap-3">
          <button
            class="flex-1 border border-gray-300 py-3 rounded-xl font-medium hover:bg-gray-100"
            @click="$emit('close')"
          >
            Cancel
          </button>

          <button
            class="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50"
            :disabled="loading || aggregatedItems.length === 0"
            @click="printBill"
          >
            Print Bill
          </button>

          <button
            class="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="paying || aggregatedItems.length === 0"
            @click="markAsPaid"
          >
            {{ paying ? "Processing..." : "Mark Paid" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
