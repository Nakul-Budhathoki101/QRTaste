import { defineStore } from "pinia";

import { useSupabase } from "~/lib/supabase";

import type { Order, OrderStatus } from "~/types";

export const useOrderStore = defineStore("order", () => {
  const supabase = useSupabase();

  const orders = ref<Order[]>([]);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    orders.value = data || [];

    return {
      success: true,
      message: "Orders loaded successfully",
    };
  };

  const createOrder = async (order: Omit<Order, "id">) => {
    const { error } = await supabase.from("orders").insert([order]);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadOrders();

    return {
      success: true,
      message: "Order created successfully",
    };
  };

  const updateStatus = async (orderId: number, status: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({
        status,
      })
      .eq("id", orderId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadOrders();

    return {
      success: true,
      message: "Order updated successfully",
    };
  };

  const deleteOrder = async (orderId: number) => {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) {
      console.error(error);

      return {
        success: false,
        message: error.message,
      };
    }

    await loadOrders();

    return {
      success: true,
      message: "Order deleted successfully",
    };
  };

  const getOrderById = (orderId: number) => {
    return orders.value.find((order) => order.id === orderId) || null;
  };

  const getOrdersByTableId = (tableId: number) => {
    return orders.value.filter((order) => order.table_id === tableId);
  };

  const pendingOrders = computed(() =>
    orders.value.filter((order) => order.status === "pending"),
  );

  const preparingOrders = computed(() =>
    orders.value.filter((order) => order.status === "preparing"),
  );

  const completedOrders = computed(() =>
    orders.value.filter((order) => order.status === "completed"),
  );

  const subscribeOrders = () => {
    supabase
      .channel("orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        async () => {
          await loadOrders();
        },
      )
      .subscribe();
  };

  return {
    orders,

    pendingOrders,
    preparingOrders,
    completedOrders,

    loadOrders,

    createOrder,
    updateStatus,
    deleteOrder,
    subscribeOrders,

    getOrderById,
    getOrdersByTableId,
  };
});
