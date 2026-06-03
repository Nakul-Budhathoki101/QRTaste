<script setup lang="ts">
import type { OrderItem } from "~/types";
import type { MenuItem } from "~/types/menu";
import { useSupabase } from "~/lib/supabase";

const route = useRoute();
const tableStore = useTableStore();
const orderStore = useOrderStore();
const menuStore = useMenuStore();
const toastStore = useToastStore();
const categoryStore = useCategoryStore();
const supabase = useSupabase();

const activeCategoryId = ref<number>();
const activeSubCategory = ref("");
const activeSubCategoryId = ref<number>();
const sectionRefs = ref<Record<string, HTMLElement>>({});

const showCart = ref(false);
const showMyOrders = ref(false);

// Table orders for the customer
const tableOrders = ref<any[]>([]);
const loadingOrders = ref(false);

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

  // Load orders for this table
  await fetchTableOrders();

  // Subscribe to realtime order updates for this table
  supabase
    .channel(`customer-orders-${tableName}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
      },
      async () => {
        await fetchTableOrders();
      },
    )
    .subscribe();
});

const fetchTableOrders = async () => {
  loadingOrders.value = true;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("table_name", tableName)
    .order("created_at", { ascending: false });

  if (!error) {
    tableOrders.value = data || [];
  }

  loadingOrders.value = false;
};

const activeOrders = computed(() =>
  tableOrders.value.filter((o) => o.status !== "completed"),
);

const completedOrders = computed(() =>
  tableOrders.value.filter((o) => o.status === "completed"),
);

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "preparing":
      return "bg-blue-100 text-blue-700";
    case "completed":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return "⏳";
    case "preparing":
      return "🍳";
    case "completed":
      return "✅";
    default:
      return "📋";
  }
};

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

  <!-- FLOATING MY ORDERS BUTTON -->
  <button
    v-if="tableOrders.length > 0"
    class="fixed bottom-6 right-6 z-40 bg-black text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95"
    @click="showMyOrders = true"
  >
    📋 My Orders

    <span
      v-if="activeOrders.length > 0"
      class="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
    >
      {{ activeOrders.length }}
    </span>
  </button>

  <!-- MY ORDERS PANEL -->
  <div
    v-if="showMyOrders"
    class="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
    @click.self="showMyOrders = false"
  >
    <div
      class="bg-white w-full max-w-lg rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col overflow-hidden animate-slide-up"
    >
      <!-- Panel Header -->
      <div class="bg-gray-900 text-white p-5 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold">📋 My Orders</h2>
          <p class="text-gray-400 text-sm mt-1">{{ tableOrders.length }} total orders</p>
        </div>

        <button
          class="text-gray-400 hover:text-white text-2xl"
          @click="showMyOrders = false"
        >
          ✕
        </button>
      </div>

      <!-- Panel Body -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Active Orders -->
        <div v-if="activeOrders.length > 0" class="mb-6">
          <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">Active</h3>

          <div class="space-y-3">
            <div
              v-for="order in activeOrders"
              :key="order.id"
              class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <p class="font-bold text-lg">{{ order.items?.name }}</p>
                  <p class="text-gray-500 text-sm">
                    x{{ order.items?.quantity }} · ¥{{ order.total_price }}
                  </p>
                </div>

                <span
                  class="px-3 py-1 rounded-full text-xs font-bold"
                  :class="getStatusColor(order.status)"
                >
                  {{ getStatusIcon(order.status) }} {{ order.status }}
                </span>
              </div>

              <p class="text-gray-400 text-xs mt-2">
                {{ new Date(order.created_at).toLocaleTimeString() }}
              </p>
            </div>
          </div>
        </div>

        <!-- Completed Orders -->
        <div v-if="completedOrders.length > 0">
          <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">Completed</h3>

          <div class="space-y-3">
            <div
              v-for="order in completedOrders"
              :key="order.id"
              class="bg-gray-50 border border-gray-100 rounded-xl p-4"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <p class="font-medium text-gray-600">{{ order.items?.name }}</p>
                  <p class="text-gray-400 text-sm">
                    x{{ order.items?.quantity }} · ¥{{ order.total_price }}
                  </p>
                </div>

                <span
                  class="px-3 py-1 rounded-full text-xs font-bold"
                  :class="getStatusColor(order.status)"
                >
                  {{ getStatusIcon(order.status) }} {{ order.status }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div
          v-if="tableOrders.length === 0"
          class="text-center py-12 text-gray-400"
        >
          <p class="text-4xl mb-3">🍽️</p>
          <p>No orders yet. Browse the menu above!</p>
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

<style>
  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
</style>
