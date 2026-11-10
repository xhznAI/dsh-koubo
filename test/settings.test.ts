import { expect, it, vi } from 'vitest';
import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
import { saveSettings, type Settings } from '../src/client/settings.js';

it('只保存地址时保留后台密钥；新密钥与地址在同一次版本校验内保存', async () => {
  const mutate = vi.fn().mockResolvedValue(true);
  const form = { getSnapshot: () => ({ status: 'ready', writable: true, revision: 7 }), mutate } as unknown as ConfigForm<Settings>;
  await saveSettings(form, ' https://video.example/v1 ', '');
  expect(mutate).toHaveBeenLastCalledWith([{ op: 'set', path: ['baseUrl'], value: 'https://video.example/v1' }], 7);
  await saveSettings(form, 'https://video.example', ' test-settings-key ');
  expect(mutate).toHaveBeenLastCalledWith([
    { op: 'set', path: ['baseUrl'], value: 'https://video.example' },
    { op: 'set', path: ['apiKey'], value: 'test-settings-key' },
  ], 7);
  await expect(saveSettings(form, 'https://user:secret@video.example', '')).rejects.toThrow();
  expect(mutate).toHaveBeenCalledTimes(2);
});
