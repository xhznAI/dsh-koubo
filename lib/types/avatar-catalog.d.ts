export interface AvatarDetails {
    name: string;
    imagePrompt: string;
    favorite: boolean;
}
export interface Avatar extends AvatarDetails {
    id: string;
    imagePath: string;
    mime: 'image/png' | 'image/jpeg' | 'image/webp';
    bytes: number;
    createdAt: string;
    updatedAt: string;
    available?: boolean;
}
export interface AvatarReference extends Omit<Avatar, 'available'> {
    removed: boolean;
}
export interface AvatarLibrary {
    items: Avatar[];
    truncated: boolean;
}
export declare const emptyAvatarDetails: AvatarDetails;
export declare const avatarImageUrl: (avatar: Avatar) => string;
