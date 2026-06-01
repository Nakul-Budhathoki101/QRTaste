import { defineStore } from "pinia";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export const useCartStore = defineStore("cart", () => {
  const items = ref<CartItem[]>([]);

  const totalPrice = computed(() => {
    return items.value.reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
  });

  const addItem = (item: Omit<CartItem, "quantity">) => {
    const existingItem = items.value.find((i) => i.id === item.id);

    if (existingItem) {
      existingItem.quantity++;
      return;
    }

    items.value.push({
      ...item,
      quantity: 1,
    });
  };

  const decreaseItem = (itemId: number) => {
    const item = items.value.find((i) => i.id === itemId);

    if (!item) return;

    item.quantity--;

    if (item.quantity <= 0) {
      items.value = items.value.filter((i) => i.id !== itemId);
    }
  };

  const clearCart = () => {
    items.value = [];
  };

  return {
    items,

    totalPrice,

    addItem,
    decreaseItem,
    clearCart,
  };
});
