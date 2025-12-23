const { v4: uuidv4 } = require('uuid');

class AccountsManager {
  constructor(store) {
    this.store = store;
  }

  getAll() {
    return this.store.get('accounts', []);
  }

  getById(id) {
    const accounts = this.getAll();
    return accounts.find(a => a.id === id);
  }

  create(accountData) {
    const accounts = this.getAll();
    const newAccount = {
      id: uuidv4(),
      ...accountData
    };
    accounts.push(newAccount);
    this.store.set('accounts', accounts);
    return newAccount;
  }

  update(id, updates) {
    const accounts = this.getAll();
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    accounts[index] = { ...accounts[index], ...updates };
    this.store.set('accounts', accounts);
    return accounts[index];
  }

  delete(id) {
    const accounts = this.getAll();
    const filtered = accounts.filter(a => a.id !== id);
    if (filtered.length === accounts.length) return false;
    this.store.set('accounts', filtered);
    return true;
  }
}

module.exports = { AccountsManager };
