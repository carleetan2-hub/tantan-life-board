# Tantan Life Board

你的个人成长工作台，支持每日计划、睡眠记录、运动记录、冥想、每日复盘、阅读、英语学习、技能提升、热点话题、灵感记录、收藏库等模块。

## 版权与许可证

Copyright (c) 2026 carleetan2-hub.

本项目采用 **GNU General Public License v3.0（GPLv3）** 开源许可证，详见仓库根目录的 `LICENSE` 文件。

选择 GPLv3 的原因：仓库公开后，别人可以学习、使用和修改代码，但如果他们分发修改后的版本，也需要在 GPLv3 下公开相应源码，避免代码被直接拿去闭源再发布。

请注意：开源许可证不能阻止别人看到公开仓库里的代码，也不能替代商标、隐私或商业秘密保护。不要把私密数据、密钥、同步密钥、账号信息或个人隐私内容提交到公开仓库。

## 在线使用

直接打开 `index.html` 即可使用。所有数据保存在浏览器本地（localStorage），无需后端服务。

## 部署到 GitHub Pages

1. 把本仓库代码 push 到你的 GitHub 仓库
2. 进入仓库 Settings → Pages
3. Source 选择 "Deploy from a branch"，Branch 选 `main` / `master`，文件夹选 `/ (root)`
4. 等待几分钟，访问 `https://你的用户名.github.io/仓库名/` 即可使用
5. **重要**：由于 GitHub Pages 使用 HTTPS，外部热榜 API 可能因跨域限制无法抓取，建议配合自动化文件同步功能使用

## 数据备份与同步

### 方式一：手动导入导出（无需后端）

- **导出**：点击右上角设置 → 数据管理 → 导出数据，可下载 JSON 备份
- **导入**：设置 → 数据管理 → 导入数据，选择之前导出的 JSON 文件

### 方式二：实时云端同步（推荐多设备使用）

部署同步后端后，电脑和手机可以自动同步数据，无需手动导入导出。

#### 部署同步后端

同步后端代码在 `server/` 目录，基于 Node.js + SQLite，轻量高效。

**本地部署：**

```bash
cd server
npm install
node server.js
```

服务默认运行在 `http://localhost:3456`。

**服务器部署（推荐）：**

可以在任何有 Node.js 的服务器上运行（云服务器、NAS、树莓派等）：

```bash
# 1. 上传 server/ 目录到服务器
# 2. 安装依赖
cd server
npm install

# 3. 启动服务（前台运行，测试用）
node server.js

# 4. 后台运行（推荐用 pm2）
npm install -g pm2
pm2 start server.js --name tantan-sync
pm2 save
pm2 startup  # 设置开机自启
```

**Docker 部署（可选）：**

```dockerfile
FROM node:18-slim
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY server/ .
EXPOSE 3456
CMD ["node", "server.js"]
```

#### 配置前端同步

1. 在电脑浏览器打开 Tantan Life Board
2. 点击右上角 **设置** → 滚动到 **云端同步** 区域
3. 填写：
   - **服务器地址**：如 `http://你的服务器IP:3456`
   - **同步密钥**：自定义一个密钥，如 `tantan2026`（多设备用同一个密钥）
   - **设备名称**：如 `电脑`
4. 点击 **保存配置**，状态显示"连接成功"即正常
5. 点击 **立即上传** 把当前数据推送到云端
6. 点击 **自动同步：开** 开启自动同步

#### 在手机上同步

1. 手机浏览器打开同一个 GitHub Pages 地址
2. 进入 **设置 → 云端同步**
3. 填入相同的服务器地址和同步密钥
4. 设备名称填 `手机`
5. 点击 **保存配置**，然后点 **立即拉取**
6. 开启 **自动同步** 后，手机修改的数据会自动上传，电脑也会自动拉取

#### 同步说明

- **自动同步**：开启后每 15 秒检查一次，有修改就自动上传
- **冲突处理**：如果云端数据比本地新，上传时会提示"请先拉取"
- **安全**：同步密钥就是访问凭证，请设置一个不容易猜到的密钥
- **数据安全**：拉取前会自动备份本地数据，可随时通过"恢复旧数据"找回

#### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/sync/:syncKey` | 拉取数据 |
| POST | `/api/sync/:syncKey` | 推送数据（带冲突检测） |
| PUT | `/api/sync/:syncKey` | 强制覆盖（忽略冲突） |
| DELETE | `/api/sync/:syncKey` | 删除云端数据 |
| GET | `/api/sync/:syncKey/check` | 检查是否有更新 |
| GET | `/api/sync/:syncKey/log` | 查看同步日志 |

## 主要功能

- 每日计划与完成率追踪
- 睡眠记录（自动计算时长）与月度看板
- 运动、冥想记录与统计
- 每日复盘（支持自定义维度）
- 阅读进度追踪与书单管理
- 英语学习（单词、例句、朗读）
- 技能提升与学习步骤生成
- 热点话题自动抓取与收藏
- 收藏库（分类折叠、自动总结、编辑）
- 目标规划（看板预览 + 编辑模式）
- 长期报告（周/月/季/年）
- 行动总览（完成矩阵可视化）
- 云端同步（多设备实时同步）

## 技术说明

- 纯前端实现，单 HTML 文件，零依赖
- 使用 localStorage 本地存储数据
- 支持 PWA，可添加到手机主屏幕
- 响应式设计，适配手机与桌面
- 同步后端：Node.js + Express + SQLite，轻量易部署

## 公开仓库安全建议

- 开启分支保护规则，避免误改 `main` 分支：Settings → Branches → Add branch protection rule。
- 开启秘密扫描和依赖检查：Settings → Security and analysis。
- 不要把真实同步密钥、数据库文件、个人备份 JSON 或浏览器导出的数据上传到仓库。
- 如果后续部署后端，请把 `server/tantan-sync.db` 和 `.env` 这类文件加入 `.gitignore`。
