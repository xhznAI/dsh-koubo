# DSH Koubo 开发与接入

[← 回到首页](../README.md)

## 本地开发

使用 Node.js 24、Corepack 和 pnpm，在插件目录执行：

```sh
corepack pnpm install
corepack pnpm check
corepack pnpm package:check
```

`check` 执行类型检查、测试和构建；`package:check` 在临时消费项目中验证安装包、Host 加载、公开 API 与原版工程创建，不调用付费视频服务。

## GitHub 安装与发布

仓库保留源码和 `lib/` 编译产物，GitHub 安装无需执行构建脚本。修改源码后，运行 `corepack pnpm check`，将对应的 `lib/` 产物一并提交。不要手改编译文件。

README 的 `github:xhznAI/dsh-koubo#main` 指向当前主分支；如需固定版本，可将 `main` 替换为包含编译产物的提交 SHA 或发布标签。旧标签未必包含编译文件，应使用对应 Release 的 `.tgz` 附件。

`corepack pnpm package:check` 同时生成 `.cache/release/dsh-koubo-<版本>.tgz`。公开发布前检查源码、Git 历史和安装包，排除密钥、本机配置与私人素材。第三方模板遵循 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。

## 复现 README 案例

讲稿、分镜和人物参考图位于 [examples/readme-cases](../examples/readme-cases)。

1. 调整 `brief.json` 中的讲稿、分镜与素材剪辑区间。
2. 将对应口播素材放到 `video/readme-cases/<案例 ID>.mp4`。
3. 准备 FFmpeg、uv、whisper.cpp，并设置 `WHISPER_MODEL`。
4. 依次运行：

```sh
corepack pnpm readme:prepare
corepack pnpm readme:render
```

这些命令只处理本地素材，不调用视频生成服务。工程输出到 `video/readme-cases/projects`，成片和动态预览输出到 `assets/readme-cases`。

## 模板与宿主接入

`koubo_template` 在工作区创建原版剪辑工程，保留原版时间轴、组件、动效和布局。原版来源与版本见 [upstream.json](../skills/koubo/upstream.json)。

小林式模板通过场景的 `pip` 选择人物位置：`circle-tl` 左上圆窗、`circle-bl` 左下圆窗、`rect-l` 左侧人物窗、`rect-r` 右侧人物窗；`host` 场景为人物全屏。

宿主可通过公开 `dsh-koubo/api` 注册视频来源，见 [接入示例](../examples/nex-host.ts)。账号、认证和计费由宿主管理，通用插件保持独立。
