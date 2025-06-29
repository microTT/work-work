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

// 解析IP地址，支持IPv4和IPv6-mapped IPv4
function parseIPAddress(ipString: string): string | null {
  if (!ipString) return null;
  
  // 处理IPv6-mapped IPv4地址 (::ffff:xxx.xxx.xxx.xxx)
  const ipv6MappedIPv4Regex = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;
  const ipv6Match = ipString.match(ipv6MappedIPv4Regex);
  if (ipv6Match) {
    return ipv6Match[1]; // 返回IPv4部分
  }
  
  // 处理纯IPv4地址
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ipString)) {
    return ipString;
  }
  
  return null;
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
    const clientIP = req.headers['x-client-ip'];
    const remoteAddress = req.socket.remoteAddress;

    let clientIPAddress: string | null = null;
    let source: string = 'unknown';

    // 优先顺序: x-real-ip > x-client-ip > x-forwarded-for > remoteAddress
    if (realIP && typeof realIP === 'string') {
      clientIPAddress = parseIPAddress(realIP);
      if (clientIPAddress) {
        source = 'x-real-ip';
        logger.info('IP extracted from X-Real-IP header', { original: realIP, parsed: clientIPAddress });
      }
    } else if (clientIP && typeof clientIP === 'string') {
      clientIPAddress = parseIPAddress(clientIP);
      if (clientIPAddress) {
        source = 'x-client-ip';
        logger.info('IP extracted from X-Client-IP header', { original: clientIP, parsed: clientIPAddress });
      }
    } else if (forwardedFor) {
      const forwardedIPs = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor;
      const firstIP = forwardedIPs.split(',')[0].trim();
      clientIPAddress = parseIPAddress(firstIP);
      if (clientIPAddress) {
        source = 'x-forwarded-for';
        logger.info('IP extracted from X-Forwarded-For header', { original: firstIP, parsed: clientIPAddress });
      }
    } else if (remoteAddress) {
      clientIPAddress = parseIPAddress(remoteAddress);
      if (clientIPAddress) {
        source = 'socket';
        logger.info('IP extracted from socket', { original: remoteAddress, parsed: clientIPAddress });
      }
    }

    if (!clientIPAddress) {
      logger.warn('No valid IP address found in request headers or connection');
      logger.error('Failed to extract valid IP address');
      return res.status(400).json({
        headers: req.headers as unknown as Record<string, string>,
        success: false,
        error: 'Unable to determine client IP address'
      });
    }

    const response: IPResponse = {
      success: true,
      ip: clientIPAddress,
      source,
      timestamp: new Date().toISOString(),
      headers: req.headers as unknown as Record<string, string>,
    };

    logger.info('Successfully returned client IP', { ip: clientIPAddress, source });
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