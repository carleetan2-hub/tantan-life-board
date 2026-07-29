#!/bin/bash
# Tantan Life Board - 一键部署到 GitHub Pages
# 用法：./deploy.sh "更新说明"

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Tantan Life Board 一键部署脚本${NC}"
echo "========================================"

# 检查 git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ 错误：未找到 git，请先安装 Git${NC}"
    exit 1
fi

# 检查是否在 git 仓库中
if [ ! -d .git ]; then
    echo -e "${RED}❌ 错误：当前目录不是 Git 仓库${NC}"
    echo "请先运行：git init && git remote add origin <你的仓库地址>"
    exit 1
fi

# 获取更新说明
MSG="${1:-更新工作台内容 $(date +%Y-%m-%d\ %H:%M)}"

echo -e "${YELLOW}📦 正在添加文件...${NC}"
git add -A

echo -e "${YELLOW}💾 正在提交：$MSG${NC}"
git commit -m "$MSG" || echo -e "${YELLOW}⚠️  没有变更需要提交${NC}"

echo -e "${YELLOW}📤 正在推送到 GitHub...${NC}"
git push origin $(git rev-parse --abbrev-ref HEAD)

echo ""
echo -e "${GREEN}✅ 推送成功！${NC}"
echo -e "${GREEN}🌐 GitHub Pages 将在 1~2 分钟后自动更新${NC}"
echo ""
echo "如果页面没有立即刷新，请尝试："
echo "  1. 强制刷新：Ctrl + F5（Windows）或 Cmd + Shift + R（Mac）"
echo "  2. 清除浏览器缓存后重新打开"
echo "  3. 在链接后加 ?v=任意数字 强制绕过缓存"
