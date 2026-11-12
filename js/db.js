// Backward-compatible persistence facade for older modules.
// New feature code should depend on itemRepository from the infrastructure contract.
export { openItemDatabase as openDB, put, remove, putMany, getAll, getItem, itemRepository } from './infrastructure/persistence/item-repository.js';
