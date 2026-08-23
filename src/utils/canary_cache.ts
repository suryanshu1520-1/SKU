export class InvalidTTLExpression extends Error {
  constructor(message = 'TTL must be greater than 0 ms') {
    super(message);
    this.name = 'InvalidTTLExpression';
    Object.setPrototypeOf(this, InvalidTTLExpression.prototype);
  }
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CanaryCache<T = unknown> {
  private readonly store = new Map<string, CacheEntry<T>>();

  set(key: string, val: T, ttlMs: number): void {
    if (ttlMs <= 0) {
      throw new InvalidTTLExpression(`Invalid TTL: ${ttlMs}. TTL must be > 0.`);
    }
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value: val, expiresAt });
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() >= entry.expiresAt) {
      return undefined;
    }
    return entry.value;
  }

  evictExpired(): number {
    const now = Date.now();
    let evictedCount = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
        evictedCount++;
      }
    }
    return evictedCount;
  }
}
