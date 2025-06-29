# Work-Work Framework

🚀 一个现代化、模块化的Node.js应用框架，专为家庭网络和云服务管理而设计。

## 📋 项目简介

Work-Work Framework 是一个基于Docker的微服务架构框架，提供了HTTP服务和网络工具的完整解决方案。所有组件完全独立，可以单独开发、构建和部署。

### ✨ 核心特性

- 🏗️ **微服务架构**: 每个组件完全独立，包含自己的配置和依赖
- 🐳 **Docker原生**: 每个服务都有独立的Docker镜像
- 🔧 **简化管理**: 只有3个核心脚本，功能单一易用
- 🌐 **Next.js框架**: HTTP服务基于Next.js，提供现代化的前端体验
- 📊 **实时监控**: 内置健康检查和状态监控
- 🔄 **自动化工具**: DDNS自动更新、网络监控等

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Work-Work Framework                     │
├─────────────────────────────────────────────────────────────┤
│  🌐 HTTP Services                    🔧 Tools               │
│  ┌─────────────────────┐            ┌─────────────────────┐  │
│  │  Cloud HTTP Service │            │     DDNS Tool       │  │
│  │     (Next.js)       │            │   (TypeScript)      │  │
│  │     Port: 9110      │            │     Port: 9910      │  │
│  └─────────────────────┘            └─────────────────────┘  │
│                                                              │
│  ┌─────────────────────┐                                    │
│  │  Home HTTP Service  │                                    │
│  │     (Next.js)       │                                    │
│  │     Port: 9111      │                                    │
│  └─────────────────────┘                                    │
└─────────────────────────────────────────────────────────────┘
```

### 组件说明

| 组件 | 技术栈 | 端口 | 功能描述 |
|------|--------|------|----------|
| **Cloud HTTP Service** | Next.js + TypeScript | 9110 | 云服务API，提供IP查询、系统监控等功能 |
| **Home HTTP Service** | Next.js + TypeScript | 9111 | 家庭网络服务，网络诊断、设备监控等 |
| **DDNS Tool** | TypeScript + Express | 9910 | 动态DNS更新工具，自动监控IP变化 |

## 🚀 快速开始

### 前置要求

- **Node.js** 18+ 
- **Docker** 20+
- **Docker Compose** 2.0+

### 1️⃣ 克隆项目

```bash
git clone <repository-url>
cd work-work
```

### 2️⃣ 启动所有服务

```bash
# 启动所有Docker服务
./scripts/deploy.sh start

# 或者使用Docker Compose
docker-compose up -d
```

### 3️⃣ 验证服务状态

```bash
# 检查服务状态
./scripts/status.sh

# 或查看详细信息
./scripts/status.sh --verbose
```

### 4️⃣ 访问服务

- 🏠 **家用服务**: http://localhost:9111
- ☁️ **云服务**: http://localhost:9110  
- 🔧 **DDNS工具**: http://localhost:9910

## 🛠️ 开发指南

### 本地开发模式

#### 开发单个服务

```bash
# 构建云服务（本地开发模式）
./scripts/build.sh cloud-http-service

# 进入服务目录进行开发
cd services/cloud-http-service
npm run dev
```

#### 构建Docker镜像

```bash
# 构建单个服务的Docker镜像
./scripts/build.sh cloud-http-service --docker

# 清理后重新构建
./scripts/build.sh ddns-tool --docker --clean
```

### 组件开发

每个组件都是完全独立的：

```bash
work-work/
├── services/cloud-http-service/
│   ├── package.json          # 独立的依赖管理
│   ├── Dockerfile            # 独立的Docker构建
│   ├── pages/                # Next.js页面
│   ├── utils/logger.ts       # 组件内部工具
│   └── config/config.json    # 组件配置
├── services/home-http-service/
│   └── ... (类似结构)
└── tools/ddns-tool/
    ├── package.json          # 独立的依赖管理
    ├── src/index.ts          # TypeScript入口
    └── config/config.json    # 工具配置
```

## 📜 脚本使用指南

### 🔨 构建脚本 (`build.sh`)

```bash
# 本地开发构建
./scripts/build.sh <组件名>

# Docker镜像构建  
./scripts/build.sh <组件名> --docker

# 清理后构建
./scripts/build.sh <组件名> --clean

# 可用组件: cloud-http-service, home-http-service, ddns-tool
```

### 🚀 部署脚本 (`deploy.sh`)

```bash
# 启动服务
./scripts/deploy.sh start [组件名]           # 启动所有或指定服务

# 停止服务  
./scripts/deploy.sh stop [组件名]            # 停止所有或指定服务

# 重启服务
./scripts/deploy.sh restart [组件名]         # 重启所有或指定服务

# 清理资源
./scripts/deploy.sh clean [组件名]           # 清理Docker镜像和容器

# 重新部署
./scripts/deploy.sh redeploy [组件名]        # 完整的重新部署流程
```

### 🔍 状态检查脚本 (`status.sh`)

```bash
# 基本状态检查
./scripts/status.sh

# 详细信息检查
./scripts/status.sh --verbose

# 快速检查（跳过健康检查）
./scripts/status.sh --quick
```

## 📡 API 接口文档

### 云服务 (Port: 9110)

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/health` | GET | 服务健康检查 |
| `/api/get-my-ip` | GET | 获取访问者IP地址 |
| `/` | GET | 服务首页，返回 "tide" |

### 家用服务 (Port: 9111)

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/health` | GET | 服务健康检查 |
| `/` | GET | 家用服务管理界面 |

### DDNS工具 (Port: 9910)

| 接口 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 工具健康检查 |
| `/status` | GET | 当前IP状态和配置信息 |
| `/trigger` | POST | 手动触发IP检查和更新 |

## 🔧 配置说明

每个组件都有独立的配置文件：

### 云服务配置 (`services/cloud-http-service/config/config.json`)

```json
{
  "server": {
    "port": 9110,
    "host": "0.0.0.0"
  },
  "api": {
    "rateLimit": 100,
    "timeout": 10000
  },
  "logging": {
    "level": "info",
    "file": "./logs/cloud-service.log"
  }
}
```

### DDNS工具配置 (`tools/ddns-tool/config/config.json`)

```json
{
  "checkInterval": 30,
  "dnsProvider": "cloudflare",
  "ipCheckUrl": "http://cloud-http-service:9110/api/get-my-ip",
  "healthCheck": {
    "enabled": true,
    "port": 9910
  }
}
```

## 🐳 Docker 部署

### 单个服务部署

```bash
# 构建并启动云服务
./scripts/build.sh cloud-http-service --docker
./scripts/deploy.sh start cloud-http-service
```

### 完整系统部署

```bash
# 方式1: 使用部署脚本
./scripts/deploy.sh start

# 方式2: 直接使用Docker Compose
docker-compose up -d

# 检查部署状态
./scripts/status.sh --verbose
```

### 环境变量配置

通过环境变量自定义配置：

```bash
# 设置日志级别
export LOG_LEVEL=debug

# 设置DDNS检查间隔（秒）
export CHECK_INTERVAL_SECONDS=60

# 启动服务
docker-compose up -d
```

## 🔍 监控和日志

### 健康检查

所有服务都提供健康检查接口：

```bash
# 检查所有服务健康状态
curl http://localhost:9111/api/health
curl http://localhost:9110/api/health  
curl http://localhost:9910/health
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs ddns-tool

# 实时跟踪日志
docker-compose logs -f cloud-http-service
```

### 状态监控

```bash
# 完整状态检查
./scripts/status.sh --verbose

# 快速状态检查  
./scripts/status.sh --quick
```

## 🚨 故障排除

### 常见问题

**Q: 服务无法启动**
```bash
# 检查端口占用
./scripts/status.sh
lsof -i :9111,9110,9910

# 清理并重新部署
./scripts/deploy.sh clean
./scripts/deploy.sh redeploy
```

**Q: DDNS工具无法更新DNS**
```bash
# 检查配置
docker-compose logs ddns-tool

# 检查网络连接
docker exec ddns-tool curl http://cloud-http-service:9110/api/get-my-ip
```

**Q: Docker镜像构建失败**
```bash
# 清理Docker缓存
docker system prune -f

# 重新构建
./scripts/build.sh <组件名> --docker --clean
```

## 🔄 更新和维护

### 更新服务

```bash
# 停止服务
./scripts/deploy.sh stop

# 拉取最新代码
git pull

# 重新构建和部署
./scripts/deploy.sh redeploy
```

### 清理系统

```bash
# 清理所有Docker资源
./scripts/deploy.sh clean

# 清理系统缓存
docker system prune -a -f
```

## 🤝 开发规范

### 编程原则

- 🎯 **功能优先**: 优先实现功能，避免过度抽象
- 🔧 **简单设计**: 保持简单，不需要时不添加复杂性
- 📦 **独立组件**: 每个组件完全独立，有自己的依赖和配置
- 🚫 **避免类**: 优先使用函数式编程，避免面向对象

### 代码风格

- 使用 TypeScript 进行类型安全
- 使用 ESLint 和 Prettier 格式化代码
- 为每个组件编写独立的 README（如需要）
- 统一的错误处理和日志记录

## 📚 更多资源

- [Next.js 官方文档](https://nextjs.org/docs)
- [Docker Compose 使用指南](https://docs.docker.com/compose/)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/)

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🙏 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/新功能`)
3. 提交更改 (`git commit -am '添加新功能'`)
4. 推送到分支 (`git push origin feature/新功能`)
5. 创建 Pull Request

---

**项目维护者**: @microTT  
**最后更新**: 2025年6月29日
