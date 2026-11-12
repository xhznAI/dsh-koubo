import { templates, type StyleTemplate } from './catalog.js';
import packaging from './packaging-catalog.json';

export interface GalleryStyle {
  id: string; name: string; group: string; category: string; description: string;
  template: StyleTemplate['id']; kind: 'template' | 'scene' | 'broll' | 'pip' | 'card' | 'preset' | 'pack';
  value: string; portrait: boolean;
}
const entries = (kind: GalleryStyle['kind'], group: string, template: GalleryStyle['template'], rows: string[][]): GalleryStyle[] => rows.map(([value, name, description]) => ({
  id: `${kind}-${value}`, name: name!, description: description!, kind, value: value!, group, category: group, template, portrait: template === 'huazi-916',
}));
export const galleryStyles: GalleryStyle[] = [
  ...templates.filter(t => t.id !== 'packaging').map(t => ({ id: `template-${t.id.replaceAll('/', '-')}`, name: t.name, description: t.description, group: '整体风格', category: t.category, template: t.id, kind: 'template' as const, value: t.id, portrait: t.aspectRatio === '9:16' })),
  ...entries('scene', '小林场景', 'lin-169', [
    ['host', '全屏景深字', '大字从人物身后出现，搭配侧边信息卡。'], ['board', '紫金题板', '主题、问题和选项分步出现。'],
    ['broll', '画面与人物小窗', '全屏辅助画面慢推，人物留在圆形小窗。'], ['rates', '利率对照', '并排展示数字，突出差异。'],
    ['assume', '假设与揭晓', '先给出问号，再揭晓条件和结果。'], ['formula', '逐行推导', '公式逐行出现，最后一行高亮。'],
    ['big', '大字结论', '上方命题，下方结果砸入。'], ['formula2', '公式逐项生长', '公式按项展开，为每个数值附上解释。'],
    ['calc', '算例填数', '算式依次填入，再突出最终答案。'], ['bars', '横向条形图', '条形依次增长，高亮重点数据。'],
    ['fall', '瀑布柱图', '用起点、扣除和结果展示变化。'], ['curve', '增长曲线', '曲线随时间画出，搭配结论标签。'],
    ['stickers', '四宫格贴纸', '四组关键词与贴纸逐个亮起。'],
  ]),
  ...entries('broll', '小林场景', 'lin-169', [
    ['card', '画面 · 信息卡', '在辅助画面上弹出标题和数字卡。'], ['stat', '画面 · 大数字', '数据与标签依次出现。'],
    ['chips', '画面 · 胶囊词', '用胶囊短句突出两三个要点。'], ['banner', '画面 · 横幅', '句子横穿画面，重点词使用色块。'],
    ['doc', '画面 · 文档卡', '纸张卡片中高亮关键原文。'], ['slam', '画面 · 砸字', '一句结论快速放大砸入。'], ['float', '画面 · 漂浮字', '多个关键词在画面中缓缓上浮。'],
  ]),
  ...entries('pip', '人物布局', 'lin-169', [
    ['circle-tl', '左上圆形窗', '人物位于左上角，内容面板向右避让。'], ['circle-bl', '左下圆形窗', '人物位于左下角，保留上方信息空间。'],
    ['rect-l', '左侧方形窗', '竖向人物窗位于左侧。'], ['rect-r', '右侧方形窗', '人物位于右侧，内容面板向左避让。'],
  ]),
  ...entries('card', '竖屏花字', 'huazi-916', [
    ['stamp', '描边印章', '倾斜盖下印章式结论。'], ['slam', '砸屏大字', '带描边的大字快速砸入。'], ['big', '渐变大字块', '黄色渐变色块突出标签式结论。'],
    ['number', '滚动数字', '数量从零滚动到目标数值。'], ['vs', '左右对比', '两个名牌与 VS 依次出现。'], ['tags', '彩色名牌', '四张名牌逐个点亮。'],
    ['bars', '横条对比', '用横条比较速度、成本或表现。'], ['list', '优缺点清单', '带勾叉的条目依次滑入。'], ['image', '白边截图', '展示带白边、标签的截图。'],
  ]),
  ...entries('preset', '竖屏花字', 'huazi-916', [['restrained', '克制花字', '较小字幕与轻微推镜，适合知识和品牌。'], ['standard', '标准花字', '清晰关键词、适度弹跳与镜头推进。'], ['lively', '热闹花字', '更大字幕、更强弹跳和多色关键词。']]),
  ...packaging.map(p => ({ ...p, id: `pack-${p.value}`, kind: 'pack' as const, group: '包装组件', template: 'packaging' as const, portrait: false })),
];
export const galleryGroups = ['全部', '整体风格', '小林场景', '竖屏花字', '包装组件', '人物布局'];
export function galleryPrompt(item: GalleryStyle): string {
  const intro = `请使用口播技能的「${item.name}」。`;
  const base = `先用 koubo_template 创建 ${item.template} 工程，沿用原版组件、布局和动效。`;
  const detail = item.kind === 'scene' ? `在 src/scenes.json 中使用 type=${JSON.stringify(item.value)}。`
    : item.kind === 'broll' ? `在 src/scenes.json 中使用 type="broll"，配置 ${item.value} 及对应时间字段。`
    : item.kind === 'pip' ? `在 src/scenes.json 的适用场景中设置 pip=${JSON.stringify(item.value)}，让面板避开人物。`
    : item.kind === 'card' ? `在 src/edit.json 的 cards 中设置 type=${JSON.stringify(item.value)}，时间与讲稿对齐。`
    : item.kind === 'preset' ? `在 src/edit.json 设置 preset=${JSON.stringify({ restrained: '克制', standard: '标准', lively: '热闹' }[item.value])}。`
    : item.kind === 'pack' ? item.value === 'Highlight' ? '用原版 Highlight 包裹需要高亮的文字；它是文字辅助组件，不能作为独立 pack 项。' : `使用原版 ${item.value} 组件；在目标剪辑工程中通过 PackLayer 的 pack 条目 {"use":${JSON.stringify(item.value)}} 接入。` : '';
  return `${intro}${base}${detail}请先和我确认讲稿、人物素材、时长及用途，再开始生成。预览里的占位人物和示例数据需要替换成我的素材；成片保存在工程的 out 文件夹。`;
}
