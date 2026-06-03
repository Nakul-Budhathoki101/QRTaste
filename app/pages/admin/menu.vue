<script setup lang="ts">

import { useSupabase } from "~/lib/supabase";
import type { MenuItem } from "~/types/menu";
import { MENU_CATEGORIES } from "~/constants/menuCategories";


type MainCategory = keyof typeof MENU_CATEGORIES;

const menuStore = useMenuStore();

const toastStore = useToastStore();

const confirmStore = useConfirmStore();

const menuItems = computed(() => menuStore.menuItems);

const loading = ref(false);

onMounted(async () => {
  await menuStore.loadMenu();
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
  main_category: "Food" as MainCategory,
  sub_category: "Appetizer",
});

const createMenuItem = async () => {
  const exists = menuItems.value.some(
    (item) => item.name.toLowerCase() === newItem.value.name.toLowerCase(),
  );
  if (exists) {
    toastStore.open("Menu item already exists", "error");

    return;
  }

  const result = await menuStore.createMenuItem(newItem.value);
  toastStore.open(result.message, result.success ? "success" : "error");
  if (!result.success) return;
  showAddModal.value = false;
  newItem.value = {
    name: "",
    description: "",
    price: 0,
    image_url: "",
    main_category: "Food",
    sub_category: "Appetizer",
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
      <div class="flex justify-between">
        <div>
          <h2 class="font-bold text-xl">
            {{ item.name }}
          </h2>

          <p>
            {{ item.description }}
          </p>

          <p>¥{{ item.price }}</p>
        </div>

        <div class="flex gap-2">
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
            v-model="selectedMenuItem.main_category"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option
              v-for="(subCategories, category) in MENU_CATEGORIES"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Sub Category
          </label>

          <select
            v-model="selectedMenuItem.sub_category"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option
              v-for="sub in MENU_CATEGORIES[newItem.main_category]"
              :key="sub"
              :value="sub"
            >
              {{ sub }}
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
            v-model="newItem.main_category"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option
              v-for="(subCategories, category) in MENU_CATEGORIES"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Sub Category
          </label>

          <select
            v-model="newItem.sub_category"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
          >
            <option
              v-for="sub in MENU_CATEGORIES[newItem.main_category]"
              :key="sub"
              :value="sub"
            >
              {{ sub }}
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
