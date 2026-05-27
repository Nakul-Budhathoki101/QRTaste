<script setup lang="ts">
import { useTableStore } from "#imports";
import { useCartStore } from "#imports";
import { useOrderStore } from "~/stores/order";
import { useSupabase } from "~/lib/supabase";

import menuItems from "~/data/menu.json";

const tableStore = useTableStore();
const cartStore = useCartStore();
const orderStore = useOrderStore();
const supabase = useSupabase();

const route = useRoute();

const tableName = route.params.table;
const showCart = ref(false);

const tableData = tableStore.tables.find((table) => table.name === tableName);

const submitOrder = async () => {
  if (!cartStore.items.length) return;

  const { error } = await supabase.from("orders").insert([
    {
      table_name: String(tableName),

      items: cartStore.items,

      total_price: cartStore.totalPrice,

      status: "pending",
    },
  ]);

  if (error) {
    console.error(error);
    return;
  }

  cartStore.clearCart();

  showCart.value = false;

  alert("Order submitted!");
};
</script>

<template>
  <!-- MENU -->

  <div class="grid grid-cols-2 gap-4">
    <div
      v-for="item in menuItems"
      :key="item.id"
      class="bg-white rounded-2xl p-4 shadow"
    >
      <img :src="item.image" class="w-full h-40 object-cover rounded-xl" />

      <h2 class="text-2xl font-bold mt-4">
        {{ item.name }}
      </h2>

      <p class="text-gray-500 mt-2">
        {{ item.description }}
      </p>

      <div class="flex justify-between items-center mt-4">
        <span class="text-xl font-bold"> ¥{{ item.price }} </span>

        <button
          class="bg-black text-white px-4 py-2 rounded-xl"
          @click="cartStore.addItem(item)"
        >
          Add
        </button>
      </div>
    </div>
  </div>

  <!-- CART -->
  <!-- FLOATING CART -->
  <button
    class="fixed bottom-6 right-6 bg-black text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-2xl"
    @click="showCart = true"
  >
    🛒

    <!-- BADGE -->
    <div
      v-if="cartStore.items.length"
      class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold"
    >
      {{ cartStore.items.reduce((total, item) => total + item.quantity, 0) }}
    </div>
  </button>

  <!-- CART MODAL -->
  <div v-if="showCart" class="fixed inset-0 bg-black/40 flex justify-end">
    <div class="bg-white w-[400px] h-full p-6 overflow-y-auto">
      <!-- HEADER -->
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-3xl font-bold">🛒 Cart</h2>

        <button class="text-2xl" @click="showCart = false">✕</button>
      </div>

      <!-- EMPTY -->
      <div v-if="cartStore.items.length === 0" class="text-gray-400">
        Cart is empty
      </div>

      <!-- ITEMS -->
      <div
        v-for="item in cartStore.items"
        :key="item.id"
        class="flex justify-between items-center mb-4 border-b pb-4"
      >
        <div>
          <div class="font-bold">
            {{ item.name }}
          </div>

          <div class="text-gray-500">¥{{ item.price }}</div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="bg-gray-200 w-8 h-8 rounded-full"
            @click="cartStore.decreaseItem(item.id)"
          >
            -
          </button>

          <span>
            {{ item.quantity }}
          </span>

          <button
            class="bg-black text-white w-8 h-8 rounded-full"
            @click="cartStore.addItem(item)"
          >
            +
          </button>
        </div>
      </div>

      <!-- TOTAL -->
      <div class="mt-6 pt-6 border-t flex justify-between text-2xl font-bold">
        <span>Total</span>

        <span> ¥{{ cartStore.totalPrice }} </span>
      </div>

      <!-- ORDER BUTTON -->
      <button
        class="w-full mt-6 bg-green-500 text-white py-4 rounded-2xl text-xl font-bold"
        @click="submitOrder"
      >
        Submit Order
      </button>
    </div>
  </div>
</template>
