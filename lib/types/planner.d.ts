import type { KouboModel } from './api/index.js';
/** 时长仅用于分段，实际语速须检查生成结果；不据此推算或记录费用。 */
export declare function planNarration(text: string, model: KouboModel, targetSeconds?: number): {
    model: string;
    segments: {
        id: string;
        narration: string;
        duration: number;
    }[];
    estimatedSeconds: number;
    message: string;
};
export declare function talkingPrompt(input: {
    narration: string;
    language: string;
    visual: string;
    voice: string;
}): string;
