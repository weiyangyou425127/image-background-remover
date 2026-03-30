# PayPal 集成说明

## 环境配置

### Worker 环境变量（wrangler.toml）

```toml
[vars]
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"  # 沙箱环境
# 生产环境: "https://api-m.paypal.com"

[secrets]
PAYPAL_CLIENT_ID = "Aeajzmpx8jJqRSS2iC-0MS4HaFP4_WkRUzUW_wjHgVr0L2_KUHLFOHMVAnPdDCbH5_ELsk7CNCGyL_-g"
PAYPAL_CLIENT_SECRET = "ED9gvjFiZUYpZJwZo_QzAYY_8I4O_zvPXQbD5xvleiqmbF4Dc4dJDNtGE01LUm9hVU_nuAln26TfVE9r"
```

## 集成步骤

### 1. 一次性支付（积分包）

**前端代码：**
```javascript
paypal.Buttons({
  createOrder: async () => {
    const res = await fetch(`${AUTH_API}/api/paypal/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        package: 'credits_10',
        amount: '3.90',
        currency: 'USD',
      }),
    });
    const data = await res.json();
    return data.orderID;
  },
  onApprove: async (data) => {
    const res = await fetch(`${AUTH_API}/api/paypal/capture-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderID: data.orderID }),
    });
    const result = await res.json();
    alert(`支付成功！获得 ${result.credits} 积分`);
  }
}).render('#paypal-button');
```

### 2. 订阅支付

需要先在 PayPal 后台创建订阅计划，然后使用计划 ID。

**创建订阅：**
```javascript
const res = await fetch(`${AUTH_API}/api/paypal/create-subscription`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ plan: 'basic_monthly' }),
});
const data = await res.json();
window.location.href = data.approveLink;
```

## 测试

1. 访问 `/paypal-test.html` 测试支付流程
2. 使用 PayPal 沙箱测试账号
3. 检查数据库 `paid_credits` 字段是否增加

## 部署清单

- [x] paypal-config.js
- [x] paypal-client.js  
- [x] paypal-worker-routes.js
- [x] paypal-subscription.js
- [x] paypal-test.html
- [ ] 更新 auth-worker/src/index.js（合并路由）
- [ ] 更新 pricing.html（集成按钮）
- [ ] 配置环境变量
- [ ] 部署到 Cloudflare Workers
