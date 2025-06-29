// DDNS Tool 配置 - 统一配置管理
import { config } from 'dotenv';
import { existsSync } from 'fs';

// 统一配置文件路径
const UNIFIED_CONFIG_PATH = '/tmp/tide/.env';

// 加载统一配置文件
if (existsSync(UNIFIED_CONFIG_PATH)) {
  config({ path: UNIFIED_CONFIG_PATH });
  console.log(`✅ 已加载统一配置: ${UNIFIED_CONFIG_PATH}`);
} else {
  console.warn(`⚠️  统一配置文件不存在: ${UNIFIED_CONFIG_PATH}, 使用默认配置`);
}

export interface DDNSConfig {
  cloudServiceUrl: string;
  checkInterval: number;
  cacheFile: string;
  port: number;
  retryAttempts: number;
  retryDelay: number;
  // 新增敏感配置项
  dnsApiKey?: string;
  dnsSecretKey?: string;
  webhookUrl?: string;
}

export function loadConfig(): DDNSConfig {
  return {
    cloudServiceUrl: process.env.CLOUD_SERVICE_URL || 'http://localhost:9110',
    checkInterval: parseInt(process.env.CHECK_INTERVAL_SECONDS || '30') * 1000,
    cacheFile: process.env.CACHE_FILE_PATH || './cache/ip-cache.json',
    port: parseInt(process.env.HEALTH_CHECK_PORT || '9910'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY_SECONDS || '2') * 1000,
    // 敏感配置项
    dnsApiKey: process.env.DNS_API_KEY,
    dnsSecretKey: process.env.DNS_SECRET_KEY,
    webhookUrl: process.env.WEBHOOK_URL
  };
} 