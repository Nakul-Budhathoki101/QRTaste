import { defineStore } from 'pinia'

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

export const useCartStore = defineStore(
  'cart',
  {
    state: () => ({
      items: [] as CartItem[]
    }),

    getters: {
      totalPrice: state => {
        return state.items.reduce(
          (total, item) =>
            total +
            item.price * item.quantity,
          0
        )
      }
    },

    actions: {
      addItem(item: Omit<CartItem, 'quantity'>) {
        const existingItem =
          this.items.find(
            i => i.id === item.id
          )

        if (existingItem) {
          existingItem.quantity++
          return
        }

        this.items.push({
          ...item,
          quantity: 1
        })
      },

      decreaseItem(itemId: number) {
        const item = this.items.find(
          i => i.id === itemId
        )

        if (!item) return

        item.quantity--

        if (item.quantity <= 0) {
          this.items =
            this.items.filter(
              i => i.id !== itemId
            )
        }
      },

      clearCart() {
        this.items = []
      }
    }
  }
)