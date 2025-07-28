module.exports = {
  apps: [
    {
      name: 'cloud-http-service',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 9110
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 9110
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 9110
      },
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
      
      // 进程管理
      min_uptime: '10s',
      max_restarts: 10,
      
      // 其他配置
      merge_logs: true,
      time: true
    }
  ]
}; 