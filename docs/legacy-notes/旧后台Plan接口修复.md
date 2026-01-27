# 旧后台 Plan 接口 500 错误修复

## 问题描述

访问 `/api/v1/user/plan/fetch` 时返回 500 错误：
```
{"message": "遇到了些问题，我们正在进行处理"}
```

## 错误日志

```
[2026-01-24 19:01:24] local.ERROR: Unsupported operand types: string - int
at /Users/jogger/VpnPro/Xboard/app/Services/PlanService.php:201
```

## 问题原因

在 `app/Models/Plan.php` 中，`capacity_limit` 和 `device_limit` 字段没有在 `$casts` 中定义类型转换，导致从数据库读取时是字符串类型。

当 `PlanService.php` 第 201 行执行以下代码时：
```php
return ($plan->capacity_limit - $activeUserCount) > 0;
```

由于 `$plan->capacity_limit` 是字符串，而 `$activeUserCount` 是整数，导致类型错误。

## 解决方案

在 `app/Models/Plan.php` 的 `$casts` 数组中添加类型转换：

```php
protected $casts = [
    'show' => 'boolean',
    'renew' => 'boolean',
    'created_at' => 'timestamp',
    'updated_at' => 'timestamp',
    'group_id' => 'integer',
    'prices' => 'array',
    'tags' => 'array',
    'reset_traffic_method' => 'integer',
    'capacity_limit' => 'integer',      // 新增
    'device_limit' => 'integer',        // 新增
    'sell' => 'boolean',                // 新增
];
```

## 验证

```bash
php artisan tinker --execute="
    \$plan = App\Models\Plan::first();
    echo 'capacity_limit type: ' . gettype(\$plan->capacity_limit);
"
```

输出应该是：`capacity_limit type: integer`

## 影响范围

这是原有代码的 bug，不是新后台配置导致的。修复后：
- ✅ 旧后台 plan/fetch API 正常工作
- ✅ 新后台不受影响
- ✅ 所有使用 Plan 模型的代码都会受益

## 注意事项

这个 bug 可能一直存在，但之前可能没有触发，因为：
1. 数据库中 `capacity_limit` 可能为 NULL
2. 或者没有设置 `capacity_limit` 的套餐

现在修复后，所有涉及 `capacity_limit` 和 `device_limit` 的计算都会正确处理。

---

**修复时间**: 2026-01-24  
**影响**: 旧后台和新后台都受益  
**类型**: Bug 修复（原有代码问题）
