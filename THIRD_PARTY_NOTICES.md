# 第三方说明

原版技能、Remotion 模板、包装组件与剪辑脚本来自
https://github.com/andyhuo520/digital-human-koubo ，代码与文档采用 MIT 许可证。
模板源码保留原样，来源版本及文件校验见 `skills/koubo/upstream.json`。
本项目增加 DSH 插件装载、Grok 渠道配置、生成/查询/下载与工程创建入口；
assemble.py 的输入改为本地素材路径，make_assets.py 使用独立临时目录，使用文档更新为 DSH 入口。
不分发原作者的人物形象、声音、演示视频、风格预览或包装图鉴。

原项目版权声明与许可如下：

```text
MIT License

Copyright (c) 2026 Berryxia (andyhuo520)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

FFmpeg/ffprobe 由用户安装，未包含在本插件发布包中；具体许可证以用户安装的构建为准。
DSH、Cordis、Schemastery 与 Zod 使用各自包中随附的许可证。

Remotion 使用自身许可证。模板包含的 Google Noto 动态表情使用 CC BY 4.0，使用它们的作品须署名「Animated emoji: Google Noto」。React 和 lottie-web 使用 MIT；d3-geo、topojson-client、world-atlas 使用 ISC。原版完整说明随附于 `skills/koubo/UPSTREAM-THIRD_PARTY.md`。
