import {createServer} from 'node:http';
import {open,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('.'),brief=JSON.parse(await readFile('examples/readme-cases/brief.json','utf8'));
createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/') {
    res.setHeader('content-type','text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="zh-CN"><meta name="viewport" content="width=device-width"><title>README 案例预览</title><style>body{background:#f6f7f3;color:#233d30;font:15px system-ui;margin:32px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}article{background:white;border:1px solid #dde4dc;padding:20px;border-radius:16px}video{width:100%;max-height:500px;background:#1d3634}p{line-height:1.7}a{color:#47745b}button{margin-bottom:12px}</style><h1>同一个数字人，三种口播表达</h1><p>人物与口播由 AI 生成；点击视频播放有声成片。</p><main>${brief.cases.map(c=>`<article><h2>${c.title}</h2><video controls preload="metadata" src="/final/${c.id}.mp4"></video><p>${c.narration}</p><a href="/raw/${c.id}.mp4">查看原始素材</a></article>`).join('')}</main></html>`);return;
  }
  const match=url.pathname.match(/^\/(raw|final)\/([a-z-]+)\.mp4$/);
  if(!match||!brief.cases.some(c=>c.id===match[2])){res.writeHead(404).end();return;}
  let file;
  try {
    file=await open(resolve(root,match[1]==='raw'?'video/readme-cases':'assets/readme-cases',`${match[2]}.mp4`));
    const {size}=await file.stat(),range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(size-1,Number(range[2])):size-1;
    if(start>end||start>=size){res.writeHead(416).end();return;}
    res.writeHead(range?206:200,{'content-type':'video/mp4','accept-ranges':'bytes','content-length':end-start+1,...(range?{'content-range':`bytes ${start}-${end}/${size}`}:{})});
    if(req.method==='HEAD'){res.end();return;}
    const stream=file.createReadStream({start,end,autoClose:false});stream.pipe(res);await new Promise(resolve=>res.on('close',()=>{stream.destroy();resolve();}));
  }catch{if(!res.headersSent)res.writeHead(404).end('素材尚未就绪');}
  finally{await file?.close();}
}).listen(4180,'127.0.0.1',()=>console.log('README cases: http://127.0.0.1:4180'));
