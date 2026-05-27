<script setup lang="ts">
import { useTableStore } from "#imports";
import { useCartStore } from "#imports";

const tableStore = useTableStore();
const cartStore = useCartStore();

const route = useRoute();

const tableName = route.params.table;

const tableData = tableStore.tables.find((table) => table.name === tableName);

const isInvalidTable = !tableData || tableData.status !== "occupied";

const menuItems = [
  {
    id: 1,
    name: "Ramen",
    description: "Delicious Japanese ramen.",
    price: 1200,
    image: "https://picsum.photos/300/200",
  },

  {
    id: 2,
    name: "Sushi",
    description: "Fresh sushi platter.",
    price: 1800,
    image: "https://picsum.photos/301/200",
  },

  {
    id: 3,
    name: "Gyoza",
    description: "Crispy fried dumplings.",
    price: 700,
    image: "https://picsum.photos/302/200",
  },
];
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
  <div
    class="fixed bottom-4 right-4 bg-white rounded-2xl shadow-2xl p-6 w-[350px]"
  >
    <h2 class="text-2xl font-bold mb-4">🛒 Cart</h2>

    <!-- EMPTY -->
    <div v-if="cartStore.items.length === 0" class="text-gray-400">
      Cart is empty
    </div>

    <!-- ITEMS -->
    <div
      v-for="item in cartStore.items"
      :key="item.id"
      class="flex justify-between items-center mb-3"
    >
      <div>
        <div class="font-bold">
          {{ item.name }}
        </div>

        <div class="text-sm text-gray-500">¥{{ item.price }}</div>
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
    <div class="border-t pt-4 mt-4 flex justify-between font-bold text-xl">
      <span>Total</span>

      <span> ¥{{ cartStore.totalPrice }} </span>
    </div>

    <!-- SUBMIT -->
    <button
      class="w-full mt-6 bg-green-500 text-white py-3 rounded-xl font-bold"
    >
      Submit Order
    </button>
  </div>
</template>
