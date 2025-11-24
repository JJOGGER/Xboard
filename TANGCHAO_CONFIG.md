# 唐朝支付 - 唐朝后台配置指南
前端用户点击"结账"
    ↓
1️⃣ 前端调用 POST /api/v1/user/order/checkout
   参数: {
     trade_no: "订单号",
     method: "支付方式ID"
   }
    ↓
2️⃣ OrderController::checkout() 处理
   - 验证订单是否存在且未支付
   - 获取支付方式配置 (Payment 模型)
   - 计算手续费
   - 保存 payment_id 到订单
    ↓
3️⃣ 创建 PaymentService 实例
   $paymentService = new PaymentService(
     $payment->payment,  // "TangchaoPay"
     $payment->id        // 支付方式ID
   )
    ↓
4️⃣ 调用 $paymentService->pay() 方法
   参数: {
     trade_no: "订单号",
     total_amount: "订单金额",
     user_id: "用户ID",
     stripe_token: "可选的支付token"
   }
    ↓
5️⃣ PaymentService::pay() 处理
   - 生成回调 URL: /api/v1/guest/payment/notify/TangchaoPay/{uuid}
   - 生成返回 URL: /#/order/{trade_no}
   - 调用 Plugin::pay() 方法
    ↓
6️⃣ TangchaoPay Plugin::pay() 处理
   - 构建支付参数:
     {
       amount: "金额",
       app_id: "配置的app_id",
       merchant_id: "配置的商户号",
       order_no: "trade_no",
       pay_type: "支付类型",
       currency: "币种",
       timestamp: "时间戳"
     }
   - 使用 RSA 私钥签名
   - 添加回调 URL 和返回 URL
   - 调用 requestGateway() 向唐朝支付 API 请求
    ↓
7️⃣ 唐朝支付 API 返回支付地址
   {
     data: {
       url: "https://tangchao.com/pay?..."
     }
   }
    ↓
8️⃣ 返回给前端
   {
     type: 1,  // 1=跳转, 0=二维码
     data: "支付地址"
   }
    ↓
9️⃣ 前端跳转到唐朝支付页面
   用户完成支付
    ↓
🔟 唐朝支付回调 XBoard
   POST /api/v1/guest/payment/notify/TangchaoPay/{uuid}
   参数包含: success, amount, order_no, encode_sign 等
    ↓
1️⃣1️⃣ PaymentController::notify() 处理
   - 验证签名
   - 调用 Plugin::notify() 验证
   - 返回 "OK" 给唐朝
    ↓
1️⃣2️⃣ OrderService::paid() 标记订单为已支付
   - 更新订单状态为 1 (已支付)
   - 激活用户订阅
    ↓
1️⃣3️⃣ 前端轮询检查订单状态
   GET /api/v1/user/order/check?trade_no=xxx
   - 如果状态为 1，显示成功页面
   - 跳转到 /#/order/{trade_no}


## 需要在唐朝后台填写的 URL

根据 XBoard 系统的代码，以下是三个关键 URL 的说明和生成规则：

### 1. 回调 URL (Notify URL)
**用途**：唐朝支付完成后，向 XBoard 发送支付结果通知

**URL 格式**：
```
https://你的域名/api/v1/guest/payment/notify/TangchaoPay/{uuid}
```

**示例**：
```
https://example.com/api/v1/guest/payment/notify/TangchaoPay/abc123def456
```

**说明**：
- `https://你的域名` = 你的 XBoard 访问地址（如 https://vpn.example.com）
- `{uuid}` = 在 XBoard 后台"系统设置 → 支付方式"中，唐朝支付的 UUID（系统自动生成）

**获取 UUID 的方法**：
1. 登录 XBoard 后台
2. 进入"系统设置 → 支付方式"
3. 找到"唐朝支付"，点击编辑
4. 在 URL 栏或支付方式列表中查看 UUID（通常是一个长字符串）

---

### 2. 返回页面 URL (Return URL)
**用途**：支付完成后，用户浏览器跳转回 XBoard 的订单页面

**URL 格式**：
```
https://你的域名/#/order/{trade_no}
```

**示例**：
```
https://example.com/#/order/2024112312345678
```

**说明**：
- `https://你的域名` = 你的 XBoard 前端访问地址
- `{trade_no}` = 订单号，由 XBoard 动态生成，唐朝会在回调时传回

**配置建议**：
- 如果你的前端和后端同域名：`https://example.com/#/order/{trade_no}`
- 如果前端有独立域名：`https://frontend.example.com/#/order/{trade_no}`

---

### 3. 退款回调 URL (Refund Notify URL)
**用途**：用户申请退款时，唐朝向 XBoard 发送退款结果通知

**URL 格式**：
```
https://你的域名/api/v1/guest/payment/refund/TangchaoPay/{uuid}
```

**示例**：
```
https://example.com/api/v1/guest/payment/refund/TangchaoPay/abc123def456
```

**说明**：
- 与回调 URL 类似，但路径是 `/refund/` 而不是 `/notify/`
- 同样需要使用唐朝支付的 UUID

---

## 快速配置清单

假设你的配置是：
- **XBoard 域名**：`https://vpn.example.com`
- **唐朝支付 UUID**：`550e8400-e29b-41d4-a716-446655440000`

那么在唐朝后台填写：

| 配置项 | 填写内容 |
|--------|--------|
| 回调 URL | `https://vpn.example.com/api/v1/guest/payment/notify/TangchaoPay/550e8400-e29b-41d4-a716-446655440000` |
| 返回页面 URL | `https://vpn.example.com/#/order/{trade_no}` |
| 退款回调 URL | `https://vpn.example.com/api/v1/guest/payment/refund/TangchaoPay/550e8400-e29b-41d4-a716-446655440000` |

---

## 如何获取 UUID

### 方法 1：从数据库查询
```bash
# 进入容器
docker compose exec -T web bash

# 查询唐朝支付的 UUID
php artisan tinker
>>> DB::table('payments')->where('payment', 'TangchaoPay')->first();
```

### 方法 2：从后台界面查看
1. 登录 XBoard 后台
2. 系统设置 → 支付方式
3. 找到"唐朝支付"行，UUID 通常显示在表格中

### 方法 3：从 API 查询
```bash
curl http://localhost:7001/api/v2/admin/payment/fetch \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 注意事项

1. **域名必须可公网访问**：唐朝服务器需要能访问你的回调 URL
2. **HTTPS 推荐**：生产环境建议使用 HTTPS
3. **{trade_no} 占位符**：返回页面 URL 中的 `{trade_no}` 是占位符，唐朝会自动替换为实际订单号
4. **时间同步**：确保服务器时间准确，否则签名验证会失败
5. **IP 白名单**：在 XBoard 后台配置唐朝服务器 IP（23.225.190.42）到"回调白名单 IP"

---

## 测试方法

配置完成后，可以：
1. 在 XBoard 前端创建订单
2. 选择唐朝支付
3. 跳转到唐朝支付页面
4. 完成支付
5. 验证是否正确回调和跳转

如果有问题，查看日志：
```bash
docker compose logs web --tail 100 | grep -i tangchao
```
