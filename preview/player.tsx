import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';
import { GalleryScene, posterFrame } from './Scene';
import { galleryStyles } from '../src/gallery';
const id = new URLSearchParams(location.search).get('id') ?? '';
const item = galleryStyles.find(s=>s.id===id);
createRoot(document.getElementById('root')!).render(item ? <Player component={GalleryScene} inputProps={{id}} durationInFrames={180} compositionWidth={item.portrait?1080:1920} compositionHeight={item.portrait?1920:1080} fps={30} controls showVolumeControls={false} loop initiallyMuted initialFrame={posterFrame(id)} style={{width:'100%',height:'100%'}} errorFallback={({error})=><p role="alert">预览加载失败：{error.message}</p>}/> : <p role="alert">未找到样式。</p>);
