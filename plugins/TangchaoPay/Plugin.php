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
        $gatewayUrl = 'https://api.tangchaoshop.com/payment/gateway';
        
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


