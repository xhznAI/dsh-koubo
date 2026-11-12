import { z } from 'zod';
export declare const modelSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    inputModes: z.ZodArray<z.ZodEnum<["text_to_video", "image_to_video"]>, "many">;
    nativeAudio: z.ZodBoolean;
    minSeconds: z.ZodNumber;
    maxSeconds: z.ZodNumber;
    resolutions: z.ZodArray<z.ZodString, "many">;
    aspectRatios: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    inputModes: ("text_to_video" | "image_to_video")[];
    nativeAudio: boolean;
    minSeconds: number;
    maxSeconds: number;
    resolutions: string[];
    aspectRatios: string[];
}, {
    id: string;
    name: string;
    inputModes: ("text_to_video" | "image_to_video")[];
    nativeAudio: boolean;
    minSeconds: number;
    maxSeconds: number;
    resolutions: string[];
    aspectRatios: string[];
}>, {
    id: string;
    name: string;
    inputModes: ("text_to_video" | "image_to_video")[];
    nativeAudio: boolean;
    minSeconds: number;
    maxSeconds: number;
    resolutions: string[];
    aspectRatios: string[];
}, {
    id: string;
    name: string;
    inputModes: ("text_to_video" | "image_to_video")[];
    nativeAudio: boolean;
    minSeconds: number;
    maxSeconds: number;
    resolutions: string[];
    aspectRatios: string[];
}>;
export type KouboModel = z.infer<typeof modelSchema>;
export declare const generationSchema: z.ZodObject<{
    model: z.ZodString;
    prompt: z.ZodString;
    duration: z.ZodNumber;
    resolution: z.ZodString;
    aspectRatio: z.ZodString;
    image: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    model: string;
    prompt: string;
    duration: number;
    resolution: string;
    aspectRatio: string;
    image?: string | undefined;
}, {
    model: string;
    prompt: string;
    duration: number;
    resolution: string;
    aspectRatio: string;
    image?: string | undefined;
}>;
export type KouboGeneration = z.infer<typeof generationSchema>;
export declare const taskSchema: z.ZodDiscriminatedUnion<"status", [z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["queued", "running"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "queued" | "running";
}, {
    id: string;
    status: "queued" | "running";
}>, z.ZodObject<{
    id: z.ZodString;
    status: z.ZodLiteral<"succeeded">;
    video: z.ZodObject<{
        url: z.ZodString;
        duration: z.ZodNumber;
        format: z.ZodLiteral<"mp4">;
    }, "strip", z.ZodTypeAny, {
        duration: number;
        url: string;
        format: "mp4";
    }, {
        duration: number;
        url: string;
        format: "mp4";
    }>;
}, "strip", z.ZodTypeAny, {
    video: {
        duration: number;
        url: string;
        format: "mp4";
    };
    id: string;
    status: "succeeded";
}, {
    video: {
        duration: number;
        url: string;
        format: "mp4";
    };
    id: string;
    status: "succeeded";
}>, z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["failed", "expired"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    status: "failed" | "expired";
}, {
    id: string;
    status: "failed" | "expired";
}>]>;
export type KouboTask = z.infer<typeof taskSchema>;
/** 来源由宿主持有凭据；实例绑定一个身份，切换身份时注销旧实例再注册新实例。 */
export interface KouboModelSource {
    readonly id: string;
    readonly label: string;
    readonly available: boolean;
    listModels(signal: AbortSignal): Promise<KouboModel[]>;
    create(input: KouboGeneration, signal: AbortSignal): Promise<KouboTask>;
    get(taskId: string, signal: AbortSignal): Promise<KouboTask>;
}
export interface KouboSources {
    register(source: KouboModelSource): () => void;
    list(): readonly KouboModelSource[];
    get(id: string): KouboModelSource | undefined;
}
export declare class SourceRegistry implements KouboSources {
    private readonly sources;
    register(source: KouboModelSource): () => void;
    list(): readonly KouboModelSource[];
    get(id: string): KouboModelSource | undefined;
}
export declare function validateGeneration(model: KouboModel, input: KouboGeneration): void;
