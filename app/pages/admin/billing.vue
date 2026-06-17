<script setup lang="ts">
import type { BillStatus, PaymentMethod, TableBill } from "~/types";

const billStore = useBillStore();
const tableStore = useTableStore();
const toastStore = useToastStore();
const settingsStore = useSettingsStore();
const confirmStore = useConfirmStore();

const search = ref("");
const statusFilter = ref<BillStatus | "all">("all");
const tableFilter = ref<string | "all">("all");
const startDate = ref("");
const endDate = ref("");
const selectedBill = ref<TableBill | null>(null);
const selectedPaymentMethod = ref<PaymentMethod>("cash");

const paymentOptions: { label: string; value: PaymentMethod }[] = [
  { label: "Online", value: "online" },
  { label: "Barcode", value: "barcode" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Cash", value: "cash" },
  { label: "Other", value: "other" },
];

onMounted(async () => {
  settingsStore.loadSettings();
  await Promise.all([billStore.loadBills(), tableStore.loadTables()]);
});

const getBillStatus = (bill: TableBill): BillStatus => {
  if (bill.status) return bill.status;
  return bill.is_paid ? "paid" : "unpaid";
};

const filteredBills = computed(() => {
  const term = search.value.trim().toLowerCase();
  const from = startDate.value ? new Date(startDate.value).getTime() : null;
  const to = endDate.value
    ? new Date(`${endDate.value}T23:59:59`).getTime()
    : null;

  return billStore.bills.filter((bill) => {
    const createdAt = new Date(bill.created_at).getTime();
    const status = getBillStatus(bill);
    const matchesSearch =
      !term ||
      bill.table_name.toLowerCase().includes(term) ||
      String(bill.id).includes(term) ||
      bill.payment_method.toLowerCase().includes(term) ||
      bill.coupon_code?.toLowerCase().includes(term);

    const matchesStatus = statusFilter.value === "all" || status === statusFilter.value;
    const matchesTable =
      tableFilter.value === "all" || bill.table_name === tableFilter.value;
    const matchesStart = !from || createdAt >= from;
    const matchesEnd = !to || createdAt <= to;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesTable &&
      matchesStart &&
      matchesEnd
    );
  });
});

const filteredRevenue = computed(() =>
  filteredBills.value
    .filter((bill) => getBillStatus(bill) === "paid")
    .reduce((sum, bill) => sum + Number(bill.total_price), 0),
);

const formatPayment = (method: string) => method.replace("_", " ");

const itemTotal = (item: any) =>
  item.lineTotal ?? Number(item.price || 0) * Number(item.quantity || 0);

const printBill = (bill: TableBill) => {
  const rows = (bill.items || [])
    .map(
      (item: any) => `
        <div class="row">
          <span>${item.name} x ${item.quantity}</span>
          <strong>${settingsStore.currencyLabel} ${itemTotal(item)}</strong>
        </div>
      `,
    )
    .join("");

  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Bill #${bill.id}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
          h1 { font-size: 22px; margin: 0 0 8px; }
          .muted { color: #555; font-size: 12px; margin-bottom: 16px; }
          .row { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; }
          .total { border-top: 1px solid #111; margin-top: 12px; padding-top: 12px; font-size: 20px; }
        </style>
      </head>
      <body>
        <h1>${settingsStore.restaurantName}</h1>
        <div class="muted">Bill #${bill.id} | Table ${bill.table_name}</div>
        ${rows}
        <div class="row"><span>Subtotal</span><span>${settingsStore.currencyLabel} ${bill.subtotal}</span></div>
        <div class="row"><span>Tax</span><span>${settingsStore.currencyLabel} ${bill.tax_amount}</span></div>
        <div class="row"><span>Discount${bill.coupon_code ? ` (${bill.coupon_code})` : ""}</span><span>${settingsStore.currencyLabel} ${bill.discount_amount || 0}</span></div>
        <div class="row total"><span>Total</span><strong>${settingsStore.currencyLabel} ${bill.total_price}</strong></div>
        <div class="row"><span>Payment</span><span>${formatPayment(bill.payment_method)}</span></div>
        <div class="row"><span>Status</span><span>${getBillStatus(bill)}</span></div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const openDetails = (bill: TableBill) => {
  selectedBill.value = bill;
  selectedPaymentMethod.value = bill.payment_method;
};

const markPaid = async (bill: TableBill) => {
  const result = await billStore.markPaid(bill.id, selectedPaymentMethod.value);
  toastStore.open(result.message, result.success ? "success" : "error");
  if (result.success) selectedBill.value = null;
};

const cancelBill = async (bill: TableBill) => {
  const confirmed = await confirmStore.confirm({
    title: "Cancel Bill",
    message: `Cancel bill #${bill.id} for table ${bill.table_name}?`,
  });

  if (!confirmed) return;

  const result = await billStore.cancelBill(bill.id);
  toastStore.open(result.message, result.success ? "success" : "error");
  if (result.success) selectedBill.value = null;
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-7xl mx-auto">
      <div class="mb-5">
        <NuxtLink to="/" class="bg-gray-700 text-white px-4 py-2 rounded-lg">
          Dashboard
        </NuxtLink>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-3xl font-bold">Billing Management</h1>
          <p class="text-gray-500 mt-1">
            Filter bills, review details, print receipts, and close payments.
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Filtered Revenue</p>
          <p class="text-2xl font-bold">
            {{ settingsStore.currencyLabel }} {{ filteredRevenue }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Paid Bills</p>
          <p class="text-2xl font-bold text-green-600">
            {{ billStore.paidBills.length }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Unpaid Bills</p>
          <p class="text-2xl font-bold text-amber-600">
            {{ billStore.unpaidBills.length }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Cancelled</p>
          <p class="text-2xl font-bold text-gray-600">
            {{ billStore.cancelledBills.length }}
          </p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            v-model="search"
            class="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Search table, bill ID, coupon"
          />

          <select
            v-model="statusFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            v-model="tableFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All tables</option>
            <option
              v-for="table in tableStore.tables"
              :key="table.id"
              :value="table.name"
            >
              {{ table.name }}
            </option>
          </select>

          <input
            v-model="startDate"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2"
          />

          <input
            v-model="endDate"
            type="date"
            class="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div
          class="hidden md:grid grid-cols-[90px_1fr_130px_130px_130px_150px] gap-4 px-4 py-3 bg-gray-900 text-white font-bold"
        >
          <span>Bill</span>
          <span>Table / Date</span>
          <span>Payment</span>
          <span>Status</span>
          <span>Total</span>
          <span>Actions</span>
        </div>

        <div
          v-for="bill in filteredBills"
          :key="bill.id"
          class="grid grid-cols-1 md:grid-cols-[90px_1fr_130px_130px_130px_150px] gap-3 md:gap-4 px-4 py-4 border-t items-center"
        >
          <div class="font-bold">#{{ bill.id }}</div>

          <div>
            <p class="font-semibold">Table {{ bill.table_name }}</p>
            <p class="text-sm text-gray-500">
              {{ new Date(bill.created_at).toLocaleString() }}
            </p>
          </div>

          <div class="capitalize">{{ formatPayment(bill.payment_method) }}</div>

          <div>
            <span
              class="px-3 py-1 rounded-full text-sm font-bold text-white capitalize"
              :class="{
                'bg-green-500': getBillStatus(bill) === 'paid',
                'bg-amber-500': getBillStatus(bill) === 'unpaid',
                'bg-gray-600': getBillStatus(bill) === 'cancelled',
              }"
            >
              {{ getBillStatus(bill) }}
            </span>
          </div>

          <div class="font-bold">
            {{ settingsStore.currencyLabel }} {{ bill.total_price }}
          </div>

          <div class="flex gap-2">
            <button
              class="bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-800"
              @click="openDetails(bill)"
            >
              Details
            </button>

            <button
              class="bg-white border rounded-lg px-3 py-2 hover:bg-gray-50"
              @click="printBill(bill)"
            >
              Print
            </button>
          </div>
        </div>

        <div v-if="filteredBills.length === 0" class="p-8 text-center text-gray-500">
          No bills found.
        </div>
      </div>
    </div>

    <div
      v-if="selectedBill"
      class="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4"
    >
      <div class="bg-white rounded-xl w-[560px] max-w-[96vw] max-h-[90vh] overflow-y-auto">
        <div class="bg-gray-900 text-white p-5 rounded-t-xl flex justify-between">
          <div>
            <h2 class="text-2xl font-bold">Bill #{{ selectedBill.id }}</h2>
            <p class="text-gray-300">Table {{ selectedBill.table_name }}</p>
          </div>

          <button class="text-2xl" @click="selectedBill = null">x</button>
        </div>

        <div class="p-5 space-y-4">
          <div class="divide-y">
            <div
              v-for="(item, index) in selectedBill.items"
              :key="index"
              class="flex justify-between py-2"
            >
              <span>{{ item.name }} x {{ item.quantity }}</span>
              <strong>{{ settingsStore.currencyLabel }} {{ itemTotal(item) }}</strong>
            </div>
          </div>

          <div class="border-t pt-4 space-y-2">
            <div class="flex justify-between">
              <span>Subtotal</span>
              <span>{{ settingsStore.currencyLabel }} {{ selectedBill.subtotal }}</span>
            </div>
            <div class="flex justify-between">
              <span>Tax</span>
              <span>{{ settingsStore.currencyLabel }} {{ selectedBill.tax_amount }}</span>
            </div>
            <div class="flex justify-between">
              <span>
                Discount
                <span v-if="selectedBill.coupon_code">
                  ({{ selectedBill.coupon_code }})
                </span>
              </span>
              <span>{{ settingsStore.currencyLabel }} {{ selectedBill.discount_amount || 0 }}</span>
            </div>
            <div class="flex justify-between text-xl font-bold border-t pt-2">
              <span>Total</span>
              <span>{{ settingsStore.currencyLabel }} {{ selectedBill.total_price }}</span>
            </div>
          </div>

          <select
            v-model="selectedPaymentMethod"
            class="w-full border rounded-lg px-3 py-3 bg-white"
          >
            <option
              v-for="option in paymentOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              class="bg-gray-900 text-white rounded-lg px-4 py-3"
              @click="printBill(selectedBill)"
            >
              Print
            </button>

            <button
              class="bg-green-500 text-white rounded-lg px-4 py-3 disabled:opacity-50"
              :disabled="getBillStatus(selectedBill) === 'paid'"
              @click="markPaid(selectedBill)"
            >
              Mark Paid
            </button>

            <button
              class="bg-red-500 text-white rounded-lg px-4 py-3 disabled:opacity-50"
              :disabled="getBillStatus(selectedBill) === 'cancelled'"
              @click="cancelBill(selectedBill)"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
