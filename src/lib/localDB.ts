export interface LocalDB {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

class InMemoryDB implements LocalDB {
  private store: Map<string, unknown> = new Map();

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key);
    return (value as T) || null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
}

let db: LocalDB | null = null;

export function initializeLocalDB(): LocalDB {
  if (!db) {
    db = new InMemoryDB();
  }
  return db;
}

export function getLocalDB(): LocalDB {
  if (!db) {
    throw new Error('LocalDB not initialized. Call initializeLocalDB first.');
  }
  return db;
}
