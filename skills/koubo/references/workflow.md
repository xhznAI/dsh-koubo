# DSH 原版工程用法

`koubo_template` 创建原版 Remotion 工程，并把配套脚本与参考文档放入工程的 `koubo/` 目录。以下命令在工程根目录执行；优先用工程已有依赖。

## 环境与素材

Node.js 使用工程 `.nvmrc`，安装原版依赖：

```sh
corepack pnpm install
uv run --with numpy python koubo/scripts/make_assets.py public
```

剪辑需要 FFmpeg 和 ffprobe；逐段转写、检查读音与字幕对齐需要 whisper.cpp 的 `whisper-cli` 及用户选择的模型，模型位置通过 `WHISPER_MODEL` 设置。Python 辅助依赖按需通过 `uv run --with ...` 提供，不修改系统 Python。

把稿件写为 `script.json`，保留原版结构：

```json
[{"id":"s01","t":"今天介绍这项功能。","shot":"full"}]
```

将插件已下载视频的本地路径写为 `clips.json`，相对路径以此文件所在目录为准：

```json
{"s01":"../clip-example.mp4"}
```

## 回听、拼接与对齐

```sh
uv run python koubo/scripts/assemble.py script.json clips.json --out out/narration.mp4
uv run python koubo/scripts/misread_check.py script.json
uv run python koubo/scripts/align.py script.json --out src/tl.json
```

先建立 `out/`；剪辑使用 `cut/joined.mp4` / `cut/joined.mov`，并按模板放入 `public/main.mp4`。花字模板的人声为 `public/voice.wav`；小林式的声音由 `scenes.json` 的 `config.audio` 选择，可设为 `main.mp4` 或完成混音的 `mix.wav`。

## 小林式解说

```sh
uv run python koubo/scripts/lin_subs.py script.json --tl src/tl.json --out src/cues.json --disp disp.txt
uv run python koubo/scripts/lin_scenes.py plan.json --tl src/tl.json --out src/scenes.json
```

布局、13 种场景、公式、图表、圆形与矩形小窗使用原版配置，详见 `lin-style.md`。`config.face` 是人物脸在 1920×1080 画面中的中心点；macOS 可按原版 `--face` 自动测量，其余环境可从画面确定坐标。不要沿用示例人物的脸中心。

## 花字与包装

编辑 `src/edit.json` 和 `src/tl.json`，详见 `huazi.md`。Noto 表情素材已随原版模板提供；作品使用时保留 Google Noto 的署名。包装组件调用见 `packaging.md`。

```sh
uv run python koubo/scripts/check_edit.py src
```

## 预览、渲染与封面

```sh
corepack pnpm exec remotion studio src/index.ts
corepack pnpm exec remotion still src/index.ts Lin out/preview.png --frame=60
corepack pnpm exec remotion render src/index.ts Lin out/film.mp4
```

将 `Lin` 换成模板对应的 Composition ID（`koubo_template` 返回）：花字为 `Huazi`，发布解读为 `Film`，教程/多主播为 `Tutorial`。参考工程需要按本期内容改场景和素材路径。

```sh
uv run --with playwright python -m playwright install chromium
uv run --with playwright python koubo/scripts/make_cover.py cover.json
uv run python koubo/scripts/cover_first.py out/film.mp4 cover/cover_16x9.jpg out/final.mp4
```

封面配置见 `cover.md`。可选语音修复和 earshot 工具按原版各自配置；未配置时不自动调用外部语音服务。
