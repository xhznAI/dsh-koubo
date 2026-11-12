export declare const templates: readonly [{
    readonly id: "lin-169";
    readonly name: "小林式解说";
    readonly aspectRatio: "16:9";
    readonly composition: "Lin";
    readonly category: "讲解";
    readonly description: "人物讲述与题板交替，让复杂内容更容易理解。";
    readonly features: readonly ["圆形人物窗", "图表与公式", "章节题板"];
    readonly tone: "mint";
}, {
    readonly id: "huazi-916";
    readonly name: "网红花字口播";
    readonly aspectRatio: "9:16";
    readonly composition: "Huazi";
    readonly category: "短视频";
    readonly description: "竖屏人物搭配关键词花字，突出每一句的重点。";
    readonly features: readonly ["竖屏人物", "关键词花字", "节奏包装"];
    readonly tone: "pink";
}, {
    readonly id: "reference/launch-169";
    readonly name: "发布解读";
    readonly aspectRatio: "16:9";
    readonly composition: "Film";
    readonly category: "讲解";
    readonly description: "用产品画面、参数与人物解读讲清新事物。";
    readonly features: readonly ["产品展示", "参数信息", "横屏解读"];
    readonly tone: "blue";
}, {
    readonly id: "reference/tutorial-169";
    readonly name: "保姆级教程";
    readonly aspectRatio: "16:9";
    readonly composition: "Tutorial";
    readonly category: "教程";
    readonly description: "围绕操作画面分步讲解，带观众完成整个流程。";
    readonly features: readonly ["步骤讲解", "操作画面", "重点提示"];
    readonly tone: "peach";
}, {
    readonly id: "reference/multihost-169";
    readonly name: "多主播多语言";
    readonly aspectRatio: "16:9";
    readonly composition: "Tutorial";
    readonly category: "讲解";
    readonly description: "组织多个讲述角色，为不同段落安排人物与语言。";
    readonly features: readonly ["多角色", "多语言", "分段讲述"];
    readonly tone: "lavender";
}, {
    readonly id: "packaging";
    readonly name: "包装组件库";
    readonly aspectRatio: "16:9";
    readonly composition: "Gallery";
    readonly category: "包装";
    readonly description: "为口播加上文字、标注、数据与章节包装。";
    readonly features: readonly ["字幕与人名条", "手绘圈注", "数字与章节"];
    readonly tone: "sand";
}];
export type StyleTemplate = typeof templates[number];
export interface LibraryItem {
    path: string;
    name: string;
    bytes: number;
    modifiedAt: string;
    kind: 'finished' | 'clip';
    project: string | null;
    templateId: string | null;
}
export interface Library {
    directory: string | null;
    items: LibraryItem[];
    truncated: boolean;
}
export declare function stylePrompt(template: StyleTemplate): string;
