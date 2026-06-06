<script setup lang="ts">
import type { MenuItem } from "~/types/menu";

const menuStore = useMenuStore();
const toastStore = useToastStore();
const confirmStore = useConfirmStore();
const categoryStore = useCategoryStore();
const settingsStore = useSettingsStore();

const loading = ref(true);
const showAddModal = ref(false);
const showEditModal = ref(false);
const selectedMenuItem = ref<MenuItem | null>(null);

const search = ref("");
const categoryFilter = ref<number | "all">("all");
const subCategoryFilter = ref<number | "all">("all");
const priceFilter = ref<"all" | "low" | "mid" | "high">("all");

const createDefaultItem = () => ({
  name: "",
  description: "",
  price: 0,
  image_url: "",
  category_id: undefined as number | undefined,
  sub_category_id: undefined as number | undefined,
});

const newItem = ref(createDefaultItem());

onMounted(async () => {
  settingsStore.loadSettings();
  loading.value = true;
  await Promise.all([
    menuStore.loadMenu(),
    categoryStore.loadCategories(),
    categoryStore.loadSubCategories(),
  ]);
  loading.value = false;
});

const addSubCategories = computed(() => {
  if (!newItem.value.category_id) return [];

  return categoryStore.subCategories.filter(
    (sub) => sub.category_id === newItem.value.category_id,
  );
});

const editSubCategories = computed(() => {
  if (!selectedMenuItem.value?.category_id) return [];

  return categoryStore.subCategories.filter(
    (sub) => sub.category_id === Number(selectedMenuItem.value?.category_id),
  );
});

const getCategoryName = (categoryId: number) =>
  categoryStore.categories.find((c) => c.id === categoryId)?.name || "-";

const getSubCategoryName = (subCategoryId: number) =>
  categoryStore.subCategories.find((s) => s.id === subCategoryId)?.name || "-";

const filteredMenuItems = computed(() => {
  const term = search.value.trim().toLowerCase();

  return menuStore.menuItems.filter((item) => {
    const categoryName = getCategoryName(item.category_id).toLowerCase();
    const subCategoryName = getSubCategoryName(item.sub_category_id).toLowerCase();
    const matchesSearch =
      !term ||
      item.name.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      categoryName.includes(term) ||
      subCategoryName.includes(term);

    const matchesCategory =
      categoryFilter.value === "all" || item.category_id === categoryFilter.value;

    const matchesSubCategory =
      subCategoryFilter.value === "all" ||
      item.sub_category_id === subCategoryFilter.value;

    const matchesPrice =
      priceFilter.value === "all" ||
      (priceFilter.value === "low" && item.price < 500) ||
      (priceFilter.value === "mid" && item.price >= 500 && item.price < 1500) ||
      (priceFilter.value === "high" && item.price >= 1500);

    return matchesSearch && matchesCategory && matchesSubCategory && matchesPrice;
  });
});

const visibleSubCategories = computed(() => {
  if (categoryFilter.value === "all") return categoryStore.subCategories;

  return categoryStore.subCategories.filter(
    (sub) => sub.category_id === categoryFilter.value,
  );
});

watch(categoryFilter, () => {
  subCategoryFilter.value = "all";
});

const openEditModal = (item: MenuItem) => {
  selectedMenuItem.value = { ...item };
  showEditModal.value = true;
};

const validateMenuItem = (item: {
  name: string;
  price: number;
  category_id?: number;
  sub_category_id?: number;
}) => {
  if (!item.name.trim()) return "Menu item name is required";
  if (item.price < 0) return "Price cannot be negative";
  if (!item.category_id) return "Please select a category";
  if (!item.sub_category_id) return "Please select a sub category";
  return "";
};

const createMenuItem = async () => {
  const validationError = validateMenuItem(newItem.value);
  if (validationError) {
    toastStore.open(validationError, "error");
    return;
  }

  const exists = menuStore.menuItems.some(
    (item) =>
      item.name.toLowerCase() === newItem.value.name.trim().toLowerCase(),
  );
  if (exists) {
    toastStore.open("Menu item already exists", "error");
    return;
  }

  const result = await menuStore.createMenuItem({
    name: newItem.value.name.trim(),
    description: newItem.value.description,
    price: newItem.value.price,
    image_url: newItem.value.image_url,
    category_id: newItem.value.category_id!,
    sub_category_id: newItem.value.sub_category_id!,
  });

  toastStore.open(result.message, result.success ? "success" : "error");

  if (!result.success) return;

  showAddModal.value = false;
  newItem.value = createDefaultItem();
};

const updateMenuItem = async () => {
  if (!selectedMenuItem.value) return;

  const validationError = validateMenuItem(selectedMenuItem.value);
  if (validationError) {
    toastStore.open(validationError, "error");
    return;
  }

  const result = await menuStore.updateMenuItem({
    ...selectedMenuItem.value,
    name: selectedMenuItem.value.name.trim(),
  });
  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) showEditModal.value = false;
};

const deleteMenuItem = async (id: number) => {
  const item = menuStore.menuItems.find((x) => x.id === id);
  if (!item) {
    toastStore.open("Menu item not found", "error");
    return;
  }

  const confirmed = await confirmStore.confirm({
    title: "Delete Menu Item",
    message: `Delete "${item.name}" ?`,
  });
  if (!confirmed) return;

  const result = await menuStore.removeMenuItem(id);
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

      <div
        class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6"
      >
        <div>
          <h1 class="text-3xl font-bold">Menu Management</h1>
          <p class="text-gray-500 mt-1">
            Search, filter, price, and organize customer-facing menu items.
          </p>
        </div>

        <button
          class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
          @click="showAddModal = true"
        >
          Add Item
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Total Items</p>
          <p class="text-2xl font-bold">{{ menuStore.menuItems.length }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Visible Results</p>
          <p class="text-2xl font-bold">{{ filteredMenuItems.length }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Categories</p>
          <p class="text-2xl font-bold">{{ categoryStore.categories.length }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Sub Categories</p>
          <p class="text-2xl font-bold">{{ categoryStore.subCategories.length }}</p>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            v-model="search"
            class="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="Search item, category, description"
          />

          <select
            v-model="categoryFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All categories</option>
            <option
              v-for="category in categoryStore.categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>

          <select
            v-model="subCategoryFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All sub categories</option>
            <option
              v-for="sub in visibleSubCategories"
              :key="sub.id"
              :value="sub.id"
            >
              {{ sub.name }}
            </option>
          </select>

          <select
            v-model="priceFilter"
            class="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="all">All prices</option>
            <option value="low">Under 500</option>
            <option value="mid">500 to 1499</option>
            <option value="high">1500 and up</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">Loading menu...</div>

      <div
        v-else-if="filteredMenuItems.length === 0"
        class="text-center py-12 text-gray-500 bg-white rounded-lg"
      >
        No menu items found.
      </div>

      <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div
          v-for="item in filteredMenuItems"
          :key="item.id"
          class="bg-white shadow rounded-lg p-4"
        >
          <div class="flex flex-col md:flex-row gap-4">
            <div
              class="w-full md:w-28 h-28 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0"
            >
              <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.name"
                class="w-full h-full object-cover"
              />

              <span v-else class="text-sm text-gray-400">No image</span>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h2 class="font-bold text-2xl">{{ item.name }}</h2>
                  <p class="text-gray-500 mt-1 line-clamp-2">
                    {{ item.description || "No description" }}
                  </p>
                </div>

                <p class="font-bold text-green-600 text-xl whitespace-nowrap">
                  {{ settingsStore.currencyLabel }} {{ item.price }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2 mt-4 text-sm">
                <span class="bg-gray-100 px-3 py-1 rounded-full">
                  {{ getCategoryName(item.category_id) }}
                </span>

                <span class="bg-gray-100 px-3 py-1 rounded-full">
                  {{ getSubCategoryName(item.sub_category_id) }}
                </span>
              </div>

              <div class="flex justify-end gap-2 mt-4">
                <button
                  class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                  @click="openEditModal(item)"
                >
                  Edit
                </button>

                <button
                  class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
                  @click="deleteMenuItem(item.id)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="showEditModal && selectedMenuItem"
        class="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      >
        <div class="bg-white p-6 rounded-xl w-[520px] max-w-[94vw]">
          <h2 class="text-2xl font-bold mb-4">Edit Menu Item</h2>

          <input
            v-model="selectedMenuItem.name"
            placeholder="Name"
            class="w-full border rounded-lg p-3 mb-3"
          />

          <textarea
            v-model="selectedMenuItem.description"
            placeholder="Description"
            class="w-full border rounded-lg p-3 mb-3"
          />

          <input
            v-model.number="selectedMenuItem.price"
            type="number"
            min="0"
            placeholder="Price"
            class="w-full border rounded-lg p-3 mb-3"
          />

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            v-model="selectedMenuItem.category_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-3 mb-3"
          >
            <option
              v-for="category in categoryStore.categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Sub Category
          </label>
          <select
            v-model="selectedMenuItem.sub_category_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-3 mb-3"
          >
            <option v-for="sub in editSubCategories" :key="sub.id" :value="sub.id">
              {{ sub.name }}
            </option>
          </select>

          <input
            v-model="selectedMenuItem.image_url"
            placeholder="Image URL"
            class="w-full border rounded-lg p-3 mb-4"
          />

          <div class="flex justify-end gap-3">
            <button
              class="bg-gray-200 px-4 py-2 rounded-lg"
              @click="showEditModal = false"
            >
              Cancel
            </button>

            <button
              class="bg-blue-500 text-white px-4 py-2 rounded-lg"
              @click="updateMenuItem"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showAddModal"
        class="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
      >
        <div class="bg-white p-6 rounded-xl w-[520px] max-w-[94vw]">
          <h2 class="text-2xl font-bold mb-4">Add Menu Item</h2>

          <input
            v-model="newItem.name"
            placeholder="Name"
            class="w-full border rounded-lg p-3 mb-3"
          />

          <textarea
            v-model="newItem.description"
            placeholder="Description"
            class="w-full border rounded-lg p-3 mb-3"
          />

          <input
            v-model.number="newItem.price"
            type="number"
            min="0"
            placeholder="Price"
            class="w-full border rounded-lg p-3 mb-3"
          />

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            v-model="newItem.category_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-3 mb-3"
          >
            <option disabled :value="undefined">Select Category</option>
            <option
              v-for="category in categoryStore.categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>

          <label class="block text-sm font-medium text-gray-700 mb-2">
            Sub Category
          </label>
          <select
            v-model="newItem.sub_category_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-3 mb-3"
          >
            <option disabled :value="undefined">Select Sub Category</option>
            <option v-for="sub in addSubCategories" :key="sub.id" :value="sub.id">
              {{ sub.name }}
            </option>
          </select>

          <input
            v-model="newItem.image_url"
            placeholder="Image URL"
            class="w-full border rounded-lg p-3 mb-4"
          />

          <div class="flex justify-end gap-3">
            <button
              class="bg-gray-200 px-4 py-2 rounded-lg"
              @click="showAddModal = false"
            >
              Cancel
            </button>

            <button
              class="bg-green-500 text-white px-4 py-2 rounded-lg"
              @click="createMenuItem"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
