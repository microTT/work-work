import { NextApiRequest, NextApiResponse } from 'next'
import { createLogger } from '../../../../utils/logger'

// 创建专用日志器
const logger = createLogger('xai-proxy-api')

// xai API 配置
const XAI_BASE_URL = 'https://api.x.ai'
const XAI_ENDPOINT = '/v1/chat/completions'

interface XAIErrorResponse {
  error: string
  details?: string
  timestamp: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 声明超时 ID 变量
  let timeoutId: NodeJS.Timeout | undefined

  try {
    logger.info('XAI proxy request received', {
      method: req.method,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type']
    })

    // 获取 XAI API Key
    const xaiApiKey = process.env.XAI_API_KEY || req.headers['x-xai-api-key']
    
    if (!xaiApiKey) {
      logger.error('XAI API key not found')
      return res.status(401).json({
        error: 'XAI API key not configured',
        details: 'Please set XAI_API_KEY environment variable or provide x-xai-api-key header',
        timestamp: new Date().toISOString()
      } as XAIErrorResponse)
    }

    // 准备转发请求的头部
    const forwardHeaders: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Authorization': `Bearer ${xaiApiKey}`,
      'User-Agent': req.headers['user-agent'] || 'cloud-http-service-proxy/1.0.0'
    }

    // 构建目标 URL
    const targetUrl = `${XAI_BASE_URL}${XAI_ENDPOINT}`

    // 创建超时控制器
    const abortController = new AbortController()
    timeoutId = setTimeout(() => {
      abortController.abort()
    }, 600000) // 10分钟超时

    // 准备请求配置
    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers: forwardHeaders,
      signal: abortController.signal
    }

    // 如果有请求体，添加到转发请求中
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      if (typeof req.body === 'string') {
        fetchOptions.body = req.body
      } else {
        fetchOptions.body = JSON.stringify(req.body)
      }
    }

    logger.info('Forwarding request to XAI', {
      targetUrl,
      method: req.method,
      hasBody: !!fetchOptions.body
    })

    // 发起代理请求
    const xaiResponse = await fetch(targetUrl, fetchOptions)
    
    // 清理超时定时器
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // 获取响应内容
    const responseText = await xaiResponse.text()
    
    logger.info('XAI response received', {
      status: xaiResponse.status,
      statusText: xaiResponse.statusText,
      contentLength: responseText.length
    })

    // 设置响应头
    res.status(xaiResponse.status)
    
    // 转发一些重要的响应头
    const headersToForward = [
      'content-type',
      'cache-control',
      'expires',
      'last-modified',
      'etag'
    ]

    headersToForward.forEach(headerName => {
      const headerValue = xaiResponse.headers.get(headerName)
      if (headerValue) {
        res.setHeader(headerName, headerValue)
      }
    })

    // 尝试解析 JSON 响应
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (parseError) {
      // 如果不是 JSON，返回原始文本
      logger.warn('XAI response is not valid JSON', {
        contentType: xaiResponse.headers.get('content-type'),
        responsePreview: responseText.substring(0, 200)
      })
      return res.send(responseText)
    }

    // 记录成功的响应
    if (xaiResponse.ok) {
      logger.info('XAI proxy request successful', {
        status: xaiResponse.status,
        model: responseData?.model,
        usage: responseData?.usage
      })
    } else {
      logger.warn('XAI API returned error', {
        status: xaiResponse.status,
        error: responseData?.error || responseData?.message
      })
    }

    res.json(responseData)

  } catch (error) {
    // 清理超时定时器
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('XAI proxy error', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })

    // 区分不同类型的错误
    if (error instanceof Error) {
      // 处理 AbortError (超时)
      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: 'XAI API request timeout',
          details: 'The request took too long to complete (timeout: 10 minutes)',
          timestamp: new Date().toISOString()
        } as XAIErrorResponse)
      }
      
      if (error.message.includes('fetch')) {
        return res.status(502).json({
          error: 'Failed to connect to XAI API',
          details: 'The XAI service might be temporarily unavailable',
          timestamp: new Date().toISOString()
        } as XAIErrorResponse)
      }
    }

    res.status(500).json({
      error: 'Internal proxy error',
      details: errorMessage,
      timestamp: new Date().toISOString()
    } as XAIErrorResponse)
  }
} 