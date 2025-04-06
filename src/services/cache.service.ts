import Redis from 'ioredis';
import { ICacheService } from '@interfaces/index';
import { RedisConfig } from '@config/env';

/**
 * Cache Service
 * Handles Redis operations with better error handling and type safety
 */
export class CacheService implements ICacheService {
  private redis: Redis;
  private times = {
    s: 1000,      // seconds
    m: 60000,     // minutes
    h: 3600000,   // hours
    d: 86400000,  // days
    w: 604800000, // weeks
  };

  /**
   * Initialize Redis connection
   */
  constructor() {
    this.redis = new Redis({
      port: RedisConfig.PORT,
      host: RedisConfig.HOST,
      username: RedisConfig.USERNAME,
      password: RedisConfig.PASSWORD,
      db: RedisConfig.DB,
    });
  }

  /**
   * Get Redis client instance
   */
  public getClient(): Redis {
    return this.redis;
  }

  /**
   * Parse JSON data
   */
  private parseJSON(data: string): any {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  /**
   * Stringify object data
   */
  private resolveJSON(data: any): string {
    if (typeof data === 'object') {
      return JSON.stringify(data);
    }
    return data;
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to store
   * @param expr Expiration time (e.g. '30m', '1h', '7d')
   */
  public async set<T>(key: string, value: T, expr?: `${number}${'s' | 'm' | 'h' | 'd' | 'w'}`): Promise<void> {
    try {
      if (expr) {
        const unit = expr.slice(-1) as 's' | 'm' | 'h' | 'd' | 'w';
        const multiplier = this.times[unit];
        
        if (!multiplier) {
          throw new Error('Invalid time format. Use s, m, h, d, or w (seconds, minutes, hours, days, weeks)');
        }
        
        const duration = +expr.substring(0, expr.length - 1) * multiplier;
        await this.redis.set(key, this.resolveJSON(value), 'PX', duration);
      } else {
        await this.redis.set(key, this.resolveJSON(value));
      }
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set multiple values in cache
   */
  public async multipleSet(data: Record<string, any>): Promise<void> {
    try {
      const formattedData: Record<string, string> = {};
      
      for (const key of Object.keys(data)) {
        formattedData[key] = this.resolveJSON(data[key]);
      }
      
      await this.redis.mset(formattedData);
    } catch (error) {
      console.error('Error setting multiple cache keys:', error);
      throw error;
    }
  }

  /**
   * Get multiple values from cache
   */
  public async multipleGet(keys: string[]): Promise<any[]> {
    try {
      const values = await this.redis.mget(keys);
      return values.map((value) => value ? this.parseJSON(value) : null);
    } catch (error) {
      console.error('Error getting multiple cache keys:', error);
      throw error;
    }
  }

  /**
   * Get a value from cache
   */
  public async get<T>(key: string, raw = false): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      
      if (!value) {
        return null;
      }
      
      return raw ? value as unknown as T : this.parseJSON(value) as T;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a key from cache
   */
  public async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  public async delWithPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length) {
        await this.redis.del(keys);
      }
    } catch (error) {
      console.error(`Error deleting cache keys with pattern ${pattern}:`, error);
      throw error;
    }
  }

  /**
   * Get keys matching a pattern
   */
  public async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      console.error(`Error getting cache keys with pattern ${pattern}:`, error);
      throw error;
    }
  }
}