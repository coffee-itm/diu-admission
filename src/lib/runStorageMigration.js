// Side-effect module: must be imported before any persisted store so the
// migration runs before Zustand rehydrates.
import { migrateStorageKeys } from './storageMigration.js';

migrateStorageKeys();
