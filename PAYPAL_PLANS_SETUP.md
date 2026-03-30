# PayPal 订阅计划创建指南

## 第一步：创建产品（Product）

在 PayPal 后台先创建一个产品：

1. 进入 Products 页面
2. 点击 "Create Product"
3. 填写信息：
   - **Product Name**: Image Background Remover Subscription
   - **Product Type**: Digital Goods
   - **Category**: Software
   - **Description**: AI-powered background removal service

## 第二步：创建订阅计划

### Plan 1: Basic Monthly
- **Plan Name**: Basic Plan - Monthly
- **Billing Cycle**: Every 1 Month
- **Price**: $6.90 USD
- **Setup Fee**: $0
- **Trial Period**: None

### Plan 2: Basic Yearly
- **Plan Name**: Basic Plan - Yearly
- **Billing Cycle**: Every 1 Year
- **Price**: $58.80 USD
- **Setup Fee**: $0
- **Trial Period**: None

### Plan 3: Pro Monthly
- **Plan Name**: Pro Plan - Monthly
- **Billing Cycle**: Every 1 Month
- **Price**: $14.90 USD
- **Setup Fee**: $0
- **Trial Period**: None

### Plan 4: Pro Yearly
- **Plan Name**: Pro Plan - Yearly
- **Billing Cycle**: Every 1 Year
- **Price**: $118.80 USD
- **Setup Fee**: $0
- **Trial Period**: None

### Plan 5: Business Monthly
- **Plan Name**: Business Plan - Monthly
- **Billing Cycle**: Every 1 Month
- **Price**: $39.90 USD
- **Setup Fee**: $0
- **Trial Period**: None

### Plan 6: Business Yearly
- **Plan Name**: Business Plan - Yearly
- **Billing Cycle**: Every 1 Year
- **Price**: $334.80 USD
- **Setup Fee**: $0
- **Trial Period**: None

## 第三步：记录 Plan ID

创建每个计划后，PayPal 会生成一个 Plan ID（格式：P-XXXXXXXXX）

记录下来：
```
PAYPAL_PLAN_BASIC_MONTHLY=P-xxxxx
PAYPAL_PLAN_BASIC_YEARLY=P-xxxxx
PAYPAL_PLAN_PRO_MONTHLY=P-xxxxx
PAYPAL_PLAN_PRO_YEARLY=P-xxxxx
PAYPAL_PLAN_BUSINESS_MONTHLY=P-xxxxx
PAYPAL_PLAN_BUSINESS_YEARLY=P-xxxxx
```

## 第四步：配置到 Worker

```bash
cd auth-worker
wrangler secret put PAYPAL_PLAN_BASIC_MONTHLY
wrangler secret put PAYPAL_PLAN_BASIC_YEARLY
wrangler secret put PAYPAL_PLAN_PRO_MONTHLY
wrangler secret put PAYPAL_PLAN_PRO_YEARLY
wrangler secret put PAYPAL_PLAN_BUSINESS_MONTHLY
wrangler secret put PAYPAL_PLAN_BUSINESS_YEARLY
```

## 注意事项

- 沙箱环境和生产环境的 Plan ID 不同
- 需要分别在沙箱和生产环境创建计划
- 切换到生产环境时记得更新所有 Plan ID
