<script setup lang="ts">
import { useSupabase } from "~/lib/supabase";
import type { MenuItem } from "~/types/menu";
import { MENU_CATEGORIES } from "~/constants/menuCategories";

type MainCategory = keyof typeof MENU_CATEGORIES;

const menuItems = ref<MenuItem[]>([]);

const supabase = useSupabase();

const loading = ref(false);

const loadMenu = async () => {
  loading.value = true;

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("id");

  if (error) {
    console.error(error);
  } else {
    menuItems.value = data || [];
  }

  loading.value = false;
};

onMounted(loadMenu);

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
    alert("Menu item already exists");
    return;
  }
  const { error } = await supabase.from("menu_items").insert([
    {
      name: newItem.value.name,
      description: newItem.value.description,
      price: newItem.value.price,
      image_url: newItem.value.image_url,
      main_category: newItem.value.main_category,
      sub_category: newItem.value.sub_category,
    },
  ]);

  if (error) {
    console.error(error);
    return;
  }

  await loadMenu();

  showAddModal.value = false;

  newItem.value = {
    name: "",
    description: "",
    price: 0,
    image_url: "",
    main_category: "Food" as MainCategory,
    sub_category: "Appetizer",
  };
};

const updateMenuItem = async () => {
  if (!selectedMenuItem.value) return;

  const { error } = await supabase
    .from("menu_items")
    .update({
      name: selectedMenuItem.value.name,

      description: selectedMenuItem.value.description,

      price: selectedMenuItem.value.price,

      image_url: selectedMenuItem.value.image_url,
      main_category: selectedMenuItem.value.main_category,
      sub_category: selectedMenuItem.value.sub_category,
    })
    .eq("id", selectedMenuItem.value.id);

  if (error) {
    console.error(error);
    return;
  }

  showEditModal.value = false;

  await loadMenu();
};

const deleteMenuItem = async (id: number) => {
  if (!confirm("Delete this menu item?")) return;

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    console.error(error);
    return;
  }

  await loadMenu();
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
