<script setup lang="ts">
import type { TableBill } from "~/types";

const billStore = useBillStore();
const toastStore = useToastStore();
const settingsStore = useSettingsStore();

const search = ref("");
const statusFilter = ref<"all" | "paid" | "unpaid">("all");

onMounted(async () => {
  settingsStore.loadSettings();
  const result = await billStore.loadBills();
  if (!result.success) toastStore.open(result.message, "error");
});

const filteredBills = computed(() => {
  const term = search.value.trim().toLowerCase();

  return billStore.bills.filter((bill) => {
    const matchesSearch =
      !term ||
      bill.table_name.toLowerCase().includes(term) ||
      String(bill.id).includes(term) ||
      bill.payment_method.toLowerCase().includes(term);

    const matchesStatus =
      statusFilter.value === "all" ||
      (statusFilter.value === "paid" && bill.is_paid) ||
      (statusFilter.value === "unpaid" && !bill.is_paid);

    return matchesSearch && matchesStatus;
  });
});

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
        <div class="row total"><span>Total</span><strong>${settingsStore.currencyLabel} ${bill.total_price}</strong></div>
        <div class="row"><span>Payment</span><span>${formatPayment(bill.payment_method)}</span></div>
        <div class="row"><span>Status</span><span>${bill.is_paid ? "Paid" : "Unpaid"}</span></div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
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

      <div
        class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6"
      >
        <div>
          <h1 class="text-3xl font-bold">Billing Management</h1>
          <p class="text-gray-500 mt-1">
            Review payments, totals, and printable receipts.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[560px]">
          <input
            v-model="search"
            class="border border-gray-300 rounded-lg px-3 py-2 sm:col-span-2"
            placeholder="Search table, bill ID, payment"
          />

          <select
            v-model="statusFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All bills</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Paid Revenue</p>
          <p class="text-2xl font-bold">
            {{ settingsStore.currencyLabel }} {{ billStore.totalRevenue }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Paid Bills</p>
          <p class="text-2xl font-bold">{{ billStore.paidBills.length }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Unpaid Bills</p>
          <p class="text-2xl font-bold">{{ billStore.unpaidBills.length }}</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow overflow-hidden">
        <div
          class="hidden md:grid grid-cols-[90px_1fr_130px_130px_130px_100px] gap-4 px-4 py-3 bg-gray-900 text-white font-bold"
        >
          <span>Bill</span>
          <span>Table / Date</span>
          <span>Payment</span>
          <span>Status</span>
          <span>Total</span>
          <span>Print</span>
        </div>

        <div
          v-for="bill in filteredBills"
          :key="bill.id"
          class="grid grid-cols-1 md:grid-cols-[90px_1fr_130px_130px_130px_100px] gap-3 md:gap-4 px-4 py-4 border-t items-center"
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
              class="px-3 py-1 rounded-full text-sm font-bold text-white"
              :class="bill.is_paid ? 'bg-green-500' : 'bg-amber-500'"
            >
              {{ bill.is_paid ? "Paid" : "Unpaid" }}
            </span>
          </div>

          <div class="font-bold">
            {{ settingsStore.currencyLabel }} {{ bill.total_price }}
          </div>

          <button
            class="bg-gray-900 text-white rounded-lg px-3 py-2 hover:bg-gray-800"
            @click="printBill(bill)"
          >
            Print
          </button>
        </div>

        <div v-if="filteredBills.length === 0" class="p-8 text-center text-gray-500">
          No bills found.
        </div>
      </div>
    </div>
  </div>
</template>
