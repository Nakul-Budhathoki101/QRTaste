<script setup lang="ts">
const categoryStore = useCategoryStore();

const toastStore = useToastStore();

const confirmStore = useConfirmStore();

const newCategory = ref("");

const newSubCategory = ref("");

const selectedCategoryId = ref<number>();

const addCategory = async () => {
  if (!newCategory.value.trim()) return;

  const result = await categoryStore.createCategory(newCategory.value);

  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) {
    newCategory.value = "";
  }
};

const addSubCategory = async () => {
  if (!selectedCategoryId.value || !newSubCategory.value.trim()) return;

  const result = await categoryStore.createSubCategory(
    selectedCategoryId.value,
    newSubCategory.value,
  );

  toastStore.open(result.message, result.success ? "success" : "error");

  if (result.success) {
    newSubCategory.value = "";
  }
};

const deleteCategory = async (id: number) => {
  const confirmed = await confirmStore.confirm({
    title: "Delete Category",
    message: "Delete this category?",
  });

  if (!confirmed) return;

  const result = await categoryStore.deleteCategory(id);

  toastStore.open(result.message, result.success ? "success" : "error");
};

const deleteSubCategory = async (id: number) => {
  const confirmed = await confirmStore.confirm({
    title: "Delete Sub Category",
    message: "Delete this sub category?",
  });

  if (!confirmed) return;

  const result = await categoryStore.deleteSubCategory(id);

  toastStore.open(result.message, result.success ? "success" : "error");
};

onMounted(async () => {
  await categoryStore.loadCategories();
  console.log("CATEGORIES LOADED", categoryStore.categories);
  await categoryStore.loadSubCategories();
  console.log("SUB CATEGORIES LOADED", categoryStore.subCategories);
});
</script>

<template>
  <div class="p-2 mt-5 mb-5">
    <NuxtLink to="/" class="bg-gray-500 text-white px-4 py-2 rounded-lg">
      ← Dashboard
    </NuxtLink>
  </div>

  <div class="p-8">
    <h1 class="text-3xl font-bold mb-8">Categories</h1>

    <!-- ADD CATEGORY -->

    <div class="bg-white p-6 rounded-xl shadow mb-8">
      <h2 class="text-xl font-bold mb-4">Add Category</h2>

      <div class="flex gap-4">
        <input
          v-model="newCategory"
          placeholder="Category Name"
          class="flex-1 border rounded-lg p-3"
        />

        <button
          class="bg-green-500 text-white px-6 rounded-lg hover:bg-green-600"
          @click="addCategory"
        >
          Add
        </button>
      </div>
    </div>

    <!-- ADD SUB CATEGORY -->

    <div class="bg-white p-6 rounded-xl shadow mb-8">
      <h2 class="text-xl font-bold mb-4">Add Sub Category</h2>

      <div class="flex gap-4">
        <select v-model="selectedCategoryId" class="border rounded-lg p-3">
          <option disabled value="">Select Category</option>

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
          placeholder="Sub Category Name"
          class="flex-1 border rounded-lg p-3"
        />

        <button
          class="bg-green-500 text-white px-6 rounded-lg hover:bg-green-600"
          @click="addSubCategory"
        >
          Add
        </button>
      </div>
    </div>

    <!-- CATEGORY LIST -->

    <div class="grid grid-cols-3 gap-4">
      <div
        v-for="category in categoryStore.categories"
        :key="category.id"
        class="bg-white p-6 rounded-xl shadow"
      >
        <div class="flex justify-between items-center mb-4">
          <h3 class="font-bold text-xl">
            {{ category.name }}
          </h3>

          <button class="text-red-500" @click="deleteCategory(category.id)">
            Delete
          </button>
        </div>

        <div
          v-for="sub in categoryStore.subCategories.filter(
            (s: any) => s.category_id === category.id,
          )"
          :key="sub.id"
          class="flex justify-between py-2"
        >
          <span>
            {{ sub.name }}
          </span>

          <button class="text-red-500" @click="deleteSubCategory(sub.id)">
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
