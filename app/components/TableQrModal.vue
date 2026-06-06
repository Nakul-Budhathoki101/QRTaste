<script setup lang="ts">
import QRCode from "qrcode";
import { ref, onMounted } from "vue";

const props = defineProps<{
  tableName: string;
}>();

const qrCodeUrl = ref("");
const tableUrl = ref("");

const generateQr = async () => {
  const origin = window.location.origin || "https://qr-taste.vercel.app";
  tableUrl.value = `${origin}/order/${encodeURIComponent(props.tableName)}`;

  qrCodeUrl.value = await QRCode.toDataURL(tableUrl.value);
};

const printQr = () => {
  window.print();
};

onMounted(() => {
  generateQr();
});
</script>

<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center">
    <div class="bg-white rounded-3xl p-8 w-[400px] shadow-2xl printable-qr">
      <h2 class="text-2xl font-bold mb-6">QR Code - Table {{ tableName }}</h2>

      <div class="flex justify-center">
        <img :src="qrCodeUrl" alt="QR Code" class="w-64 h-64" />
      </div>

      <div class="mt-6 text-center">
        <p class="text-gray-500 break-all">
          {{ tableUrl }}
        </p>
      </div>

      <div class="mt-6 grid grid-cols-2 gap-3 no-print">
        <button
          class="w-full bg-gray-200 text-gray-900 py-3 rounded-xl"
          @click="$emit('close')"
        >
          Close
        </button>

        <button
          class="w-full bg-black text-white py-3 rounded-xl"
          @click="printQr"
        >
          Print QR
        </button>
      </div>
    </div>
  </div>
</template>
