#!/bin/bash
# 自动化部署脚本

set -e

echo "🚀 开始部署..."

# 检查环境变量
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "❌ 请先设置 CLOUDFLARE_API_TOKEN"
    echo "export CLOUDFLARE_API_TOKEN='你的token'"
    exit 1
fi

# 1. 部署 Worker
echo "📦 部署 Worker..."
cd auth-worker
wrangler deploy
cd ..

# 2. 部署静态网站
echo "🌐 部署静态网站..."
wrangler pages deploy . --project-name=image-background-remover

echo "✅ 部署完成！"
echo "🔗 访问: https://imagebackgroundremover.quest"
