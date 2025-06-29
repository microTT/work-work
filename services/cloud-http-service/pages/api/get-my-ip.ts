import requestIp from 'request-ip';
import { NextApiRequest, NextApiResponse } from 'next';

import { createLogger } from '../../utils/logger';

// 创建专用日志器
const logger = createLogger('get-my-ip-api');

interface IPResponse {
  success: boolean;
  ip?: string;
  source?: string;
  timestamp?: string;
  error?: string;
  headers?: Record<string, string>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IPResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    logger.info('Get-my-ip API request');

    // 使用 request-ip 包获取客户端IP地址
    const clientIP = requestIp.getClientIp(req);
    
    if (!clientIP) {
      logger.warn('No IP address found by request-ip package');
      logger.error('Failed to extract IP address');
      return res.status(400).json({
        headers: req.headers as unknown as Record<string, string>,
        success: false,
        error: 'Unable to determine client IP address'
      });
    }

    // 验证IP地址格式（IPv4）
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(clientIP)) {
      logger.warn('Invalid IPv4 address format', { ip: clientIP });
      logger.error('Failed to extract valid IPv4 address');
      return res.status(400).json({
        headers: req.headers as unknown as Record<string, string>,
        success: false,
        error: 'Invalid IP address format'
      });
    }

    const response: IPResponse = {
      success: true,
      ip: clientIP,
      source: 'request-ip',
      timestamp: new Date().toISOString(),
      headers: req.headers as unknown as Record<string, string>,
    };

    logger.info('Successfully returned client IP', { ip: clientIP });
    res.status(200).json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Get-my-ip API error', { error: errorMessage });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      headers: req.headers as unknown as Record<string, string>,
    });
  }
} 