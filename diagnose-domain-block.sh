#!/bin/bash
# 域名被墙诊断脚本
# 用于排查同一服务器上个别域名无法访问的问题

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAINS=("mazuvpn.com" "mazuvpn.xyz" "mazuvpn.icu")
TEST_LOCATIONS=(
    "114.114.114.114"  # 国内 DNS
    "223.5.5.5"        # 阿里 DNS
    "8.8.8.8"          # Google DNS
    "1.1.1.1"          # Cloudflare DNS
)

section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${CYAN}[$1] $2${NC}"
    echo -e "${BLUE}========================================${NC}"
}

ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; }
info() { echo -e "${CYAN}ℹ $1${NC}"; }

section "1" "DNS 解析检查"

declare -A DOMAIN_IPS

for domain in "${DOMAINS[@]}"; do
    echo ""
    info "检查域名: $domain"
    
    # 使用不同 DNS 服务器解析
    for dns in "${TEST_LOCATIONS[@]}"; do
        DNS_NAME=$(echo "$dns" | sed 's/114.114.114.114/114DNS/' | sed 's/223.5.5.5/阿里DNS/' | sed 's/8.8.8.8/GoogleDNS/' | sed 's/1.1.1.1/CloudflareDNS/')
        RESOLVED_IP=$(dig +short @"$dns" "$domain" A 2>/dev/null | head -1)
        
        if [ -n "$RESOLVED_IP" ]; then
            echo "  $DNS_NAME: $RESOLVED_IP"
            if [ -z "${DOMAIN_IPS[$domain]}" ]; then
                DOMAIN_IPS[$domain]="$RESOLVED_IP"
            fi
        else
            echo "  $DNS_NAME: ${RED}解析失败${NC}"
        fi
    done
    
    # 检查是否有 DNS 污染（返回假 IP）
    if [ -n "${DOMAIN_IPS[$domain]}" ]; then
        # 检查是否是常见的污染 IP
        POLLUTED_IPS=("127.0.0.1" "0.0.0.0" "1.1.1.1" "8.8.8.8")
        for polluted_ip in "${POLLUTED_IPS[@]}"; do
            if [ "${DOMAIN_IPS[$domain]}" = "$polluted_ip" ]; then
                err "检测到 DNS 污染！返回假 IP: $polluted_ip"
            fi
        done
    fi
done

# 检查所有域名是否解析到同一 IP
echo ""
info "IP 地址汇总:"
UNIQUE_IPS=()
for domain in "${DOMAINS[@]}"; do
    if [ -n "${DOMAIN_IPS[$domain]}" ]; then
        echo "  $domain -> ${DOMAIN_IPS[$domain]}"
        if [[ ! " ${UNIQUE_IPS[@]} " =~ " ${DOMAIN_IPS[$domain]} " ]]; then
            UNIQUE_IPS+=("${DOMAIN_IPS[$domain]}")
        fi
    fi
done

if [ ${#UNIQUE_IPS[@]} -eq 1 ]; then
    ok "所有域名解析到同一 IP: ${UNIQUE_IPS[0]}"
else
    warn "域名解析到不同 IP，可能有问题"
fi

section "2" "HTTP/HTTPS 连接测试"

for domain in "${DOMAINS[@]}"; do
    echo ""
    info "测试域名: $domain"
    
    # 测试 HTTP
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$domain" 2>&1)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
        ok "HTTP 连接正常 (状态码: $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "000" ]; then
        err "HTTP 连接失败（超时或被阻断）"
    else
        warn "HTTP 连接异常 (状态码: $HTTP_CODE)"
    fi
    
    # 测试 HTTPS
    HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$domain" 2>&1)
    if [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "301" ] || [ "$HTTPS_CODE" = "302" ]; then
        ok "HTTPS 连接正常 (状态码: $HTTPS_CODE)"
    elif [ "$HTTPS_CODE" = "000" ]; then
        err "HTTPS 连接失败（超时或被阻断）"
    else
        warn "HTTPS 连接异常 (状态码: $HTTPS_CODE)"
    fi
    
    # 测试 SNI（Server Name Indication）
    SNI_TEST=$(echo | timeout 5 openssl s_client -connect "$domain:443" -servername "$domain" 2>&1 | grep -i "verify return code" | head -1)
    if echo "$SNI_TEST" | grep -q "verify return code: 0"; then
        ok "SNI 连接正常"
    elif echo "$SNI_TEST" | grep -q "verify return code"; then
        warn "SNI 连接有警告: $SNI_TEST"
    else
        err "SNI 连接失败（可能被阻断）"
    fi
    
    # 测试 API 端点
    API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "https://$domain/api/v2/user/info" 2>&1)
    if [ "$API_CODE" = "200" ] || [ "$API_CODE" = "401" ] || [ "$API_CODE" = "403" ]; then
        ok "API 端点可访问 (状态码: $API_CODE)"
    elif [ "$API_CODE" = "000" ]; then
        err "API 端点无法访问（超时或被阻断）"
    else
        warn "API 端点异常 (状态码: $API_CODE)"
    fi
done

section "3" "路由追踪（Traceroute）"

for domain in "${DOMAINS[@]}"; do
    if [ -n "${DOMAIN_IPS[$domain]}" ]; then
        echo ""
        info "追踪到 $domain (${DOMAIN_IPS[$domain]}) 的路由:"
        echo "  注意：这可能需要一些时间..."
        
        # 只显示前 10 跳，避免太长
        if command -v traceroute >/dev/null 2>&1; then
            traceroute -m 10 -w 2 "${DOMAIN_IPS[$domain]}" 2>/dev/null | head -15
        elif command -v tracert >/dev/null 2>&1; then
            tracert -h 10 -w 2000 "${DOMAIN_IPS[$domain]}" 2>/dev/null | head -15
        else
            warn "未找到 traceroute 命令"
        fi
    fi
done

section "4" "SSL 证书检查"

for domain in "${DOMAINS[@]}"; do
    echo ""
    info "检查 $domain 的 SSL 证书:"
    
    CERT_INFO=$(echo | timeout 5 openssl s_client -connect "$domain:443" -servername "$domain" 2>&1)
    
    if echo "$CERT_INFO" | grep -q "Verify return code: 0"; then
        ok "证书验证通过"
        
        # 提取证书信息
        CERT_SUBJECT=$(echo "$CERT_INFO" | grep "subject=" | head -1)
        CERT_ISSUER=$(echo "$CERT_INFO" | grep "issuer=" | head -1)
        CERT_EXPIRY=$(echo "$CERT_INFO" | grep "notAfter" | head -1)
        
        echo "  证书主题: $CERT_SUBJECT"
        echo "  证书颁发者: $CERT_ISSUER"
        echo "  证书有效期: $CERT_EXPIRY"
    else
        err "证书验证失败"
        echo "$CERT_INFO" | grep -i "error\|verify" | head -5
    fi
done

section "5" "域名历史检查建议"

cat <<'EOF'
可以使用以下工具检查域名历史：

1. 在线工具：
   - https://securitytrails.com/domain/mazuvpn.xyz/history
   - https://whois.net/
   - https://dnschecker.org/

2. 检查域名是否曾被用于其他用途：
   - 是否曾被用于其他 VPN/代理服务
   - 是否曾被用于其他敏感内容
   - 注册时间和历史记录

3. 检查 IP 历史：
   - 该 IP 是否曾被其他被墙域名使用
   - IP 的声誉评分
EOF

section "6" "解决方案建议"

cat <<EOF
如果确认 mazuvpn.xyz 被墙，可以尝试以下方案：

1. 【推荐】更换域名
   - 使用新的域名替换 mazuvpn.xyz
   - 更新所有配置和客户端

2. 使用 CDN/代理
   - 使用 Cloudflare 等 CDN 服务
   - 隐藏真实服务器 IP
   - 注意：需要配置正确的 SSL 证书

3. 使用 IP 直连（临时方案）
   - 在客户端配置中使用 IP 地址
   - 注意：需要配置 SNI

4. 使用备用域名
   - 配置多个备用域名
   - 客户端自动切换

5. 检查并优化
   - 检查域名是否在敏感词列表中
   - 考虑使用更"正常"的域名
   - 避免使用明显的 VPN 相关词汇

6. 使用域名前置（Domain Fronting）
   - 使用未被墙的域名作为前端
   - 实际请求转发到真实域名
   - 注意：部分服务商已禁止此技术
EOF

section "7" "快速测试命令"

cat <<EOF
# 1. 测试 DNS 解析（使用不同 DNS）
dig @114.114.114.114 mazuvpn.xyz
dig @8.8.8.8 mazuvpn.xyz
nslookup mazuvpn.xyz 114.114.114.114

# 2. 测试 HTTP 连接
curl -v http://mazuvpn.xyz
curl -v https://mazuvpn.xyz

# 3. 测试 SNI
echo | openssl s_client -connect mazuvpn.xyz:443 -servername mazuvpn.xyz

# 4. 测试路由
traceroute mazuvpn.xyz
# 或
mtr mazuvpn.xyz

# 5. 检查域名 IP 历史
# 访问: https://securitytrails.com/domain/mazuvpn.xyz/history
EOF

echo ""
echo -e "${GREEN}诊断完成！${NC}"
echo ""
echo -e "${YELLOW}提示：${NC}"
echo "1. 如果 DNS 解析正常但连接失败，可能是 SNI 阻断"
echo "2. 如果 DNS 解析到假 IP，是 DNS 污染"
echo "3. 如果部分 DNS 服务器解析正常，部分失败，可能是选择性阻断"
echo ""



