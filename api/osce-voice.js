// OpenAI-generated voice for the simulated patient. Secret key stays on Vercel.
// WARNING: public endpoint. Require authentication and durable rate limiting before wider rollout.
const limits=new Map();
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'OPENAI_API_KEY not configured'});
 const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0];
 const now=Date.now(),old=limits.get(ip)||{start:now,n:0};if(now-old.start>60000){old.start=now;old.n=0}old.n++;limits.set(ip,old);
 if(old.n>10)return res.status(429).json({error:'Too many voice requests. Please wait.'});
 let body=req.body;
 try{if(typeof body==='string')body=JSON.parse(body);const text=String(body?.text||'').trim();if(!text||text.length>850)return res.status(400).json({error:'Voice text must be 1–850 characters'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
  let upstream;try{upstream=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'tts-1',voice:'nova',input:text,response_format:'mp3',speed:0.95}),signal:controller.signal})}finally{clearTimeout(timer)}
  if(!upstream.ok){const detail=await upstream.text();console.error('OSCE voice upstream:',upstream.status,detail.slice(0,250));return res.status(502).json({error:'Voice generation failed; check API billing and Vercel logs'})}
  const audio=Buffer.from(await upstream.arrayBuffer());res.setHeader('Content-Type','audio/mpeg');res.setHeader('Content-Length',String(audio.length));return res.status(200).end(audio);
 }catch(e){console.error('OSCE voice:',e.message);return res.status(500).json({error:'Could not generate Sami’s voice'})}
};
