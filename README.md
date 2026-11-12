![DSH Koubo 数字人口播工作室：数字人口播、样式馆、作品库](assets/readme-cover.png)

# DSH Koubo

[![MIT License](https://img.shields.io/github/license/xhznAI/dsh-koubo?style=flat-square&color=386951)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/xhznAI/dsh-koubo?style=flat-square&color=386951)](https://github.com/xhznAI/dsh-koubo/releases/latest)
[![Node.js 24+](https://img.shields.io/badge/Node.js-24%2B-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![DSH Plugin](https://img.shields.io/badge/DSH-plugin-386951?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)
[![Download Plugin](https://img.shields.io/badge/Download-Plugin-386951?style=flat-square&logo=github&logoColor=white)](https://github.com/xhznAI/dsh-koubo/releases/latest)

[digital-human-koubo](https://github.com/andyhuo520/digital-human-koubo) 的 DSH 插件版。保留原版数字人口播工作流、Remotion 模板、布局、动效和包装组件，通过自定义 Grok 视频渠道生成口播素材。

## 功能

- **数字人口播**：根据讲解稿和人物参考图生成带声音的视频，支持文生视频、图生视频、分段生成、查询与下载。
- **原版模板**：小林式解说、网红花字口播，以及发布解读、教程、多主播多语言参考工程。
- **原版剪辑**：人物全屏、圆形小窗、左右人物窗、题板、图表、公式、花字、作品展示和包装动效。
- **成片制作**：回听校验、字幕对齐、音效与混音、Remotion 预览和渲染、封面与首帧。

## 成片案例

同一个原创 AI 数字人，用三种风格介绍 DSH Koubo。下方为成片动态预览，点击查看带声音的 MP4；人物和口播由 AI 生成，画面包装采用随插件提供的原版模板与组件。

| 小林式知识讲解 · 16:9 | 竖屏花字口播 · 9:16 | 数据包装解说 · 16:9 |
| --- | --- | --- |
| <a href="assets/readme-cases/lin-explainer.mp4"><img src="assets/readme-cases/lin-explainer.gif" alt="小林式知识讲解动态预览" height="180"></a> | <a href="assets/readme-cases/huazi-short.mp4"><img src="assets/readme-cases/huazi-short.gif" alt="竖屏花字口播动态预览" height="180"></a> | <a href="assets/readme-cases/data-packaging.mp4"><img src="assets/readme-cases/data-packaging.gif" alt="数据包装解说动态预览" height="180"></a> |
| 全屏人物开场，接题板、圆形小窗与侧边人物窗。 | 关键词花字、准备清单、对比卡片与结尾印章。 | 90 项样式数字强调、分类数据面板与选择步骤。 |
| [▶ 播放有声视频](assets/readme-cases/lin-explainer.mp4) | [▶ 播放有声视频](assets/readme-cases/huazi-short.mp4) | [▶ 播放有声视频](assets/readme-cases/data-packaging.mp4) |

讲稿、分镜和人物参考图见 [案例源文件](examples/readme-cases)。复用时，先调整 `brief.json` 中的讲稿、分镜与素材剪辑区间，再将对应口播素材放到 `video/readme-cases/<案例 ID>.mp4`，安装 FFmpeg、uv 和 whisper.cpp 并设置 `WHISPER_MODEL`，依次运行 `corepack pnpm readme:prepare`、`corepack pnpm readme:render`。剪辑工程保存在 `video/readme-cases/projects`，成片和动态预览输出到 `assets/readme-cases`；这些命令只处理本地素材，不调用视频生成服务。

## 口播工作室

以下截图来自 macOS 上实际运行的 DeepSeek Harness，作品库使用本仓库的三条示例成片。

侧栏打开「口播工作室」，在「样式馆」浏览 90 项样式与组件：5 种整体风格、13 种小林场景、7 种画面包装、4 种人物小窗、9 种竖屏花字卡片、3 档花字强度，以及 48 个包装组件和文字高亮。紧凑网格支持分类与搜索，点击缩略图可播放原版组件动效、暂停和拖动进度，再将具体样式带入制作对话。

![DSH 实机样式馆：分类浏览 90 项样式与组件](assets/screenshots/gallery.png)

预览采用统一的原创 AI 数字人，截图和数据为演示素材，不含口播和音效；保留原版布局、动画与位置配置。选用会带入准确的模板、场景或组件参数，只填写对话草稿，确认后再发送。

![DSH 实机样式预览：播放动效并选用具体样式](assets/screenshots/style-preview.png)

「作品库」读取当前工作区的 `video/koubo`，支持 MP4、WebM 和 MOV 的搜索、分类、排序、播放与下载。原版模板工程的 `out` 成片会关联对应工程；`clip-*` 和工程素材目录中的视频归入生成片段。继续编辑会把视频与工程位置填入对话。浏览器不能播放的编码可下载后用本地播放器打开。

作品以紧凑卡片排列，封面保留横竖屏完整画面并标注片长。横竖视频共用相同尺寸与控制布局的预览窗口，可按 Esc 关闭，回到原来的卡片位置。

![DSH 实机作品库：三条成片的缩略图与片长](assets/screenshots/library.png)

<details>
<summary>查看成片预览弹窗</summary>

![DSH 实机成片预览：播放器在弹窗中按比例展示](assets/screenshots/library-preview.png)

</details>

作品库只读取本地文件，不建立云端作品或调用历史。将成片保存在模板工程的 `out` 文件夹，或 `video/koubo` 下，完成后点击「刷新作品」。

## 安装与配置

从 [GitHub Releases](https://github.com/xhznAI/dsh-koubo/releases) 下载最新版本的 `dsh-koubo-*.tgz`，在 DSH 插件管理中填写下载后的 `.tgz` 安装包路径。支持 **DSH 0.2.1-rc.5 / 0.2.2-rc.1 / 0.2.2-rc.2**，运行环境为 **Node.js 24**。

已安装旧版 `@nex-assistant/koubo` 时，先停用旧插件，再安装新版，避免同时启用两份口播插件。

在插件设置中填写：

| 配置项 | 内容 |
| --- | --- |
| Base URL | Grok 视频 API 地址，默认 `https://api.x.ai`；支持兼容 Grok 协议的自定义服务 |
| API Key | 对应视频服务的密钥 |

默认模型为 **Grok Imagine Video 1.5**（`grok-imagine-video-1.5`）。API 地址支持域名根路径或以 `/v1` 结尾的路径。

结果支持完整 HTTPS 下载地址，也支持相对于服务域名的 `/v1/...` 路径。下载不会附带模型 API Key；渠道若返回需要认证的文件接口，应由宿主服务端提供独立授权的下载地址。

本地剪辑按原版流程使用 FFmpeg、Python、whisper.cpp 和 Remotion。助手会按所选模板检查所需工具，Python 依赖通过 uv 管理，Remotion 依赖安装在各自的剪辑工程中。

## 使用

在 DSH 对话中调用口播技能，提供讲解稿、人物参考图和想要的风格：

> 用口播技能，把这篇文章做成横屏讲解视频，用原版小林式模板。人物参考图是 presenter.png，开场人物全屏，正文配题板和圆形小窗。先做一个口播片段给我看，再继续。

> 用原版花字模板做一条竖屏视频，花字强度选标准，中间展示我提供的截图和作品。

助手会规划内容、生成并下载口播片段，用 `koubo_template` 在工作区建立原版剪辑工程，再沿用原版的时间轴、字幕、包装和成片流程。可以直接修改工程继续剪辑。

小林式模板通过场景的 `pip` 选择人物位置：`circle-tl` 左上圆窗、`circle-bl` 左下圆窗、`rect-l` 左侧人物窗、`rect-r` 右侧人物窗；`host` 场景为人物全屏。

宿主也可通过插件的公开 `./api` 注册视频来源，示例见 [官方来源接入](examples/nex-host.ts)。

原版模板来源和版本见 [upstream.json](skills/koubo/upstream.json)，第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
