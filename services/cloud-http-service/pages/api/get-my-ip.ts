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

    // 获取客户端IP地址
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIP = req.headers['x-real-ip'];
    const remoteAddress = req.socket.remoteAddress;

    let clientIP: string | undefined;
    let source: string = 'unknown';

    // 优先顺序: x-real-ip > x-forwarded-for > remoteAddress
    if (realIP && typeof realIP === 'string') {
      clientIP = realIP;
      source = 'x-real-ip';
      logger.info('IP extracted from X-Real-IP header');
    } else if (forwardedFor) {
      const forwardedIPs = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor;
      clientIP = forwardedIPs.split(',')[0].trim();
      source = 'x-forwarded-for';
      logger.info('IP extracted from X-Forwarded-For header');
    } else if (remoteAddress) {
      clientIP = remoteAddress;
      source = 'socket';
      logger.info('IP extracted from socket');
    }

    // 验证IP地址格式（IPv4）
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!clientIP || !ipv4Regex.test(clientIP)) {
      logger.warn('No valid IPv4 address found in request headers or connection');
      logger.error('Failed to extract valid IPv4 address');
      return res.status(400).json({
        success: false,
        error: 'Unable to determine client IP address'
      });
    }

    const response: IPResponse = {
      success: true,
      ip: clientIP,
      source,
      timestamp: new Date().toISOString()
    };

    logger.info('Successfully returned client IP');
    res.status(200).json(response);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Get-my-ip API error', { error: errorMessage });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
} 