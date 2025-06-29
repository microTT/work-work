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
import { AliCloudDNSService } from './alicloud-dns';
import { NotificationService } from './notification';

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
    private networkService: NetworkService,
    private dnsService: AliCloudDNSService | null,
    private notificationService: NotificationService
  ) {}

  async checkIPChange(): Promise<void> {
    try {
      const newIP = await this.networkService.fetchIP();
      if (!newIP) {
        await this.notificationService.sendErrorNotification('Failed to fetch IP address');
        return;
      }

      if (newIP && newIP !== this.currentIP) {
        logger.info(`🔄 IP changed: ${this.currentIP} -> ${newIP}`);
        
        // 更新DNS记录
        const updateSuccess = await this.updateDNSRecord(newIP);
        
        // 发送通知
        await this.notificationService.sendIPChangeNotification(
          this.currentIP, 
          newIP, 
          updateSuccess,
          updateSuccess ? undefined : 'DNS update failed'
        );

        this.currentIP = newIP;
        this.saveCache();
        
      } else if (!this.currentIP) {
        logger.info(`🆕 Initial IP recorded: ${newIP}`);
        
        // 发送初始IP通知
        await this.notificationService.sendInitialIPNotification(newIP);
      }

      
    } catch (error: any) {
      logger.error('Error during IP check', { error: error.message });
      await this.notificationService.sendErrorNotification(error.message, this.currentIP);
    }
  }

  /**
   * 更新DNS记录
   */
  private async updateDNSRecord(newIP: string): Promise<boolean> {
    if (!this.dnsService) {
      logger.warn('DNS服务未配置，跳过DNS更新');
      return false;
    }

    try {
      // 使用配置中的记录ID
      if (!this.config.recordId) {
        logger.error('DNS记录ID未配置，跳过DNS更新');
        return false;
      }

      // 更新DNS记录
      const success = await this.dnsService.updateDomainRecord(this.config.recordId, newIP);
      
      if (success) {
        logger.info('✅ DNS记录更新成功', { recordId: this.config.recordId, newIP });
      } else {
        logger.error('❌ DNS记录更新失败');
      }
      
      return success;
    } catch (error: any) {
      logger.error('DNS更新过程中发生错误', { error: error.message });
      return false;
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
        logger.info('Cache loaded', { 
          currentIP: this.currentIP
        });
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
  private dnsService: AliCloudDNSService | null = null;
  private notificationService: NotificationService;
  private ipMonitorService: IPMonitorService;
  private isRunning: boolean = false;
  private checkTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.app = express();
    this.config = loadConfig();
    this.networkService = new NetworkService(this.config);
    this.notificationService = new NotificationService(this.config);
    
    // 初始化DNS服务（如果配置完整）
    if (this.config.dnsApiKey && this.config.dnsSecretKey) {
      try {
        this.dnsService = new AliCloudDNSService(this.config);
        if (this.dnsService.validateConfig()) {
          logger.info('✅ 阿里云DNS服务初始化成功');
        } else {
          logger.warn('⚠️  DNS配置不完整，DNS功能将被禁用');
          this.dnsService = null;
        }
      } catch (error: any) {
        logger.error('❌ DNS服务初始化失败', { error: error.message });
        this.dnsService = null;
      }
    } else {
      logger.info('DNS凭据未配置，DNS更新功能将被禁用');
    }

    // 验证通知配置
    if (!this.notificationService.validateConfig()) {
      logger.warn('⚠️  通知配置验证失败');
    }

    this.ipMonitorService = new IPMonitorService(
      this.config, 
      this.networkService, 
      this.dnsService,
      this.notificationService
    );
    
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
        isRunning: this.isRunning,
        dnsEnabled: !!this.dnsService,
        webhookEnabled: this.config.enableWebhookNotification
      });
    });

    // IP状态
    this.app.get('/status', (req: express.Request, res: express.Response) => {
      res.json({
        currentIP: this.ipMonitorService.getCurrentIP(),
        recordId: this.config.recordId ? '***' : null,
        isRunning: this.isRunning,
        lastCheck: new Date().toISOString(),
        config: {
          domain: this.config.domainName,
          record: this.config.recordName,
          checkInterval: this.config.checkInterval / 1000,
          dnsEnabled: !!this.dnsService,
          webhookEnabled: this.config.enableWebhookNotification
        }
      });
    });

    // 手动触发IP检查
    this.app.post('/check', async (req: express.Request, res: express.Response) => {
      try {
        logger.info('手动触发IP检查');
        await this.ipMonitorService.checkIPChange();
        res.json({
          success: true,
          message: 'IP check triggered successfully',
          currentIP: this.ipMonitorService.getCurrentIP()
        });
      } catch (error: any) {
        logger.error('手动IP检查失败', { error: error.message });
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
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
  logger.info('🌟 Starting Enhanced DDNS Tool with Alibaba Cloud DNS');
  
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