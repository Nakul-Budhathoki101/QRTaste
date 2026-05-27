<script setup lang="ts">
import QRCode from "qrcode";
import { ref, onMounted } from "vue";

const props = defineProps<{
  tableName: string;
}>();

const qrCodeUrl = ref("");
const tableUrl = ref("");

const generateQr = async () => {
  tableUrl.value = `https://qr-taste.vercel.app/order/${props.tableName}`;

  qrCodeUrl.value = await QRCode.toDataURL(tableUrl.value);
};

onMounted(() => {
  generateQr();
});
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-white rounded-3xl p-8 w-[400px] shadow-2xl">
      <h2 class="text-2xl font-bold mb-6">QR Code - Table {{ tableName }}</h2>

      <div class="flex justify-center">
        <img :src="qrCodeUrl" alt="QR Code" class="w-64 h-64" />
      </div>

      <div class="mt-6 text-center">
        <p class="text-gray-500 break-all">
          {{ tableUrl }}
        </p>
      </div>

      <button
        class="w-full mt-6 bg-black text-white py-3 rounded-xl"
        @click="$emit('close')"
      >
        Close
      </button>
    </div>
  </div>
</template>
