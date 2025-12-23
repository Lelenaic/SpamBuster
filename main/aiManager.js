class AIManager {
  constructor(store) {
    this.store = store;
  }

  getAISource() {
    return this.store.get('aiSource', 'ollama');
  }

  setAISource(value) {
    this.store.set('aiSource', value);
  }

  getOllamaBaseUrl() {
    return this.store.get('ollamaBaseUrl', 'http://localhost:11434');
  }

  setOllamaBaseUrl(value) {
    this.store.set('ollamaBaseUrl', value);
  }

  getOllamaApiKey() {
    return this.store.get('ollamaApiKey', '');
  }

  setOllamaApiKey(value) {
    this.store.set('ollamaApiKey', value);
  }

  getOpenRouterApiKey() {
    return this.store.get('openRouterApiKey', '');
  }

  setOpenRouterApiKey(value) {
    this.store.set('openRouterApiKey', value);
  }

  getSelectedModel() {
    return this.store.get('selectedModel', '');
  }

  setSelectedModel(value) {
    this.store.set('selectedModel', value);
  }

  getSelectedEmbedModel() {
    return this.store.get('selectedEmbedModel', '');
  }

  setSelectedEmbedModel(value) {
    this.store.set('selectedEmbedModel', value);
  }
}

module.exports = { AIManager };
