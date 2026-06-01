import { defineStore } from "pinia";

import type { OrderStatus, Order, OrderItem } from "~/types";

export const useOrderStore = defineStore("order", () => {
  const orders = ref<Order[]>([]);

  const createOrder = (order: Order) => {
    orders.value.unshift(order);
  };

  const updateStatus = (orderId: number, status: OrderStatus) => {
    const order = orders.value.find((o) => o.id === orderId);

    if (!order) return;

    order.status = status;
  };

  return {
    orders,
    createOrder,
    updateStatus,
  };
});
