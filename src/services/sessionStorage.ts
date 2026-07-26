import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStore = new Map<string, string>();

function browserStore(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const keyValueStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      const store = browserStore();
      return store ? store.getItem(key) : (memoryStore.get(key) ?? null);
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      const store = browserStore();
      if (store) {
        store.setItem(key, value);
      } else {
        memoryStore.set(key, value);
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      const store = browserStore();
      if (store) {
        store.removeItem(key);
      } else {
        memoryStore.delete(key);
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

export const authSessionStorage = keyValueStorage;
export const appStorage = keyValueStorage;
