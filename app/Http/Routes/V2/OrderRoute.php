<?php
namespace App\Http\Routes\V2;

use App\Http\Controllers\V2\User\OrderController;
use Illuminate\Contracts\Routing\Registrar;

class OrderRoute
{
    public function map(Registrar $router)
    {
        $router->group([
            'prefix' => 'order',
            'middleware' => 'user'
        ], function ($router) {
            // 创建订单
            $router->post('/save', [OrderController::class, 'save']);
            
            // 查询用户订单列表
            $router->get('/fetch', [OrderController::class, 'fetch']);
            
            // 订单详情
            $router->get('/detail/{id}', [OrderController::class, 'detail']);
            
            // 取消订单
            $router->post('/cancel/{id}', [OrderController::class, 'cancel']);
            
            // 发起支付
            $router->post('/checkout', [OrderController::class, 'checkout']);
            
            // 检查订单状态
            $router->post('/check', [OrderController::class, 'checkStatus']);
            
            // 获取支付方式列表
            $router->get('/payment-methods', [OrderController::class, 'getPaymentMethods']);
            
            // 获取订单支付信息（保留兼容）
            $router->get('/payment/{tradeNo}', [OrderController::class, 'getPaymentInfo']);
        });
    }
}
