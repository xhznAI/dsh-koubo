window.__ModuleLoader__.load({
	id: "dsh-koubo",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/http.ts
		function apiBase(value) {
			let url;
			try {
				url = new URL(value);
			} catch {
				throw new Error("请填写有效的 API 地址。");
			}
			if (url.protocol !== "https:" && !(url.protocol === "http:" && [
				"localhost",
				"127.0.0.1",
				"[::1]"
			].includes(url.hostname)) || url.username || url.password || url.search || url.hash) throw new Error("API 地址须使用 HTTPS，本机调试可使用 HTTP。");
			const path = url.pathname.replace(/\/+$/, "");
			url.pathname = `${path.endsWith("/v1") ? path : `${path}/v1`}/`;
			return url;
		}
		//#endregion
		//#region src/client/settings.ts
		/** 只写入用户编辑的字段，空密钥保留原值。 */
		async function saveSettings(form, baseUrl, apiKey) {
			const url = baseUrl.trim();
			apiBase(url);
			const snapshot = form.getSnapshot();
			if (snapshot.status !== "ready" || !snapshot.writable) return false;
			return form.mutate([{
				op: "set",
				path: ["baseUrl"],
				value: url
			}, ...apiKey.trim() ? [{
				op: "set",
				path: ["apiKey"],
				value: apiKey.trim()
			}] : []], snapshot.revision);
		}
		//#endregion
		//#region src/catalog.ts
		const templates = [
			{
				id: "lin-169",
				name: "小林式解说",
				aspectRatio: "16:9",
				composition: "Lin",
				category: "讲解",
				description: "人物讲述与题板交替，让复杂内容更容易理解。",
				features: [
					"圆形人物窗",
					"图表与公式",
					"章节题板"
				],
				tone: "mint"
			},
			{
				id: "huazi-916",
				name: "网红花字口播",
				aspectRatio: "9:16",
				composition: "Huazi",
				category: "短视频",
				description: "竖屏人物搭配关键词花字，突出每一句的重点。",
				features: [
					"竖屏人物",
					"关键词花字",
					"节奏包装"
				],
				tone: "pink"
			},
			{
				id: "reference/launch-169",
				name: "发布解读",
				aspectRatio: "16:9",
				composition: "Film",
				category: "讲解",
				description: "用产品画面、参数与人物解读讲清新事物。",
				features: [
					"产品展示",
					"参数信息",
					"横屏解读"
				],
				tone: "blue"
			},
			{
				id: "reference/tutorial-169",
				name: "保姆级教程",
				aspectRatio: "16:9",
				composition: "Tutorial",
				category: "教程",
				description: "围绕操作画面分步讲解，带观众完成整个流程。",
				features: [
					"步骤讲解",
					"操作画面",
					"重点提示"
				],
				tone: "peach"
			},
			{
				id: "reference/multihost-169",
				name: "多主播多语言",
				aspectRatio: "16:9",
				composition: "Tutorial",
				category: "讲解",
				description: "组织多个讲述角色，为不同段落安排人物与语言。",
				features: [
					"多角色",
					"多语言",
					"分段讲述"
				],
				tone: "lavender"
			},
			{
				id: "packaging",
				name: "包装组件库",
				aspectRatio: "16:9",
				composition: "Gallery",
				category: "包装",
				description: "为口播加上文字、标注、数据与章节包装。",
				features: [
					"字幕与人名条",
					"手绘圈注",
					"数字与章节"
				],
				tone: "sand"
			}
		];
		//#endregion
		//#region src/packaging-catalog.json
		var packaging_catalog_default = [
			{
				"value": "TeaserColdOpen",
				"name": "预告快切",
				"category": "开场 / 钩子",
				"description": "后面最炸的 3–5 个瞬间各闪 0.4–0.8 秒 + 「接下来」角标 → 问题字卡"
			},
			{
				"value": "ColdOpenFreeze",
				"name": "定格冷开场",
				"category": "开场 / 钩子",
				"description": "动作片段 → 定格去色 → 「未完待续」箭头 → 片名卡 → 雪花转场"
			},
			{
				"value": "SearchTyping",
				"name": "搜索打字",
				"category": "开场 / 钩子",
				"description": "中性搜索框逐字打 + 联想词 + 推近 1.6×"
			},
			{
				"value": "NumberSpike",
				"name": "数字钉子",
				"category": "开场 / 钩子",
				"description": "大数字从 3 倍大 0.5 秒缩到顶部 + 同色闪光，可再缩成角标常驻"
			},
			{
				"value": "SlamText",
				"name": "双行砸字",
				"category": "开场 / 钩子",
				"description": "两行大字先后砸进画面上下，可带年份角标"
			},
			{
				"value": "WordStack",
				"name": "逐词堆叠",
				"category": "开场 / 钩子",
				"description": "逐词堆叠，一拍一个词，最后一词换色放大"
			},
			{
				"value": "TornStrip",
				"name": "撕纸标题",
				"category": "开场 / 钩子",
				"description": "撕纸标题条横穿画面（片名 / 章节）"
			},
			{
				"value": "TextBehind",
				"name": "人物景深字",
				"category": "开场 / 钩子",
				"description": "景深字：大字 / 数字在人身后（原视频 → 大字 → 抠出来的人），升起 / 砸入 / 数字滚动 / 滑入"
			},
			{
				"value": "EvidenceCard",
				"name": "证据截图",
				"category": "证据 / 数据",
				"description": "截图飞入 + 品牌色描边 + 鼠标指针 + 推近数值签 + 3D 倾斜"
			},
			{
				"value": "DocFocus",
				"name": "文档聚焦",
				"category": "证据 / 数据",
				"description": "重建文档，非目标句压暗 35%，关键词黄块扫过"
			},
			{
				"value": "SourceDoc",
				"name": "原文与译句",
				"category": "证据 / 数据",
				"description": "官方文档截图慢推 + 中文译句荧光底 + 来源角标"
			},
			{
				"value": "ZoomFocus",
				"name": "截图推近",
				"category": "证据 / 数据",
				"description": "截图 / 录屏推近到目标框 + 压暗 + 标签（不越过原图边缘）"
			},
			{
				"value": "Counter",
				"name": "滚动计数",
				"category": "证据 / 数据",
				"description": "数字滚动，落地弹一下"
			},
			{
				"value": "Odometer",
				"name": "里程表数字",
				"category": "证据 / 数据",
				"description": "里程表逐位滚动，高位先停"
			},
			{
				"value": "GlassPanel",
				"name": "毛玻璃数据",
				"category": "证据 / 数据",
				"description": "毛玻璃数据面板，条形和数字一起滚"
			},
			{
				"value": "SpecCard",
				"name": "参数卡",
				"category": "证据 / 数据",
				"description": "质感参数卡：大数字小单位、留白、逐行淡入"
			},
			{
				"value": "LineDraw",
				"name": "折线生长",
				"category": "证据 / 数据",
				"description": "多条折线画出，末端挂同色标签"
			},
			{
				"value": "BarCompare",
				"name": "横条数据",
				"category": "证据 / 数据",
				"description": "横条对比 + 鬼影大字背景"
			},
			{
				"value": "ReviewCards",
				"name": "评论连弹",
				"category": "证据 / 数据",
				"description": "评论 / 差评卡每 1.1 秒连弹（示意评论要标注）"
			},
			{
				"value": "ArchiveCards",
				"name": "档案快切",
				"category": "证据 / 数据",
				"description": "档案卡 0.6 秒一张快切 + 红色标签"
			},
			{
				"value": "MapRoute",
				"name": "地图航线",
				"category": "证据 / 数据",
				"description": "世界地图推近 + 国家高亮 + 图钉 + 航线生长"
			},
			{
				"value": "CompareWipe",
				"name": "前后擦除",
				"category": "证据 / 数据",
				"description": "前后对比擦除"
			},
			{
				"value": "PaperCollage",
				"name": "纸张拼贴",
				"category": "证据 / 数据",
				"description": "纸纹底 + 白边照片 + 胶带 + 手写批注"
			},
			{
				"value": "HandDraw",
				"name": "手绘圈注",
				"category": "标注 / 人物",
				"description": "手绘圈 / 箭头 / 下划线 / 打叉，描边生长"
			},
			{
				"value": "CalloutPill",
				"name": "指向胶囊",
				"category": "标注 / 人物",
				"description": "实色胶囊 + 小尖指向目标，弹簧弹出"
			},
			{
				"value": "LeaderLabel",
				"name": "引线标签",
				"category": "标注 / 人物",
				"description": "引线 + 中文粗体 + 英文小斜体（+ 牛皮纸小标签）"
			},
			{
				"value": "TypedNameTag",
				"name": "打字姓名",
				"category": "标注 / 人物",
				"description": "手绘箭头指人 + 粗衬线名字逐字打出 + 头衔"
			},
			{
				"value": "LowerThird",
				"name": "双层人名条",
				"category": "标注 / 人物",
				"description": "色条 + 名字 + 身份两层滑出"
			},
			{
				"value": "NamePlate",
				"name": "人物名牌",
				"category": "标注 / 人物",
				"description": "去色人物旁双层名牌 + 语录药丸气泡"
			},
			{
				"value": "SourceTag",
				"name": "来源角标",
				"category": "标注 / 人物",
				"description": "出处角标（每个数据都挂）"
			},
			{
				"value": "FreezeFrame",
				"name": "定格圈注",
				"category": "标注 / 人物",
				"description": "定格 + 去色 + 「等等！」+ 圈注（打断节奏）"
			},
			{
				"value": "PunchInHost",
				"name": "人物跳切",
				"category": "节奏 / 互动 / 结构",
				"description": "同一条口播按句子边界硬切景别（1.0/1.3 或 1.0/1.18/1.32 + 偏置）"
			},
			{
				"value": "KeywordStack",
				"name": "关键词堆叠",
				"category": "节奏 / 互动 / 结构",
				"description": "主播身旁依次弹 图标 + 彩色词，结束一起模糊淡出"
			},
			{
				"value": "RetentionCaption",
				"name": "留存大字幕",
				"category": "节奏 / 互动 / 结构",
				"description": "留存大字幕：1–3 个词一组居中砸出，关键词变色"
			},
			{
				"value": "TiltLine",
				"name": "倾斜金句",
				"category": "节奏 / 互动 / 结构",
				"description": "倾斜 -12° 金句逐字弹出，关键词亮黄"
			},
			{
				"value": "Aside",
				"name": "括号旁白",
				"category": "节奏 / 互动 / 结构",
				"description": "括号旁白吐槽（剪辑师画外音）"
			},
			{
				"value": "Danmaku",
				"name": "飘动弹幕",
				"category": "节奏 / 互动 / 结构",
				"description": "弹幕从右往左飘（替观众说出质疑）"
			},
			{
				"value": "ReactionPop",
				"name": "反应贴纸",
				"category": "节奏 / 互动 / 结构",
				"description": "动态表情 / 原创贴纸 + 吐槽，弹出轻晃"
			},
			{
				"value": "MemeWindow",
				"name": "梗图窗口",
				"category": "节奏 / 互动 / 结构",
				"description": "黑底梗图窗，一句一图硬切（素材用原创表情包）"
			},
			{
				"value": "PollPop",
				"name": "互动投票",
				"category": "节奏 / 互动 / 结构",
				"description": "「评论区打 1 还是 2」，说到哪个哪个大数字弹出"
			},
			{
				"value": "GlitchInterstitial",
				"name": "故障插屏",
				"category": "节奏 / 互动 / 结构",
				"description": "0.5 秒测试卡故障插屏 + 圆形主播 + 「点赞关注」"
			},
			{
				"value": "HostFloaters",
				"name": "漂浮窗口",
				"category": "节奏 / 互动 / 结构",
				"description": "主播旁漂两个浏览器窗口 + 图标小标签"
			},
			{
				"value": "ProgressChapters",
				"name": "章节进度",
				"category": "节奏 / 互动 / 结构",
				"description": "顶部进度条 + 章节刻度 + 当前章节名"
			},
			{
				"value": "ProgressTracker",
				"name": "步骤追踪",
				"category": "节奏 / 互动 / 结构",
				"description": "步骤徽章 / 路线条（起点 → 终点）"
			},
			{
				"value": "ChapterCard",
				"name": "章节大卡",
				"category": "节奏 / 互动 / 结构",
				"description": "色条扫过 + 大序号 + 标题"
			},
			{
				"value": "RecapBoard",
				"name": "两栏复盘",
				"category": "节奏 / 互动 / 结构",
				"description": "两栏复盘板（为什么 / 怎么办），每章亮一条新的"
			},
			{
				"value": "Countdown",
				"name": "倒计时",
				"category": "节奏 / 互动 / 结构",
				"description": "倒计时药丸，最后 3 秒变红跳动"
			},
			{
				"value": "GhostWord",
				"name": "背景鬼影字",
				"category": "节奏 / 互动 / 结构",
				"description": "背景巨大鬼影词缓慢横移"
			},
			{
				"value": "Highlight",
				"name": "荧光文字高亮",
				"category": "标注 / 人物",
				"description": "在文字后扫过荧光底色，用于句内重点。"
			}
		];
		//#endregion
		//#region src/gallery.ts
		const entries = (kind, group, template, rows) => rows.map(([value, name, description]) => ({
			id: `${kind}-${value}`,
			name,
			description,
			kind,
			value,
			group,
			category: group,
			template,
			portrait: template === "huazi-916"
		}));
		const galleryStyles = [
			...templates.filter((t) => t.id !== "packaging").map((t) => ({
				id: `template-${t.id.replaceAll("/", "-")}`,
				name: t.name,
				description: t.description,
				group: "整体风格",
				category: t.category,
				template: t.id,
				kind: "template",
				value: t.id,
				portrait: t.aspectRatio === "9:16"
			})),
			...entries("scene", "小林场景", "lin-169", [
				[
					"host",
					"全屏景深字",
					"大字从人物身后出现，搭配侧边信息卡。"
				],
				[
					"board",
					"紫金题板",
					"主题、问题和选项分步出现。"
				],
				[
					"broll",
					"画面与人物小窗",
					"全屏辅助画面慢推，人物留在圆形小窗。"
				],
				[
					"rates",
					"利率对照",
					"并排展示数字，突出差异。"
				],
				[
					"assume",
					"假设与揭晓",
					"先给出问号，再揭晓条件和结果。"
				],
				[
					"formula",
					"逐行推导",
					"公式逐行出现，最后一行高亮。"
				],
				[
					"big",
					"大字结论",
					"上方命题，下方结果砸入。"
				],
				[
					"formula2",
					"公式逐项生长",
					"公式按项展开，为每个数值附上解释。"
				],
				[
					"calc",
					"算例填数",
					"算式依次填入，再突出最终答案。"
				],
				[
					"bars",
					"横向条形图",
					"条形依次增长，高亮重点数据。"
				],
				[
					"fall",
					"瀑布柱图",
					"用起点、扣除和结果展示变化。"
				],
				[
					"curve",
					"增长曲线",
					"曲线随时间画出，搭配结论标签。"
				],
				[
					"stickers",
					"四宫格贴纸",
					"四组关键词与贴纸逐个亮起。"
				]
			]),
			...entries("broll", "小林场景", "lin-169", [
				[
					"card",
					"画面 · 信息卡",
					"在辅助画面上弹出标题和数字卡。"
				],
				[
					"stat",
					"画面 · 大数字",
					"数据与标签依次出现。"
				],
				[
					"chips",
					"画面 · 胶囊词",
					"用胶囊短句突出两三个要点。"
				],
				[
					"banner",
					"画面 · 横幅",
					"句子横穿画面，重点词使用色块。"
				],
				[
					"doc",
					"画面 · 文档卡",
					"纸张卡片中高亮关键原文。"
				],
				[
					"slam",
					"画面 · 砸字",
					"一句结论快速放大砸入。"
				],
				[
					"float",
					"画面 · 漂浮字",
					"多个关键词在画面中缓缓上浮。"
				]
			]),
			...entries("pip", "人物布局", "lin-169", [
				[
					"circle-tl",
					"左上圆形窗",
					"人物位于左上角，内容面板向右避让。"
				],
				[
					"circle-bl",
					"左下圆形窗",
					"人物位于左下角，保留上方信息空间。"
				],
				[
					"rect-l",
					"左侧方形窗",
					"竖向人物窗位于左侧。"
				],
				[
					"rect-r",
					"右侧方形窗",
					"人物位于右侧，内容面板向左避让。"
				]
			]),
			...entries("card", "竖屏花字", "huazi-916", [
				[
					"stamp",
					"描边印章",
					"倾斜盖下印章式结论。"
				],
				[
					"slam",
					"砸屏大字",
					"带描边的大字快速砸入。"
				],
				[
					"big",
					"渐变大字块",
					"黄色渐变色块突出标签式结论。"
				],
				[
					"number",
					"滚动数字",
					"数量从零滚动到目标数值。"
				],
				[
					"vs",
					"左右对比",
					"两个名牌与 VS 依次出现。"
				],
				[
					"tags",
					"彩色名牌",
					"四张名牌逐个点亮。"
				],
				[
					"bars",
					"横条对比",
					"用横条比较速度、成本或表现。"
				],
				[
					"list",
					"优缺点清单",
					"带勾叉的条目依次滑入。"
				],
				[
					"image",
					"白边截图",
					"展示带白边、标签的截图。"
				]
			]),
			...entries("preset", "竖屏花字", "huazi-916", [
				[
					"restrained",
					"克制花字",
					"较小字幕与轻微推镜，适合知识和品牌。"
				],
				[
					"standard",
					"标准花字",
					"清晰关键词、适度弹跳与镜头推进。"
				],
				[
					"lively",
					"热闹花字",
					"更大字幕、更强弹跳和多色关键词。"
				]
			]),
			...packaging_catalog_default.map((p) => ({
				...p,
				id: `pack-${p.value}`,
				kind: "pack",
				group: "包装组件",
				template: "packaging",
				portrait: false
			}))
		];
		const galleryGroups = [
			"全部",
			"整体风格",
			"小林场景",
			"竖屏花字",
			"包装组件",
			"人物布局"
		];
		function galleryPrompt(item) {
			return `${`请使用口播技能的「${item.name}」。`}${`先用 koubo_template 创建 ${item.template} 工程，沿用原版组件、布局和动效。`}${item.kind === "scene" ? `在 src/scenes.json 中使用 type=${JSON.stringify(item.value)}。` : item.kind === "broll" ? `在 src/scenes.json 中使用 type="broll"，配置 ${item.value} 及对应时间字段。` : item.kind === "pip" ? `在 src/scenes.json 的适用场景中设置 pip=${JSON.stringify(item.value)}，让面板避开人物。` : item.kind === "card" ? `在 src/edit.json 的 cards 中设置 type=${JSON.stringify(item.value)}，时间与讲稿对齐。` : item.kind === "preset" ? `在 src/edit.json 设置 preset=${JSON.stringify({
				restrained: "克制",
				standard: "标准",
				lively: "热闹"
			}[item.value])}。` : item.kind === "pack" ? item.value === "Highlight" ? "用原版 Highlight 包裹需要高亮的文字；它是文字辅助组件，不能作为独立 pack 项。" : `使用原版 ${item.value} 组件；在目标剪辑工程中通过 PackLayer 的 pack 条目 {"use":${JSON.stringify(item.value)}} 接入。` : ""}请先和我确认讲稿、人物素材、时长及用途，再开始生成。预览里的占位人物和示例数据需要替换成我的素材；成片保存在工程的 out 文件夹。`;
		}
		//#endregion
		//#region src/client/Gallery.tsx
		function Preview({ item, close, choose }) {
			const dialog = (0, react.useRef)(null);
			const frame = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				dialog.current?.showModal();
				return () => dialog.current?.close();
			}, []);
			(0, react.useEffect)(() => {
				const onMessage = (event) => {
					if (event.origin === location.origin && event.source === frame.current?.contentWindow && event.data?.type === "dsh-koubo:preview-close") close();
				};
				window.addEventListener("message", onMessage);
				return () => window.removeEventListener("message", onMessage);
			}, [close]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dialog", {
				ref: dialog,
				className: "kb-gallery-dialog",
				"aria-labelledby": "kb-style-title",
				onCancel: (event) => {
					event.preventDefault();
					close();
				},
				onClick: (event) => {
					if (event.target === event.currentTarget) close();
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "kb-gallery-dialog-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "样式预览" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						"aria-label": "关闭样式预览",
						onClick: close,
						children: "×"
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "kb-gallery-dialog-content",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "kb-motion",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
							ref: frame,
							src: `/dsh-koubo/gallery/index.html?id=${encodeURIComponent(item.id)}`,
							title: `${item.name}动效预览`,
							allow: "fullscreen"
						}, item.id)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "kb-gallery-info",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "kb-eyebrow",
								children: [
									item.group,
									" · ",
									item.portrait ? "9:16" : "16:9"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								id: "kb-style-title",
								children: item.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: item.description }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "kb-source-name",
								children: item.value
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "kb-gallery-note",
								children: "点击播放查看原版动效。人物为 AI 生成的示例形象，截图与数据仅用于演示；预览不含口播和音效。"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "kb-primary",
								onClick: choose,
								children: "选用这个样式 ↗"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "kb-help",
								children: "带入当前对话，确认内容后再制作。"
							})
						]
					})]
				})]
			});
		}
		function Gallery({ prompt }) {
			const [group, setGroup] = (0, react.useState)("全部"), [query, setQuery] = (0, react.useState)(""), [category, setCategory] = (0, react.useState)("全部"), [selected, setSelected] = (0, react.useState)();
			const previewTrigger = (0, react.useRef)(null);
			const closePreview = () => {
				const trigger = previewTrigger.current;
				setSelected(void 0);
				requestAnimationFrame(() => {
					if (trigger?.isConnected) trigger.focus({ preventScroll: true });
				});
			};
			const categories = [...new Set(galleryStyles.filter((item) => item.group === "包装组件").map((item) => item.category))];
			const items = galleryStyles.filter((item) => (group === "全部" || item.group === group) && (group !== "包装组件" || category === "全部" || item.category === category) && `${item.name} ${item.value} ${item.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
			const choose = (item) => {
				setSelected(void 0);
				prompt(galleryPrompt(item));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "kb-gallery",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "kb-gallery-heading",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "kb-eyebrow",
								children: "STYLE COLLECTION"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "找到你的表达方式" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "先看看效果，再选一个开始创作。" })
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "kb-gallery-total",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: galleryStyles.length }), " 种样式与组件"]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "kb-gallery-toolbar",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "kb-gallery-tabs",
							"aria-label": "样式分类",
							children: galleryGroups.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								"aria-pressed": group === value,
								onClick: () => {
									setGroup(value);
									setCategory("全部");
								},
								children: [value, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: value === "全部" ? galleryStyles.length : galleryStyles.filter((item) => item.group === value).length })]
							}, value))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							"aria-label": "搜索样式",
							placeholder: "搜索样式…",
							value: query,
							onChange: (event) => setQuery(event.target.value)
						})]
					}),
					group === "包装组件" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "kb-filters kb-gallery-subfilters",
						"aria-label": "包装用途",
						children: ["全部", ...categories].map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-pressed": category === value,
							onClick: () => setCategory(value),
							children: value
						}, value))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "kb-gallery-results",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: group === "全部" ? "全部样式" : group }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [items.length, " 个结果"] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "kb-gallery-grid",
						children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: "kb-style-tile",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: `kb-tile-image ${item.portrait ? "kb-tile-portrait" : ""}`,
								"aria-label": `预览${item.name}`,
								onClick: (event) => {
									previewTrigger.current = event.currentTarget;
									setSelected(item);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
										src: `/dsh-koubo/gallery/posters/${item.id}.jpg`,
										alt: `${item.name}效果预览`,
										loading: "lazy"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "kb-tile-ratio",
										children: item.portrait ? "9:16" : "16:9"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "kb-tile-play",
										"aria-hidden": "true",
										children: "▶"
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "kb-tile-caption",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									title: item.name,
									children: item.name
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: item.group === "包装组件" ? item.category : item.group })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									"aria-label": `选用${item.name}`,
									onClick: () => choose(item),
									children: "选用 ↗"
								})]
							})]
						}, item.id))
					}),
					!items.length && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "kb-empty",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: "没有找到这个样式" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "试试名称、组件名，或清除筛选。" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								onClick: () => {
									setGroup("全部");
									setCategory("全部");
									setQuery("");
								},
								children: "显示全部"
							})
						]
					}),
					selected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Preview, {
						item: selected,
						close: closePreview,
						choose: () => choose(selected)
					})
				]
			});
		}
		//#endregion
		//#region src/client/navigation.ts
		const currentConversation = (state) => Object.values(state.byId).find((session) => (session.retainedBy.mainView ?? 0) > 0);
		/** 只填入草稿，保留已有输入与附件，由用户确认后发送。 */
		function preparePrompt(ctx, prompt) {
			const sessions = ctx.sessions;
			const session = currentConversation(sessions.list.getSnapshot());
			if (!session) {
				ctx.uiWorkspace.startSession(void 0, {
					prompt,
					whenDraftExists: "append"
				});
				return;
			}
			const binding = sessions.binding(session.id);
			if (!binding) throw new Error("请重新打开工作区对话。");
			if (ctx.conversation.input.requestDraftInitialization(binding, {
				prompt,
				whenDraftExists: "append"
			}) === "blocked") throw new Error("正在发送消息，请稍后再试。");
			ctx.layout.selectPanel(null);
			requestAnimationFrame(() => {
				if (ctx.layout.panelInfo.getSnapshot().activePanelId !== null || currentConversation(sessions.list.getSnapshot())?.id !== session.id) return;
				const scope = sessions.scope(session.id);
				if (scope) ctx.conversation.input.for(scope).focus();
			});
		}
		//#endregion
		//#region src/client/Studio.tsx
		function StudioIcon({ size = 20 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "3",
						y: "4",
						width: "18",
						height: "16",
						rx: "4"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m10 9 5 3-5 3Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 4v3m10-3v3M7 17v3m10-3v3" })
				]
			});
		}
		const size = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
		const workName = (name) => name.replace(/\.(mp4|webm|mov)$/iu, "");
		const durationLabel = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
		const mediaUrl = (sessionId, item, download = false) => `/dsh-koubo/media?${new URLSearchParams({
			sessionId,
			path: item.path,
			version: item.modifiedAt,
			...download ? { download: "1" } : {}
		})}`;
		function WorkCover({ sessionId, item }) {
			const element = (0, react.useRef)(null), [visible, setVisible] = (0, react.useState)(false), [ready, setReady] = (0, react.useState)(false), [duration, setDuration] = (0, react.useState)();
			(0, react.useEffect)(() => {
				if (!element.current) return;
				const observer = new IntersectionObserver((entries) => {
					if (entries.some((entry) => entry.isIntersecting)) {
						setVisible(true);
						observer.disconnect();
					}
				}, { rootMargin: "100px" });
				observer.observe(element.current);
				return () => observer.disconnect();
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "kb-thumbnail",
				ref: element,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioIcon, { size: 38 }),
					visible && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
						muted: true,
						playsInline: true,
						preload: "metadata",
						"aria-hidden": "true",
						tabIndex: -1,
						src: `${mediaUrl(sessionId, item)}#t=0.1`,
						onLoadedMetadata: (event) => {
							const value = event.currentTarget.duration;
							if (Number.isFinite(value)) setDuration(value);
						},
						onLoadedData: () => setReady(true),
						onError: () => setReady(false),
						style: { opacity: ready ? 1 : 0 }
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "kb-work-play",
						"aria-hidden": "true",
						children: "▶"
					}),
					duration !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "kb-work-duration",
						children: durationLabel(duration)
					})
				]
			});
		}
		function WorkPreview({ sessionId, item, close, resource, edit }) {
			const dialog = (0, react.useRef)(null), [failed, setFailed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				const element = dialog.current;
				element?.showModal();
				return () => element?.close();
			}, []);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dialog", {
				ref: dialog,
				className: "kb-work-dialog",
				"aria-labelledby": "kb-work-title",
				onCancel: (event) => {
					event.preventDefault();
					close();
				},
				onClick: (event) => {
					if (event.target === event.currentTarget) close();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "kb-work-dialog-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "kb-eyebrow",
							children: "作品预览"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							id: "kb-work-title",
							children: workName(item.name)
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-label": "关闭作品预览",
							onClick: close,
							children: "×"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "kb-work-stage",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("video", {
							controls: true,
							playsInline: true,
							preload: "metadata",
							src: mediaUrl(sessionId, item),
							onError: () => setFailed(true),
							"aria-label": `播放 ${item.name}`
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "kb-work-dialog-foot",
						children: [
							failed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								role: "alert",
								children: "此视频无法在浏览器播放，请下载后使用本地播放器打开。"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
								templates.find((t) => t.id === item.templateId)?.name ?? "口播视频",
								" · ",
								size(item.bytes)
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "kb-work-actions",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										href: mediaUrl(sessionId, item, true),
										download: item.name,
										children: "下载成品 ↓"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										onClick: resource,
										children: item.project ? "查看工程" : "查看文件"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "kb-primary",
										onClick: edit,
										children: "继续编辑 ↗"
									})
								]
							})
						]
					})
				]
			});
		}
		function LibraryView({ ctx, sessionId, cwd, prompt }) {
			const [result, setResult] = (0, react.useState)(), [loading, setLoading] = (0, react.useState)(true), [error, setError] = (0, react.useState)("");
			const [revision, setRevision] = (0, react.useState)(0), [query, setQuery] = (0, react.useState)(""), [kind, setKind] = (0, react.useState)("finished"), [sort, setSort] = (0, react.useState)("recent"), [selected, setSelected] = (0, react.useState)("");
			const previewTrigger = (0, react.useRef)(null);
			const closePreview = () => {
				const trigger = previewTrigger.current;
				setSelected("");
				requestAnimationFrame(() => {
					if (trigger?.isConnected) trigger.focus({ preventScroll: true });
				});
			};
			(0, react.useEffect)(() => {
				const abort = new AbortController();
				setError("");
				setSelected("");
				if (!sessionId) {
					setLoading(false);
					return () => abort.abort();
				}
				setLoading(true);
				(async () => {
					try {
						const response = await fetch(`/dsh-koubo/library?${new URLSearchParams({ sessionId })}`, {
							credentials: "same-origin",
							signal: abort.signal
						});
						if (!response.ok) throw new Error("无法读取作品，请确认工作区可用后重试。");
						const data = await response.json();
						if (!abort.signal.aborted) setResult({
							sessionId,
							cwd,
							data
						});
					} catch (failure) {
						if (!abort.signal.aborted) setError(failure instanceof Error ? failure.message : "无法读取作品。");
					} finally {
						if (!abort.signal.aborted) setLoading(false);
					}
				})();
				return () => abort.abort();
			}, [
				sessionId,
				cwd,
				revision
			]);
			const data = result?.sessionId === sessionId && result?.cwd === cwd ? result?.data : void 0;
			const items = (data?.items ?? []).filter((item) => (kind === "all" || item.kind === kind) && `${item.name} ${item.path} ${templates.find((t) => t.id === item.templateId)?.name ?? ""}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name, "zh") : b.modifiedAt.localeCompare(a.modifiedAt));
			const active = items.find((item) => item.path === selected);
			const resource = (path) => {
				if (!sessionId) return;
				ctx.layout.selectPanel(null);
				ctx.sidebarRight.openResource(`dsh-resource://file/session/${encodeURIComponent(sessionId)}/video/koubo/${path.split("/").map(encodeURIComponent).join("/")}`);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "kb-heading",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "我的作品库" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						title: cwd,
						children: cwd ? `当前工作区 · ${cwd.split(/[/\\]/u).filter(Boolean).at(-1)}` : "打开工作区，找回你的口播作品。"
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						disabled: loading || !sessionId,
						onClick: () => setRevision((v) => v + 1),
						children: "刷新作品"
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "kb-library-tools",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "kb-filters",
						"aria-label": "作品分类",
						children: [
							["finished", "成片"],
							["clip", "生成片段"],
							["all", "全部视频"]
						].map(([value, label]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-pressed": kind === value,
							onClick: () => {
								setKind(value);
								setSelected("");
							},
							children: label
						}, value))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "kb-search",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							"aria-label": "搜索作品",
							placeholder: "搜索作品或样式…",
							value: query,
							onChange: (event) => setQuery(event.target.value)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							"aria-label": "作品排序",
							value: sort,
							onChange: (event) => setSort(event.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "recent",
								children: "最近修改"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "name",
								children: "名称排序"
							})]
						})]
					})]
				}),
				!sessionId ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "kb-empty",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioIcon, { size: 38 }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: "先打开一个工作区对话" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "该工作区的口播视频会集中显示在这里。" })
					]
				}) : loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "kb-empty",
					role: "status",
					children: "正在读取作品…"
				}) : error ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "kb-empty",
					role: "alert",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: error }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						onClick: () => setRevision((v) => v + 1),
						children: "重试"
					})]
				}) : !items.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "kb-empty",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioIcon, { size: 38 }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: query ? "没有找到匹配的作品" : kind === "clip" ? "还没有生成片段" : "这里将收藏你的创作" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: query ? "换个关键词，或查看全部视频。" : "保存在工作区 video/koubo 文件夹中的 MP4、WebM、MOV 视频会出现在这里。" }),
						!query && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: () => prompt("请用口播技能帮我制作一条视频，先和我确认讲稿、人物素材与样式。"),
							children: "开始创作 ↗"
						})
					]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "kb-works",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "kb-work-grid",
						children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: "kb-work-card",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								className: "kb-work-cover",
								"aria-label": `预览 ${item.name}`,
								"aria-haspopup": "dialog",
								onClick: (event) => {
									previewTrigger.current = event.currentTarget;
									setSelected(item.path);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkCover, {
									sessionId,
									item
								}), item.kind === "clip" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "kb-work-kind",
									children: "生成片段"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "kb-work-card-body",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										title: item.name,
										children: workName(item.name)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [
										templates.find((t) => t.id === item.templateId)?.name ?? "口播视频",
										" · ",
										size(item.bytes)
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "kb-work-card-foot",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("time", {
											dateTime: item.modifiedAt,
											children: new Date(item.modifiedAt).toLocaleString("zh-CN", {
												timeZone: "Asia/Shanghai",
												month: "2-digit",
												day: "2-digit",
												hour: "2-digit",
												minute: "2-digit",
												hour12: false
											})
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
											href: mediaUrl(sessionId, item, true),
											download: item.name,
											"aria-label": `下载 ${item.name}`,
											children: "下载 ↓"
										})]
									})
								]
							})]
						}, item.path))
					}), active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkPreview, {
						sessionId,
						item: active,
						close: closePreview,
						resource: () => resource(active.project ? `${active.project}/package.json` : active.path),
						edit: () => {
							setSelected("");
							prompt(`请继续编辑口播作品 ${JSON.stringify(`video/koubo/${active.path}`)}。${active.project ? `对应工程是 ${JSON.stringify(`video/koubo/${active.project}`)}，请沿用该工程。` : "先检查现有视频与素材。"}请先问我需要修改什么，保留原成片，把新版本另存。`);
						}
					}, `${sessionId}:${active.path}:${active.modifiedAt}`)]
				}),
				data?.truncated && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					role: "status",
					className: "kb-help",
					children: "文件较多，当前只显示部分作品。请整理口播目录后刷新。"
				})
			] });
		}
		function Studio({ ctx }) {
			const sessions = ctx.sessions;
			const session = currentConversation((0, react.useSyncExternalStore)(sessions.list.subscribe, sessions.list.getSnapshot));
			const [tab, setTab] = (0, react.useState)("styles"), [notice, setNotice] = (0, react.useState)("");
			const prompt = (text) => {
				try {
					preparePrompt(ctx, text);
					setNotice("");
				} catch (error) {
					setNotice(error instanceof Error ? error.message : "无法打开对话。");
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "kb-studio",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						"data-window-drag": true,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "kb-brand",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StudioIcon, { size: 25 }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: "口播工作室" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: "从灵感样式，到你的下一部作品" })] })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							onClick: () => ctx.layout.selectPanel(null),
							children: "返回对话 ↗"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
						"aria-label": "口播工作室",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-current": tab === "styles" ? "page" : void 0,
							onClick: () => {
								setTab("styles");
								setNotice("");
							},
							children: "样式馆"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							"aria-current": tab === "library" ? "page" : void 0,
							onClick: () => {
								setTab("library");
								setNotice("");
							},
							children: "作品库"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", { children: [notice && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						role: "alert",
						children: notice
					}), tab === "styles" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Gallery, { prompt }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LibraryView, {
						ctx,
						sessionId: session?.id,
						cwd: session?.cwd,
						prompt
					})] })
				]
			});
		}
		//#endregion
		//#region src/client/styles.ts
		const STYLES = `
.kb-studio{--kb-header-inset:28px;--kb-bg:var(--dsw-alias-bg-base,#fafafa);--kb-fg:var(--dsw-alias-label-primary,#262626);--kb-muted:var(--dsw-alias-label-secondary,#737373);--kb-border:var(--dsw-alias-border-l2,#e5e5e5);--kb-card:var(--dsw-alias-bg-module-platform,#fff);height:100%;min-height:0;display:flex;flex-direction:column;overflow:hidden;color:var(--kb-fg);background:var(--kb-bg);font-family:inherit;container-type:inline-size}
.kb-studio *{box-sizing:border-box}.kb-studio button,.kb-studio input,.kb-studio select{font:inherit;color:inherit}.kb-studio button,.kb-studio a{cursor:pointer}.kb-studio button{border:1px solid var(--kb-border);background:var(--kb-card);border-radius:9px;padding:9px 14px;font-size:13px}.kb-studio button:hover{filter:brightness(.96)}.kb-studio button:disabled{opacity:.5;cursor:default}.kb-studio :focus-visible{outline:2px solid var(--kb-fg);outline-offset:3px}.kb-studio a{color:inherit;text-decoration:none;font-size:13px}.kb-studio h1,.kb-studio h2,.kb-studio h3,.kb-studio p{margin:0}.kb-studio h1{font-size:19px;font-weight:650}.kb-studio h2{font-size:24px;letter-spacing:-.6px;font-weight:650}.kb-studio h3{font-size:16px;font-weight:600}.kb-studio p{font-size:13px;line-height:1.8;color:var(--kb-muted)}.kb-studio header{flex:none;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:var(--kb-header-inset) 32px 20px}.kb-brand{display:flex;align-items:center;gap:13px}.kb-brand>span{background:transparent;color:var(--kb-fg);border-radius:0;padding:0;display:flex}.kb-brand p{margin-top:3px;font-size:12px}.kb-studio nav{flex:none;display:flex;gap:24px;padding:0 32px;border-bottom:1px solid var(--kb-border)}.kb-studio nav button{border:0;border-radius:0;padding:14px 0;background:none;font-weight:600;color:var(--kb-muted)}.kb-studio nav button[aria-current]{border-bottom:2px solid var(--kb-fg);color:var(--kb-fg)}.kb-studio main{flex:1;min-height:0;width:100%;overflow:auto;padding:30px 32px 48px;max-width:1500px;margin:0 auto}.kb-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}.kb-heading p{margin-top:8px}.kb-count,.kb-eyebrow{font-size:11px;color:var(--kb-muted);letter-spacing:1px}.kb-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}.kb-filters button{background:transparent;border-color:transparent;padding:7px 14px}.kb-filters button[aria-pressed=true]{background:var(--kb-fg);color:var(--kb-bg);border-color:var(--kb-fg)}.kb-studio .kb-primary{background:var(--kb-fg);color:var(--kb-bg);border-color:var(--kb-fg)}.kb-studio .kb-help{font-size:11px;margin-top:12px}.kb-muted{margin-bottom:20px!important}.kb-library-tools{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:start}.kb-search{display:flex;gap:8px;margin-bottom:22px}.kb-search input,.kb-search select{border:1px solid var(--kb-border);background:var(--kb-card);padding:8px 10px;border-radius:8px;font-size:12px;max-width:180px}.kb-empty{min-height:310px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;text-align:center;padding:30px;color:var(--kb-muted)}.kb-empty p{max-width:400px}
@container (max-width:650px){.kb-studio header{padding:20px}.kb-studio main{padding:24px 20px}.kb-studio nav{padding:0 20px}.kb-studio h2{font-size:20px}.kb-heading{align-items:start}.kb-detail-columns{grid-template-columns:1fr}.kb-count{display:none}.kb-brand p{display:none}.kb-search{width:100%}.kb-search input{flex:1;max-width:none;min-width:0}.kb-large .kb-board strong{font-size:24px}}
html[data-platform="darwin"] .kb-studio>header{padding-top:calc(var(--kb-header-inset) + var(--dsh-frame-top-clearance,0px))}
@media(prefers-color-scheme:dark){.kb-studio{--kb-header-inset:28px;--kb-bg:var(--dsw-alias-bg-base,#1b1b1b);--kb-fg:var(--dsw-alias-label-primary,#e5e5e5);--kb-muted:var(--dsw-alias-label-secondary,#a3a3a3);--kb-border:var(--dsw-alias-border-l2,#383838);--kb-card:var(--dsw-alias-bg-module-platform,#252525)}}

.kb-gallery-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:0 0 28px}.kb-gallery-heading h2{margin:8px 0 6px;font-size:28px;letter-spacing:-.7px}.kb-gallery-heading .kb-eyebrow{color:var(--kb-muted);font-size:10px;letter-spacing:2.2px}.kb-gallery-total{font-size:12px;color:var(--kb-muted);white-space:nowrap}.kb-gallery-total b{font-size:28px;font-weight:500;color:var(--kb-fg);margin-right:6px}
.kb-gallery-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:1px solid var(--kb-border)}.kb-gallery-tabs{display:flex;flex-wrap:wrap;gap:5px}.kb-gallery-tabs button{border:0;background:transparent;padding:9px 12px;color:var(--kb-muted);font-size:12px}.kb-gallery-tabs button[aria-pressed=true]{background:var(--kb-fg);color:var(--kb-bg)}.kb-gallery-tabs small{font-size:10px;margin-left:6px;opacity:.6}.kb-gallery-toolbar input{min-width:100px;width:160px;border:1px solid var(--kb-border);border-radius:8px;padding:9px 12px;background:var(--kb-card);font-size:12px}.kb-gallery-subfilters{margin:16px 0 0;gap:2px}.kb-gallery-subfilters button{font-size:11px}.kb-gallery-results{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--kb-muted);padding:20px 0 13px}.kb-gallery-results>span:first-child{font-weight:600;color:var(--kb-fg)}
.kb-gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:20px 18px}.kb-style-tile{min-width:0;background:var(--kb-card);border:1px solid var(--kb-border);border-radius:12px;overflow:hidden;transition:box-shadow .18s,border-color .18s}.kb-style-tile:hover{border-color:var(--kb-muted);box-shadow:0 5px 18px #0000000c}.kb-studio .kb-tile-image{position:relative;display:block;width:100%;aspect-ratio:16/10;padding:0;border:0;border-radius:0;overflow:hidden;background:#202020}.kb-studio .kb-tile-image:hover{filter:none}.kb-tile-image img{width:100%;height:100%;object-fit:contain;display:block}.kb-tile-portrait{background:radial-gradient(ellipse at center,#404040,#202020)!important}.kb-tile-ratio{position:absolute;top:8px;right:8px;padding:3px 5px;border-radius:4px;background:#0004;color:#fff9;font-size:9px;letter-spacing:.6px}.kb-tile-play{position:absolute;left:50%;top:50%;translate:-50% -50%;width:36px;height:36px;display:grid;place-items:center;border-radius:50%;background:#fffffff0;color:#303030;font-size:13px;opacity:0;transition:opacity .18s}.kb-tile-image:hover .kb-tile-play,.kb-tile-image:focus-visible .kb-tile-play{opacity:1}.kb-tile-caption{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 13px}.kb-tile-caption>div{min-width:0}.kb-tile-caption h3{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kb-tile-caption small{display:block;color:var(--kb-muted);font-size:10px;margin-top:4px}.kb-tile-caption button{flex:none;padding:6px 0 6px 6px;border:0;background:none;color:var(--kb-fg);font-size:11px}
.kb-gallery-dialog{color:var(--kb-fg);background:var(--kb-card);border:1px solid var(--kb-border);border-radius:18px;padding:0;width:min(960px,calc(100% - 40px));max-width:960px;max-height:calc(100% - 60px);margin:auto;box-shadow:0 30px 100px #0005;overflow:auto}.kb-gallery-dialog::backdrop{background:#00000099;backdrop-filter:blur(5px)}.kb-gallery-dialog-head{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--kb-border);font-size:12px;color:var(--kb-muted)}.kb-gallery-dialog-head button{background:none;border:0;padding:0 6px;font-size:24px;line-height:1}.kb-gallery-dialog-content{display:grid;grid-template-columns:minmax(0,1fr) 280px}.kb-motion{min-height:0;display:grid;place-items:center;background:#1c1c1c;padding:14px}.kb-motion iframe{border:0;width:100%;height:min(400px,48dvh);aspect-ratio:auto;display:block}.kb-gallery-info{padding:28px 24px;display:flex;flex-direction:column;align-items:start}.kb-gallery-info h2{font-size:22px;margin:12px 0}.kb-gallery-info p{font-size:12px}.kb-source-name{font-family:monospace;font-size:11px;color:var(--kb-muted);margin:14px 0 20px;word-break:break-all}.kb-gallery-info .kb-gallery-note{font-size:11px;padding-top:16px;border-top:1px solid var(--kb-border);margin-top:auto;margin-bottom:20px}.kb-gallery-info .kb-primary{width:100%}
@container(max-width:1000px){.kb-gallery-toolbar{flex-wrap:wrap}.kb-gallery-toolbar input{width:100%}.kb-gallery-tabs{gap:0}.kb-gallery-tabs button{padding:8px 10px}.kb-gallery-grid{grid-template-columns:repeat(auto-fill,minmax(185px,1fr))}}
@container(max-width:650px){.kb-gallery-heading h2{font-size:23px}.kb-gallery-heading{margin-bottom:20px}.kb-gallery-total{display:none}.kb-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 10px}.kb-tile-caption{padding:10px;align-items:start;flex-wrap:wrap;gap:3px}.kb-tile-caption button{padding:4px 0}.kb-tile-caption h3{font-size:12px}.kb-tile-caption small{font-size:9px}.kb-gallery-dialog-content{grid-template-columns:1fr}.kb-motion{min-height:0}.kb-motion iframe{height:min(300px,40dvh)}.kb-gallery-info{padding:20px}.kb-gallery-info .kb-gallery-note{margin-top:0}.kb-gallery-dialog{width:calc(100% - 24px);max-height:calc(100% - 32px)}}


.kb-work-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:18px}.kb-work-card{min-width:0;overflow:hidden;border:1px solid var(--kb-border);border-radius:12px;background:var(--kb-card);transition:border-color .18s,box-shadow .18s}.kb-work-card:hover{border-color:var(--kb-muted);box-shadow:0 5px 18px #0000000c}
.kb-studio .kb-work-cover{position:relative;display:block;width:100%;aspect-ratio:16/9;padding:0;border:0;border-radius:0;overflow:hidden;background:#202020;color:#b3b3b3}.kb-studio .kb-work-cover:hover{filter:none}.kb-thumbnail{position:absolute;inset:0;display:grid;place-items:center}.kb-thumbnail video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.kb-work-play{position:absolute;left:50%;top:50%;translate:-50% -50%;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#fffffff0;color:#303030;font-size:14px;opacity:0;transition:opacity .18s}.kb-work-cover:hover .kb-work-play,.kb-work-cover:focus-visible .kb-work-play{opacity:1}.kb-work-duration{position:absolute;right:8px;bottom:8px;border-radius:4px;padding:3px 6px;background:#0009;color:#fff;font-size:10px;font-variant-numeric:tabular-nums}.kb-work-kind{position:absolute;left:8px;top:8px;padding:3px 6px;border-radius:4px;background:#0008;color:#fff;font-size:10px}
.kb-work-card-body{padding:13px 14px}.kb-work-card h3{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;font-weight:600}.kb-work-card p{font-size:11px;margin-top:5px}.kb-work-card-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;font-size:10px;color:var(--kb-muted)}.kb-work-card-foot a{font-size:11px;color:var(--kb-fg)}
.kb-work-dialog{color:var(--kb-fg);background:var(--kb-card);padding:0;border:1px solid var(--kb-border);border-radius:16px;width:min(780px,calc(100% - 48px));max-width:780px;max-height:calc(100dvh - 48px);margin:auto;overflow:auto;box-shadow:0 24px 90px #0005}.kb-work-dialog::backdrop{background:#00000080;backdrop-filter:blur(4px)}.kb-work-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px}.kb-work-dialog-head>div{min-width:0}.kb-work-dialog-head .kb-eyebrow{font-size:10px}.kb-work-dialog-head h2{font-size:17px;letter-spacing:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;margin-top:5px}.kb-work-dialog-head button{flex:none;border:0;background:none;font-size:25px;padding:4px 10px;line-height:1}.kb-work-stage{height:min(400px,48dvh);display:grid;place-items:center;background:#171717}.kb-work-stage video{display:block;width:100%;height:100%;min-height:0;object-fit:contain}.kb-work-dialog-foot{padding:16px 20px}.kb-work-dialog-foot p{font-size:11px}.kb-work-actions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px}.kb-work-actions>a{margin-right:auto;font-size:12px}.kb-work-actions button{padding:8px 12px;font-size:12px}
@container(max-width:650px){.kb-work-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 10px}.kb-work-card-body{padding:11px 10px}.kb-work-card h3{font-size:12px}.kb-work-card p{font-size:10px}.kb-work-card-foot{flex-wrap:wrap;gap:5px;margin-top:9px}.kb-work-dialog{width:calc(100% - 24px);max-height:calc(100dvh - 32px)}.kb-work-dialog-head,.kb-work-dialog-foot{padding:14px 16px}.kb-work-stage{height:min(300px,42dvh)}.kb-work-actions{gap:8px}.kb-work-actions button{padding:7px 9px;font-size:11px}}
@media(hover:none){.kb-work-play{opacity:1}}

`;
		//#endregion
		//#region src/client/index.tsx
		const inject = [
			"slots",
			"configForms",
			"layout",
			"sessions",
			"conversation",
			"uiWorkspace",
			"sidebarRight"
		];
		function GrokSettings({ settings }) {
			const state = (0, react.useSyncExternalStore)((listener) => settings.subscribe(listener), () => settings.getSnapshot());
			const [draftUrl, setUrl] = (0, react.useState)();
			const [apiKey, setKey] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)("");
			const baseUrl = draftUrl ?? state.value?.baseUrl ?? "";
			const disabled = state.status !== "ready" || !state.writable || busy;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				"aria-label": "Grok 视频渠道",
				style: {
					display: "grid",
					gap: 16,
					maxWidth: 580
				},
				onSubmit: async (event) => {
					event.preventDefault();
					setBusy(true);
					setMessage("");
					try {
						if (await saveSettings(settings, baseUrl, apiKey)) {
							setKey("");
							setUrl(void 0);
							setMessage("已保存");
						} else setMessage("配置已变化，请检查后重新保存。");
					} catch {
						setMessage("保存失败，请检查 API 地址后重试。");
					} finally {
						setBusy(false);
					}
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: {
							display: "grid",
							gap: 8
						},
						children: ["Base URL", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							"aria-label": "Grok Base URL",
							value: baseUrl,
							onChange: (event) => {
								setUrl(event.target.value);
								setMessage("");
							},
							disabled,
							placeholder: "https://api.x.ai",
							autoComplete: "off",
							spellCheck: false
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						style: {
							display: "grid",
							gap: 8
						},
						children: ["API Key", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							"aria-label": "Grok API Key",
							type: "password",
							value: apiKey,
							onChange: (event) => {
								setKey(event.target.value);
								setMessage("");
							},
							disabled,
							placeholder: "填写 API Key；留空保留已保存密钥",
							autoComplete: "new-password"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 12
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "submit",
							variant: "primary",
							disabled,
							children: busy ? "保存中…" : "保存"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							role: "status",
							children: state.status === "loading" ? "正在加载…" : state.status === "unavailable" ? "请启用口播插件。" : message
						})]
					})
				]
			});
		}
		function apply(ctx) {
			ctx.effect(() => {
				const style = document.createElement("style");
				style.textContent = STYLES;
				document.head.append(style);
				return () => style.remove();
			});
			ctx.slots.inject("main", () => ctx.slots.register({
				name: "main",
				key: "dsh-koubo"
			}, () => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Studio, { ctx })));
			ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
				name: "sidebar.panellist",
				id: "dsh-koubo",
				order: 15,
				label: () => "口播工作室"
			}, StudioIcon));
			const settings = ctx.configForms.get("koubo");
			ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: "dsh-koubo",
				inject: () => ({ settings })
			}, GrokSettings));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
