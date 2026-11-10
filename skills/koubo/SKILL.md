---
name: koubo
description: 使用原版 digital-human-koubo 模板制作数字人口播：小林式解说、花字口播、发布解读、教程、多主播多语言，保留原版字幕、题板、圆形小窗、包装、声音与封面流程；视频生成通过插件配置的 Grok 渠道。
---

# 数字人口播

这是 digital-human-koubo 的 DSH 插件版。沿用随包原版模板与剪辑流程，通过 `koubo_models`、`koubo_plan`、`koubo_generate`、`koubo_status` 连接视频服务，用 `koubo_template` 建立原版工程。不要用自制通用布局替换原版模板。

## 准备与风格

先调用 `koubo_models` 查看可用来源；需要生成时再查询该来源模型。Grok 在 DSH 插件设置中填写 Base URL 和 API Key，宿主可注册额外来源。使用返回的模型 ID 与时长、分辨率范围。

原版参考文档用于剪辑、布局、字幕和声音。文档中的 Renoise MCP、credits、素材 ID 和下载命令由本插件工具替代，不要求连接 Renoise，也不沿用旧服务价格。计费与调用量由服务后台记录。

确定用户提供的人物参考图、声音描述、目标语言、平台与时长；默认使用用户自己的形象。没有参考图时可文生视频，或先准备符合画面比例的人物图。不要使用原作者的主播形象或演示视频。

按 [风格菜单](references/style-menu.md) 推荐适合内容的风格，沿用用户已有选择。五种风格为：

| 风格 | 原版工程 | 主要内容 |
| --- | --- | --- |
| 小林式解说 | `lin-169` | 人物全屏、紫色题板、圆形/矩形小窗、B-roll、公式、图表 |
| 网红花字口播 | `huazi-916` | 竖屏花字、关键词、表情、卡片、作品展示，克制/标准/热闹三档 |
| 发布解读 | `reference/launch-169` | 发布内容、数据与证据画面 |
| 保姆级教程 | `reference/tutorial-169` | 分步骤讲解和演示 |
| 多主播多语言 | `reference/multihost-169` | 多人物、外语段、场景串联 |

后三种保留原版参考实现，需要按本期内容编辑 Scene；不是替换 JSON 就能生成任意内容。`packaging` 提供原版包装组件库。选择后用 `koubo_template` 建立工程，读取返回的 `guide`。

## 1. 写稿与分段

保留原版的 `brief.json` 与 `script.json` 创作文件。稿件每段一两句，字段包括 `id`、`t`，可写 `shot: full / pip / vlog / depth`、`lang_code` 和字幕替换 `sub`。没有要求改稿时保留原文；数字、产品名与缩写要考虑读法。

用 `koubo_plan` 辅助分段，按当前模型的时长上限安排完整句子，给长数字、专有名词和尾音留余量。所有片段保持相同人物参考图与声音描述。图生视频的比例取决于参考图。需要裁成小窗或放大人物时优先 720p。

## 2. 生成与下载

先做一个有代表性的片段，检查人物、声音、口型和发音，再按用户授权继续。费用以服务后台为准，不编造积分、余额或价格。

调用 `koubo_generate`：每段使用新的 `operationId`（UUID），同一次提交恢复时复用原值和参数。传入 `narration`、`language`、人物画面要求 `visual`、声音要求 `voice`，图生视频另传本地 `imagePath`。根据原版的 shot 安排全屏人物、中景和景深字需要的留白。

随后间隔约 5 秒调用 `koubo_status`，完成后下载到工作区。提交结果未知、查询或下载失败时继续核实原任务，不自动重新生成。任务路由只在插件内存中，后台记录用量和账单；插件重启后到服务后台用 providerTaskId 核实。

将已下载素材的本地路径写进 `clips.json`，例如 `{"s01":"../clip-a.mp4","s02":"../clip-b.mp4"}`，路径相对于该文件。这是分镜素材映射，不保存服务端任务历史。

## 3. 回听、抽帧与拼接

按 [工程流程](references/workflow.md) 运行原版 `scripts/assemble.py`；插件版只将输入改为 `clips.json` 的本地素材路径，保留逐段转写、剪尾、画面帧数与音频对齐、拼接和响度处理。

每段抽帧检查人物、口型、烧录字幕与画面；回听台词、读音和尾音。`misread_check.py` 不带原稿提示查读音，带原稿的转写不能证明没有念错。没有实际听看或转写结果时，不声称已核验。

需要修音时按原版流程只处理错误句子，保留口型；可选的外部语音服务需要用户配置，不自动产生额外调用。不整片替换音色。只需简单拼接已核验素材时也可用 `koubo_assemble`。

## 4. 对齐与原版剪辑

`align.py` 依据真实片段音频生成逐字时间轴，不用分段估算时间代替字幕对齐。

- 小林式：按 [lin-style.md](references/lin-style.md)，由 `lin_subs.py` 生成 `cues.json`，`lin_scenes.py` 将 `plan.json` 转为 `scenes.json`。保留原版 13 种场景与动效；`pip` 使用 `circle-tl`、`circle-bl`、`rect-l`、`rect-r`，人物全屏使用 `host`。按人物脸中心配置 `config.face`，让题板避开小窗。
- 花字：按 [huazi.md](references/huazi.md) 编辑 `edit.json` 与 `tl.json`，保留三档花字、关键词、卡片、表情、作品展示、号召与原版全屏/小窗切换。先运行 `check_edit.py` 检查时间引用。
- 发布/教程/多主播：按原版 `templates/reference/README.md`，保留布局、字幕、人物窗与过渡，按本期内容修改场景。

所有风格的包装按 [packaging-presets.json](references/packaging-presets.json) 和 [packaging.md](references/packaging.md) 选择组件，不重复造组件。表情与包装代码随工程提供；不使用原作者的包装预览图。使用 Noto 动态表情时在作品署名中注明 Animated emoji: Google Noto。

景深字按原版 `cutout_video.py` 准备透明人物素材，Apple Vision 抠像需要 macOS；其他平台可使用用户提供的透明人物视频。B-roll、截图、贴纸使用用户的素材，或按已配置服务与授权准备。

## 5. 声音、预览与成片

保留原版的人声单轨、人物视频静音、音效、BGM 避让和混音流程。音效由 `make_assets.py` 本地合成；可用 `lin_sfx.py`、`lin_mix.py`、`voicefx/unify.py` 处理声音。依赖用 uv 管理，按需检查工具，不要求用户重复安装。

在工程内安装原版依赖，打开 Remotion Studio。抽取场景开头、中点与过渡帧，检查人物裁切、小窗遮挡、空板、字幕、音画同步，再渲染。模板有示例内容，须按本期稿件替换后交付。

## 6. 封面与首帧

按 [cover.md](references/cover.md) 编辑 `cover.json`，运行 `make_cover.py`，检查标题、人物帧与证据卡，再用 `cover_first.py` 将封面接到成片最前面。保留原版封面、首帧和交付流程；用户明确不需要封面时遵从其要求。

成片、脚本、素材与剪辑工程保存在用户工作区。交付前实际检查输出，再给出可播放文件路径。
