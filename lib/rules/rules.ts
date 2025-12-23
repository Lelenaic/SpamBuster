import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { Rule } from '../types';

export class RulesManager {
  private store: Store;

  constructor(store?: Store) {
    this.store = store || new Store();
  }

  getAll(): Rule[] {
    return this.store.get('rules', []) as Rule[];
  }

  getById(id: string): Rule | undefined {
    const rules = this.getAll();
    return rules.find(r => r.id === id);
  }

  create(ruleData: Omit<Rule, 'id'>): Rule {
    const rules = this.getAll();
    const newRule: Rule = {
      id: uuidv4(),
      ...ruleData
    };
    rules.push(newRule);
    this.store.set('rules', rules);
    return newRule;
  }

  update(id: string, updates: Partial<Omit<Rule, 'id'>>): Rule | undefined {
    const rules = this.getAll();
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    rules[index] = { ...rules[index], ...updates };
    this.store.set('rules', rules);
    return rules[index];
  }

  delete(id: string): boolean {
    const rules = this.getAll();
    const filtered = rules.filter(r => r.id !== id);
    if (filtered.length === rules.length) return false;
    this.store.set('rules', filtered);
    return true;
  }
}
