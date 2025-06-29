// DDNS Tool 配置 - 就近原则，配置和代码在一起
import { config } from 'dotenv';

// 根据环境加载对应的.env文件
const envFile = process.env.NODE_ENV === 'production' ? '.env' : '.env.local';
config({ path: envFile });

export interface DDNSConfig {
  cloudServiceUrl: string;
  checkInterval: number;
  cacheFile: string;
  port: number;
  retryAttempts: number;
  retryDelay: number;
}

export function loadConfig(): DDNSConfig {
  return {
    cloudServiceUrl: process.env.CLOUD_SERVICE_URL || 'http://localhost:9110',
    checkInterval: parseInt(process.env.CHECK_INTERVAL_SECONDS || '30') * 1000,
    cacheFile: process.env.CACHE_FILE_PATH || './cache/ip-cache.json',
    port: parseInt(process.env.HEALTH_CHECK_PORT || '9910'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY_SECONDS || '2') * 1000
  };
} 