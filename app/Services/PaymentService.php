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

        // 初始化插件系统，确保插件已加载
        $this->pluginManager->initializeEnabledPlugins();

        $payment = null;
        if ($id) {
            $paymentModel = Payment::find($id);
            if ($paymentModel) {
                $payment = $paymentModel->toArray();
            }
        }
        if (!$payment && $uuid) {
            $paymentModel = Payment::where('uuid', $uuid)->first();
            if ($paymentModel) {
                $payment = $paymentModel->toArray();
            }
        }

        $this->config = [];
        if ($payment) {
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
            // 如果从数据库读取，method 应该从 payment 字段获取
            if (isset($payment['payment'])) {
                $this->method = $payment['payment'];
            }
        }

        // 获取可用的支付方式
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

        // 如果找不到插件，抛出异常
        throw new ApiException('支付方式不存在或插件未启用: ' . $this->method);
    }

    public function notify($params)
    {
        if (!$this->payment) {
            throw new ApiException('支付插件未初始化');
        }
        if (!isset($this->config['enable']) || !$this->config['enable']) {
            throw new ApiException('支付方式未启用');
        }
        return $this->payment->notify($params);
    }

    public function pay($order)
    {
        if (!$this->payment) {
            throw new ApiException('支付插件未初始化');
        }
        
        // 对于唐朝支付，使用固定路径
        if ($this->method === 'TangchaoPay') {
            $notifyUrl = url("/api/payment/tangchao/notify");
        } else {
            if (!isset($this->config['uuid']) || empty($this->config['uuid'])) {
                throw new ApiException('支付方式配置不完整，UUID未设置');
            }
            $notifyUrl = url("/api/v1/guest/payment/notify/{$this->method}/{$this->config['uuid']}");
        }

        // 自定义通知域名
        if (!empty($this->config['notify_domain'])) {
            $parseUrl = parse_url($notifyUrl);
            $notifyUrl = $this->config['notify_domain'] . $parseUrl['path'];
        }

        return $this->payment->pay([
            'notify_url' => $notifyUrl,
            'return_url' => source_base_url('/#/order/' . $order['trade_no']),
            'trade_no' => $order['trade_no'],
            'total_amount' => $order['total_amount'],
            'user_id' => $order['user_id'],
            'stripe_token' => $order['stripe_token'] ?? null
        ]);
    }

    public function form()
    {
        if (!$this->payment) {
            throw new ApiException('支付插件未初始化');
        }

        $form = $this->payment->form();
        if (!is_array($form)) {
            throw new ApiException('支付插件 form() 方法返回格式错误');
        }

        $result = [];
        foreach ($form as $key => $field) {
            $result[$key] = [
                'type' => $field['type'] ?? 'string',
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
