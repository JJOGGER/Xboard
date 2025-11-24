<?php

namespace Plugin\TangchaoPay;

use App\Contracts\PaymentInterface;
use App\Exceptions\ApiException;
use App\Services\Plugin\AbstractPlugin;
use Illuminate\Support\Facades\Log;

class Plugin extends AbstractPlugin implements PaymentInterface
{
    public function boot(): void
    {
        $this->filter('available_payment_methods', function ($methods) {
            if ($this->getConfig('enabled', true)) {
                $methods['TangchaoPay'] = [
                    'name' => $this->getConfig('display_name', '唐朝支付'),
                    'icon' => $this->getConfig('icon', '🏛️'),
                    'plugin_code' => $this->getPluginCode(),
                    'type' => 'plugin'
                ];
            }
            return $methods;
        });
    }

    public function form(): array
    {
        return [
            'app_id' => [
                'label' => 'App ID',
                'type' => 'string',
                'required' => true,
                'description' => '唐朝平台项目 app_id'
            ],
            'merchant_id' => [
                'label' => '商户号',
                'type' => 'string',
                'required' => true,
                'description' => '唐朝支付商户 ID'
            ],
            'private_key' => [
                'label' => 'RSA 私钥',
                'type' => 'text',
                'required' => true,
                'description' => '唐朝后台下载的应用私钥（PKCS1 / PKCS8）'
            ],
            'public_key' => [
                'label' => 'RSA 公钥',
                'type' => 'text',
                'required' => true,
                'description' => '唐朝后台下载的公钥，用于验证回调'
            ],
            'pay_type' => [
                'label' => '支付渠道',
                'type' => 'string',
                'default' => '1',
                'description' => '唐朝支付支持的支付类型，可选值: 1=支付宝, 2=微信, 3=银行卡, 4=数字货币'
            ],
            'currency' => [
                'label' => '币种',
                'type' => 'string',
                'default' => 'rmb',
                'description' => '默认 rmb，可根据唐朝后台配置调整'
            ],
            'ip_allowed' => [
                'label' => '回调白名单 IP',
                'type' => 'string',
                'description' => '可配置逗号分隔的白名单 IP，留空则不校验'
            ],
            'display_name' => [
                'label' => '前台名称',
                'type' => 'string',
                'default' => '唐朝支付',
                'description' => '用户在前台看到的名称'
            ]
        ];
    }

    public function pay($order): array
    {
        if (!$this->getConfig('enabled', true)) {
            throw new ApiException('唐朝支付未启用');
        }

        // 获取配置参数
        $appId = $this->getConfig('app_id');
        $merchantId = $this->getConfig('merchant_id');
        $privateKey = $this->getConfig('private_key');
        $payType = $this->getConfig('pay_type', '1');
        $currency = $this->getConfig('currency', 'rmb');
        
        // 验证必要配置
        if (!$appId || !$merchantId || !$privateKey) {
            throw new ApiException('唐朝支付配置不完整：缺少 app_id、merchant_id 或 private_key');
        }
        
        Log::info('TangchaoPay payment initiated', [
            'app_id' => $appId,
            'merchant_id' => $merchantId,
            'order_no' => $order['trade_no'],
            'amount' => $order['total_amount']
        ]);
        
        // 准备请求参数
        $payload = [
            'amount' => sprintf('%.2f', $order['total_amount'] / 100),  // 转换为元
            'app_id' => $appId,
            'merchant_id' => $merchantId,
            'order_no' => $order['trade_no'],
            'pay_type' => $payType,
            'currency' => $currency,
            'timestamp' => time()
        ];

        // 构建待签名字符串（按照 Demo 的顺序：amount&app_id&currency&merchant_id&order_no&pay_type&timestamp）
        $signContent = 'amount=' . $payload['amount'] . 
                      '&app_id=' . $payload['app_id'] . 
                      '&currency=' . $payload['currency'] . 
                      '&merchant_id=' . $payload['merchant_id'] . 
                      '&order_no=' . $payload['order_no'] . 
                      '&pay_type=' . $payload['pay_type'] . 
                      '&timestamp=' . $payload['timestamp'];
        
        // 检查私钥格式
        if (strpos($privateKey, '-----BEGIN PRIVATE KEY-----') === false) {
            $privateKey = "-----BEGIN PRIVATE KEY-----\n" . 
                         trim($privateKey) . 
                         "\n-----END PRIVATE KEY-----";
        }
        
        // 执行RSA加密
        try {
            $encodeSign = $this->rsaEncrypt($signContent, $privateKey);
        } catch (\Exception $e) {
            $error = "RSA加密失败: " . $e->getMessage();
            Log::error($error, ['exception' => $e]);
            throw new ApiException($error);
        }

        // 按照 Demo 的方式构建请求体（只包含必要参数，不包含 notifyUrl 和 returnUrl）
        $body = [
            'amount' => $payload['amount'],
            'app_id' => $payload['app_id'],
            'merchant_id' => $payload['merchant_id'],
            'order_no' => $payload['order_no'],
            'pay_type' => $payload['pay_type'],
            'currency' => $payload['currency'],
            'encode_sign' => $encodeSign,
            'timestamp' => $payload['timestamp']
        ];

        $response = $this->requestGateway($body);

        if (!isset($response['data']['url'])) {
            $message = $response['msg'] ?? '未获取到支付地址';
            Log::error('TangchaoPay pay failed', ['response' => $response]);
            throw new ApiException($message);
        }

        return [
            'type' => 1,
            'data' => $response['data']['url']
        ];
    }

    public function notify($params): array|bool
    {
        if (!$this->getConfig('enabled', true)) {
            return false;
        }

        if ($allowed = $this->getConfig('ip_allowed')) {
            $allowedIps = array_map('trim', explode(',', $allowed));
            if (!in_array(request()->ip(), $allowedIps, true)) {
                Log::warning('TangchaoPay notify blocked by IP whitelist', ['ip' => request()->ip()]);
                return false;
            }
        }

        $encodeSign = $params['encode_sign'] ?? '';
        $tradeStatus = $params['success'] ?? '';
        $orderNo = $params['order_no'] ?? '';
        $amount = $params['amount'] ?? '';

        // 回调签名参数（根据官方文档，回调使用不同的参数集）
        // 通常包含：amount, invoice_no, order_no, pay_type, success
        $signContent = http_build_query([
            'amount' => $amount,
            'invoice_no' => $params['invoice_no'] ?? '',
            'order_no' => $orderNo,
            'pay_type' => $params['pay_type'] ?? '',
            'success' => $tradeStatus,
        ], '', '&', PHP_QUERY_RFC3986);

        $localSign = $this->rsaEncrypt($signContent, $this->getConfig('private_key'));

        if ($encodeSign !== $localSign) {
            Log::warning('TangchaoPay notify sign mismatch', ['params' => $params]);
            return false;
        }

        if ((string)$tradeStatus !== '1') {
            return false;
        }

        return [
            'trade_no' => $orderNo,
            'callback_no' => $params['invoice_no'] ?? '',
            'custom_result' => 'OK'
        ];
    }

    protected function requestGateway(array $body): array
    {
        // 检查是否使用模拟网关
        $useMock = env('TANGCHAO_USE_MOCK', false);
        $gatewayUrl = $useMock 
            ? env('TANGCHAO_MOCK_URL', 'http://localhost:7001/api/v1/guest/tangchao/mock/gateway')
            : 'https://api.tangchaoshop.com/payment/gateway';
        
        Log::info('TangchaoPay gateway request', [
            'url' => $gatewayUrl,
            'order_no' => $body['order_no'] ?? null,
            'amount' => $body['amount'] ?? null
        ]);
        
        try {
            // 使用 cURL（完全按照 Demo 方式）
            $curl = curl_init();
            
            $startTime = microtime(true);
            
            // 设置 cURL 选项（完全按照 Demo）
            curl_setopt($curl, CURLOPT_URL, $gatewayUrl);
            curl_setopt($curl, CURLOPT_POST, 1);
            curl_setopt($curl, CURLOPT_POSTFIELDS, $body);  // 直接传递数组，cURL 会自动编码
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
            curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);  // 关闭 HTTPS 验证
            curl_setopt($curl, CURLOPT_SSL_VERIFYHOST, false);  // 不验证主机名
            curl_setopt($curl, CURLOPT_TIMEOUT, 30);
            curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 15);
            
            // 修复 TLS 连接问题 - 唐朝支付服务器不支持 TLS 1.3，必须使用 TLS 1.2
            curl_setopt($curl, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1_2);
            curl_setopt($curl, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
            curl_setopt($curl, CURLOPT_SSL_SESSIONID_CACHE, false);
            
            $responseBody = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $curlError = curl_error($curl);
            $curlErrno = curl_errno($curl);
            
            $endTime = microtime(true);
            $totalTime = round(($endTime - $startTime) * 1000, 2);
            
            // 检查 cURL 错误
            if ($curlErrno) {
                Log::error('TangchaoPay cURL error', [
                    'errno' => $curlErrno,
                    'error' => $curlError
                ]);
                curl_close($curl);
                throw new \Exception("cURL 请求失败: {$curlError} (错误码: {$curlErrno})");
            }
            
            Log::info('TangchaoPay gateway response', [
                'duration_ms' => $totalTime,
                'http_code' => $httpCode
            ]);
            
            // 解析 JSON 响应
            $result = json_decode($responseBody, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error('TangchaoPay JSON parse error', [
                    'error' => json_last_error_msg()
                ]);
                curl_close($curl);
                throw new \Exception("支付网关返回了无效的JSON数据");
            }
            
            // 检查业务错误
            if (isset($result['code']) && $result['code'] != 0) {
                $errorMsg = $result['msg'] ?? '未知错误';
                $errorCode = $result['code'];
                
                Log::warning('TangchaoPay business error', [
                    'code' => $errorCode,
                    'message' => $errorMsg,
                    'data' => $result['data'] ?? null
                ]);
                
                curl_close($curl);
                throw new \Exception("支付失败: {$errorMsg} (错误码: {$errorCode})");
            }
            
            curl_close($curl);
            return $result;
            
        } catch (\Exception $e) {
            $errorMsg = $e->getMessage();
            Log::error('TangchaoPay gateway request failed', [
                'url' => $gatewayUrl,
                'error' => $errorMsg
            ]);
            
            throw new \Exception("支付网关请求失败: {$errorMsg}");
            
        } finally {
            if (isset($curl) && is_resource($curl)) {
                curl_close($curl);
            }
        }
    }

    protected function rsaEncrypt(string $data, string $privateKey): string
    {
        // ============ 硬编码的私钥和公钥（用于测试） ============
        $hardcodedPrivateKey = "-----BEGIN PRIVATE KEY-----
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
rWsrQj4i6XMRHQLNEDulG+v0sBS0sQ==
-----END PRIVATE KEY-----";

        $hardcodedPublicKey = "-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAq+h7CCUOcYuBgz/EsceY
x0chU0FI4taIPX1c2nIFfO4xbqnZvRkfmzsnmSncLerO5seE799Gfo0pZeoq+JJ
+Gkm/5fHQZloo5cyTHjPFKQqov9lYYRccUv1//UfWak1n0xh8QGj+JSSTmE4BDad
yJ+WgQD6RoKgLbj8f2HzlEV0fEKbFKIrJL7NngC71PvxnpTdmHICmEbT5pxSMvVk
sNaR/msHeMuntHuRxD1j0i5wRqpktZeeQULx9+b1xprXAQ6+KhKjLUrvspaRmV3+
rI0VsZL55kvlG2uAq82dE/mtYe0WWZC5HRcoEqD47X+3tlZ3ZulYwO83E+Hh2zYa
tLYde9t6vwA+ReJsa1ECR2LX3ClDhQo0cq+cwEnGLFPtzVbQn/mgNRuWrwy4LjAS
TSBcG+IEIsyeKgCpQRORZebUU+Giq//hDNYfYEwe3Y6FOx1RqXiGCVbLnfq/MG+t
zcnoaQZgFLE8rNUpGZ8wsulaU7iOQH6pN6AKqFtn9pK+xwru/EIefs4gJDK20aht
LcedVF3SiCmZMTUQDoRPfGDg11Uj0GjNgTveT4wMAqtul7OYC3OjeDedg7Y3cYtu
/X1pkirbaR2SpkfHYXxSxEAzWcgO1XTxug8f/Pw/4pVedpL+G55nJOQtuxj0uSKI
RnXEVil61Bv6NFwNQRqyxTcCAwEAAQ==
-----END PUBLIC KEY-----";
        
        // 清理私钥中的多余空格和换行
        $privateKey = trim($privateKey);
        
        // 检查私钥格式
        if (strpos($privateKey, '-----BEGIN PRIVATE KEY-----') === false) {
            $privateKey = "-----BEGIN PRIVATE KEY-----\n" . 
                         trim($privateKey) . 
                         "\n-----END PRIVATE KEY-----";
        }
        
        // 尝试加载私钥
        $key = openssl_pkey_get_private($privateKey);
        
        if (!$key) {
            // 尝试修复私钥格式
            $fixedKey = str_replace(['\r\n', '\r'], "\n", $privateKey);
            
            // 确保每行64个字符（PKCS#8标准）
            if (strpos($fixedKey, '-----') !== false) {
                $parts = explode("\n", $fixedKey);
                $header = array_shift($parts);
                $footer = array_pop($parts);
                $keyContent = str_replace(' ', '', implode('', $parts));
                $keyContent = chunk_split($keyContent, 64, "\n");
                $fixedKey = $header . "\n" . $keyContent . $footer;
            }
            
            // 尝试加载修复后的密钥
            $key = openssl_pkey_get_private($fixedKey);
            
            if (!$key) {
                $error = openssl_error_string();
                Log::error('TangchaoPay private key invalid', [
                    'key_length' => strlen($privateKey),
                    'openssl_error' => $error
                ]);
                throw new ApiException('唐朝支付私钥不可用，请检查私钥格式是否正确: ' . $error);
            }
            
            $privateKey = $fixedKey;
        }
        
        // 执行加密
        if (!openssl_private_encrypt($data, $encrypted, $key, OPENSSL_PKCS1_PADDING)) {
            $error = openssl_error_string();
            Log::error('TangchaoPay encryption failed', [
                'openssl_error' => $error,
                'data_length' => strlen($data)
            ]);
            throw new ApiException('唐朝支付签名失败: ' . $error);
        }
        
        // Base64编码
        $encoded = base64_encode($encrypted);
        
        return $encoded;
    }
}


