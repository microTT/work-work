#!/bin/bash

# Work-Work Framework 简化部署脚本
# 用法: ./scripts/deploy.sh <操作> [组件]

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
    echo "Work-Work Framework 部署脚本"
    echo ""
    echo "用法: ./scripts/deploy.sh <操作> [组件]"
    echo ""
    echo "操作:"
    echo "  start              启动服务"
    echo "  stop               停止服务"
    echo "  restart            重启服务"
    echo "  clean              清理镜像和容器"
    echo "  redeploy           重新部署（停止->清理->启动）"
    echo ""
    echo "组件 (可选):"
    echo "  cloud-http-service    云服务"
    echo "  home-http-service     家用服务"
    echo "  ddns-tool             DDNS工具"
    echo "  不指定组件则操作所有服务"
    echo ""
    echo "选项:"
    echo "  -h, --help            显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./scripts/deploy.sh start"
    echo "  ./scripts/deploy.sh stop ddns-tool"
    echo "  ./scripts/deploy.sh redeploy cloud-http-service"
    echo "  ./scripts/deploy.sh clean"
}

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装或不可用"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose未安装或不可用"
        exit 1
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        log_error "docker-compose.yml文件不存在"
        exit 1
    fi
}

# 获取服务名称
get_service_name() {
    local component=$1
    case $component in
        cloud-http-service) echo "work-work-cloud-http-service" ;;
        home-http-service) echo "work-work-home-http-service" ;;
        ddns-tool) echo "work-work-ddns-tool" ;;
        *) echo "$component" ;;
    esac
}

# 启动服务
start_services() {
    local component=$1
    
    if [ -n "$component" ]; then
        local service_name=$(get_service_name "$component")
        log_info "启动服务: $component"
        docker-compose up -d "$service_name"
    else
        log_info "启动所有服务..."
        docker-compose up -d
    fi
    
    log_success "服务启动完成"
}

# 停止服务
stop_services() {
    local component=$1
    
    if [ -n "$component" ]; then
        local service_name=$(get_service_name "$component")
        log_info "停止服务: $component"
        docker-compose stop "$service_name"
    else
        log_info "停止所有服务..."
        docker-compose down
    fi
    
    log_success "服务停止完成"
}

# 重启服务
restart_services() {
    local component=$1
    
    if [ -n "$component" ]; then
        local service_name=$(get_service_name "$component")
        log_info "重启服务: $component"
        docker-compose restart "$service_name"
    else
        log_info "重启所有服务..."
        docker-compose restart
    fi
    
    log_success "服务重启完成"
}

# 清理镜像和容器
clean_docker() {
    local component=$1
    
    log_info "清理Docker资源..."
    
    if [ -n "$component" ]; then
        local service_name=$(get_service_name "$component")
        local image_name="work-work-$component"
        
        # 停止并删除容器
        docker-compose stop "$service_name" 2>/dev/null || true
        docker-compose rm -f "$service_name" 2>/dev/null || true
        
        # 删除镜像
        docker rmi "$image_name:latest" 2>/dev/null || true
        
        log_success "已清理组件: $component"
    else
        # 停止所有服务
        docker-compose down
        
        # 清理项目相关的镜像
        docker images | grep "work-work-" | awk '{print $1":"$2}' | xargs -r docker rmi
        
        # 清理未使用的资源
        docker container prune -f
        docker image prune -f
        docker network prune -f
        
        log_success "Docker资源清理完成"
    fi
}

# 重新部署
redeploy_services() {
    local component=$1
    
    log_info "开始重新部署..."
    
    # 停止服务
    stop_services "$component"
    
    # 清理资源
    clean_docker "$component"
    
    # 重新构建镜像
    if [ -n "$component" ]; then
        log_info "重新构建镜像: $component"
        ./scripts/build.sh "$component" --docker
    else
        log_info "重新构建所有镜像..."
        ./scripts/build.sh cloud-http-service --docker
        ./scripts/build.sh home-http-service --docker
        ./scripts/build.sh ddns-tool --docker
    fi
    
    # 启动服务
    start_services "$component"
    
    log_success "重新部署完成"
}

# 主函数
main() {
    ACTION=""
    COMPONENT=""
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            start|stop|restart|clean|redeploy)
                ACTION=$1
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
    
    # 检查操作参数
    if [ -z "$ACTION" ]; then
        log_error "请指定要执行的操作"
        show_help
        exit 1
    fi
    
    # 检查Docker环境
    check_docker
    
    log_info "开始执行部署操作..."
    log_info "操作: $ACTION"
    log_info "组件: $([ -n "$COMPONENT" ] && echo "$COMPONENT" || echo "所有服务")"
    echo ""
    
    # 执行对应操作
    case $ACTION in
        start)
            start_services "$COMPONENT"
            ;;
        stop)
            stop_services "$COMPONENT"
            ;;
        restart)
            restart_services "$COMPONENT"
            ;;
        clean)
            clean_docker "$COMPONENT"
            ;;
        redeploy)
            redeploy_services "$COMPONENT"
            ;;
        *)
            log_error "未知操作: $ACTION"
            exit 1
            ;;
    esac
    
    log_success "部署操作完成！"
}

# 执行主函数
main "$@" 