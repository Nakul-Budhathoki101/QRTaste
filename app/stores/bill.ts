import { defineStore } from "pinia";
import type { TableBill, BillStatus } from "~/types";

export const useBillStore = defineStore("bill", () => {
  const bills = ref<TableBill[]>([]);

  const createBill = (bill: TableBill) => {
    bills.value.unshift(bill);
  };

  const updateStatus = (billId: number, status: BillStatus) => {
    const bill = bills.value.find((b) => b.id === billId);

    if (!bill) return;

    bill.status = status;

    if (status === "paid") {
      bill.paidAt = new Date().toISOString();
    }
  };

  const removeBill = (billId: number) => {
    bills.value = bills.value.filter((b) => b.id !== billId);
  };

  const getBillByTable = (tableId: number) => {
    return bills.value.find(
      (b) => b.tableId === tableId && b.status === "unpaid",
    );
  };

  const unpaidBills = computed(() =>
    bills.value.filter((b) => b.status === "unpaid"),
  );

  const paidBills = computed(() =>
    bills.value.filter((b) => b.status === "paid"),
  );

  const totalRevenue = computed(() => {
    return bills.value
      .filter((b) => b.status === "paid")
      .reduce((sum, bill) => sum + bill.total, 0);
  });

  return {
    bills,
    unpaidBills,
    paidBills,
    totalRevenue,

    createBill,
    updateStatus,
    removeBill,

    getBillByTable,
  };
});
