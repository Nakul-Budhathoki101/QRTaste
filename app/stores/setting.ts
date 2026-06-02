import { defineStore } from 'pinia'

export const useSettingsStore = defineStore(
  'settings',
  {
    state: () => ({
      defaultTimeLimit: 120,
      warningBeforeMinutes: 10,
      enableSoundAlert: true,
      taxRate: 10,
    })
  }
)