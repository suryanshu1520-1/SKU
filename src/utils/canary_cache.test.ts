import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CanaryCache, InvalidTTLExpression } from './canary_cache.js';

describe('CanaryCache', () => {
  it('stores and retrieves fresh values', () => {
    const cache = new CanaryCache<string>();
    cache.set('key1', 'value1', 1000);
    assert.equal(cache.get('key1'), 'value1');
  });

  it('returns undefined for non-existent keys', () => {
    const cache = new CanaryCache<number>();
    assert.equal(cache.get('non_existent'), undefined);
  });

  it('returns undefined for expired keys lazily before evictExpired is called', async () => {
    const cache = new CanaryCache<{ name: string }>();
    cache.set('temp', { name: 'tark' }, 20);
    assert.deepEqual(cache.get('temp'), { name: 'tark' });
    
    await new Promise((resolve) => setTimeout(resolve, 35));
    assert.equal(cache.get('temp'), undefined);
  });

  it('throws InvalidTTLExpression for ttlMs <= 0 (zero and negative)', () => {
    const cache = new CanaryCache<string>();
    
    assert.throws(
      () => cache.set('zero_ttl', 'val', 0),
      (err: unknown) => err instanceof InvalidTTLExpression && err.name === 'InvalidTTLExpression'
    );

    assert.throws(
      () => cache.set('neg_ttl', 'val', -500),
      (err: unknown) => err instanceof InvalidTTLExpression && err.name === 'InvalidTTLExpression'
    );
  });

  it('evictExpired accurately returns count for 0, some, and all expired entries', async () => {
    const cache = new CanaryCache<number>();
    cache.set('short1', 10, 20);
    cache.set('short2', 20, 20);
    cache.set('long1', 30, 5000);

    // 0 expired
    assert.equal(cache.evictExpired(), 0);

    // Wait for short entries to expire
    await new Promise((resolve) => setTimeout(resolve, 35));

    // 2 expired, 1 remains
    assert.equal(cache.evictExpired(), 2);
    assert.equal(cache.get('long1'), 30);
    assert.equal(cache.evictExpired(), 0);

    // Add another short item and expire everything
    cache.set('short3', 40, 10);
    cache.set('short4', 50, 10);
    // Replace long1 with a short expiration
    cache.set('long1', 30, 10);

    await new Promise((resolve) => setTimeout(resolve, 25));
    assert.equal(cache.evictExpired(), 3);
    assert.equal(cache.evictExpired(), 0);
  });
});
