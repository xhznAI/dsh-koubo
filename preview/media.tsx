import React from 'react';
import avatar from '../.cache/gallery-source/avatar';
export * from 'remotion';

// 只在展馆构建副本里替换人物、截图和声音，原版布局与动画代码保持不变。
const svg = (body: string, width = 1920, height = 1080) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`)}`;
export const staticFile = (path: string) => /brand\/mark/.test(path) ? svg('<path d="M160 120H640V420H160Z M760 120H1240V420H760Z M160 540H640V840H160Z M760 540H1240V840H760Z" fill="white"/>',1400,960) : path;
export function placeholder(path = '', portrait = false, cutout = false) {
  const palette = ['#273f48', '#493849', '#23463e', '#454255'];
  const color = palette[[...path].reduce((n, c) => n + c.charCodeAt(0), 0) % palette.length];
  if (/screen|doc|multiview|logo/i.test(path)) return svg(`<rect width="1920" height="1080" fill="#f6f3eb"/><rect x="40" y="40" width="1840" height="1000" rx="28" fill="#fff" stroke="#d9ded9" stroke-width="3"/><rect x="40" y="40" width="1840" height="100" rx="28" fill="#dfe9e3"/><circle cx="90" cy="90" r="13" fill="#7c9e8a"/><text x="140" y="105" font-family="sans-serif" font-size="38" fill="#345547">KOUBO / DEMO</text><rect x="1650" y="65" width="180" height="54" rx="12" fill="#48755e"/><text x="1690" y="103" font-family="sans-serif" font-size="30" fill="white">START</text><text x="150" y="300" font-family="sans-serif" font-size="65" fill="#273e33">Make your story.</text><rect x="150" y="380" width="1000" height="28" rx="14" fill="#e1e5e1"/><rect x="150" y="445" width="850" height="28" rx="14" fill="#e1e5e1"/>${[0,1,2].map((n)=>`<rect x="${150+n*530}" y="570" width="480" height="310" rx="22" fill="${['#e2eadc','#e4e2ef','#efe5d4'][n]}"/><text x="${190+n*530}" y="680" font-family="sans-serif" font-size="56" fill="#50645a">0${n+1}</text>`).join('')}`);
  const w = portrait ? 1080 : 1920, h = portrait ? 1920 : 1080, x = portrait ? 540 : 1215, y = portrait ? 550 : 390;
  return svg(`${cutout ? '' : `<defs><radialGradient id="g"><stop stop-color="${color}"/><stop offset="1" stop-color="#142428"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${w*.22}" cy="${h*.2}" r="${w*.3}" fill="#6a8f7c" opacity=".08"/><path d="M0 ${h*.8}L${w} ${h*.6}" stroke="#e7f3e2" opacity=".12" stroke-width="2"/>`}
    <path d="M${x-235} ${h}L${x-210} ${y+310}Q${x-180} ${y+160} ${x} ${y+170}Q${x+180} ${y+160} ${x+210} ${y+310}L${x+235} ${h}Z" fill="#7a9e8b"/><path d="M${x-120} ${y+200}L${x} ${y+370}L${x+120} ${y+200}" fill="#d8d1ba"/><rect x="${x-50}" y="${y+80}" width="100" height="150" rx="40" fill="#c6a787"/><ellipse cx="${x}" cy="${y}" rx="126" ry="150" fill="#e5c9a6"/><path d="M${x-125} ${y-20}Q${x-170} ${y-160} ${x} ${y-172}Q${x+152} ${y-150} ${x+125} ${y-20}Q${x+75} ${y-90} ${x-60} ${y-75}Z" fill="#263e3b"/><path d="M${x-60} ${y+8}h24m72 0h24" stroke="#3f4940" stroke-width="8" stroke-linecap="round"/><path d="M${x-28} ${y+73}q28 20 56 0" fill="none" stroke="#a87863" stroke-width="7" stroke-linecap="round"/>`, w, h);
}
export function OffthreadVideo({ src = '', transparent, style, className }: { src?: string; transparent?: boolean; style?: React.CSSProperties; className?: string; [key: string]: unknown }) {
  const portrait = /portrait|vertical|host_v/.test(src), cutout = transparent || /cutout|cut\/|_cut/.test(src);
  const w=portrait?1080:1920,h=portrait?1920:1080,iw=portrait?1100:750,ih=iw*1456/1088;
  const x=portrait?540:/main|cut\//.test(src)?1215:960,y=portrait?550:390;
  return <svg role="img" aria-label="AI 生成的示例数字人" className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" style={style}>
    {!cutout&&<><rect width={w} height={h} fill="#263e40"/><circle cx={w*.2} cy={h*.24} r={w*.32} fill="#6c8c7a" opacity=".12"/><path d={`M0 ${h*.82}L${w} ${h*.64}`} stroke="#b2cbb8" opacity=".15" strokeWidth="2"/></>}
    <image href={avatar} x={x-iw/2} y={y-ih*.28} width={iw} height={ih}/>
  </svg>;
}
export const Video = OffthreadVideo;
export function Img({ src = '', style, className }: { src?: string; style?: React.CSSProperties; className?: string; [key: string]: unknown }) {
  if(!src.startsWith('data:')&&!/screen|doc|multiview|logo/i.test(src)) return <OffthreadVideo src={src} style={style} className={className}/>;
  return <img alt="示例素材" src={src.startsWith('data:') ? src : placeholder(src)} style={style} className={className}/>;
}
export const Audio = () => null;
