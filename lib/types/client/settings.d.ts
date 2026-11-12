import type { ConfigForm } from '@deepseek-ai/dsh-client-ui-settings/client';
export interface Settings {
    baseUrl: string;
}
/** 只写入用户编辑的字段，空密钥保留原值。 */
export declare function saveSettings(form: ConfigForm<Settings>, baseUrl: string, apiKey: string): Promise<boolean>;
