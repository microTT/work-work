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
  // DNS 配置项
  dnsApiKey?: string;
  dnsSecretKey?: string;
  domainName?: string;
  recordName?: string;
  recordType?: string;
  recordId?: string;
  // 通知配置项
  webhookUrl?: string;
  enableWebhookNotification: boolean;
}

export function loadConfig(): DDNSConfig {
  return {
    cloudServiceUrl: process.env.CLOUD_SERVICE_URL || 'http://localhost:9110',
    checkInterval: parseInt(process.env.CHECK_INTERVAL_SECONDS || '30') * 1000,
    cacheFile: process.env.CACHE_FILE_PATH || './cache/ip-cache.json',
    port: parseInt(process.env.DDNS_HEALTH_PORT || '9910'),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY_SECONDS || '2') * 1000,
    // DNS 配置项
    dnsApiKey: process.env.ALIYUN_AK,
    dnsSecretKey: process.env.ALIYUN_SK,
    domainName: process.env.DOMAIN_NAME, // 例如: example.com
    recordName: process.env.RECORD_NAME, // 例如: www 或 @ (根域名)
    recordType: process.env.RECORD_TYPE || 'A',
    recordId: process.env.RECORD_ID, // 阿里云DNS记录ID
    // 通知配置项
    webhookUrl: process.env.WEBHOOK_URL,
    enableWebhookNotification: !!process.env.WEBHOOK_URL
  };
} 