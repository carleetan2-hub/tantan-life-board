# GitHub Pages 部署说明

## 1. 根目录在哪里

你截图里的页面就是仓库根目录。能看到 `README.md` 的那个文件列表区域，就是根目录。

红框里的 `+` 可以用来新增或上传文件：

- 点 `+`
- 选择 `Upload files`
- 把解压后的文件拖进去
- 点击页面底部绿色按钮 `Commit changes`

## 2. 要上传哪些文件

请把压缩包解压后，把下面这些文件全部上传到仓库根目录：

- `index.html`
- `tantan-workbench.html`
- `tantan-manifest.webmanifest`
- `tantan-icon.svg`
- `tantan-sw.js`
- `favicon.ico`
- `.nojekyll`
- `README.md`
- `GITHUB_DEPLOY_GUIDE.md`

如果 GitHub 页面里已经有同名文件，直接覆盖即可。

## 3. 开启 GitHub Pages

1. 进入仓库的 `Settings`
2. 左侧找到 `Pages`
3. `Source` 选择 `Deploy from a branch`
4. `Branch` 选择 `main`
5. 文件夹选择 `/ (root)`
6. 保存后等待 1-3 分钟

生成的网址通常是：

`https://你的用户名.github.io/仓库名/`

## 4. 以后更新怎么办

如果只是工作台页面功能更新，通常只需要重新上传：

- `tantan-workbench.html`
- `index.html`

如果我重新给你打包了压缩包，最稳妥的方式是把压缩包里的文件全部重新上传覆盖一次。

## 5. Vercel 和 GitHub Pages 的区别

Vercel 可以绑定 GitHub，之后 GitHub 仓库更新，Vercel 链接会自动更新。

但如果你希望「不需要科学上网也能尽量稳定打开」，建议先用 GitHub Pages。Vercel 的 `vercel.app` 链接在国内网络下可能不稳定，不适合作为唯一入口。

## 6. 同步数据说明

GitHub Pages 只能部署前端页面，不能运行后端同步服务。电脑和手机都可以打开同一个页面，但数据默认仍保存在各自浏览器里。

如果后续要多设备实时同步，需要再把 `server/` 后端部署到 Render、Railway 或其他可运行 Node.js 的平台。
