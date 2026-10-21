import http from 'node:http';

const plain=process.argv.includes('--plain');
const label=(emoji,text)=>`${plain?'':emoji+' '}${text}`;
const started=Date.now();
let requests=0;
const server=http.createServer((request,response)=>{
  requests++;
  response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  const path=new URL(request.url,'http://localhost').pathname;
  response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Refresh fixture</title><style>body{font:18px system-ui;max-width:760px;margin:70px auto;background:#171c1d;color:#eaf0ef;padding:20px}a,button{color:#72deca}button{background:#273333;padding:12px;border:1px solid #526361;border-radius:6px}code{overflow-wrap:anywhere}</style><h1>↻ Refresh fixture</h1><p>Every real reload gets a new response timestamp.</p><p>Served: <code id="served">${new Date().toISOString()}</code></p><p id="route"></p><a href="/page?demo=1">Saved-page candidate</a> · <a href="/other">Another page</a><p><button id="spa-away">SPA away</button> <button id="spa-back">SPA back</button></p><script>const show=()=>document.getElementById('route').textContent=location.href;document.getElementById('spa-away').onclick=()=>{history.pushState({},'', '/other');show()};document.getElementById('spa-back').onclick=()=>{history.pushState({},'', '/page?demo=1');show()};show();</script></html>`);
});
const preferred=Number(process.env.PORT || 4317);
function listen(port){server.listen(port,'127.0.0.1');}
server.on('error',error=>{
  if(error.code==='EADDRINUSE'){console.error(label('⚠️','Port occupied; trying an available port.'));listen(0);}
  else {console.error(label('❌',error.message));process.exitCode=1;}
});
server.on('listening',()=>console.log(label('🌐',`Refresh fixture: http://127.0.0.1:${server.address().port}/page?demo=1`)));
const progress=setInterval(()=>console.error(label('⏱️',`Fixture active · ${Math.floor((Date.now()-started)/1000)}s · ${requests} requests`)),15000);
function close(){clearInterval(progress);server.close();}
process.on('SIGINT',close);process.on('SIGTERM',close);
listen(preferred);
