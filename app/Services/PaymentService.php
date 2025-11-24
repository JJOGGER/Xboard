<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Payment;
use App\Services\Plugin\PluginManager;
use App\Services\Plugin\HookManager;

class PaymentService
{
    public $method;
    protected $config;
    protected $payment;
    protected $pluginManager;
    protected $class;

    public function __construct($method, $id = NULL, $uuid = NULL)
    {
        $this->method = $method;
        $this->pluginManager = app(PluginManager::class);

        if ($method === 'temp') {
            return;
        }

        if ($id) {
            $payment = Payment::find($id)->toArray();
        }
        if ($uuid) {
            $payment = Payment::where('uuid', $uuid)->first()->toArray();
        }

        $this->config = [];
        if (isset($payment)) {
            // 处理 config - 可能是字符串或数组
            $config = $payment['config'];
            if (is_string($config)) {
                $this->config = json_decode($config, true) ?: [];
            } elseif (is_array($config)) {
                $this->config = $config;
            } else {
                $this->config = [];
            }
            
            $this->config['enable'] = $payment['enable'];
            $this->config['id'] = $payment['id'];
            $this->config['uuid'] = $payment['uuid'];
            $this->config['notify_domain'] = $payment['notify_domain'] ?? '';
        }

        $paymentMethods = $this->getAvailablePaymentMethods();
        if (isset($paymentMethods[$this->method])) {
            $pluginCode = $paymentMethods[$this->method]['plugin_code'];
            $paymentPlugins = $this->pluginManager->getEnabledPaymentPlugins();
            foreach ($paymentPlugins as $plugin) {
                if ($plugin->getPluginCode() === $pluginCode) {
                    $plugin->setConfig($this->config);
                    $this->payment = $plugin;
                    return;
                }
            }
        }

        $this->payment = new $this->class($this->config);
    }

    public function notify($params)
    {
        if (!$this->config['enable'])
            throw new ApiException('gate is not enable');
        return $this->payment->notify($params);
    }

    public function pay($order)
    {
        $logFile = '/tmp/payment_service_debug.log';
        file_put_contents($logFile, "=== PaymentService::pay() called ===\n", FILE_APPEND);
        file_put_contents($logFile, "Method: {$this->method}\n", FILE_APPEND);
        file_put_contents($logFile, "Config keys: " . implode(', ', array_keys($this->config)) . "\n", FILE_APPEND);
        file_put_contents($logFile, "UUID: " . ($this->config['uuid'] ?? 'MISSING') . "\n", FILE_APPEND);
        
        // custom notify domain name
        if (empty($this->config['uuid'])) {
            file_put_contents($logFile, "ERROR: UUID is empty\n", FILE_APPEND);
            throw new ApiException('Payment UUID is not set. Payment method may not be properly configured.');
        }
        
        $notifyUrl = url("/api/v1/guest/payment/notify/{$this->method}/{$this->config['uuid']}");
        if ($this->config['notify_domain']) {
            $parseUrl = parse_url($notifyUrl);
            $notifyUrl = $this->config['notify_domain'] . $parseUrl['path'];
        }

        file_put_contents($logFile, "About to call plugin pay method\n", FILE_APPEND);
        file_put_contents($logFile, "Plugin class: " . get_class($this->payment) . "\n", FILE_APPEND);

        return $this->payment->pay([
            'notify_url' => $notifyUrl,
            'return_url' => source_base_url('/#/order/' . $order['trade_no']),
            'trade_no' => $order['trade_no'],
            'total_amount' => $order['total_amount'],
            'user_id' => $order['user_id'],
            'stripe_token' => $order['stripe_token']
        ]);
    }

    public function form()
    {
        $form = $this->payment->form();
        $result = [];
        foreach ($form as $key => $field) {
            $result[$key] = [
                'type' => $field['type'],
                'label' => $field['label'] ?? '',
                'placeholder' => $field['placeholder'] ?? '',
                'description' => $field['description'] ?? '',
                'value' => $this->config[$key] ?? $field['default'] ?? '',
                'options' => $field['select_options'] ?? $field['options'] ?? []
            ];
        }
        return $result;
    }

    /**
     * 获取所有可用的支付方式
     */
    public function getAvailablePaymentMethods(): array
    {
        $methods = [];

        $methods = HookManager::filter('available_payment_methods', $methods);

        return $methods;
    }

    /**
     * 获取所有支付方式名称列表（用于管理后台）
     */
    public static function getAllPaymentMethodNames(): array
    {
        $pluginManager = app(PluginManager::class);
        $pluginManager->initializeEnabledPlugins();

        $instance = new self('temp');
        $methods = $instance->getAvailablePaymentMethods();

        return array_keys($methods);
    }
}
