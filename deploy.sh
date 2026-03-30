#!/bin/bash
# 部署到 Cloudflare Pages

echo "🚀 开始部署到 imagebackgroundremover.quest..."

# 1. 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler 未安装，正在安装..."
    npm install -g wrangler
fi

# 2. 部署静态网站到 Cloudflare Pages
echo "📦 部署静态文件..."
wrangler pages deploy . --project-name=image-background-remover

echo "✅ 部署完成！"
echo "🌐 访问: https://imagebackgroundremover.quest"
