<?php

namespace App\Services;

use App\ValueObjects\TrafficInfo;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Yaml\Yaml;

class SubscriptionParserService
{
    // 支持的订阅格式
    const FORMAT_CLASH = 'clash';
    const FORMAT_V2RAY = 'v2ray';
    const FORMAT_SHADOWSOCKS = 'shadowsocks';
    const FORMAT_TROJAN = 'trojan';
    const FORMAT_HYSTERIA = 'hysteria';
    const FORMAT_HYSTERIA2 = 'hysteria2';
    const FORMAT_TUIC = 'tuic';
    const FORMAT_ANYTLS = 'anytls';
    const FORMAT_URI = 'uri'; // 混合URI格式（多行，每行一个协议链接）
    const FORMAT_UNKNOWN = 'unknown';

    /**
     * 检测并解码Base64编码的订阅内容
     * 
     * @param string $content
     * @return string
     */
    public function decodeBase64(string $content): string
    {
        // 移除空白字符
        $content = trim($content);
        
        // 检查是否为Base64编码
        // Base64编码的内容通常只包含A-Z, a-z, 0-9, +, /, =
        if (preg_match('/^[A-Za-z0-9+\/=\s]+$/', $content)) {
            $decoded = base64_decode($content, true);
            
            // 验证解码是否成功
            if ($decoded !== false && base64_encode($decoded) === str_replace(["\r", "\n", " "], '', $content)) {
                return $decoded;
            }
        }
        
        // 如果不是Base64或解码失败，返回原内容
        return $content;
    }

    /**
     * 自动检测订阅格式
     * 
     * @param string $content
     * @return string
     */
    public function detectFormat(string $content): string
    {
        $content = trim($content);
        
        // 先尝试解码Base64
        $decoded = $this->decodeBase64($content);
        
        // 检测Clash YAML格式
        if ($this->isClashFormat($decoded)) {
            return self::FORMAT_CLASH;
        }
        
        // 检测V2Ray JSON格式
        if ($this->isV2RayFormat($decoded)) {
            return self::FORMAT_V2RAY;
        }
        
        // 检测混合URI格式（多行，包含多种协议）
        if ($this->isUriFormat($decoded)) {
            return self::FORMAT_URI;
        }
        
        // 检测Shadowsocks链接格式
        if ($this->isShadowsocksFormat($decoded)) {
            return self::FORMAT_SHADOWSOCKS;
        }
        
        // 检测Trojan链接格式
        if ($this->isTrojanFormat($decoded)) {
            return self::FORMAT_TROJAN;
        }
        
        // 检测Hysteria2格式
        if ($this->isHysteria2Format($decoded)) {
            return self::FORMAT_HYSTERIA2;
        }
        
        // 检测Hysteria格式
        if ($this->isHysteriaFormat($decoded)) {
            return self::FORMAT_HYSTERIA;
        }
        
        // 检测TUIC格式
        if ($this->isTuicFormat($decoded)) {
            return self::FORMAT_TUIC;
        }
        
        // 检测AnyTLS格式
        if ($this->isAnyTlsFormat($decoded)) {
            return self::FORMAT_ANYTLS;
        }
        
        return self::FORMAT_UNKNOWN;
    }

    /**
     * 检测是否为Clash格式
     */
    private function isClashFormat(string $content): bool
    {
        try {
            $data = Yaml::parse($content);
            return is_array($data) && (isset($data['proxies']) || isset($data['proxy-groups']));
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * 检测是否为V2Ray格式
     */
    private function isV2RayFormat(string $content): bool
    {
        $data = json_decode($content, true);
        return is_array($data) && isset($data['outbounds']);
    }

    /**
     * 检测是否为Shadowsocks格式
     */
    private function isShadowsocksFormat(string $content): bool
    {
        return str_contains($content, 'ss://');
    }

    /**
     * 检测是否为Trojan格式
     */
    private function isTrojanFormat(string $content): bool
    {
        return str_contains($content, 'trojan://');
    }

    /**
     * 检测是否为Hysteria格式
     */
    private function isHysteriaFormat(string $content): bool
    {
        return str_contains($content, 'hysteria://');
    }

    /**
     * 检测是否为Hysteria2格式
     */
    private function isHysteria2Format(string $content): bool
    {
        return str_contains($content, 'hysteria2://');
    }

    /**
     * 检测是否为TUIC格式
     */
    private function isTuicFormat(string $content): bool
    {
        return str_contains($content, 'tuic://');
    }

    /**
     * 检测是否为AnyTLS格式
     */
    private function isAnyTlsFormat(string $content): bool
    {
        return str_contains($content, 'anytls://');
    }

    /**
     * 检测是否为混合URI格式
     * 混合URI格式：多行文本，每行一个协议链接（可能包含多种协议）
     */
    private function isUriFormat(string $content): bool
    {
        $lines = explode("\n", $content);
        $protocolCount = 0;
        $protocolTypes = [];
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }
            
            // 检查是否为协议链接
            if (preg_match('/^(ss|ssr|vmess|vless|trojan|hysteria|hysteria2|tuic|anytls):\/\//', $line, $matches)) {
                $protocolCount++;
                $protocolTypes[$matches[1]] = true;
            }
        }
        
        // 如果有多个协议链接，或者有多种不同协议类型，则认为是混合URI格式
        return $protocolCount > 0 && (count($protocolTypes) > 1 || $protocolCount > 1);
    }

    /**
     * 获取支持的格式列表
     */
    public function getSupportedFormats(): array
    {
        return [
            self::FORMAT_CLASH,
            self::FORMAT_V2RAY,
            self::FORMAT_SHADOWSOCKS,
            self::FORMAT_TROJAN,
            self::FORMAT_HYSTERIA,
            self::FORMAT_HYSTERIA2,
            self::FORMAT_TUIC,
            self::FORMAT_ANYTLS,
            self::FORMAT_URI,
        ];
    }

    /**
     * 解析Clash YAML格式
     * 
     * @param string $content
     * @return array
     */
    public function parseClash(string $content): array
    {
        try {
            $data = Yaml::parse($content);
            $nodes = [];
            
            if (!is_array($data)) {
                return $nodes;
            }
            
            // 解析proxies配置
            if (isset($data['proxies']) && is_array($data['proxies'])) {
                foreach ($data['proxies'] as $proxy) {
                    if (!is_array($proxy)) {
                        continue;
                    }
                    
                    $node = $this->parseClashProxy($proxy);
                    if ($node) {
                        $nodes[] = $node;
                    }
                }
            }
            
            return $nodes;
        } catch (\Exception $e) {
            Log::error('Failed to parse Clash subscription', [
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * 解析单个Clash代理节点
     */
    private function parseClashProxy(array $proxy): ?array
    {
        // 必需字段检查
        if (!isset($proxy['name']) || !isset($proxy['server']) || !isset($proxy['port']) || !isset($proxy['type'])) {
            return null;
        }
        
        $node = [
            'name' => $proxy['name'],
            'server' => $proxy['server'],
            'port' => (int)$proxy['port'],
            'protocol' => strtolower($proxy['type']),
        ];
        
        // 根据不同协议提取特定字段
        switch ($node['protocol']) {
            case 'ss':
            case 'shadowsocks':
                $node['cipher'] = $proxy['cipher'] ?? null;
                $node['password'] = $proxy['password'] ?? null;
                $node['plugin'] = $proxy['plugin'] ?? null;
                $node['plugin-opts'] = $proxy['plugin-opts'] ?? null;
                break;
                
            case 'vmess':
                $node['uuid'] = $proxy['uuid'] ?? null;
                $node['alterId'] = $proxy['alterId'] ?? 0;
                $node['cipher'] = $proxy['cipher'] ?? 'auto';
                $node['network'] = $proxy['network'] ?? 'tcp';
                $node['tls'] = $proxy['tls'] ?? false;
                $node['ws-opts'] = $proxy['ws-opts'] ?? null;
                $node['h2-opts'] = $proxy['h2-opts'] ?? null;
                $node['grpc-opts'] = $proxy['grpc-opts'] ?? null;
                break;
                
            case 'trojan':
                $node['password'] = $proxy['password'] ?? null;
                $node['sni'] = $proxy['sni'] ?? null;
                $node['skip-cert-verify'] = $proxy['skip-cert-verify'] ?? false;
                $node['network'] = $proxy['network'] ?? 'tcp';
                $node['ws-opts'] = $proxy['ws-opts'] ?? null;
                $node['grpc-opts'] = $proxy['grpc-opts'] ?? null;
                break;
                
            case 'hysteria':
            case 'hysteria2':
                $node['password'] = $proxy['password'] ?? $proxy['auth'] ?? null;
                $node['obfs'] = $proxy['obfs'] ?? null;
                $node['obfs-password'] = $proxy['obfs-password'] ?? null;
                $node['up'] = $proxy['up'] ?? null;
                $node['down'] = $proxy['down'] ?? null;
                $node['sni'] = $proxy['sni'] ?? null;
                $node['skip-cert-verify'] = $proxy['skip-cert-verify'] ?? false;
                break;
        }
        
        return $node;
    }

    /**
     * 解析V2Ray JSON格式
     * 
     * @param string $content
     * @return array
     */
    public function parseV2Ray(string $content): array
    {
        try {
            $data = json_decode($content, true);
            $nodes = [];
            
            if (!is_array($data) || !isset($data['outbounds'])) {
                return $nodes;
            }
            
            foreach ($data['outbounds'] as $outbound) {
                if (!is_array($outbound)) {
                    continue;
                }
                
                $node = $this->parseV2RayOutbound($outbound);
                if ($node) {
                    $nodes[] = $node;
                }
            }
            
            return $nodes;
        } catch (\Exception $e) {
            Log::error('Failed to parse V2Ray subscription', [
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * 解析单个V2Ray outbound节点
     */
    private function parseV2RayOutbound(array $outbound): ?array
    {
        // 必需字段检查
        if (!isset($outbound['protocol']) || !isset($outbound['settings'])) {
            return null;
        }
        
        $protocol = strtolower($outbound['protocol']);
        $settings = $outbound['settings'];
        
        // 跳过非代理协议
        if (in_array($protocol, ['freedom', 'blackhole', 'dns'])) {
            return null;
        }
        
        $node = [
            'name' => $outbound['tag'] ?? 'Unnamed',
            'protocol' => $protocol,
        ];
        
        // 根据协议提取服务器信息
        switch ($protocol) {
            case 'vmess':
                if (isset($settings['vnext'][0])) {
                    $server = $settings['vnext'][0];
                    $node['server'] = $server['address'] ?? null;
                    $node['port'] = $server['port'] ?? null;
                    
                    if (isset($server['users'][0])) {
                        $user = $server['users'][0];
                        $node['uuid'] = $user['id'] ?? null;
                        $node['alterId'] = $user['alterId'] ?? 0;
                        $node['security'] = $user['security'] ?? 'auto';
                    }
                }
                break;
                
            case 'shadowsocks':
                if (isset($settings['servers'][0])) {
                    $server = $settings['servers'][0];
                    $node['server'] = $server['address'] ?? null;
                    $node['port'] = $server['port'] ?? null;
                    $node['cipher'] = $server['method'] ?? null;
                    $node['password'] = $server['password'] ?? null;
                }
                break;
                
            case 'trojan':
                if (isset($settings['servers'][0])) {
                    $server = $settings['servers'][0];
                    $node['server'] = $server['address'] ?? null;
                    $node['port'] = $server['port'] ?? null;
                    $node['password'] = $server['password'] ?? null;
                }
                break;
        }
        
        // 提取streamSettings
        if (isset($outbound['streamSettings'])) {
            $stream = $outbound['streamSettings'];
            $node['network'] = $stream['network'] ?? 'tcp';
            $node['security'] = $stream['security'] ?? 'none';
            
            if (isset($stream['tlsSettings'])) {
                $node['tls'] = true;
                $node['sni'] = $stream['tlsSettings']['serverName'] ?? null;
                $node['allowInsecure'] = $stream['tlsSettings']['allowInsecure'] ?? false;
            }
            
            // 传输协议特定设置
            if ($node['network'] === 'ws' && isset($stream['wsSettings'])) {
                $node['ws-path'] = $stream['wsSettings']['path'] ?? '/';
                $node['ws-headers'] = $stream['wsSettings']['headers'] ?? [];
            } elseif ($node['network'] === 'h2' && isset($stream['httpSettings'])) {
                $node['h2-path'] = $stream['httpSettings']['path'] ?? '/';
                $node['h2-host'] = $stream['httpSettings']['host'] ?? [];
            } elseif ($node['network'] === 'grpc' && isset($stream['grpcSettings'])) {
                $node['grpc-service-name'] = $stream['grpcSettings']['serviceName'] ?? '';
            }
        }
        
        // 验证必需字段
        if (!isset($node['server']) || !isset($node['port'])) {
            return null;
        }
        
        return $node;
    }

    /**
     * 解析Shadowsocks链接格式
     * 
     * @param string $content
     * @return array
     */
    public function parseShadowsocks(string $content): array
    {
        $nodes = [];
        $lines = explode("\n", $content);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || !str_starts_with($line, 'ss://')) {
                continue;
            }
            
            $node = $this->parseShadowsocksLink($line);
            if ($node) {
                $nodes[] = $node;
            }
        }
        
        return $nodes;
    }

    /**
     * 解析单个Shadowsocks链接
     * 格式: ss://base64(method:password)@server:port#name
     * 或: ss://base64(method:password@server:port)#name
     */
    private function parseShadowsocksLink(string $link): ?array
    {
        try {
            // 移除ss://前缀
            $link = substr($link, 5);
            
            // 分离名称
            $name = 'Unnamed';
            if (str_contains($link, '#')) {
                [$link, $name] = explode('#', $link, 2);
                $name = urldecode($name);
            }
            
            // 分离服务器信息和认证信息
            if (str_contains($link, '@')) {
                // 格式1: base64(method:password)@server:port
                [$auth, $serverInfo] = explode('@', $link, 2);
                $auth = base64_decode($auth, true);
                
                if ($auth === false) {
                    return null;
                }
                
                if (!str_contains($auth, ':')) {
                    return null;
                }
                
                [$method, $password] = explode(':', $auth, 2);
                
                if (!str_contains($serverInfo, ':')) {
                    return null;
                }
                
                [$server, $port] = explode(':', $serverInfo, 2);
            } else {
                // 格式2: base64(method:password@server:port)
                $decoded = base64_decode($link, true);
                
                if ($decoded === false || !str_contains($decoded, '@')) {
                    return null;
                }
                
                [$auth, $serverInfo] = explode('@', $decoded, 2);
                
                if (!str_contains($auth, ':') || !str_contains($serverInfo, ':')) {
                    return null;
                }
                
                [$method, $password] = explode(':', $auth, 2);
                [$server, $port] = explode(':', $serverInfo, 2);
            }
            
            // 移除端口后的参数
            if (str_contains($port, '?')) {
                [$port] = explode('?', $port, 2);
            }
            
            return [
                'name' => $name,
                'server' => $server,
                'port' => (int)$port,
                'protocol' => 'shadowsocks',
                'cipher' => $method,
                'password' => $password,
            ];
        } catch (\Exception $e) {
            Log::warning('Failed to parse Shadowsocks link', [
                'link' => substr($link, 0, 50) . '...',
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 解析Trojan链接格式
     * 
     * @param string $content
     * @return array
     */
    public function parseTrojan(string $content): array
    {
        $nodes = [];
        $lines = explode("\n", $content);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line) || !str_starts_with($line, 'trojan://')) {
                continue;
            }
            
            $node = $this->parseTrojanLink($line);
            if ($node) {
                $nodes[] = $node;
            }
        }
        
        return $nodes;
    }

    /**
     * 解析单个Trojan链接
     * 格式: trojan://password@server:port?params#name
     */
    private function parseTrojanLink(string $link): ?array
    {
        try {
            // 移除trojan://前缀
            $link = substr($link, 9);
            
            // 分离名称
            $name = 'Unnamed';
            if (str_contains($link, '#')) {
                [$link, $name] = explode('#', $link, 2);
                $name = urldecode($name);
            }
            
            // 分离参数
            $params = [];
            if (str_contains($link, '?')) {
                [$link, $queryString] = explode('?', $link, 2);
                parse_str($queryString, $params);
            }
            
            // 分离密码和服务器信息
            if (!str_contains($link, '@')) {
                return null;
            }
            
            [$password, $serverInfo] = explode('@', $link, 2);
            
            if (!str_contains($serverInfo, ':')) {
                return null;
            }
            
            [$server, $port] = explode(':', $serverInfo, 2);
            
            $node = [
                'name' => $name,
                'server' => $server,
                'port' => (int)$port,
                'protocol' => 'trojan',
                'password' => urldecode($password),
            ];
            
            // 提取可选参数
            if (isset($params['sni'])) {
                $node['sni'] = $params['sni'];
            }
            if (isset($params['type'])) {
                $node['network'] = $params['type'];
            }
            if (isset($params['security'])) {
                $node['security'] = $params['security'];
            }
            if (isset($params['allowInsecure'])) {
                $node['allowInsecure'] = $params['allowInsecure'] === '1';
            }
            
            // WebSocket参数
            if (isset($params['path'])) {
                $node['ws-path'] = $params['path'];
            }
            if (isset($params['host'])) {
                $node['ws-host'] = $params['host'];
            }
            
            // gRPC参数
            if (isset($params['serviceName'])) {
                $node['grpc-service-name'] = $params['serviceName'];
            }
            
            return $node;
        } catch (\Exception $e) {
            Log::warning('Failed to parse Trojan link', [
                'link' => substr($link, 0, 50) . '...',
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 解析Hysteria链接格式
     * 
     * @param string $content
     * @return array
     */
    public function parseHysteria(string $content): array
    {
        $nodes = [];
        $lines = explode("\n", $content);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }
            
            if (str_starts_with($line, 'hysteria2://')) {
                $node = $this->parseHysteria2Link($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'hysteria://')) {
                $node = $this->parseHysteriaLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'tuic://')) {
                $node = $this->parseTuicLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'anytls://')) {
                $node = $this->parseAnyTlsLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            }
        }
        
        return $nodes;
    }

    /**
     * 解析混合URI格式
     * 支持多种协议混合在一起的订阅（每行一个协议链接）
     * 
     * @param string $content
     * @return array
     */
    public function parseUri(string $content): array
    {
        $nodes = [];
        $lines = explode("\n", $content);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) {
                continue;
            }
            
            // 根据协议前缀分发到对应的解析器
            if (str_starts_with($line, 'ss://')) {
                $node = $this->parseShadowsocksLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'trojan://')) {
                $node = $this->parseTrojanLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'hysteria2://')) {
                $node = $this->parseHysteria2Link($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'hysteria://')) {
                $node = $this->parseHysteriaLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'vmess://')) {
                $node = $this->parseVmessLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'vless://')) {
                $node = $this->parseVlessLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'tuic://')) {
                $node = $this->parseTuicLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            } elseif (str_starts_with($line, 'anytls://')) {
                $node = $this->parseAnyTlsLink($line);
                if ($node) {
                    $nodes[] = $node;
                }
            }
        }
        
        return $nodes;
    }

    /**
     * 解析Hysteria链接
     * 格式: hysteria://server:port?params#name
     */
    private function parseHysteriaLink(string $link): ?array
    {
        try {
            // 移除hysteria://前缀
            $link = substr($link, 11);
            
            // 分离名称
            $name = 'Unnamed';
            if (str_contains($link, '#')) {
                [$link, $name] = explode('#', $link, 2);
                $name = urldecode($name);
            }
            
            // 分离参数
            $params = [];
            if (str_contains($link, '?')) {
                [$link, $queryString] = explode('?', $link, 2);
                parse_str($queryString, $params);
            }
            
            // 解析服务器和端口
            if (!str_contains($link, ':')) {
                return null;
            }
            
            [$server, $port] = explode(':', $link, 2);
            
            $node = [
                'name' => $name,
                'server' => $server,
                'port' => (int)$port,
                'protocol' => 'hysteria',
            ];
            
            // 提取参数
            if (isset($params['auth'])) {
                $node['password'] = $params['auth'];
            }
            if (isset($params['obfs'])) {
                $node['obfs'] = $params['obfs'];
            }
            if (isset($params['obfsParam'])) {
                $node['obfs-password'] = $params['obfsParam'];
            }
            if (isset($params['upmbps'])) {
                $node['up'] = $params['upmbps'];
            }
            if (isset($params['downmbps'])) {
                $node['down'] = $params['downmbps'];
            }
            if (isset($params['peer'])) {
                $node['sni'] = $params['peer'];
            }
            if (isset($params['insecure'])) {
                $node['skip-cert-verify'] = $params['insecure'] === '1';
            }
            if (isset($params['alpn'])) {
                $node['alpn'] = explode(',', $params['alpn']);
            }
            
            return $node;
        } catch (\Exception $e) {
            Log::warning('Failed to parse Hysteria link', [
                'link' => substr($link, 0, 50) . '...',
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 解析Hysteria2链接
     * 格式: hysteria2://password@server:port?params#name
     */
    private function parseHysteria2Link(string $link): ?array
    {
        try {
            // 移除hysteria2://前缀
            $link = substr($link, 12);
            
            // 分离名称
            $name = 'Unnamed';
            if (str_contains($link, '#')) {
                [$link, $name] = explode('#', $link, 2);
                $name = urldecode($name);
            }
            
            // 分离参数
            $params = [];
            if (str_contains($link, '?')) {
                [$link, $queryString] = explode('?', $link, 2);
                parse_str($queryString, $params);
            }
            
            // 分离密码和服务器信息
            $password = null;
            if (str_contains($link, '@')) {
                [$password, $serverInfo] = explode('@', $link, 2);
                $password = urldecode($password);
            } else {
                $serverInfo = $link;
            }
            
            if (!str_contains($serverInfo, ':')) {
                return null;
            }
            
            [$server, $port] = explode(':', $serverInfo, 2);
            
            $node = [
                'name' => $name,
                'server' => $server,
                'port' => (int)$port,
                'protocol' => 'hysteria2',
            ];
            
            if ($password) {
                $node['password'] = $password;
            }
            
            // 提取参数
            if (isset($params['obfs'])) {
                $node['obfs'] = $params['obfs'];
            }
            if (isset($params['obfs-password'])) {
                $node['obfs-password'] = $params['obfs-password'];
            }
            if (isset($params['sni'])) {
                $node['sni'] = $params['sni'];
            }
            if (isset($params['insecure'])) {
                $node['skip-cert-verify'] = $params['insecure'] === '1';
            }
            
            return $node;
        } catch (\Exception $e) {
            Log::warning('Failed to parse Hysteria2 link', [
                'link' => substr($link, 0, 50) . '...',
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 解析VMess链接
     * 格式: vmess://base64(json)
     */
    private function parseVmessLink(string $link): ?array
    {
        try {
            // 移除vmess://前缀
            $link = substr($link, 8);
            
            // Base64解码
            $decoded = base64_decode($link, true);
            if ($decoded === false) {
                return null;
            }
            
            // 解析JSON
            $config = json_decode($decoded, true);
            if (!is_array($config)) {
                return null;
            }
            
            // 提取必需字段
            if (!isset($config['add']) || !isset($config['port'])) {
                return null;
            }
            
            $node = [
                'name' => $config['ps'] ?? 'Unnamed',
                'server' => $config['add'],
                'port' => (int)$config['port'],
                'protocol' => 'vmess',
                'uuid' => $config['id'] ?? '',
                'alterId' => (int)($config['aid'] ?? 0),
                'cipher' => $config['scy'] ?? 'auto',
                'network' => $config['net'] ?? 'tcp',
            ];
            
            // TLS配置
            if (isset($config['tls']) && $config['tls'] === 'tls') {
                $node['tls'] = true;
                $node['sni'] = $config['sni'] ?? $config['host'] ?? null;
            }
            
            // 传输协议特定配置
            if ($node['network'] === 'ws') {
                $node['ws-path'] = $config['path'] ?? '/';
                if (isset($config['host'])) {
                    $node['ws-headers'] = ['Host' => $config['host']];
                }
            } elseif ($node['network'] === 'h2') {
                $node['h2-path'] = $config['path'] ?? '/';
                if (isset($config['host'])) {
                    $node['h2-host'] = [$config['host']];
                }
            } elseif ($node['network'] === 'grpc') {
                $node['grpc-service-name'] = $config['path'] ?? '';
            }
            
            return $node;
        } catch (\Exception $e) {
            Log::warning('Failed to parse VMess link', [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 解析VLESS链接
     * 格式: vless://uuid@server:port?params#name
     */
    private function parseVlessLink(string $link): ?array
    {
        try {
            // 移除vless://前缀
            $link = substr($link, 8);
            
            // 分离名称
            $name = 'Unnamed';
            if (str_contains($link, '#')) {
                [$link, $name] = explode('#', $link, 2);
                $name = urldecode($name);
            }
            
            // 分离参数
            $params = [];
            if (str_contains($link, '?')) {
                [$link, $queryString] = explode('?', $link, 2);
                parse_str($queryString, $params);
            }
            
            // 分离UUID和服务器信息
            if (!str_contains($link, '@')) {
                return null;
            }
            
            [$uuid, $serverInfo] = explode('@', $link, 2);
            
            if (!str_contains($serverInfo, ':')) {
                return null;
            }
            
            [$server, $port] = explode(':', $serverInfo, 2);
            
            $node = [
                'name' => $name,
                'server' => $server,
                'port' => (int)$port,
                'protocol' => 'vless',
                'uuid' => $uuid,
                'flow' => $params['flow'] ?? null,
            ];
            
            // 加密方式
            if (isset($params['encryption'])) {
                $node['cipher'] = $params['encryption'];
            }
            
            // 传输协议
            if (isset($params['type'])) {
                $node['network'] = $params['type'];
            }
            
            // TLS配置
            if (isset($params['security'])) {
                $node['security'] = $params['security'];
                if ($params['security'] === 'tls' || $params['security'] === 'reality') {
                    $node['tls'] = true;
                    if (isset($params['sni'])) {
                        $node['sni'] = $params['sni'];
                    }
                    if (isset($params['fp'])) {
                        $node['fingerprint'] = $params['fp'];
                    }
                    if (isset($params['allowInsecure'])) {
                        $node['skip-cert-verify'] = $params['allowInsecure'] === '1';
                    }
                }
            }
            
            // WebSocket配置
            if (($node['network'] ?? 'tcp') === 'ws') {
                if (isset($params['path'])) {
                    $node['ws-path'] = $params['path'];
                }
                if (isset($params['host'])) {
                    $node['ws-host'] = $params['host'];
                }
            }
            
            // gRPC配置
            if (($node['network'] ?? 'tcp') === 'grpc') {
                if (isset($params['serviceName'])) {
                    $node['grpc-service-name'] = $params['serviceName'];
                }
            }
            
            return $node;
        } catch (\Exception $e) {
            Log::warning('Failed to parse VLESS link', [
                'link' => substr($link, 0, 50) . '...',
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 解析TUIC链接
     * 格式: tuic://uuid:password@server:port?params#name
     */
    private function parseTuicLink(string $link): ?array
    {
        try {
            // 移除tuic://前缀
            $link = substr($link, 7);
            
            // 分离名称
            $name = 'Unnamed';
            if (str_contains($link, '#')) {
                [$link, $name] = explode('#', $link, 2);
                $name = urldecode($name);
            }
            
            // 分离参数
            $params = [];
            if (str_contains($link, '?')) {
                [$link, $queryString] = explode('?', $link, 2);
                parse_str($queryString, $params);
            }
            
            // 分离认证信息和服务器信息
            if (!str_contains($link, '@')) {
                return null;
            }
            
            [$auth, $serverInfo] = explode('@', $link, 2);
            
            // 解析UUID和密码
            $uuid = null;
            $password = null;
            if (str_contains($auth, ':')) {
                [$uuid, $password] = explode(':', $auth, 2);
            } else {
                $uuid = $auth;
            }
            
            if (!str_contains($serverInfo, ':')) {
                return null;
            }
            
            [$server, $port] = explode(':', $serverInfo, 2);
            
            $node = [
                'name' => $name,
                'server' => $server,
                'port' => (int)$port,
                'protocol' => 'tuic',
                'uuid' => urldecode($uuid),
            ];
            
            if ($password) {
                $node['password'] = urldecode($password);
            }
            
            // 提取可选参数
            if (isset($params['congestion_control'])) {
                $node['congestion_control'] = $params['congestion_control'];
            }
            if (isset($params['udp_relay_mode'])) {
                $node['udp_relay_mode'] = $params['udp_relay_mode'];
            }
            if (isset($params['alpn'])) {
                $node['alpn'] = explode(',', $params['alpn']);
            }
            if (isset($params['sni'])) {
                $node['sni'] = $params['sni'];
            }
            if (isset($params['disable_sni'])) {
                $node['disable_sni'] = $params['disable_sni'] === '1';
            }
            if (isset($params['allow_insecure'])) {
                $node['skip-cert-verify'] = $params['allow_insecure'] === '1';
            }
            
            return $node;
        } catch (\Exception $e) {
            Log::warning('Failed to parse TUIC link', [
                'link' => substr($link, 0, 50) . '...',
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 解析AnyTLS链接
     * 格式: anytls://password@server:port?params#name
     */
    private function parseAnyTlsLink(string $link): ?array
    {
        try {
            // 移除anytls://前缀
            $link = substr($link, 9);
            
            // 分离名称
            $name = 'Unnamed';
            if (str_contains($link, '#')) {
                [$link, $name] = explode('#', $link, 2);
                $name = urldecode($name);
            }
            
            // 分离参数
            $params = [];
            if (str_contains($link, '?')) {
                [$link, $queryString] = explode('?', $link, 2);
                parse_str($queryString, $params);
            }
            
            // 分离密码和服务器信息
            $password = null;
            if (str_contains($link, '@')) {
                [$password, $serverInfo] = explode('@', $link, 2);
                $password = urldecode($password);
            } else {
                $serverInfo = $link;
            }
            
            if (!str_contains($serverInfo, ':')) {
                return null;
            }
            
            [$server, $port] = explode(':', $serverInfo, 2);
            
            $node = [
                'name' => $name,
                'server' => $server,
                'port' => (int)$port,
                'protocol' => 'anytls',
            ];
            
            if ($password) {
                $node['password'] = $password;
            }
            
            // 提取可选参数
            if (isset($params['sni'])) {
                $node['sni'] = $params['sni'];
            }
            if (isset($params['alpn'])) {
                $node['alpn'] = explode(',', $params['alpn']);
            }
            if (isset($params['allow_insecure'])) {
                $node['skip-cert-verify'] = $params['allow_insecure'] === '1';
            }
            
            return $node;
        } catch (\Exception $e) {
            Log::warning('Failed to parse AnyTLS link', [
                'link' => substr($link, 0, 50) . '...',
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 将节点数组转换为指定格式
     * 
     * @param array $nodes
     * @param string $targetFormat
     * @return string
     */
    public function convertFormat(array $nodes, string $targetFormat): string
    {
        switch ($targetFormat) {
            case self::FORMAT_CLASH:
                return $this->convertToClash($nodes);
            case self::FORMAT_V2RAY:
                return $this->convertToV2Ray($nodes);
            case self::FORMAT_SHADOWSOCKS:
                return $this->convertToShadowsocks($nodes);
            default:
                throw new \InvalidArgumentException("Unsupported target format: {$targetFormat}");
        }
    }

    /**
     * 转换为Clash格式
     */
    private function convertToClash(array $nodes): string
    {
        $proxies = [];
        
        foreach ($nodes as $node) {
            $proxy = [
                'name' => $node['name'],
                'type' => $this->normalizeProtocolForClash($node['protocol']),
                'server' => $node['server'],
                'port' => $node['port'],
            ];
            
            // 根据协议添加特定字段
            switch ($proxy['type']) {
                case 'ss':
                    $proxy['cipher'] = $node['cipher'] ?? 'aes-256-gcm';
                    $proxy['password'] = $node['password'] ?? '';
                    if (isset($node['plugin'])) {
                        $proxy['plugin'] = $node['plugin'];
                        $proxy['plugin-opts'] = $node['plugin-opts'] ?? [];
                    }
                    break;
                    
                case 'vmess':
                    $proxy['uuid'] = $node['uuid'] ?? '';
                    $proxy['alterId'] = $node['alterId'] ?? 0;
                    $proxy['cipher'] = $node['cipher'] ?? 'auto';
                    $proxy['network'] = $node['network'] ?? 'tcp';
                    $proxy['tls'] = $node['tls'] ?? false;
                    
                    if ($proxy['network'] === 'ws' && isset($node['ws-path'])) {
                        $proxy['ws-opts'] = [
                            'path' => $node['ws-path'],
                            'headers' => $node['ws-headers'] ?? [],
                        ];
                    }
                    break;
                    
                case 'trojan':
                    $proxy['password'] = $node['password'] ?? '';
                    $proxy['sni'] = $node['sni'] ?? $node['server'];
                    $proxy['skip-cert-verify'] = $node['skip-cert-verify'] ?? false;
                    break;
                    
                case 'hysteria':
                case 'hysteria2':
                    $proxy['password'] = $node['password'] ?? '';
                    if (isset($node['obfs'])) {
                        $proxy['obfs'] = $node['obfs'];
                    }
                    if (isset($node['up'])) {
                        $proxy['up'] = $node['up'];
                    }
                    if (isset($node['down'])) {
                        $proxy['down'] = $node['down'];
                    }
                    $proxy['sni'] = $node['sni'] ?? $node['server'];
                    $proxy['skip-cert-verify'] = $node['skip-cert-verify'] ?? false;
                    break;
            }
            
            $proxies[] = $proxy;
        }
        
        $config = [
            'proxies' => $proxies,
        ];
        
        return Yaml::dump($config, 4, 2);
    }

    /**
     * 转换为V2Ray格式
     */
    private function convertToV2Ray(array $nodes): string
    {
        $outbounds = [];
        
        foreach ($nodes as $node) {
            $outbound = [
                'tag' => $node['name'],
                'protocol' => $this->normalizeProtocolForV2Ray($node['protocol']),
            ];
            
            switch ($outbound['protocol']) {
                case 'vmess':
                    $outbound['settings'] = [
                        'vnext' => [[
                            'address' => $node['server'],
                            'port' => $node['port'],
                            'users' => [[
                                'id' => $node['uuid'] ?? '',
                                'alterId' => $node['alterId'] ?? 0,
                                'security' => $node['security'] ?? 'auto',
                            ]],
                        ]],
                    ];
                    break;
                    
                case 'shadowsocks':
                    $outbound['settings'] = [
                        'servers' => [[
                            'address' => $node['server'],
                            'port' => $node['port'],
                            'method' => $node['cipher'] ?? 'aes-256-gcm',
                            'password' => $node['password'] ?? '',
                        ]],
                    ];
                    break;
                    
                case 'trojan':
                    $outbound['settings'] = [
                        'servers' => [[
                            'address' => $node['server'],
                            'port' => $node['port'],
                            'password' => $node['password'] ?? '',
                        ]],
                    ];
                    break;
            }
            
            // 添加streamSettings
            if (isset($node['network']) || isset($node['tls'])) {
                $outbound['streamSettings'] = [
                    'network' => $node['network'] ?? 'tcp',
                ];
                
                if ($node['tls'] ?? false) {
                    $outbound['streamSettings']['security'] = 'tls';
                    $outbound['streamSettings']['tlsSettings'] = [
                        'serverName' => $node['sni'] ?? $node['server'],
                        'allowInsecure' => $node['allowInsecure'] ?? false,
                    ];
                }
                
                if (($node['network'] ?? 'tcp') === 'ws') {
                    $outbound['streamSettings']['wsSettings'] = [
                        'path' => $node['ws-path'] ?? '/',
                        'headers' => $node['ws-headers'] ?? [],
                    ];
                }
            }
            
            $outbounds[] = $outbound;
        }
        
        $config = [
            'outbounds' => $outbounds,
        ];
        
        return json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    /**
     * 转换为Shadowsocks链接格式
     */
    private function convertToShadowsocks(array $nodes): string
    {
        $links = [];
        
        foreach ($nodes as $node) {
            // 只转换Shadowsocks节点
            if (!in_array($node['protocol'], ['shadowsocks', 'ss'])) {
                continue;
            }
            
            $method = $node['cipher'] ?? 'aes-256-gcm';
            $password = $node['password'] ?? '';
            $server = $node['server'];
            $port = $node['port'];
            $name = $node['name'];
            
            // 格式: ss://base64(method:password)@server:port#name
            $auth = base64_encode("{$method}:{$password}");
            $link = "ss://{$auth}@{$server}:{$port}#" . urlencode($name);
            
            $links[] = $link;
        }
        
        return implode("\n", $links);
    }

    /**
     * 标准化协议名称为Clash格式
     */
    private function normalizeProtocolForClash(string $protocol): string
    {
        $map = [
            'shadowsocks' => 'ss',
            'vmess' => 'vmess',
            'trojan' => 'trojan',
            'hysteria' => 'hysteria',
            'hysteria2' => 'hysteria2',
        ];
        
        return $map[strtolower($protocol)] ?? $protocol;
    }

    /**
     * 标准化协议名称为V2Ray格式
     */
    private function normalizeProtocolForV2Ray(string $protocol): string
    {
        $map = [
            'ss' => 'shadowsocks',
            'shadowsocks' => 'shadowsocks',
            'vmess' => 'vmess',
            'trojan' => 'trojan',
        ];
        
        return $map[strtolower($protocol)] ?? $protocol;
    }

    /**
     * 解析订阅内容（主入口）
     * 
     * @param string $content
     * @return array
     */
    public function parse(string $content): array
    {
        // 先解码Base64
        $decoded = $this->decodeBase64($content);
        
        // 检测格式
        $format = $this->detectFormat($decoded);
        
        if ($format === self::FORMAT_UNKNOWN) {
            throw new \InvalidArgumentException(
                'Unsupported subscription format. Supported formats: ' . 
                implode(', ', $this->getSupportedFormats())
            );
        }
        
        // 根据格式解析
        switch ($format) {
            case self::FORMAT_CLASH:
                return $this->parseClash($decoded);
            case self::FORMAT_V2RAY:
                return $this->parseV2Ray($decoded);
            case self::FORMAT_URI:
                return $this->parseUri($decoded);
            case self::FORMAT_SHADOWSOCKS:
                return $this->parseShadowsocks($decoded);
            case self::FORMAT_TROJAN:
                return $this->parseTrojan($decoded);
            case self::FORMAT_HYSTERIA:
            case self::FORMAT_HYSTERIA2:
            case self::FORMAT_TUIC:
            case self::FORMAT_ANYTLS:
                return $this->parseHysteria($decoded);
            default:
                return [];
        }
    }

    /**
     * 解析subscription-userinfo响应头
     * 
     * 格式示例: upload=123456; download=789012; total=1073741824; expire=1640995200
     * 
     * @param string $headerValue subscription-userinfo头的值
     * @return TrafficInfo|null 解析成功返回TrafficInfo对象，失败返回null
     */
    public function parseTrafficInfo(string $headerValue): ?TrafficInfo
    {
        try {
            // 初始化默认值
            $upload = 0;
            $download = 0;
            $total = 0;
            $expire = null;

            // 分割各个字段（格式: key=value; key=value）
            $parts = array_map('trim', explode(';', $headerValue));

            foreach ($parts as $part) {
                if (empty($part)) {
                    continue;
                }

                // 分割键值对
                if (!str_contains($part, '=')) {
                    continue;
                }

                [$key, $value] = array_map('trim', explode('=', $part, 2));

                // 解析各个字段
                switch (strtolower($key)) {
                    case 'upload':
                        $upload = (int)$value;
                        break;
                    case 'download':
                        $download = (int)$value;
                        break;
                    case 'total':
                        $total = (int)$value;
                        break;
                    case 'expire':
                        $expire = (int)$value;
                        break;
                }
            }

            // 创建TrafficInfo对象
            return new TrafficInfo(
                upload: $upload,
                download: $download,
                total: $total,
                expire: $expire > 0 ? $expire : null
            );
        } catch (\Exception $e) {
            Log::warning('Failed to parse subscription-userinfo header', [
                'header' => $headerValue,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * 从HTTP响应头数组中提取并解析流量信息
     * 
     * @param array $headers HTTP响应头数组（键不区分大小写）
     * @return TrafficInfo|null
     */
    public function parseTrafficInfoFromHeaders(array $headers): ?TrafficInfo
    {
        // 查找subscription-userinfo头（不区分大小写）
        foreach ($headers as $key => $value) {
            if (strcasecmp($key, 'subscription-userinfo') === 0) {
                // 如果值是数组，取第一个元素
                $headerValue = is_array($value) ? ($value[0] ?? '') : $value;
                return $this->parseTrafficInfo($headerValue);
            }
        }

        return null;
    }
}
