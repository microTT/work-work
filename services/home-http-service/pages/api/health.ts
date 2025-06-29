import { NextApiRequest, NextApiResponse } from 'next'
import { createLogger } from '../../utils/logger'

const logger = createLogger('home-http-service')

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = {
      status: 'healthy',
      service: 'home-http-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
    
    logger.info('Health check passed')
    res.status(200).json(response)
  } catch (error) {
    logger.error('Health check failed')
    res.status(500).json({ error: 'Health check failed' })
  }
} 