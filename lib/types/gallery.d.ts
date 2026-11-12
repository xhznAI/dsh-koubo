import { type StyleTemplate } from './catalog.js';
export interface GalleryStyle {
    id: string;
    name: string;
    group: string;
    category: string;
    description: string;
    template: StyleTemplate['id'];
    kind: 'template' | 'scene' | 'broll' | 'pip' | 'card' | 'preset' | 'pack';
    value: string;
    portrait: boolean;
}
export declare const galleryStyles: GalleryStyle[];
export declare const galleryGroups: string[];
export declare function galleryPrompt(item: GalleryStyle): string;
