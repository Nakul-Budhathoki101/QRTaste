<script setup lang="ts">
import { useTableStore } from "#imports";
import { useCartStore } from "#imports";
import { useOrderStore } from "~/stores/order";
import { useSupabase } from "~/lib/supabase";

import { MENU_CATEGORIES } from "~/constants/menuCategories";
import type { MenuItem } from "~/types/menu";

const menuItems = ref<MenuItem[]>([]);

const tableStore = useTableStore();
const cartStore = useCartStore();
const orderStore = useOrderStore();
const supabase = useSupabase();

const route = useRoute();

const tableName = route.params.table;
const showCart = ref(false);

const tableData = tableStore.tables.find((table) => table.name === tableName);

const activeMainCategory = ref<MainCategory>("Food");

type MainCategory = keyof typeof MENU_CATEGORIES;
const mainCategories = Object.keys(MENU_CATEGORIES) as MainCategory[];

const changeActiveMainCategory = (name: MainCategory) => {
  activeMainCategory.value = name;
};

const activeSubCategory = ref("");
const sectionRefs = ref<Record<string, HTMLElement>>({});

const groupedMenu = computed(() => {
  const grouped: Record<string, Record<string, MenuItem[]>> = {};

  menuItems.value.forEach((item) => {
    const mainCategory = item.main_category;
    const subCategory = item.sub_category;

    if (!grouped[mainCategory]) {
      grouped[mainCategory] = {};
    }

    const categoryGroup = grouped[mainCategory];

    if (!categoryGroup[subCategory]) {
      categoryGroup[subCategory] = [];
    }

    categoryGroup[subCategory].push(item);
  });

  return grouped[activeMainCategory.value] ?? {};
});

const loadMenu = async () => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error(error);
    return;
  }

  menuItems.value = data || [];
};

onMounted(async () => {
  await loadMenu();

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);

      if (visible) {
        activeSubCategory.value = visible.target.id;
      }
    },
    {
      threshold: 0.3,
    },
  );

  Object.values(sectionRefs.value).forEach((el) => observer.observe(el));
});

const submitOrder = async () => {
  if (!cartStore.items.length) return;

  const { error } = await supabase.from("orders").insert([
    {
      table_name: String(tableName),

      items: cartStore.items,

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

const scrollToSection = (sub: string) => {
  document.getElementById(sub)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

const showItemQuantity = ref(false);

const selectedItem = ref<MenuItem | null>(null);

const selectedQuantity = ref(1);

const addItem = (item: MenuItem) => {
  selectedItem.value = item;
  selectedQuantity.value = 1;
  showItemQuantity.value = true;
};

const addItemFinal = () => {
  if (!selectedItem.value) return;

  for (let i = 0; i < selectedQuantity.value; i++) {
    cartStore.addItem(selectedItem.value);
  }

  showSuccessToast(
    `${selectedQuantity.value} × ${selectedItem.value.name}  order have been placed !! `
  );

  

  showItemQuantity.value = false;
  selectedItem.value = null;
  selectedQuantity.value = 1;
};

const showToast = ref(false);

const toastMessage = ref("");

const toastType = ref<"success" | "error" | "info">(
  "success"
);

const showSuccessToast = (message: string) => {
  toastMessage.value = message;
  toastType.value = "success";
  showToast.value = true;

  setTimeout(() => {
    showToast.value = false;
  }, 2500);
};
</script>

<template>
  <!-- MAIN CATEGORY  -->
  <div
    class="flex flex-row justify-between sticky top-0z-50 flex border-b text-2xl"
  >
    <button
      v-for="category in mainCategories"
      :key="category"
      class="flex-1 bg-blue-500 text-white hover:bg-sky-700 mx-2 py-2 rounded"
      @click="changeActiveMainCategory(category)"
    >
      {{ category }}
    </button>
  </div>
  <!-- SUB CATEGORY -->
  <div class="sticky top-0z-50 bg-white z-40 flex gap-2 overflow-x-auto p-2">
    <button
      v-for="sub in MENU_CATEGORIES[activeMainCategory]"
      :key="sub"
      class="px-4 py-2 rounded-full"
      :class="{
        'bg-black text-white': activeSubCategory === sub,
        'bg-gray-100': activeSubCategory !== sub,
      }"
      @click="scrollToSection(sub)"
    >
      {{ sub }}
    </button>
  </div>

  <!-- MENU -->
  <div
    v-for="sub in MENU_CATEGORIES[activeMainCategory]"
    :key="sub"
    :id="sub"
    class="mb-12"
  >
    <h2 class="text-xl font-bold mb-4">
      {{ sub }}
    </h2>

    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="item in groupedMenu[sub]"
        :key="item.id"
        class="bg-white rounded-2xl p-4 shadow"
      >
        <img
          :src="item.image_url ?? ''"
          class="w-full h-40 object-cover rounded-xl"
        />

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
            @click="addItem(item)"
          >
            Add
          </button>
        </div>
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

  <div
    v-if="showItemQuantity"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-2xl p-6 w-[350px] shadow-xl">
      <h2 class="text-2xl font-bold mb-4">
        {{ selectedItem?.name }}
      </h2>

      <p class="text-gray-500 mb-4">Select quantity</p>

      <div class="flex items-center justify-center gap-4 mb-6">
        <button
          class="w-10 h-10 rounded-full bg-gray-200"
          @click="selectedQuantity = Math.max(1, selectedQuantity - 1)"
        >
          -
        </button>

        <span class="text-2xl font-bold">
          {{ selectedQuantity }}
        </span>

        <button
          class="w-10 h-10 rounded-full bg-black text-white"
          @click="selectedQuantity++"
        >
          +
        </button>
      </div>

      <div class="flex gap-3">
        <button
          class="flex-1 border rounded-xl py-3"
          @click="showItemQuantity = false"
        >
          Cancel
        </button>

        <button
          class="flex-1 bg-green-500 text-white rounded-xl py-3 font-bold"
          @click="addItemFinal"
        >
          ADD
        </button>
      </div>
    </div>
  </div>

</template>
