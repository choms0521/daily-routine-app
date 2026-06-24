/**
 * App-wide store singleton, backed by AsyncStorage. Kept separate from the
 * `createAppStore` factory so that importing the factory (in store unit tests) does not
 * pull in the AsyncStorage native module. The app (screens/components) imports this hook;
 * tests build isolated stores via `createAppStore(fakeRepository)`.
 */
import { AsyncStorageRepository } from '@/repository/AsyncStorageRepository';
import { createAppStore } from '@/store/appStore';

export const useAppStore = createAppStore(new AsyncStorageRepository());
