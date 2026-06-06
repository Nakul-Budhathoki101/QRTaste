import { defineStore } from "pinia";
import type { PaymentMethod, TableBill } from "~/types";
import { useSupabase } from "~/lib/supabase";

export const useBillStore = defineStore("bill", () => {
  const supabase = useSupabase();

  const bills = ref<TableBill[]>([]);

  const loadBills = async () => {
    const { data, error } = await supabase
      .from("table_bills")
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

  const createBill = async (
    bill: Omit<TableBill, "id" | "created_at" | "is_paid"> & {
      is_paid?: boolean;
    },
  ) => {
    const { error } = await supabase.from("table_bills").insert([
      {
        ...bill,
        is_paid: bill.is_paid ?? false,
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

  const markPaid = async (billId: number, paymentMethod: PaymentMethod) => {
    const { error } = await supabase
      .from("table_bills")
      .update({
        is_paid: true,
        payment_method: paymentMethod,
        paid_at: new Date().toISOString(),
      })
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
    const { error } = await supabase
      .from("table_bills")
      .delete()
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
      message: "Bill deleted successfully",
    };
  };

  const getBillById = (billId: number) =>
    bills.value.find((bill) => bill.id === billId) || null;

  const getBillsByTable = (tableName: string) =>
    bills.value.filter((bill) => bill.table_name === tableName);

  const unpaidBills = computed(() =>
    bills.value.filter((bill) => !bill.is_paid),
  );

  const paidBills = computed(() => bills.value.filter((bill) => bill.is_paid));

  const totalRevenue = computed(() =>
    paidBills.value.reduce((sum, bill) => sum + Number(bill.total_price), 0),
  );

  return {
    bills,
    unpaidBills,
    paidBills,
    totalRevenue,
    loadBills,
    createBill,
    markPaid,
    deleteBill,
    getBillById,
    getBillsByTable,
  };
});
