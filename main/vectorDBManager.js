class VectorDBManager {
  constructor(store) {
    this.store = store;
    this.db = null;
    this.table = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      const lancedb = await import("@lancedb/lancedb");
      const { default: path } = await import("path");
      const { default: os } = await import("os");

      // Use app data directory for database storage
      const dbPath = path.join(os.homedir(), "spambuster-data", "emails.lancedb");
      this.db = await lancedb.connect(dbPath);

      // Create table if it doesn't exist
      await this.createTableIfNotExists();

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize VectorDB:", error);
      throw error;
    }
  }

  async createTableIfNotExists() {
    try {
      // Check if table exists
      const tables = await this.db.tableNames();
      if (tables.includes("emails")) {
        this.table = await this.db.openTable("emails");
        return;
      }

      // Create new table with schema
      const { Schema, Field, Float32, Utf8, Bool, FixedSizeList, Int8 } = await import("apache-arrow");
      
      // Get the embedding model dimension from store or fetch from Ollama API
      const embedModel = this.store.get('selectedEmbedModel', '');
      let vectorDimension = this.store.get('embedModelDimension', null);
      
      // If no dimension stored, fetch it from Ollama API
      if (!vectorDimension && embedModel) {
        vectorDimension = await this.getModelDimension(embedModel);
        this.store.set('embedModelDimension', vectorDimension);
      }
      
      // Fallback to default if no embed model selected
      if (!vectorDimension) {
        vectorDimension = 1024;
      }
      
      // Use FixedSizeList for vector field to enable indexing
      // Dynamic dimension based on the embedding model
      const schema = new Schema([
        new Field("id", new Utf8(), false),
        new Field("emailId", new Utf8(), false),
        new Field("subject", new Utf8(), false),
        new Field("sender", new Utf8(), false),
        new Field("body", new Utf8(), false),
        new Field("score", new Float32(), false),
        new Field("reasoning", new Utf8(), false),
        new Field("accountId", new Utf8(), false),
        new Field("isSpam", new Bool(), false),
        new Field("analyzedAt", new Utf8(), false),
        new Field("userValidated", new Int8(), false), // 1 = spam, 0 = ham, -1 = not validated
        new Field("vector", new FixedSizeList(vectorDimension, new Field("item", new Float32(), false)), false)
      ]);

      this.table = await this.db.createTable("emails", [], { schema });
    } catch (error) {
      console.error("Failed to create table:", error);
      throw error;
    }
  }

  async getModelDimension(model) {
    const baseUrl = this.store.get('ollamaBaseUrl', 'http://localhost:11434');
    
    try {
      const response = await fetch(`${baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        return 1024; // Default dimension
      }

      const data = await response.json();
      
      // Look for embedding dimension in model_info
      // The key pattern is {family}.embedding_length (e.g., "gemma3.embedding_length": 2560)
      if (data.model_info) {
        const modelInfoKeys = Object.keys(data.model_info);
        
        // First, look for exact embedding_length key (most specific)
        const embeddingLengthKey = modelInfoKeys.find(k => k.endsWith('.embedding_length'));
        if (embeddingLengthKey && data.model_info[embeddingLengthKey]) {
          return data.model_info[embeddingLengthKey];
        }
        
        // Fallback: look for any key containing 'embedding'
        const embeddingKey = modelInfoKeys.find(k => 
          k.includes('embedding_dim') || k.includes('embedding_size') || k.includes('embedding')
        );
        if (embeddingKey && data.model_info[embeddingKey]) {
          return data.model_info[embeddingKey];
        }
      }
      
      // Default fallback
      return 1024;
    } catch (error) {
      return 1024; // Default dimension on error
    }
  }

  async generateEmbedding(text) {
    try {
      // Get embedding configuration - always use Ollama for embeddings
      const embedModel = this.store.get('selectedEmbedModel', '');

      if (!embedModel) {
        throw new Error('No embedding model configured');
      }

      // Ensure the model dimension is stored
      let storedDimension = this.store.get('embedModelDimension', null);
      if (!storedDimension) {
        storedDimension = await this.getModelDimension(embedModel);
        this.store.set('embedModelDimension', storedDimension);
      }

      const vector = await this.generateOllamaEmbedding(text, embedModel);
      return vector;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw error;
    }
  }

  async getModelContextLimit(model) {
    const baseUrl = this.store.get('ollamaBaseUrl', 'http://localhost:11434');
    
    try {
      const response = await fetch(`${baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        return 2000;
      }

      const data = await response.json();
      
      // Strategy 1: Look for {family}.context_length in model_info
      if (data.model_info) {
        const modelInfoKeys = Object.keys(data.model_info);
        
        // Find any key ending with ".context_length"
        const contextKey = modelInfoKeys.find(k => k.endsWith('.context_length'));
        if (contextKey) {
          const contextLength = data.model_info[contextKey];
          return Math.floor(contextLength / 4 * 0.8);
        }
      }
      
      // Strategy 2: Look for general.context_length or general.context_length_max
      if (data.model_info && (data.model_info['general.context_length'] || data.model_info['general.context_length_max'])) {
        const contextLength = data.model_info['general.context_length'] || data.model_info['general.context_length_max'];
        return Math.floor(contextLength / 4 * 0.8);
      }
      
      // Strategy 3: Parse parameters string for num_ctx (e.g., "num_ctx 2048")
      if (data.parameters) {
        const numCtxMatch = data.parameters.match(/num_ctx\s+(\d+)/i);
        if (numCtxMatch) {
          const contextLength = parseInt(numCtxMatch[1], 10);
          return Math.floor(contextLength / 4 * 0.8);
        }
      }

      return 2000;
    } catch (error) {
      return 2000;
    }
  }

  async generateOllamaEmbedding(text, model) {
    const baseUrl = this.store.get('ollamaBaseUrl', 'http://localhost:11434');
    
    // Get context limit for this specific model
    const maxChars = await this.getModelContextLimit(model);
    
    // Truncate text to prevent Ollama 500 errors on large inputs
    const truncatedText = text.length > maxChars
      ? text.substring(0, maxChars)
      : text;

    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: truncatedText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${errorText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  async storeAnalyzedEmail(emailData) {
    await this.initialize();

    try {
      // Generate embedding for the email content
      const content = `${emailData.subject} ${emailData.body || ''}`;
      const vector = await this.generateEmbedding(content);

      // Prepare data for storage
      const record = {
        id: emailData.id,
        emailId: emailData.emailId,
        subject: emailData.subject,
        sender: emailData.sender,
        body: emailData.body || '',
        score: emailData.score,
        reasoning: emailData.reasoning,
        accountId: emailData.accountId,
        isSpam: emailData.isSpam,
        analyzedAt: new Date().toISOString(),
        userValidated: -1,
        vector: vector,
      };

      await this.table.add([record]);

      // Ensure vector index exists for search functionality
      await this.ensureVectorIndex();
    } catch (error) {
      // If schema mismatch, try to recreate table
      if (error.message && error.message.includes("different schema")) {
        try {
          await this.db.dropTable("emails");
          this.table = null;
          this.isInitialized = false;
          await this.initialize();
          // Retry storage
          return await this.storeAnalyzedEmail(emailData);
        } catch (recreateError) {
          throw recreateError;
        }
      }

      throw error;
    }
  }

  async ensureVectorIndex() {
    try {
      // Check if vector index already exists
      const indices = await this.table.listIndices();
      const vectorIndexExists = indices.some(index => index.name === 'vector_idx' || index.columns?.includes('vector'));

      if (!vectorIndexExists) {
        // Check if we have enough data for PQ index (requires 256+ rows)
        const rowCount = await this.table.countRows();
        if (rowCount >= 256) {
          await this.table.createIndex("vector");
        }
      }
    } catch (error) {
      // Don't throw here as this shouldn't block email storage
    }
  }

  async findSimilarEmails(queryText, limit = 5, accountId = null) {
    await this.initialize();

    try {
      // Check if table has any data
      const count = await this.table.countRows();
      if (count === 0) {
        return [];
      }

      // Ensure vector index exists for search
      await this.ensureVectorIndex();

      // Generate embedding for query
      const queryVector = await this.generateEmbedding(queryText);

      // Build search query
      let searchQuery = this.table.search(queryVector).limit(limit);

      // Filter by account if specified
      if (accountId) {
        searchQuery = searchQuery.where(`"accountId" = '${accountId}'`);
      }

      const results = await searchQuery.toArray();

      return results.map(result => ({
        id: result.id,
        emailId: result.emailId,
        subject: result.subject,
        sender: result.sender,
        body: result.body,
        score: result.score,
        reasoning: result.reasoning,
        accountId: result.accountId,
        isSpam: result.isSpam,
        analyzedAt: result.analyzedAt,
        userValidated: result.userValidated === -1 ? null : result.userValidated === 1,
        similarity: result._distance || 0,
      }));
    } catch (error) {
      // If it's a "no vector column" error, return empty results
      if (error.message && error.message.includes("No vector column found")) {
        return [];
      }

      return [];
    }
  }

  async getEmailCount() {
    await this.initialize();

    try {
      const count = await this.table.countRows();
      return count;
    } catch (error) {
      return 0;
    }
  }

  async updateUserValidation(emailId, userValidated) {
    await this.initialize();

    try {
      // Convert boolean/null to integer format: null/-1 = not validated, true/1 = spam, false/0 = ham
      const dbValue = userValidated === null ? -1 : (userValidated ? 1 : 0);

      // Update the user validation for the specified email
      await this.table.update({
        where: `"emailId" = '${emailId}'`,
        values: { userValidated: dbValue }
      });
    } catch (error) {
      throw error;
    }
  }

  async clearAllEmails() {
    await this.initialize();

    try {
      // Drop the table and recreate it
      await this.db.dropTable("emails");
      await this.createTableIfNotExists();
      
      // Also clear the stored embedding dimension so it's recalculated on next use
      this.store.delete('embedModelDimension');
    } catch (error) {
      throw error;
    }
  }

  async close() {
    if (this.db) {
      // LanceDB doesn't have explicit close method, but we can set to null
      this.db = null;
      this.table = null;
      this.isInitialized = false;
    }
  }

  async updateEmbeddingModel(newModel) {
    // Get the dimension for the new model
    const newDimension = await this.getModelDimension(newModel);
    const oldDimension = this.store.get('embedModelDimension', 1024);
    
    // Store the new dimension
    this.store.set('embedModelDimension', newDimension);
    
    // If dimension changed, we need to recreate the table
    if (oldDimension !== newDimension && this.table) {
      try {
        await this.db.dropTable("emails");
        this.table = null;
        this.isInitialized = false;
        await this.initialize();
      } catch (error) {
        console.error("Failed to recreate table with new dimension:", error);
        throw error;
      }
    }
  }
}

module.exports = { VectorDBManager };
