# 部署指南

## 完成情况

✅ **步骤 1：查看 GitHub 仓库** - 已完成
- 仓库地址：https://github.com/weiyangyou425127/image-background-remover
- 项目结构已分析

✅ **步骤 2：编写 PayPal 集成代码** - 已完成
- paypal-config.js - PayPal 配置
- paypal-client.js - 前端集成
- paypal-worker-routes.js - 后端订单处理
- paypal-subscription.js - 订阅处理
- paypal-test.html - 测试页面
- PAYPAL_INTEGRATION.md - 集成文档

✅ **步骤 3：部署准备** - 已完成
- wrangler.toml - Cloudflare 配置
- deploy.sh - 部署脚本

## 下一步操作

### 1. 合并 PayPal 路由到 Worker

需要将 `paypal-worker-routes.js` 和 `paypal-subscription.js` 的代码合并到 `auth-worker/src/index.js`

### 2. 配置环境变量

```bash
cd auth-worker
wrangler secret put PAYPAL_CLIENT_ID
wrangler secret put PAYPAL_CLIENT_SECRET
```

### 3. 部署 Worker

```bash
cd auth-worker
wrangler deploy
```

### 4. 部署静态网站

```bash
wrangler pages deploy . --project-name=image-background-remover
```

### 5. 配置自定义域名

在 Cloudflare Dashboard 中：
- Pages 项目 → Custom domains
- 添加：imagebackgroundremover.quest

## 测试

1. 访问 https://imagebackgroundremover.quest/paypal-test.html
2. 使用沙箱账号测试支付
3. 检查积分是否到账

## 文件清单

- ✅ paypal-config.js
- ✅ paypal-client.js
- ✅ paypal-worker-routes.js
- ✅ paypal-subscription.js
- ✅ paypal-test.html
- ✅ PAYPAL_INTEGRATION.md
- ✅ wrangler.toml
- ✅ deploy.sh
