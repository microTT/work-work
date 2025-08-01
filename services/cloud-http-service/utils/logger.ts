import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { config } from 'dotenv';

// 统一配置文件路径
const UNIFIED_CONFIG_PATH = '/tmp/tide/.env';

// 加载统一配置文件
if (existsSync(UNIFIED_CONFIG_PATH)) {
  config({ path: UNIFIED_CONFIG_PATH });
}

export function createLogger(serviceName: string = 'cloud-http-service'): winston.Logger {
  const logDir = './logs';
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, service }) => {
            return `${timestamp} [${service}] [${level}]: ${message}`;
          })
        )
      }),
      new winston.transports.File({
        filename: `${logDir}/${serviceName}.log`,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        maxsize: 50 * 1024 * 1024, // 50MB
        maxFiles: 5
      })
    ]
  });
} 