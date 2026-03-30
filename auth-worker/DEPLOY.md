# Worker 部署说明

## 1. 配置环境变量

```bash
cd auth-worker

# 配置 PayPal 凭证
wrangler secret put PAYPAL_CLIENT_ID
# 输入: Aeajzmpx8jJqRSS2iC-0MS4HaFP4_WkRUzUW_wjHgVr0L2_KUHLFOHMVAnPdDCbH5_ELsk7CNCGyL_-g

wrangler secret put PAYPAL_CLIENT_SECRET
# 输入: ED9gvjFiZUYpZJwZo_QzAYY_8I4O_zvPXQbD5xvleiqmbF4Dc4dJDNtGE01LUm9hVU_nuAln26TfVE9r
```

## 2. 部署 Worker

```bash
wrangler deploy
```

## 3. 测试

访问: https://imagebackgroundremover.quest/paypal-test-standalone.html
