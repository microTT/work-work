/**
 * DDNS Tool - TypeScript版本
 * 遵循分层架构：配置层、业务逻辑层、网络层
 */

import express from 'express';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger';
import { loadConfig, DDNSConfig } from '../config';

// 日志器
const logger = createLogger('ddns-tool');

// 数据接口
interface CacheData {
  currentIP: string;
  lastUpdate: string;
}

// 网络层 - 负责IP获取
class NetworkService {
  constructor(private config: DDNSConfig) {}

  async fetchIP(): Promise<string | null> {
    const url = `${this.config.cloudServiceUrl}/api/get-my-ip`;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        logger.debug(`Fetching IP (attempt ${attempt})`, { url });
        
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'DDNS-Tool/2.0',
            // 开发环境模拟IP
            ...(process.env.NODE_ENV === 'development' && {
              'X-Real-IP': '203.0.113.100'
            })
          }
        });

        if (response.data && response.data.success && response.data.ip) {
          logger.info(`Successfully fetched IP: ${response.data.ip}`);
          return response.data.ip;
        }
      } catch (error: any) {
        logger.warn(`Failed to fetch IP (attempt ${attempt})`, { 
          error: error.message 
        });
        
        if (attempt < this.config.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    
    logger.error('Failed to fetch IP after all attempts');
    return null;
  }
}

// 业务逻辑层 - 负责IP监控和缓存
class IPMonitorService {
  private currentIP: string = '';
  
  constructor(
    private config: DDNSConfig,
    private networkService: NetworkService
  ) {}

  async checkIPChange(): Promise<void> {
    try {
      const newIP = await this.networkService.fetchIP();
      if (!newIP) return;

      if (this.currentIP && this.currentIP !== newIP) {
        logger.info(`🔄 IP changed: ${this.currentIP} -> ${newIP}`);
        // TODO: 这里可以添加DNS更新和通知逻辑
      } else if (!this.currentIP) {
        logger.info(`🆕 Initial IP recorded: ${newIP}`);
      }

      this.currentIP = newIP;
      this.saveCache();
      
    } catch (error: any) {
      logger.error('Error during IP check', { error: error.message });
    }
  }

  private saveCache(): void {
    try {
      const cacheDir = path.dirname(this.config.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const cacheData: CacheData = {
        currentIP: this.currentIP,
        lastUpdate: new Date().toISOString()
      };

      fs.writeFileSync(this.config.cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error: any) {
      logger.error('Failed to save cache', { error: error.message });
    }
  }

  loadCache(): void {
    try {
      if (fs.existsSync(this.config.cacheFile)) {
        const cacheData: CacheData = JSON.parse(fs.readFileSync(this.config.cacheFile, 'utf-8'));
        this.currentIP = cacheData.currentIP || '';
        logger.info('Cache loaded', { currentIP: this.currentIP });
      }
    } catch (error: any) {
      logger.warn('Failed to load cache', { error: error.message });
    }
  }

  getCurrentIP(): string {
    return this.currentIP;
  }
}

// 应用层 - 负责API和服务编排
class DDNSService {
  private app: express.Application;
  private config: DDNSConfig;
  private networkService: NetworkService;
  private ipMonitorService: IPMonitorService;
  private isRunning: boolean = false;
  private checkTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.app = express();
    this.config = loadConfig();
    this.networkService = new NetworkService(this.config);
    this.ipMonitorService = new IPMonitorService(this.config, this.networkService);
    this.setupRoutes();
    
    logger.info('DDNS Tool initialized');
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    // 健康检查
    this.app.get('/health', (req: express.Request, res: express.Response) => {
      res.json({
        status: 'healthy',
        service: 'ddns-tool',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        currentIP: this.ipMonitorService.getCurrentIP(),
        isRunning: this.isRunning
      });
    });

    // IP状态
    this.app.get('/status', (req: express.Request, res: express.Response) => {
      res.json({
        currentIP: this.ipMonitorService.getCurrentIP(),
        isRunning: this.isRunning,
        lastCheck: new Date().toISOString()
      });
    });
  }

  public start(): void {
    logger.info('🚀 Starting DDNS Tool');
    
    this.ipMonitorService.loadCache();
    this.isRunning = true;

    // 立即检查一次
    this.ipMonitorService.checkIPChange();

    // 定期检查
    this.checkTimer = setInterval(() => {
      this.ipMonitorService.checkIPChange();
    }, this.config.checkInterval);

    // 启动API服务器
    this.app.listen(this.config.port, () => {
      logger.info(`🌐 DDNS API server listening on port ${this.config.port}`);
    });

    logger.info('✅ DDNS service started successfully');
  }

  public stop(): void {
    logger.info('🛑 Stopping DDNS service');
    
    this.isRunning = false;
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    logger.info('✅ DDNS service stopped');
  }
}

// 启动服务
function main(): void {
  logger.info('🌟 Starting Simple DDNS Tool');
  
  const service = new DDNSService();
  
  // 优雅关闭
  process.on('SIGTERM', () => {
    service.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    service.stop();
    process.exit(0);
  });

  // 启动服务
  service.start();
}

if (require.main === module) {
  main();
}

export { DDNSService }; 