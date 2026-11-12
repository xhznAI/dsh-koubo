import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { GalleryScene } from './Scene';
import { galleryStyles } from '../src/gallery';
registerRoot(()=> <>{galleryStyles.map(item=><Composition key={item.id} id={item.id} component={GalleryScene} defaultProps={{id:item.id}} durationInFrames={180} fps={30} width={item.portrait?1080:1920} height={item.portrait?1920:1080}/>)}</>);
