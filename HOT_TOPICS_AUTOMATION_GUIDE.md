# 爆款话题自动化关联指南

## 目标

让 GitHub 每天自动抓取热点，生成一个 `hot-topics.json` 文件。你的 Tantan Life Board 打开后，在「爆款话题」模块点击「同步文件」，就能把这个 JSON 里的热点读进工具里。

## 需要上传的文件

这套自动化主要需要上传 1 个新增文件：

```text
.github/workflows/update-hot-topics.yml
```

如果你还没有上传主应用更新，也需要同时上传：

```text
tantan-workbench.html
tantan-sw.js
index.html
```

## 第一步：在 GitHub 新建工作流文件

1. 打开你的 GitHub 仓库。
2. 点击 `Add file`。
3. 点击 `Create new file`。
4. 文件名输入：

```text
.github/workflows/update-hot-topics.yml
```

5. 把我提供的 `update-hot-topics.yml` 内容复制进去。
6. 点击 `Commit changes`。

## 第二步：确认权限

进入仓库：

```text
Settings → Actions → General
```

找到：

```text
Workflow permissions
```

选择：

```text
Read and write permissions
```

然后保存。否则自动化任务没有权限把 `hot-topics.json` 写回仓库。

## 第三步：手动运行一次

1. 打开仓库上方的 `Actions`。
2. 左侧选择 `Update Hot Topics`。
3. 点击 `Run workflow`。
4. 等它运行完成，看到绿色勾就是成功。

成功后，你的仓库根目录会多一个文件：

```text
hot-topics.json
```

这个文件就是工作台要读取的热点数据。

## 第四步：在工作台里同步

1. 打开 Tantan Life Board。
2. 找到「爆款话题」模块。
3. 确认「自动化文件」输入框是：

```text
./hot-topics.json
```

4. 点击「同步文件」。
5. 如果能看到热点列表，再点击「批量加入收藏」。

## 之后会自动发生什么

`update-hot-topics.yml` 里设置的是：

```yaml
cron: '10 0 * * *'
```

这表示 GitHub 会每天自动运行一次，对应北京时间大约早上 08:10。

每次运行后：

1. 自动抓取微博、知乎、抖音、百度、B站热榜。
2. 自动更新仓库里的 `hot-topics.json`。
3. 这个工作流会顺手重新部署 GitHub Pages，所以 Pages 链接里的 `hot-topics.json` 也会更新。
4. 工作台里点击「同步文件」即可读取最新热点。

## 注意事项

- GitHub Actions 的定时任务不是精确闹钟，可能延迟几分钟到十几分钟。
- 公共热榜接口偶尔会不稳定，如果某个平台失败，JSON 里会写入“抓取失败”的提示。
- 如果你想只抓微博/知乎，可以删除 `update-hot-topics.yml` 里不需要的平台。
- 如果你想更换抓取时间，修改 `cron` 即可。

## 常见问题

### 为什么工作台没有自动出现新热点？

当前版本是“自动生成文件 + 手动同步到工具”。也就是说，GitHub 会自动更新 `hot-topics.json`，但你需要在工作台里点一下「同步文件」，避免自动覆盖你正在看的内容。

### 可以打开页面后自动同步吗？

可以，后续可以继续优化成：打开「爆款话题」模块时自动读取 `hot-topics.json`，如果有新内容就提示“发现新热点，是否导入”。

### 热点会自动进入收藏吗？

不会直接自动进入收藏。你需要先「同步文件」，确认热点列表没问题后，再点「批量加入收藏」。这样更安全，避免抓取到无关内容直接污染收藏库。
