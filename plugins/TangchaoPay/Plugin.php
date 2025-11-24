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

        // 验证必要的配置
        $requiredConfigs = ['app_id', 'merchant_id', 'private_key'];
        foreach ($requiredConfigs as $config) {
            if (empty($this->getConfig($config))) {
                Log::error('TangchaoPay missing required config', ['config' => $config]);
                throw new ApiException("唐朝支付配置不完整：缺少 {$config}");
            }
        }

        $payload = [
            'amount' => number_format($order['total_amount'] / 100, 2, '.', ''),
            'app_id' => $this->getConfig('app_id'),
            'merchant_id' => $this->getConfig('merchant_id'),
            'order_no' => $order['trade_no'],
            'pay_type' => $this->getConfig('pay_type', '1'),
            'currency' => $this->getConfig('currency', 'rmb'),
            'timestamp' => time()
        ];

        $signContent = http_build_query([
            'amount' => $payload['amount'],
            'app_id' => $payload['app_id'],
            'currency' => $payload['currency'],
            'merchant_id' => $payload['merchant_id'],
            'order_no' => $payload['order_no'],
            'pay_type' => $payload['pay_type'],
            'timestamp' => $payload['timestamp'],
        ], '', '&', PHP_QUERY_RFC3986);

        $privateKey = $this->getConfig('private_key');
        $encodeSign = $this->rsaEncrypt($signContent, $privateKey);

        $body = array_merge($payload, [
            'encode_sign' => $encodeSign,
            'notifyUrl' => $order['notify_url'],
            'returnUrl' => $order['return_url']
        ]);

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

        $signContent = http_build_query([
            'amount' => $amount,
            'currency' => $params['currency'] ?? '',
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
        
        try {
            // 使用 curl 而不是 Guzzle，以便更好地控制 SSL
            $ch = curl_init();
            
            curl_setopt($ch, CURLOPT_URL, $gatewayUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($body));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
            
            // SSL 配置
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            
            // 强制使用 TLSv1.2
            curl_setopt($ch, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1_2);
            
            $response = curl_exec($ch);
            $curlErrno = curl_errno($ch);
            
            if ($curlErrno !== 0) {
                $curlError = curl_error($ch);
                curl_close($ch);
                throw new \Exception("Curl error: {$curlError}");
            }
            
            curl_close($ch);
            
            $result = json_decode($response, true) ?? [];
            
            return $result;
        } catch (\Exception $e) {
            Log::error('TangchaoPay gateway request failed', [
                'url' => $gatewayUrl,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    protected function rsaEncrypt(string $data, string $privateKey): string
    {
        // 清理私钥中的多余空格和换行
        $privateKey = trim($privateKey);
        
        // 修复可能被转义的私钥
        $key = openssl_pkey_get_private($privateKey);
        
        // 如果失败，尝试修复转义的字符
        if (!$key) {
            $privateKey = str_replace('\\n', "\n", $privateKey);
            $privateKey = str_replace('\\r', "\r", $privateKey);
            $privateKey = str_replace('\\/', '/', $privateKey);
            $privateKey = str_replace('\\\\', '\\', $privateKey);
            
            $key = openssl_pkey_get_private($privateKey);
        }
        
        if (!$key) {
            Log::error('TangchaoPay private key invalid', [
                'key_start' => substr($privateKey, 0, 50),
                'key_end' => substr($privateKey, -50),
                'key_length' => strlen($privateKey)
            ]);
            throw new ApiException('唐朝支付私钥不可用，请检查私钥格式是否正确');
        }
        
        if (!openssl_private_encrypt($data, $encrypted, $key, OPENSSL_PKCS1_PADDING)) {
            Log::error('TangchaoPay encryption failed', [
                'openssl_error' => openssl_error_string(),
                'data_length' => strlen($data)
            ]);
            throw new ApiException('唐朝支付签名失败: ' . openssl_error_string());
        }
        
        return base64_encode($encrypted);
    }
}


