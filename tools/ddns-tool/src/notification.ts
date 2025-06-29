/**
 * 通知服务 - Webhook通知功能
 */
import axios from 'axios';
import { createLogger } from '../utils/logger';
import { DDNSConfig } from '../config';

const logger = createLogger('notification');

export interface NotificationPayload {
  msgtype: string;
  markdown: {
    title: string;
    text: string;
  };
  at?: {
    isAtAll: boolean;
    atUserIds?: string[];
    atMobiles?: string[];
  };
}

export class NotificationService {
  private config: DDNSConfig;

  constructor(config: DDNSConfig) {
    this.config = config;
  }

  /**
   * 发送IP变更通知
   */
  async sendIPChangeNotification(oldIP: string, newIP: string, updateSuccess: boolean, error?: string): Promise<void> {
    if (!this.config.enableWebhookNotification || !this.config.webhookUrl) {
      logger.debug('Webhook通知未启用或未配置URL');
      return;
    }

    const status = updateSuccess ? '✅ 成功' : '❌ 失败';
    const statusIcon = updateSuccess ? '🟢' : '🔴';
    
    let markdownText = `### ${statusIcon} DDNS IP更新通知\n\n`;
    markdownText += `**域名**: ${this.config.domainName || 'N/A'}\n\n`;
    markdownText += `**记录**: ${this.config.recordName || 'N/A'}\n\n`;
    markdownText += `**旧IP**: \`${oldIP}\`\n\n`;
    markdownText += `**新IP**: \`${newIP}\`\n\n`;
    markdownText += `**状态**: ${status}\n\n`;
    markdownText += `**时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
    
    if (error) {
      markdownText += `**错误信息**: ${error}\n\n`;
    }

    const payload: NotificationPayload = {
      msgtype: 'markdown',
      markdown: {
        title: 'tide - DDNS IP变更通知',
        text: markdownText
      }
    };

    await this.sendWebhook(payload);
  }

  /**
   * 发送初始IP记录通知
   */
  async sendInitialIPNotification(ip: string): Promise<void> {
    if (!this.config.enableWebhookNotification || !this.config.webhookUrl) {
      return;
    }

    let markdownText = `### 🆕 DDNS 初始IP记录\n\n`;
    markdownText += `**域名**: ${this.config.domainName || 'N/A'}\n\n`;
    markdownText += `**记录**: ${this.config.recordName || 'N/A'}\n\n`;
    markdownText += `**IP地址**: \`${ip}\`\n\n`;
    markdownText += `**状态**: ✅ 已记录\n\n`;
    markdownText += `**时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;

    const payload: NotificationPayload = {
      msgtype: 'markdown',
      markdown: {
        title: 'tide - DDNS 初始IP记录',
        text: markdownText
      }
    };

    await this.sendWebhook(payload);
  }

  /**
   * 发送错误通知
   */
  async sendErrorNotification(error: string, ip?: string): Promise<void> {
    if (!this.config.enableWebhookNotification || !this.config.webhookUrl) {
      return;
    }

    let markdownText = `### ⚠️ DDNS 错误通知\n\n`;
    markdownText += `**域名**: ${this.config.domainName || 'N/A'}\n\n`;
    markdownText += `**记录**: ${this.config.recordName || 'N/A'}\n\n`;
    if (ip) {
      markdownText += `**当前IP**: \`${ip}\`\n\n`;
    }
    markdownText += `**错误信息**: ${error}\n\n`;
    markdownText += `**时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;

    const payload: NotificationPayload = {
      msgtype: 'markdown',
      markdown: {
        title: 'tide - DDNS 错误通知',
        text: markdownText
      }
    };

    await this.sendWebhook(payload);
  }

  /**
   * 发送Webhook请求
   */
  private async sendWebhook(payload: NotificationPayload): Promise<void> {
    try {
      logger.info('发送Webhook通知', { title: payload.markdown.title, url: this.config.webhookUrl });
      
      const response = await axios.post(this.config.webhookUrl!, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'DDNS-Tool-Webhook/2.0'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        logger.info('Webhook通知发送成功', { 
          title: payload.markdown.title, 
          status: response.status 
        });
      } else {
        logger.warn('Webhook通知响应异常', { 
          title: payload.markdown.title, 
          status: response.status,
          data: response.data 
        });
      }
    } catch (error: any) {
      logger.error('发送Webhook通知失败', { 
        title: payload.markdown.title,
        error: error.message,
        url: this.config.webhookUrl 
      });
    }
  }

  /**
   * 验证Webhook配置
   */
  validateConfig(): boolean {
    if (this.config.enableWebhookNotification && !this.config.webhookUrl) {
      logger.error('Webhook通知已启用但未配置URL');
      return false;
    }
    return true;
  }
} 