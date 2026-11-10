import { rmSync } from 'node:fs';

// 仅清理本插件生成的编译目录，不触及用户工作区或视频。
rmSync(new URL('../lib/', import.meta.url), { recursive: true, force: true });
