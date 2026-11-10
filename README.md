# Nex Koubo

[digital-human-koubo](https://github.com/andyhuo520/digital-human-koubo) 的 DSH 插件版。保留原版数字人口播工作流、Remotion 模板、布局、动效和包装组件，通过自定义 Grok 视频渠道生成口播素材。

## 功能

- **数字人口播**：根据讲解稿和人物参考图生成带声音的视频，支持文生视频、图生视频、分段生成、查询与下载。
- **原版模板**：小林式解说、网红花字口播，以及发布解读、教程、多主播多语言参考工程。
- **原版剪辑**：人物全屏、圆形小窗、左右人物窗、题板、图表、公式、花字、作品展示和包装动效。
- **成片制作**：回听校验、字幕对齐、音效与混音、Remotion 预览和渲染、封面与首帧。

## 安装与配置

从 [GitHub Releases](https://github.com/xhznAI/nex-koubo/releases) 下载 `nex-assistant-koubo-0.1.3.tgz`，在 DSH 插件管理中填写下载后的 `.tgz` 安装包路径。支持 **DSH 0.2.1-rc.5 / 0.2.2-rc.1**，运行环境为 **Node.js 24**。

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
