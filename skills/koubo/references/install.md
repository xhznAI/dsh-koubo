# DSH 插件环境

从 [GitHub Releases](https://github.com/xhznAI/dsh-koubo/releases) 下载 DSH Koubo 的 `.tgz` 安装包，通过 DSH 插件管理安装。在插件设置中填写 Grok Base URL 和 API Key，再用 koubo_models 检查可用来源。

插件 Host 使用 Node.js 24；原版剪辑工程使用各自 package.json 的公开依赖。调用 koubo_template 后按 workflow.md 安装并运行。剪辑需要 FFmpeg/ffprobe，逐字字幕需要 whisper.cpp 与 WHISPER_MODEL，Python 依赖通过 uv 管理。先检查已有工具，缺少时按当前平台补齐。

人物参考图使用用户自己的本地图片。
