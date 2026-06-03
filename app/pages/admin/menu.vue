<script setup lang="ts">
import type { MenuItem } from "~/types/menu";

const menuStore = useMenuStore();
const toastStore = useToastStore();
const confirmStore = useConfirmStore();
const categoryStore = useCategoryStore();

const menuItems = computed(() => menuStore.menuItems);

const loading = ref(false);

onMounted(async () => {
  await menuStore.loadMenu();
  console.log("MENU LOADED", menuStore.menuItems);
  await categoryStore.loadCategories();
  console.log("CATEGORIES LOADED", categoryStore.categories);
  await categoryStore.loadSubCategories();
  console.log("SUB CATEGORIES LOADED", categoryStore.subCategories);
});

const showAddModal = ref(false);
const showEditModal = ref(false);

const selectedMenuItem = ref<MenuItem | null>(null);

const openEditModal = (item: MenuItem) => {
  selectedMenuItem.value = {
    ...item,
  };
  showEditModal.value = true;
};

const newItem = ref({
  name: "",
  description: "",
  price: 0,
  image_url: "",
  category_id: undefined as number | undefined,
  sub_category_id: undefined as number | undefined,
});

const addSubCategories = computed(() => {
  if (!newItem.value.category_id) return [];

  return categoryStore.subCategories.filter(
    (sub) => sub.category_id === newItem.value.category_id,
  );
});
const editSubCategories = computed(() => {
  if (!selectedMenuItem.value?.sub_category_id) return [];

  return categoryStore.subCategories.filter(
    (sub) => sub.category_id === Number(selectedMenuItem.value?.category_id),
  );
});

//category Names
const getCategoryName = (categoryId: number) => {
  return categoryStore.categories.find((c) => c.id === categoryId)?.name || "-";
};
const getSubCategoryName = (subCategoryId: number) => {
  return (
    categoryStore.subCategories.find((s) => s.id === subCategoryId)?.name || "-"
  );
};

const createMenuItem = async () => {
  const exists = menuItems.value.some(
    (item) => item.name.toLowerCase() === newItem.value.name.toLowerCase(),
  );
  if (exists) {
    toastStore.open("Menu item already exists", "error");
    return;
  }
  if (!newItem.value.category_id) {
    toastStore.open("Please select a category", "error");
    return;
  }

  if (!newItem.value.sub_category_id) {
    toastStore.open("Please select a sub category", "error");
    return;
  }

  const result = await menuStore.createMenuItem({
    name: newItem.value.name,
    description: newItem.value.description,
    price: newItem.value.price,
    image_url: newItem.value.image_url,

    category_id: newItem.value.category_id,

    sub_category_id: newItem.value.sub_category_id,
  });

  toastStore.open(result.message, result.success ? "success" : "error");

  if (!result.success) return;

  showAddModal.value = false;
  newItem.value = {
    name: "",
    description: "",
    price: 0,
    image_url: "",
    category_id: undefined,
    sub_category_id: undefined,
  };
};
const updateMenuItem = async () => {
  if (!selectedMenuItem.value) return;
  const result = await menuStore.updateMenuItem(selectedMenuItem.value);
  toastStore.open(result.message, result.success ? "success" : "error");
  if (!result.success) return;
  showEditModal.value = false;
};
const deleteMenuItem = async (id: number) => {
  const item = menuItems.value.find((x) => x.id === id);
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
  <div class="p-2 mt-5 mb-5">
    <NuxtLink to="/" class="bg-gray-500 text-white px-4 py-2 rounded-lg">
      ← Dashboard
    </NuxtLink>
  </div>

  <div class="p-2">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Menu Management</h1>

      <button
        class="bg-green-500 text-white px-4 py-2 rounded-lg"
        @click="showAddModal = true"
      >
        Add Item
      </button>
    </div>

    <div
      v-for="item in menuItems"
      :key="item.id"
      class="bg-white shadow rounded-xl p-4 mb-4"
    >
      <div class="flex">
        <div class="flex gap-5">
          <div
            class="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center"
          >
            <img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.name"
              class="w-full h-full object-cover"
            />
            <div
              v-else
              class="flex flex-col items-center justify-center text-gray-400"
            >
              <span class="text-3xl"> 📷 </span>
              <span class="text-xs"> No Image </span>
            </div>
          </div>

          <div>
            <h2 class="font-bold text-3xl">
              {{ item.name }}
            </h2>

            <p v-if="item.description" class="text-gray-500 mt-1">
              {{ item.description }}
            </p>
          </div>
        </div>

        <div
          class="h-auto flex flex-row flex-1 items-center justify-center gap-5 text-3xl"
        >
          <p class="text-gray-400">
            {{ getCategoryName(item.category_id) }}
            /
            {{ getSubCategoryName(item.sub_category_id) }}
          </p>

          <P class="text-5xl"> | </P>

          <p class="font-bold text-green-600">{{ item.price }} ¥</p>
        </div>

        <div class="flex flex-1 justify-end gap-2">
          <button
            class="w-20 bg-blue-500 text-white px-3 py-2 rounded-xl hover:bg-blue-400"
            @click="openEditModal(item)"
          >
            Edit
          </button>

          <button
            @click="deleteMenuItem(item.id)"
            class="w-40 bg-red-500 text-white px-3 py-2 rounded-xl hover:bg-red-400"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- EDIT MENU ITEM MODAL -->
    <div
      v-if="showEditModal && selectedMenuItem"
      class="fixed inset-0 bg-black/50 flex justify-center items-center"
    >
      <div class="bg-white p-6 rounded-xl w-[500px]">
        <h2 class="text-2xl font-bold mb-4">Edit Menu Item</h2>

        <input
          v-model="selectedMenuItem.name"
          placeholder="Name"
          class="w-full border p-2 mb-3"
        />

        <textarea
          v-model="selectedMenuItem.description"
          placeholder="Description"
          class="w-full border p-2 mb-3"
        />

        <input
          v-model.number="selectedMenuItem.price"
          type="number"
          placeholder="Price"
          class="w-full border p-2 mb-3"
        />
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>

          <select
            v-model="selectedMenuItem.category_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option
              v-for="category in categoryStore.categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Sub Category
          </label>

          <select
            v-model="selectedMenuItem.sub_category_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option
              v-for="sub in editSubCategories"
              :key="sub.id"
              :value="sub.id"
            >
              {{ sub.name }}
            </option>
          </select>
        </div>
        <input
          v-model="selectedMenuItem.image_url"
          placeholder="Image URL"
          class="w-full border p-2 mb-3"
        />

        <div class="flex justify-end gap-3">
          <button
            @click="showEditModal = false"
            class="bg-gray-300 px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            @click="updateMenuItem"
            class="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>

    <!-- ADD MENU ITEM MODAL -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/50 flex justify-center items-center"
    >
      <div class="bg-white p-6 rounded-xl w-[500px]">
        <h2 class="text-2xl font-bold mb-4">Add Menu Item</h2>

        <input
          v-model="newItem.name"
          placeholder="Name"
          class="w-full border p-2 mb-3"
        />

        <textarea
          v-model="newItem.description"
          placeholder="Description"
          class="w-full border p-2 mb-3"
        />

        <input
          v-model.number="newItem.price"
          type="number"
          placeholder="Price"
          class="w-full border p-2 mb-3"
        />

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>

          <select
            v-model="newItem.category_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-2"
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
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Sub Category
          </label>

          <select
            v-model="newItem.sub_category_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option disabled :value="undefined">Select Sub Category</option>

            <option
              v-for="sub in addSubCategories"
              :key="sub.id"
              :value="sub.id"
            >
              {{ sub.name }}
            </option>
          </select>
        </div>

        <input
          v-model="newItem.image_url"
          placeholder="Image URL"
          class="w-full border p-2 mb-3"
        />

        <div class="flex justify-end gap-3">
          <button
            @click="showAddModal = false"
            class="bg-gray-300 px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            @click="createMenuItem"
            class="bg-green-500 text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
