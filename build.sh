#!/bin/bash
###
 # @Author: Diana Tang
### 

if [ -z "$1" ]; then
    echo "❌ Environment parameter is required! Please use: ./build.sh [development|production|test]"
    exit 1
fi

ENV=$1
ENV_FILE=".env.$ENV"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE does not exist!"
    exit 1
fi

# 清理旧的构建文件
echo "🧹 Cleaning up old build files..."
rm -rf dist/
rm -rf .aws-sam/
rm -rf layer/

# 创建必要的目录
mkdir -p dist/
mkdir -p layer/nodejs

# 使用webpack构建应用
echo "🏗️ Building application with webpack..."
yarn run build

# 设置 Lambda Layer
echo "📦 Setting up Lambda layer..."
cat > layer/nodejs/package.json << EOF
{
  "dependencies": {
    "@koa/cors": "^5.0.0",
    "@koa/router": "^13.1.0",
    "@langchain/community": "^0.3.24",
    "@langchain/core": "^0.3.28",
    "@langchain/openai": "^0.3.16",
    "bignumber.js": "^9.1.2",
    "dotenv": "^16.4.7",
    "koa": "^2.15.3",
    "koa-bodyparser": "^4.4.1",
    "koa-static": "^5.0.0",
    "langchain": "^0.3.10",
    "serverless-http": "^3.2.0"
  }
}
EOF

# 在layer中安装依赖
cd layer/nodejs
echo "📦 Installing layer dependencies..."
yarn install --production --frozen-lockfile

echo "📊 Final layer size:"
du -sh node_modules/
cd ../../

# 准备函数部署包
echo "📦 Preparing function package..."
cp "$ENV_FILE" "dist/.env"

# 执行 sam build 和部署
echo "🚀 Running sam build..."
sam build --skip-pull-image

if [ $? -eq 0 ]; then
    if [ "$ENV" = "production" ] || [ "$ENV" = "test" ]; then
        echo "🚀 Deploying to production..."
        sam deploy -g
    else
        echo "🌍 Starting local API..."
        sam local start-api --warm-containers EAGER
    fi
else
    echo "❌ Sam build failed!"
    exit 1
fi