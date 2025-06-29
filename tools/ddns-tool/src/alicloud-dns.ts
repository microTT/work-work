/**
 * 阿里云DNS服务集成
 */
import Alidns20150109, * as $Alidns20150109 from '@alicloud/alidns20150109';
import OpenApi, * as $OpenApi from '@alicloud/openapi-client';
import Util, * as $Util from '@alicloud/tea-util';
import Credential, * as $Credential from '@alicloud/credentials';
import { createLogger } from '../utils/logger';
import { DDNSConfig } from '../config';

const logger = createLogger('alicloud-dns');

export interface DNSRecord {
  recordId: string;
  domainName: string;
  recordName: string;
  recordType: string;
  value: string;
}

export class AliCloudDNSService {
  private client: Alidns20150109;
  private config: DDNSConfig;

  constructor(config: DDNSConfig) {
    this.config = config;
    this.client = this.createClient();
  }

  /**
   * 创建阿里云DNS客户端
   */
  private createClient(): Alidns20150109 {
    try {
      // 创建凭证配置
      const credentialsConfig = new $Credential.Config({
        // 凭证类型
        type: 'access_key',
        // 设置accessKeyId值
        accessKeyId: this.config.dnsApiKey,
        // 设置accessKeySecret值
        accessKeySecret: this.config.dnsSecretKey,
      });
      
      // 创建凭证客户端
      const credentialClient = new Credential(credentialsConfig);

      // 创建DNS客户端配置
      const config = new $OpenApi.Config();
      config.endpoint = 'alidns.cn-hangzhou.aliyuncs.com'; // 阿里云DNS API端点
      config.credential = credentialClient; // 使用Credentials配置凭证
      
      logger.info('阿里云DNS客户端初始化成功');
      return new Alidns20150109(config);
    } catch (error: any) {
      logger.error('创建阿里云DNS客户端失败', { error: error.message });
      throw error;
    }
  }



  /**
   * 更新DNS记录
   */
  async updateDomainRecord(recordId: string, newIP: string): Promise<boolean> {
    try {
      const updateRequest = new $Alidns20150109.UpdateDomainRecordRequest({
        recordId: recordId,
        RR: this.config.recordName,
        type: this.config.recordType,
        value: newIP,
      });

      const runtime = new $Util.RuntimeOptions({});
      const response = await this.client.updateDomainRecordWithOptions(updateRequest, runtime);
      
      if (response.body?.recordId) {
        logger.info('DNS记录更新成功', { 
          recordId, 
          newIP, 
          responseRecordId: response.body.recordId 
        });
        return true;
      }
      
      logger.warn('DNS记录更新响应异常', { response: response.body });
      return false;
    } catch (error: any) {
      logger.error('更新DNS记录失败', { 
        error: error.message, 
        recordId, 
        newIP,
        recommendation: error.data?.Recommend 
      });
      throw error;
    }
  }



  /**
   * 验证配置是否完整
   */
  validateConfig(): boolean {
    const requiredFields = ['dnsApiKey', 'dnsSecretKey', 'domainName', 'recordName', 'recordId'];
    const missingFields = requiredFields.filter(field => !this.config[field as keyof DDNSConfig]);
    
    if (missingFields.length > 0) {
      logger.error('DNS配置不完整', { missingFields });
      return false;
    }
    
    return true;
  }
} 