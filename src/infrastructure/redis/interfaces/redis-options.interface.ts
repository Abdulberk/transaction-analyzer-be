// src/infrastructure/redis/interfaces/redis-options.interface.ts
export interface RedisOptions {
  host: string;
  port: number;
  password?: string;
  ttl?: number;
}
