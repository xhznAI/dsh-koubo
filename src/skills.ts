import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { SkillCandidate, SkillProvider } from '@deepseek-ai/dsh-skill';

export function kouboSkill(): SkillProvider {
  const directory = new URL('../skills/koubo/', import.meta.url), file = new URL('SKILL.md', directory);
  const raw = readFileSync(file, 'utf8');
  const header = /^---\r?\nname: koubo\r?\ndescription: ([^\r\n]+)\r?\n---\r?\n/u.exec(raw);
  if (!header?.[1]) throw new Error('口播技能元数据无效。');
  const candidate: SkillCandidate = { name: 'koubo', description: header[1], path: fileURLToPath(file),
    invocation: { modelInvocable: true, userInvocable: true }, source: 'bundled', provider: 'koubo', rank: 600,
    resourceBase: { kind: 'directory', path: fileURLToPath(directory) }, locator: 'koubo' };
  return { name: 'koubo', list: async () => [candidate], get: async entry => {
    if (entry.locator !== 'koubo') return undefined;
    const { rank: _rank, locator: _locator, ...summary } = candidate;
    return { ...summary, content: raw.slice(header[0].length).trim() };
  } };
}
