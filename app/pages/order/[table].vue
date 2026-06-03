<script setup lang="ts">
import type { OrderItem } from "~/types";
import type { MenuItem } from "~/types/menu";

const route = useRoute();
const tableStore = useTableStore();
const orderStore = useOrderStore();
const menuStore = useMenuStore();
const toastStore = useToastStore();
const categoryStore = useCategoryStore();

const activeCategoryId = ref<number>();
const activeSubCategory = ref("");
const activeSubCategoryId = ref<number>();
const sectionRefs = ref<Record<string, HTMLElement>>({});

const showCart = ref(false);

onMounted(async () => {
  await Promise.all([
    tableStore.loadTables(),
    menuStore.loadMenu(),
    categoryStore.loadCategories(),
    categoryStore.loadSubCategories(),
  ]);

  if (categoryStore.categories.length) {
    activeCategoryId.value = categoryStore.categories[0]?.id;
  }
});

//table information
const tableName = route.params.table;
const tableData = computed(() => {
  return tableStore.tables.find((table) => table.name === tableName);
});

const categories = computed(() => categoryStore.categories);

const getCategoryName = (categoryId: number) =>
  categoryStore.categories.find((c) => c.id === categoryId)?.name ?? "-";

const getSubCategoryName = (subCategoryId: number) =>
  categoryStore.subCategories.find((s) => s.id === subCategoryId)?.name ?? "-";

const activeSubCategories = computed(() => {
  if (!activeCategoryId.value) return [];

  return categoryStore.subCategories.filter(
    (sub) => sub.category_id === activeCategoryId.value,
  );
});

const menuItems = computed(() => menuStore.menuItems);

const groupedMenu = computed(() => {
  const grouped: Record<number, MenuItem[]> = {};

  menuItems.value.forEach((item) => {
    const subCategoryId = item.sub_category_id;

    if (!grouped[subCategoryId]) {
      grouped[subCategoryId] = [];
    }

    const items = grouped[subCategoryId];

    items.push(item);
  });

  return grouped;
});

let observer: IntersectionObserver;

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

const addItemFinal = async () => {
  if (!selectedItem.value) return;
  if (!tableData.value) {
    toastStore.open("The Table Doesnot Exitst", "error");
    return;
  }

  const currentOrder: OrderItem = {
    menuItemId: selectedItem.value.id,
    quantity: selectedQuantity.value,
    price: selectedItem.value.price,
    name: selectedItem.value.name,
  };

  const result = await orderStore.createOrder({
    table_id: tableData.value?.id,
    table_name: tableData.value?.name,

    items: currentOrder,

    total_price: selectedItem.value.price * selectedQuantity.value,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  toastStore.open(result.message, result.success ? "success" : "error");

  showItemQuantity.value = false;
  selectedItem.value = null;
  selectedQuantity.value = 1;
};
</script>

<template>
  <!-- MAIN CATEGORY  -->
  <div class="sticky top-0 z-50 bg-white shadow-md p-2">
    <div class="flex gap-3 overflow-x-auto text-l">
      <button
        v-for="category in categories"
        :key="category.id"
        class="py-2 px-3 rounded-full font-semibold transition-all duration-200"
        :class="{
          'bg-blue-500 text-white shadow-lg': activeCategoryId === category.id,
          'bg-gray-100 hover:bg-gray-200': activeCategoryId !== category.id,
        }"
        @click="activeCategoryId = category.id"
      >
        {{ category.name }}
      </button>
    </div>
  </div>

  <!-- SUB CATEGORY -->
  <!-- <div class="sticky top-[72px] z-40 bg-white border-b shadow-sm">
    <div class="flex gap-2 overflow-x-auto px-3 py-2">
      <button
        v-for="sub in activeSubCategories"
        :key="sub.id"
        :id="String(sub.id)"
        class="px-4 py-2 rounded-full whitespace-nowrap transition-all"
        :class="{
          'bg-black text-white': activeSubCategoryId === sub.id,

          'bg-gray-100 hover:bg-gray-200': activeSubCategoryId !== sub.id,
        }"
        @click="scrollToSection(String(sub.id))"
      >
        {{ sub.name }}
      </button>
    </div>
  </div> -->

  <!-- MENU -->
  <div
    v-for="sub in activeSubCategories"
    :key="sub.id"
    :id="String(sub.id)"
    class="mb-12"
  >
    <div class="sticky top-[60px] z-30 mb-4">
      <div
        class="inline-block bg-yellow-300 px-3 py-1 rounded-r-xl shadow-md font-bold text-small"
      >
        📌 {{ sub.name }}
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="item in groupedMenu[sub.id]"
        :key="item.id"
        class="bg-white rounded-2xl p-4 shadow"
      >
        <div
          class="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden"
        >
          <img
            v-if="item.image_url"
            :src="item.image_url"
            class="w-full h-full object-cover"
          />

          <div v-else class="flex flex-col items-center text-gray-400">
            <span class="text-4xl"> 📷 </span>

            <span> No Image </span>
          </div>
        </div>

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

  <!-- QUANTITY CONFIRMATION -->
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
