import { defineStore } from 'pinia'

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'completed'

export interface OrderItem {
  id: number
  name: string
  price: number
  quantity: number
}

export interface Order {
  id: number
  tableName: string
  items: OrderItem[]
  totalPrice: number
  status: OrderStatus
  createdAt: string
}

export const useOrderStore =
  defineStore('order', {
    state: () => ({
      orders: [] as Order[]
    }),

    actions: {
      createOrder(order: Order) {
        this.orders.unshift(order)
      },

      updateStatus(
        orderId: number,
        status: OrderStatus
      ) {
        const order =
          this.orders.find(
            o => o.id === orderId
          )

        if (!order) return

        order.status = status
      }
    }
  })