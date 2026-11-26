// Re-export storage migration capabilities into storage domain
// @ts-ignore
import storageMigration = require("../../storage-migration");

export const runStorageMigration = storageMigration.runStorageMigration;
export const STORAGE_SCHEMA_VERSION = storageMigration.STORAGE_SCHEMA_VERSION;
export const DEFAULT_LIMITS = storageMigration.DEFAULT_LIMITS;
export const HANDLED_KEYS = storageMigration.HANDLED_KEYS;
