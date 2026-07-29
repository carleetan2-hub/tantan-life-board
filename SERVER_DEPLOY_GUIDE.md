# 后端同步服务部署说明

## 什么时候需要上传 server 文件夹

如果你要在 Render、Railway 等平台部署同步后端，GitHub 仓库里必须包含 `server/` 文件夹。

前端页面只需要 `index.html`、`tantan-workbench.html` 等静态文件；后端同步服务需要 `server/server.js` 和 `server/package.json`。

## Render 填写方式

在 Render 的 `Configure and deploy your new Web Service` 页面，继续往下滚动，会看到下面这些字段：

- `Name`：可以填 `tantan-life-board-sync`
- `Language`：选择 `Node`
- `Branch`：选择 `main`
- `Root Directory`：留空
- `Build Command`：填写 `cd server && npm install`
- `Start Command`：填写 `cd server && node server.js`

如果页面里没有看到 `Build Command` 和 `Start Command`，说明还没滚动到下半部分，继续往下滑。

## 注意

不要把这些数据库文件上传到 GitHub：

- `server/tantan-sync.db`
- `server/tantan-sync.db-shm`
- `server/tantan-sync.db-wal`

这些文件是运行后生成的数据文件，公开仓库不应该上传。
