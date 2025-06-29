import { NextApiRequest, NextApiResponse } from 'next'
import { createLogger } from '../../utils/logger'

// 创建服务专用日志器
const logger = createLogger('cloud-http-service')

interface HealthResponse {
  status: 'healthy' | 'unhealthy'
  service: string
  timestamp: string
  uptime: number
  environment: string
  version: string
  checks: {
    memory: {
      status: 'ok' | 'warning' | 'critical'
      used: number
      total: number
      percentage: number
    }
    security: {
      status: 'ok' | 'warning'
      httpsOnly: boolean
      secureHeaders: boolean
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // 获取内存使用情况
    const memoryUsage = process.memoryUsage()
    const totalMemory = memoryUsage.heapTotal
    const usedMemory = memoryUsage.heapUsed
    const memoryPercentage = (usedMemory / totalMemory) * 100

    // 内存状态评估
    let memoryStatus: 'ok' | 'warning' | 'critical' = 'ok'
    if (memoryPercentage > 90) {
      memoryStatus = 'critical'
    } else if (memoryPercentage > 70) {
      memoryStatus = 'warning'
    }

    // 安全检查（云服务器特有）
    const isHttps = req.headers['x-forwarded-proto'] === 'https' || 
                   (req.connection as any).encrypted || 
                   process.env.NODE_ENV === 'development'
    
    const hasSecureHeaders = !!(
      req.headers['x-content-type-options'] ||
      req.headers['x-frame-options'] ||
      req.headers['strict-transport-security']
    )

    const securityStatus: 'ok' | 'warning' = (isHttps && hasSecureHeaders) ? 'ok' : 'warning'

    // 构建健康检查响应
    const healthResponse: HealthResponse = {
      status: (memoryStatus === 'critical' || securityStatus === 'warning') ? 'unhealthy' : 'healthy',
      service: 'cloud-http-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        memory: {
          status: memoryStatus,
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: Math.round(memoryPercentage * 100) / 100
        },
        security: {
          status: securityStatus,
          httpsOnly: isHttps,
          secureHeaders: hasSecureHeaders
        }
      }
    }

    // 记录健康检查日志
    if (healthResponse.status === 'healthy') {
      logger.info('Health check passed', {
        uptime: healthResponse.uptime,
        memory: healthResponse.checks.memory,
        security: healthResponse.checks.security
      })
    } else {
      logger.warn('Health check failed', {
        uptime: healthResponse.uptime,
        memory: healthResponse.checks.memory,
        security: healthResponse.checks.security
      })
    }

    // 根据健康状态设置HTTP状态码
    const statusCode = healthResponse.status === 'healthy' ? 200 : 503

    res.status(statusCode).json(healthResponse)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Health check endpoint error', { error: errorMessage })
    
    res.status(500).json({
      error: 'Internal server error during health check'
    })
  }
} 