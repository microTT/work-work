import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';

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