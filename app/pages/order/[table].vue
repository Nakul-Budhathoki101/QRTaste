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
const showOrders = ref(false);
const showItemQuantity = ref(false);
const selectedItem = ref<MenuItem | null>(null);
const selectedQuantity = ref(1);

const tableName = String(route.params.table);

onMounted(async () => {
  await Promise.all([
    tableStore.loadTables(),
    menuStore.loadMenu(),
    categoryStore.loadCategories(),
    categoryStore.loadSubCategories(),
    orderStore.loadOrders(),
  ]);

  if (categoryStore.categories.length) {
    activeCategoryId.value = categoryStore.categories[0]?.id;
  }

  orderStore.subscribeOrders();
});

const tableData = computed(() =>
  tableStore.tables.find((table) => table.name === tableName),
);

const categories = computed(() => categoryStore.categories);

const activeSubCategories = computed(() => {
  if (!activeCategoryId.value) return [];

  return categoryStore.subCategories.filter(
    (sub) => sub.category_id === activeCategoryId.value,
  );
});

const menuItems = computed(() => menuStore.menuItems);

const normalizeItems = (items: OrderItem | OrderItem[] | null | undefined) => {
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
};

const myOrders = computed(() => {
  const orders = orderStore.orders.filter((order) => {
    if (order.table_name !== tableName) return false;
    if (order.is_billed) return false;

    if (tableData.value?.startTime) {
      return (
        new Date(order.created_at).getTime() >=
        new Date(tableData.value.startTime).getTime()
      );
    }

    return true;
  });

  return orders.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
});

const orderedItems = computed(() => {
  const itemMap = new Map<
    string,
    OrderItem & { lineTotal: number; statuses: Set<string> }
  >();

  for (const order of myOrders.value) {
    for (const item of normalizeItems(order.items)) {
      const key = `${item.menuItemId}-${item.name}-${item.price}`;
      const existing = itemMap.get(key);

      if (existing) {
        existing.quantity += item.quantity;
        existing.lineTotal = existing.price * existing.quantity;
        existing.statuses.add(order.status);
      } else {
        itemMap.set(key, {
          ...item,
          lineTotal: item.price * item.quantity,
          statuses: new Set([order.status]),
        });
      }
    }
  }

  return Array.from(itemMap.values());
});

const orderSubtotal = computed(() =>
  orderedItems.value.reduce((sum, item) => sum + item.lineTotal, 0),
);

const latestOrderPreview = computed(() => orderedItems.value.slice(0, 2));

const groupedMenu = computed(() => {
  const grouped: Record<number, MenuItem[]> = {};

  menuItems.value.forEach((item) => {
    const subCategoryId = item.sub_category_id;

    if (!grouped[subCategoryId]) {
      grouped[subCategoryId] = [];
    }

    grouped[subCategoryId].push(item);
  });

  return grouped;
});

const addItem = (item: MenuItem) => {
  selectedItem.value = item;
  selectedQuantity.value = 1;
  showItemQuantity.value = true;
};

const addItemFinal = async () => {
  if (!selectedItem.value) return;

  if (!tableData.value) {
    toastStore.open("This table does not exist", "error");
    return;
  }

  const currentOrder: OrderItem = {
    menuItemId: selectedItem.value.id,
    quantity: selectedQuantity.value,
    price: selectedItem.value.price,
    name: selectedItem.value.name,
  };

  const result = await orderStore.createOrder({
    table_id: tableData.value.id,
    table_name: tableData.value.name,
    items: currentOrder,
    total_price: selectedItem.value.price * selectedQuantity.value,
    status: "pending",
    is_billed: false,
    created_at: new Date().toISOString(),
  });

  toastStore.open(result.message, result.success ? "success" : "error");

  showItemQuantity.value = false;
  selectedItem.value = null;
  selectedQuantity.value = 1;
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 pb-24">
    <div class="sticky top-0 z-50 bg-white shadow-md">
      <div class="p-3 border-b">
        <p class="text-sm text-gray-500">Self Order</p>
        <h1 class="text-2xl font-bold">Table {{ tableName }}</h1>
      </div>

      <div class="flex gap-3 overflow-x-auto text-l p-2">
        <button
          v-for="category in categories"
          :key="category.id"
          class="py-2 px-3 rounded-full font-semibold transition-all duration-200 whitespace-nowrap"
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

    <div
      v-if="!tableData"
      class="m-4 bg-white rounded-xl p-6 text-center text-red-500 shadow"
    >
      This table does not exist.
    </div>

    <div
      v-for="sub in activeSubCategories"
      :key="sub.id"
      :id="String(sub.id)"
      class="mb-12"
    >
      <div class="sticky top-[122px] z-30 mb-4">
        <div
          class="inline-block bg-yellow-300 px-3 py-1 rounded-r-xl shadow-md font-bold text-small"
        >
          {{ sub.name }}
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 px-3">
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
              <span class="text-sm">No Image</span>
            </div>
          </div>

          <h2 class="text-2xl font-bold mt-4">
            {{ item.name }}
          </h2>

          <p class="text-gray-500 mt-2">
            {{ item.description }}
          </p>

          <div class="flex justify-between items-center mt-4">
            <span class="text-xl font-bold">JPY {{ item.price }}</span>

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

    <div class="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-2xl">
      <div
        class="max-w-3xl mx-auto p-3 flex items-center justify-between gap-3"
      >
        <div class="min-w-0">
          <p class="font-bold">My Orders: JPY {{ orderSubtotal }}</p>
          <p class="text-xs text-gray-500 truncate">
            <span v-if="latestOrderPreview.length">
              {{
                latestOrderPreview
                  .map((item) => `${item.name} x${item.quantity}`)
                  .join(" | ")
              }}
            </span>
            <span v-else>Tap View to see your current order list.</span>
          </p>
        </div>

        <button
          class="bg-gray-900 text-white px-4 py-2 rounded-xl whitespace-nowrap"
          @click="showOrders = true"
        >
          View Orders
        </button>
      </div>
    </div>
  </div>

  <div
    v-if="showOrders"
    class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
  >
    <div
      class="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:w-[520px] max-h-[82vh] overflow-hidden shadow-2xl"
    >
      <div class="p-5 border-b flex justify-between items-start">
        <div>
          <h2 class="text-2xl font-bold">My Ordered Items</h2>
          <p class="text-sm text-gray-500">
            {{ myOrders.length }} orders in this session
          </p>
        </div>

        <button class="text-2xl" @click="showOrders = false">x</button>
      </div>

      <div class="p-5 overflow-y-auto max-h-[56vh]">
        <div v-if="orderedItems.length" class="divide-y divide-gray-100">
          <div
            v-for="item in orderedItems"
            :key="`${item.menuItemId}-${item.name}`"
            class="flex justify-between gap-3 py-3"
          >
            <div>
              <p class="font-semibold">{{ item.name }} x{{ item.quantity }}</p>
              <p class="text-xs text-gray-500">
                {{ Array.from(item.statuses).join(", ") }}
              </p>
            </div>

            <p class="font-bold">JPY {{ item.lineTotal }}</p>
          </div>
        </div>

        <div v-else class="text-gray-500">
          Your ordered items will appear here after you add food or drinks.
        </div>
      </div>

      <div class="p-5 border-t flex justify-between items-center">
        <span class="text-gray-500">Current total</span>
        <span class="text-2xl font-bold">JPY {{ orderSubtotal }}</span>
      </div>
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
          Add
        </button>
      </div>
    </div>
  </div>
</template>
