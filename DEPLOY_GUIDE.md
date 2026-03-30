# 完整部署指南

## 前置准备

### 1. 获取 Cloudflare API Token

访问：https://dash.cloudflare.com/profile/api-tokens

点击 "Create Token"，选择权限：
- Account - Cloudflare Pages - Edit
- Account - Workers Scripts - Edit

复制生成的 Token

### 2. 配置环境变量

```bash
export CLOUDFLARE_API_TOKEN="你的token"
```

## 部署步骤

### 方式一：使用自动化脚本

```bash
chmod +x deploy-all.sh
./deploy-all.sh
```

### 方式二：手动部署

```bash
# 1. 配置 PayPal 密钥
cd auth-worker
wrangler secret put PAYPAL_CLIENT_ID
wrangler secret put PAYPAL_CLIENT_SECRET

# 2. 部署 Worker
wrangler deploy

# 3. 部署静态网站
cd ..
wrangler pages deploy . --project-name=image-background-remover
```

## 测试

访问：https://imagebackgroundremover.quest/paypal-test-standalone.html

使用沙箱账号测试支付
