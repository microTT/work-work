#!/bin/bash

# Work-Work Framework 状态检查脚本
# 用法: ./scripts/status.sh [选项]

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
    echo "Work-Work Framework 状态检查脚本"
    echo ""
    echo "用法: ./scripts/status.sh [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help      显示帮助信息"
    echo "  -v, --verbose   显示详细信息"
    echo "  -q, --quick     快速检查（跳过健康检查）"
    echo ""
    echo "功能:"
    echo "  • 检查Docker容器状态"
    echo "  • 检查服务健康状况"
    echo "  • 显示服务端口和访问地址"
    echo "  • 检查资源使用情况"
    echo ""
    echo "示例:"
    echo "  ./scripts/status.sh"
    echo "  ./scripts/status.sh --verbose"
    echo "  ./scripts/status.sh --quick"
}

# 检查Docker环境
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker未安装或不可用"
        return 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "docker-compose未安装或不可用"
        return 1
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        log_warning "docker-compose.yml文件不存在"
        return 1
    fi
    
    return 0
}

# 显示容器状态
show_container_status() {
    log_info "Docker容器状态:"
    echo "----------------------------------------"
    
    if docker-compose ps 2>/dev/null; then
        echo ""
    else
        log_warning "无法获取容器状态，可能没有运行的容器"
        return 1
    fi
    
    return 0
}

# 健康检查
check_health() {
    local verbose=$1
    
    log_info "服务健康检查:"
    echo "----------------------------------------"
    
    # 服务配置：名称:端口:健康检查路径
    local services=(
        "云服务:9110:/api/health"
        "家用服务:9111:/api/health"
        "DDNS工具:9910:/health"
    )
    
    local healthy_count=0
    local total_count=${#services[@]}
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r name port path <<< "$service_info"
        
        local url="http://localhost:$port$path"
        
        if curl -f --max-time 5 --silent "$url" > /dev/null 2>&1; then
            echo -e "  ✅ $name (端口:$port): ${GREEN}健康${NC}"
            healthy_count=$((healthy_count + 1))
            
            if [ "$verbose" = true ]; then
                echo -e "     ${BLUE}访问地址: http://localhost:$port${NC}"
            fi
        else
            echo -e "  ❌ $name (端口:$port): ${RED}不健康或未启动${NC}"
            
            if [ "$verbose" = true ]; then
                echo -e "     ${YELLOW}检查地址: $url${NC}"
            fi
        fi
    done
    
    echo ""
    echo -e "健康状态汇总: ${GREEN}$healthy_count${NC}/${total_count} 服务健康"
    
    if [ $healthy_count -eq $total_count ]; then
        log_success "所有服务都运行正常！"
    elif [ $healthy_count -gt 0 ]; then
        log_warning "部分服务异常，请检查日志"
    else
        log_error "所有服务都异常或未启动"
    fi
}

# 显示系统资源使用情况
show_system_resources() {
    log_info "系统资源使用情况:"
    echo "----------------------------------------"
    
    # Docker资源使用
    if command -v docker &> /dev/null; then
        echo "Docker资源:"
        docker system df 2>/dev/null || echo "  无法获取Docker资源信息"
        echo ""
    fi
    
    # 内存使用
    echo "内存使用:"
    if command -v free &> /dev/null; then
        free -h
    else
        echo "  无法获取内存信息"
    fi
    echo ""
    
    # 磁盘使用
    echo "磁盘使用:"
    if command -v df &> /dev/null; then
        df -h / 2>/dev/null | head -2
    else
        echo "  无法获取磁盘信息"
    fi
}

# 显示服务日志（最近几条）
show_recent_logs() {
    log_info "最近的服务日志:"
    echo "----------------------------------------"
    
    if docker-compose logs --tail=5 2>/dev/null; then
        echo ""
    else
        log_warning "无法获取服务日志"
    fi
}

# 显示Docker镜像信息
show_docker_images() {
    log_info "Work-Work Docker镜像:"
    echo "----------------------------------------"
    
    if docker images | grep -E "(work-work|REPOSITORY)" 2>/dev/null; then
        echo ""
    else
        log_warning "没有找到Work-Work相关的Docker镜像"
    fi
}

# 显示服务端口信息
show_service_ports() {
    log_info "服务端口信息:"
    echo "----------------------------------------"
    
    local ports=(
        "9111:家用服务"
        "9110:云服务"
        "9910:DDNS工具"
    )
    
    for port_info in "${ports[@]}"; do
        IFS=':' read -r port name <<< "$port_info"
        
        if lsof -i :$port > /dev/null 2>&1; then
            echo -e "  ✅ 端口 $port ($name): ${GREEN}已使用${NC}"
        else
            echo -e "  ❌ 端口 $port ($name): ${YELLOW}未使用${NC}"
        fi
    done
    
    echo ""
    echo "快速访问地址:"
    echo "  • 家用服务: http://localhost:9111"
    echo "  • 云服务:   http://localhost:9110"
    echo "  • DDNS工具: http://localhost:9910"
}

# 主函数
main() {
    VERBOSE=false
    QUICK=false
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -q|--quick)
                QUICK=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    echo "🔍 Work-Work Framework 状态检查"
    echo "==============================="
    echo ""
    
    # 检查Docker环境
    if ! check_docker; then
        log_error "Docker环境检查失败"
        exit 1
    fi
    
    # 显示容器状态
    if show_container_status; then
        echo ""
        
        # 快速模式跳过健康检查
        if [ "$QUICK" != true ]; then
            check_health "$VERBOSE"
            echo ""
        fi
        
        show_service_ports
        echo ""
        
        # 详细模式显示更多信息
        if [ "$VERBOSE" = true ]; then
            show_docker_images
            echo ""
            
            show_system_resources
            echo ""
            
            show_recent_logs
        fi
        
        log_success "状态检查完成"
    else
        log_warning "没有运行的容器"
        echo ""
        
        log_info "您可以使用以下命令启动服务:"
        echo "  ./scripts/deploy.sh start"
        echo ""
        
        if [ "$VERBOSE" = true ]; then
            show_docker_images
        fi
    fi
}

# 执行主函数
main "$@" 