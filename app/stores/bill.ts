import { defineStore } from "pinia";
import type { TableBill, BillStatus } from "~/types";
import { useSupabase } from "~/lib/supabase";

export const useBillStore = defineStore("bill", () => {
  const supabase = useSupabase();

  const bills = ref<TableBill[]>([]);

  const loadBills = async () => {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    bills.value = data || [];

    return {
      success: true,
      message: "Bills loaded successfully",
    };
  };

  const createBill = async (bill: Omit<TableBill, "id">) => {
    const { error } = await supabase.from("bills").insert([
      {
        table_id: bill.tableId,
        table_name: bill.tableName,
        items: bill.items,
        subtotal: bill.subtotal,
        tax: bill.tax,
        total: bill.total,
        status: bill.status,
        created_at: bill.createdAt,
        paid_at: bill.paidAt,
      },
    ]);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadBills();

    return {
      success: true,
      message: "Bill created successfully",
    };
  };

  const updateBillStatus = async (billId: number, status: BillStatus) => {
    const payload: Partial<TableBill> = {
      status,
    };

    if (status === "paid") {
      payload.paidAt = new Date().toISOString();
    }

    const { error } = await supabase
      .from("bills")
      .update(payload)
      .eq("id", billId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadBills();

    return {
      success: true,
      message: "Bill updated successfully",
    };
  };

  const deleteBill = async (billId: number) => {
    const { error } = await supabase.from("bills").delete().eq("id", billId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadBills();

    return {
      success: true,
      message: "Bill deleted successfully",
    };
  };

  const getBillById = (billId: number) => {
    return bills.value.find((bill) => bill.id === billId) || null;
  };

  const getBillByTableId = (tableId: number) => {
    return (
      bills.value.find(
        (bill) => bill.tableId === tableId && bill.status === "unpaid",
      ) || null
    );
  };

  const getBillsByTableId = (tableId: number) => {
    return bills.value.filter((bill) => bill.tableId === tableId);
  };

  const unpaidBills = computed(() =>
    bills.value.filter((bill) => bill.status === "unpaid"),
  );

  const paidBills = computed(() =>
    bills.value.filter((bill) => bill.status === "paid"),
  );

  const totalRevenue = computed(() =>
    paidBills.value.reduce((sum, bill) => sum + bill.total, 0),
  );

  return {
    bills,

    unpaidBills,
    paidBills,
    totalRevenue,

    loadBills,

    createBill,
    updateBillStatus,
    deleteBill,

    getBillById,
    getBillByTableId,
    getBillsByTableId,
  };
});
