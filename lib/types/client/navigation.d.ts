import type { Context } from '@deepseek-ai/cordis';
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
export declare const currentConversation: (state: SessionListState) => import("@deepseek-ai/dsh-api-session-controller/client").SessionSummary | undefined;
/** 只填入草稿，保留已有输入与附件，由用户确认后发送。 */
export declare function preparePrompt(ctx: Context, prompt: string): void;
