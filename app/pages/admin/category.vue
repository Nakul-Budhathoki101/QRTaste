<script setup lang="ts">
const categoryStore = useCategoryStore();
const toastStore = useToastStore();
const confirmStore = useConfirmStore();

const loading = ref(true);
const search = ref("");
const newCategory = ref("");
const newSubCategory = ref("");
const selectedCategoryId = ref<number>();

onMounted(async () => {
  loading.value = true;
  await Promise.all([
    categoryStore.loadCategories(),
    categoryStore.loadSubCategories(),
  ]);
  loading.value = false;
});

const filteredCategories = computed(() => {
  const term = search.value.trim().toLowerCase();

  return categoryStore.categories.filter((category) => {
    const subs = categoryStore.subCategories.filter(
      (sub) => sub.category_id === category.id,
    );

    return (
      !term ||
      category.name.toLowerCase().includes(term) ||
      subs.some((sub) => sub.name.toLowerCase().includes(term))
    );
  });
});

const subCategoriesFor = (categoryId: number) =>
  categoryStore.subCategories.filter((sub) => sub.category_id === categoryId);

const addCategory = async () => {
  const name = newCategory.value.trim();
  if (!name) {
    toastStore.open("Category name is required", "error");
    return;
  }

  const exists = categoryStore.categories.some(
    (category) => category.name.toLowerCase() === name.toLowerCase(),
  );
  if (exists) {
    toastStore.open("Category already exists", "error");
    return;
  }

  const result = await categoryStore.createCategory(name);
  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) newCategory.value = "";
};

const addSubCategory = async () => {
  const name = newSubCategory.value.trim();

  if (!selectedCategoryId.value) {
    toastStore.open("Select a category first", "error");
    return;
  }

  if (!name) {
    toastStore.open("Sub category name is required", "error");
    return;
  }

  const exists = categoryStore.subCategories.some(
    (sub) =>
      sub.category_id === selectedCategoryId.value &&
      sub.name.toLowerCase() === name.toLowerCase(),
  );
  if (exists) {
    toastStore.open("Sub category already exists", "error");
    return;
  }

  const result = await categoryStore.createSubCategory(
    selectedCategoryId.value,
    name,
  );
  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) newSubCategory.value = "";
};

const deleteCategory = async (id: number) => {
  const category = categoryStore.categories.find((item) => item.id === id);

  const confirmed = await confirmStore.confirm({
    title: "Delete Category",
    message: `Delete "${category?.name ?? "category"}" and its sub categories?`,
  });

  if (!confirmed) return;

  const result = await categoryStore.deleteCategory(id);
  toastStore.open(result.message, result.success ? "success" : "error");
};

const deleteSubCategory = async (id: number) => {
  const sub = categoryStore.subCategories.find((item) => item.id === id);

  const confirmed = await confirmStore.confirm({
    title: "Delete Sub Category",
    message: `Delete "${sub?.name ?? "sub category"}"?`,
  });

  if (!confirmed) return;

  const result = await categoryStore.deleteSubCategory(id);
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
          <h1 class="text-3xl font-bold">Category Management</h1>
          <p class="text-gray-500 mt-1">
            Organize menu categories and sub categories for customer ordering.
          </p>
        </div>

        <input
          v-model="search"
          class="border border-gray-300 rounded-lg px-3 py-2 lg:w-[360px]"
          placeholder="Search categories or sub categories"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Categories</p>
          <p class="text-2xl font-bold">{{ categoryStore.categories.length }}</p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Sub Categories</p>
          <p class="text-2xl font-bold">
            {{ categoryStore.subCategories.length }}
          </p>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <p class="text-sm text-gray-500">Visible Results</p>
          <p class="text-2xl font-bold">{{ filteredCategories.length }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div class="bg-white p-5 rounded-lg shadow">
          <h2 class="text-xl font-bold mb-4">Add Category</h2>

          <div class="flex flex-col sm:flex-row gap-3">
            <input
              v-model="newCategory"
              placeholder="Category name"
              class="flex-1 border rounded-lg p-3"
            />

            <button
              class="bg-green-500 text-white px-6 rounded-lg hover:bg-green-600 py-3"
              @click="addCategory"
            >
              Add
            </button>
          </div>
        </div>

        <div class="bg-white p-5 rounded-lg shadow">
          <h2 class="text-xl font-bold mb-4">Add Sub Category</h2>

          <div class="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-3">
            <select v-model="selectedCategoryId" class="border rounded-lg p-3">
              <option :value="undefined">Select Category</option>
              <option
                v-for="category in categoryStore.categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>

            <input
              v-model="newSubCategory"
              placeholder="Sub category name"
              class="border rounded-lg p-3"
            />

            <button
              class="bg-green-500 text-white px-6 rounded-lg hover:bg-green-600 py-3"
              @click="addSubCategory"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-12">Loading categories...</div>

      <div
        v-else-if="filteredCategories.length === 0"
        class="bg-white rounded-lg p-10 text-center text-gray-500 shadow"
      >
        No categories found.
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div
          v-for="category in filteredCategories"
          :key="category.id"
          class="bg-white p-5 rounded-lg shadow"
        >
          <div class="flex justify-between items-start gap-3 mb-4">
            <div>
              <h3 class="font-bold text-xl">{{ category.name }}</h3>
              <p class="text-sm text-gray-500">
                {{ subCategoriesFor(category.id).length }} sub categories
              </p>
            </div>

            <button
              class="text-red-500 font-semibold"
              @click="deleteCategory(category.id)"
            >
              Delete
            </button>
          </div>

          <div v-if="subCategoriesFor(category.id).length" class="space-y-2">
            <div
              v-for="sub in subCategoriesFor(category.id)"
              :key="sub.id"
              class="flex justify-between items-center bg-gray-100 rounded-lg px-3 py-2"
            >
              <span>{{ sub.name }}</span>

              <button
                class="text-red-500 text-sm font-semibold"
                @click="deleteSubCategory(sub.id)"
              >
                Delete
              </button>
            </div>
          </div>

          <div v-else class="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            No sub categories yet.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
