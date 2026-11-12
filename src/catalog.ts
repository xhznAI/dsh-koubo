export const templates = [
  { id: 'lin-169', name: '小林式解说', aspectRatio: '16:9', composition: 'Lin', category: '讲解', description: '人物讲述与题板交替，让复杂内容更容易理解。', features: ['圆形人物窗', '图表与公式', '章节题板'], tone: 'mint' },
  { id: 'huazi-916', name: '网红花字口播', aspectRatio: '9:16', composition: 'Huazi', category: '短视频', description: '竖屏人物搭配关键词花字，突出每一句的重点。', features: ['竖屏人物', '关键词花字', '节奏包装'], tone: 'pink' },
  { id: 'reference/launch-169', name: '发布解读', aspectRatio: '16:9', composition: 'Film', category: '讲解', description: '用产品画面、参数与人物解读讲清新事物。', features: ['产品展示', '参数信息', '横屏解读'], tone: 'blue' },
  { id: 'reference/tutorial-169', name: '保姆级教程', aspectRatio: '16:9', composition: 'Tutorial', category: '教程', description: '围绕操作画面分步讲解，带观众完成整个流程。', features: ['步骤讲解', '操作画面', '重点提示'], tone: 'peach' },
  { id: 'reference/multihost-169', name: '多主播多语言', aspectRatio: '16:9', composition: 'Tutorial', category: '讲解', description: '组织多个讲述角色，为不同段落安排人物与语言。', features: ['多角色', '多语言', '分段讲述'], tone: 'lavender' },
  { id: 'packaging', name: '包装组件库', aspectRatio: '16:9', composition: 'Gallery', category: '包装', description: '为口播加上文字、标注、数据与章节包装。', features: ['字幕与人名条', '手绘圈注', '数字与章节'], tone: 'sand' },
] as const;
export type StyleTemplate = typeof templates[number];
export interface LibraryItem { path: string; name: string; bytes: number; modifiedAt: string; kind: 'finished' | 'clip'; project: string | null; templateId: string | null }
export interface Library { directory: string | null; items: LibraryItem[]; truncated: boolean }
export function stylePrompt(template: StyleTemplate): string {
  return `请用口播技能的「${template.name}」样式制作视频。先用 koubo_template 创建 ${template.id} 工程，沿用原版模板。请先和我确认讲稿、人物素材和时长，再开始生成。成片请保存在该工程的 out 文件夹。`;
}
