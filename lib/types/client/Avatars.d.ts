import type { AvatarStore } from './avatar-store.js';
export declare function Avatars({ sessionId, store, prompt }: {
    sessionId?: string;
    store: AvatarStore;
    prompt(text: string): void;
}): import("react").JSX.Element;
