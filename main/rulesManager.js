// eslint-disable-next-line @typescript-eslint/no-require-imports
const { v4: uuidv4 } = require('uuid');

class RulesManager {
  constructor(store) {
    this.store = store;
  }

  getAll() {
    return this.store.get('rules', []);
  }

  getById(id) {
    const rules = this.getAll();
    return rules.find(r => r.id === id);
  }

  create(ruleData) {
    const rules = this.getAll();
    const newRule = {
      id: uuidv4(),
      ...ruleData
    };
    rules.push(newRule);
    this.store.set('rules', rules);
    return newRule;
  }

  update(id, updates) {
    const rules = this.getAll();
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    rules[index] = { ...rules[index], ...updates };
    this.store.set('rules', rules);
    return rules[index];
  }

  delete(id) {
    const rules = this.getAll();
    const filtered = rules.filter(r => r.id !== id);
    if (filtered.length === rules.length) return false;
    this.store.set('rules', filtered);
    return true;
  }

  registerHandlers(ipcMain) {
    ipcMain.handle('rules:getAll', async () => {
      return this.getAll();
    });

    ipcMain.handle('rules:getById', async (event, id) => {
      return this.getById(id);
    });

    ipcMain.handle('rules:create', async (event, ruleData) => {
      return this.create(ruleData);
    });

    ipcMain.handle('rules:update', async (event, id, updates) => {
      return this.update(id, updates);
    });

    ipcMain.handle('rules:delete', async (event, id) => {
      return this.delete(id);
    });
  }
}

module.exports = { RulesManager };
