import type { Avatar, AvatarLibrary } from '../avatar-catalog.js';
export declare function useAvatars(sessionId?: string, cwd?: string): {
    data: AvatarLibrary | undefined;
    loading: boolean;
    error: string;
    busy: boolean;
    refresh: () => void;
    mutate: (method: "POST" | "PATCH" | "DELETE", value: unknown) => Promise<Avatar | undefined>;
    use: (id: string) => Promise<Avatar>;
};
export type AvatarStore = ReturnType<typeof useAvatars>;
