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

export interface AvatarReference extends Omit<Avatar, 'available'> { removed: boolean }

export interface AvatarLibrary { items: Avatar[]; truncated: boolean }
export const emptyAvatarDetails: AvatarDetails = { name: '', imagePrompt: '', favorite: true };
export const avatarImageUrl = (avatar: Avatar) => `/dsh-koubo/avatar-image?${new URLSearchParams({ id: avatar.id, version: avatar.updatedAt })}`;
