module.exports.config = { api: { bodyParser: false } };
// Vercel Node.js serverless function. Never expose OPENAI_API_KEY to the browser.
module.exports = async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'Voice transcription is not configured. Set OPENAI_API_KEY in Vercel environment variables and redeploy.'});
 try{
  const buffers=[];let total=0;
  for await(const chunk of req){total+=chunk.length;if(total>12*1024*1024)return res.status(413).json({error:'Audio clip too large (max 12 MB)'});buffers.push(chunk)}
  if(total<100)return res.status(400).json({error:'Empty audio recording'});
  const type=String(req.headers['content-type']||'audio/webm').split(';')[0];
  const ext=type==='audio/mp4'?'mp4':type==='audio/ogg'?'ogg':'webm';
  const form=new FormData();form.append('file',new Blob([Buffer.concat(buffers)],{type}),`osce-answer.${ext}`);
  form.append('model','gpt-4o-mini-transcribe');form.append('language','en');
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
  let upstream;
  try{upstream=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form,signal:controller.signal})}finally{clearTimeout(timeout)}
  if(!upstream.ok){const error=await upstream.text();console.error('Transcription upstream status:',upstream.status,error.slice(0,300));return res.status(502).json({error:'Speech transcription service failed. Please retry or type your answer.'})}
  const result=await upstream.json();return res.status(200).json({text:String(result.text||'').slice(0,4000)});
 }catch(e){console.error('Transcription error:',e.message);return res.status(500).json({error:'Unable to transcribe this clip. Please retry or type.'})}
};
