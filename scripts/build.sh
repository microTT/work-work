#!/bin/bash

# Work-Work Framework 简化构建脚本
# 用法: ./scripts/build.sh <组件> [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 显示帮助信息
show_help() {
    echo "Work-Work Framework 构建脚本"
    echo ""
    echo "用法: ./scripts/build.sh <组件> [选项]"
    echo ""
    echo "组件:"
    echo "  cloud-http-service    构建云服务"
    echo "  home-http-service     构建家用服务" 
    echo "  ddns-tool             构建DDNS工具"
    echo ""
    echo "选项:"
    echo "  -d, --docker          构建Docker镜像"
    echo "  -c, --clean           构建前清理"
    echo "  -h, --help            显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./scripts/build.sh cloud-http-service"
    echo "  ./scripts/build.sh ddns-tool --docker"
    echo "  ./scripts/build.sh home-http-service --clean"
}

# 构建Node.js组件（本地开发）
build_local() {
    local component=$1
    local component_path=""
    
    case $component in
        cloud-http-service|home-http-service)
            component_path="services/$component"
            ;;
        ddns-tool)
            component_path="tools/$component"
            ;;
        *)
            log_error "未知组件: $component"
            return 1
            ;;
    esac
    
    if [ ! -d "$component_path" ]; then
        log_error "组件目录不存在: $component_path"
        return 1
    fi
    
    log_info "构建组件: $component (本地开发模式)"
    
    cd "$component_path"
    
    # 清理构建产物
    if [ "$CLEAN" = true ]; then
        log_info "清理构建产物..."
        rm -rf node_modules .next dist build
    fi
    
    # 安装依赖
    log_info "安装依赖..."
    npm ci
    
    # 构建
    if [ -f "package.json" ] && grep -q '"build":' package.json; then
        log_info "编译项目..."
        npm run build
    else
        log_warning "没有找到构建脚本，跳过构建步骤"
    fi
    
    cd - > /dev/null
    log_success "$component 本地构建完成"
}

# 构建Docker镜像
build_docker() {
    local component=$1
    local component_path=""
    local image_name="work-work-$component"
    
    case $component in
        cloud-http-service|home-http-service)
            component_path="services/$component"
            ;;
        ddns-tool)
            component_path="tools/$component"
            ;;
        *)
            log_error "未知组件: $component"
            return 1
            ;;
    esac
    
    if [ ! -d "$component_path" ]; then
        log_error "组件目录不存在: $component_path"
        return 1
    fi
    
    if [ ! -f "$component_path/Dockerfile" ]; then
        log_error "Dockerfile不存在: $component_path/Dockerfile"
        return 1
    fi
    
    log_info "构建Docker镜像: $image_name"
    
    # 清理旧镜像
    if [ "$CLEAN" = true ]; then
        log_info "清理旧镜像..."
        docker rmi "$image_name:latest" 2>/dev/null || true
    fi
    
    # 构建镜像
    docker build -t "$image_name:latest" "$component_path"
    
    if [ $? -eq 0 ]; then
        log_success "Docker镜像构建成功: $image_name:latest"
    else
        log_error "Docker镜像构建失败"
        return 1
    fi
}

# 主函数
main() {
    CLEAN=false
    DOCKER=false
    COMPONENT=""
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                CLEAN=true
                shift
                ;;
            -d|--docker)
                DOCKER=true
                shift
                ;;
            cloud-http-service|home-http-service|ddns-tool)
                COMPONENT=$1
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查组件参数
    if [ -z "$COMPONENT" ]; then
        log_error "请指定要构建的组件"
        show_help
        exit 1
    fi
    
    # 检查Docker环境
    if [ "$DOCKER" = true ] && ! command -v docker &> /dev/null; then
        log_error "Docker未安装或不可用"
        exit 1
    fi
    
    log_info "开始构建..."
    log_info "组件: $COMPONENT"
    log_info "模式: $([ "$DOCKER" = true ] && echo "Docker" || echo "本地开发")"
    log_info "清理: $([ "$CLEAN" = true ] && echo "是" || echo "否")"
    echo ""
    
    # 执行构建
    if [ "$DOCKER" = true ]; then
        build_docker "$COMPONENT"
    else
        build_local "$COMPONENT"
    fi
    
    log_success "构建完成！"
}

# 执行主函数
main "$@" 