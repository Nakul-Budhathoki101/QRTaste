<script setup lang="ts">
import type { MenuItem } from "~/types/menu";

const menuStore = useMenuStore();
const toastStore = useToastStore();
const categoryStore = useCategoryStore();

const loading = ref(true);
const search = ref("");
const availabilityFilter = ref<"all" | "unlimited" | "limited" | "sold_out">(
  "all",
);
const selectedItem = ref<MenuItem | null>(null);
const availabilityMode = ref<"unlimited" | "limited">("unlimited");
const availableQuantity = ref(1);

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    menuStore.loadMenu(),
    menuStore.loadTodayAvailability(),
    categoryStore.loadCategories(),
    categoryStore.loadSubCategories(),
  ]);
  loading.value = false;
});

const getCategoryName = (categoryId: number) =>
  categoryStore.categories.find((category) => category.id === categoryId)?.name ||
  "-";

const getAvailabilityState = (item: MenuItem) => {
  const availability = menuStore.getTodayAvailability(item.id);
  if (!availability || availability.available_quantity === null) return "unlimited";
  if (availability.is_sold_out || (availability.remaining_quantity ?? 0) <= 0) {
    return "sold_out";
  }

  return "limited";
};

const getAvailabilityLabel = (item: MenuItem) => {
  const state = getAvailabilityState(item);
  const availability = menuStore.getTodayAvailability(item.id);

  if (state === "sold_out") return "Sold Out Today";
  if (state === "unlimited") return "Unlimited Today";

  return `${availability?.remaining_quantity ?? 0} remaining today`;
};

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase();

  return menuStore.menuItems.filter((item) => {
    const categoryName = getCategoryName(item.category_id).toLowerCase();
    const state = getAvailabilityState(item);
    const matchesSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      categoryName.includes(term);
    const matchesAvailability =
      availabilityFilter.value === "all" || state === availabilityFilter.value;

    return matchesSearch && matchesAvailability;
  });
});

const stats = computed(() => ({
  total: menuStore.menuItems.length,
  unlimited: menuStore.menuItems.filter(
    (item) => getAvailabilityState(item) === "unlimited",
  ).length,
  limited: menuStore.menuItems.filter(
    (item) => getAvailabilityState(item) === "limited",
  ).length,
  soldOut: menuStore.menuItems.filter(
    (item) => getAvailabilityState(item) === "sold_out",
  ).length,
}));

const openAvailabilityModal = (item: MenuItem) => {
  const availability = menuStore.getTodayAvailability(item.id);

  selectedItem.value = item;
  availabilityMode.value =
    availability?.available_quantity === null || !availability
      ? "unlimited"
      : "limited";
  availableQuantity.value =
    availability?.available_quantity ?? availability?.remaining_quantity ?? 1;
};

const saveAvailability = async () => {
  if (!selectedItem.value) return;

  const result = await menuStore.setTodayAvailability(
    selectedItem.value,
    availabilityMode.value === "unlimited" ? null : availableQuantity.value,
  );

  toastStore.open(result.message, result.success ? "success" : "error");
  if (result.success) selectedItem.value = null;
};

const markSoldOutToday = async (item: MenuItem) => {
  const result = await menuStore.setTodayAvailability(item, 0);
  toastStore.open(result.message, result.success ? "success" : "error");
};
</script>

<template>
  <div class="min-h-screen bg-gray-100 p-4">
    <div class="max-w-7xl mx-auto">
      <div class="mb-5">
        <NuxtLink to="/" class="bg-gray-700 text-white px-4 py-2 rounded-lg">
          Dashboard
        </NuxtLink>
      </div>

      <div class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-3xl font-bold">Today's Menu Availability</h1>
          <p class="text-gray-500 mt-1">
            Set limited servings for today. Items reset to unlimited tomorrow.
          </p>
        </div>

        <p class="bg-white rounded-lg px-4 py-2 shadow text-sm font-semibold">
          {{ menuStore.getServiceDate() }}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Menu Items</p>
          <p class="text-2xl font-bold">{{ stats.total }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Unlimited Today</p>
          <p class="text-2xl font-bold text-green-600">{{ stats.unlimited }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Limited Today</p>
          <p class="text-2xl font-bold text-amber-600">{{ stats.limited }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Sold Out Today</p>
          <p class="text-2xl font-bold text-red-600">{{ stats.soldOut }}</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            v-model="search"
            class="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Search item, category, or description"
          />

          <select
            v-model="availabilityFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All items</option>
            <option value="unlimited">Unlimited today</option>
            <option value="limited">Limited today</option>
            <option value="sold_out">Sold out today</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">Loading availability...</div>

      <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h2 class="text-xl font-bold">{{ item.name }}</h2>
            <p class="text-sm text-gray-500">
              {{ getCategoryName(item.category_id) }}
            </p>
            <div class="flex flex-wrap gap-2 mt-2">
              <span
                class="px-3 py-1 rounded-full text-sm font-bold text-white"
                :class="{
                  'bg-green-600': getAvailabilityState(item) === 'unlimited',
                  'bg-amber-500': getAvailabilityState(item) === 'limited',
                  'bg-red-600': getAvailabilityState(item) === 'sold_out',
                }"
              >
                {{ getAvailabilityLabel(item) }}
              </span>

              <span
                v-for="allergen in item.allergens"
                :key="`${item.id}-${allergen}`"
                class="bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm"
              >
                {{ allergen }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              class="px-4 py-2 rounded-lg bg-gray-900 text-white"
              @click="openAvailabilityModal(item)"
            >
              Set Limit
            </button>

            <button
              class="px-4 py-2 rounded-lg bg-red-600 text-white"
              @click="markSoldOutToday(item)"
            >
              Sold Out
            </button>
          </div>
        </div>

        <div
          v-if="filteredItems.length === 0"
          class="bg-white rounded-lg p-10 text-center text-gray-500 shadow xl:col-span-2"
        >
          No menu items found.
        </div>
      </div>
    </div>

    <div
      v-if="selectedItem"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-xl p-6 w-[420px] max-w-[96vw]">
        <h2 class="text-2xl font-bold mb-1">{{ selectedItem.name }}</h2>
        <p class="text-gray-500 mb-4">Set today's customer-order availability.</p>

        <div class="grid grid-cols-2 gap-2 mb-4">
          <button
            class="rounded-lg px-4 py-3 font-bold border"
            :class="availabilityMode === 'unlimited' ? 'bg-green-600 text-white' : 'bg-white'"
            @click="availabilityMode = 'unlimited'"
          >
            Unlimited
          </button>

          <button
            class="rounded-lg px-4 py-3 font-bold border"
            :class="availabilityMode === 'limited' ? 'bg-amber-500 text-white' : 'bg-white'"
            @click="availabilityMode = 'limited'"
          >
            Limited
          </button>
        </div>

        <div v-if="availabilityMode === 'limited'">
          <label class="block text-sm font-bold text-gray-700 mb-2">
            Servings Available Today
          </label>
          <input
            v-model.number="availableQuantity"
            type="number"
            min="0"
            class="w-full border rounded-lg p-3"
          />
        </div>

        <div class="flex justify-end gap-3 mt-5">
          <button
            class="bg-gray-200 px-4 py-2 rounded-lg"
            @click="selectedItem = null"
          >
            Cancel
          </button>

          <button
            class="bg-gray-900 text-white px-4 py-2 rounded-lg"
            @click="saveAvailability"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
