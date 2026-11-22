import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const root = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
  imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"],
  baseUri: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"]
}}}));
app.use(express.json({limit:'16kb'}));
app.use(express.static(path.join(root,'public')));
const history = new Map();
function limiter(req,res,next) {
  const now=Date.now(), key=req.ip||'unknown';
  const recent=(history.get(key)||[]).filter(t=>now-t<300000);
  if(recent.length>=20) return res.status(429).json({error:'Too many requests. Please try again in a few minutes.'});
  recent.push(now); history.set(key,recent);
  if(history.size>500) history.delete(history.keys().next().value);
  next();
}
const emergencies = /\b(chest pain|heart attack|stroke|can't breathe|cannot breathe|difficulty breathing|severe bleeding|unconscious|suicid(?:e|al)|overdose)\b/i;
const providers = /\b(doctor|hospital|clinic|physician|specialist|cardiologist|dermatologist|dentist|surgeon|near me|nearby)\b/i;
const strip = s => String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
async function wiki(query) {
  const base='https://en.wikipedia.org/w/api.php';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  try {
    const search=new URL(base);
    search.searchParams.set('action','query'); search.searchParams.set('list','search');
    search.searchParams.set('srsearch',query); search.searchParams.set('srlimit','1');
    search.searchParams.set('format','json');
    const r=await fetch(search,{signal:controller.signal,headers:{'User-Agent':'LilyVoiceHealthAssistant/2.0 (educational prototype)'}});
    if(!r.ok) throw new Error('Public information service unavailable');
    const item=(await r.json()).query?.search?.[0];
    if(!item) return null;
    const page=new URL(base);
    page.searchParams.set('action','query'); page.searchParams.set('prop','extracts');
    page.searchParams.set('exintro','1'); page.searchParams.set('explaintext','1');
    page.searchParams.set('exchars','850'); page.searchParams.set('titles',item.title);
    page.searchParams.set('format','json');
    const p=await fetch(page,{signal:controller.signal,headers:{'User-Agent':'LilyVoiceHealthAssistant/2.0 (educational prototype)'}});
    if(!p.ok) throw new Error('Public information service unavailable');
    const pages=(await p.json()).query?.pages||{};
    const extract=strip(Object.values(pages)[0]?.extract||'');
    if(!extract) return null;
    return {title:item.title, extract, url:`https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g,'_'))}`};
  } finally {clearTimeout(timer);}
}
app.get('/api/health',(_req,res)=>res.json({ok:true,configured:true,model:'Public Wikipedia information (no AI API key)'}));
app.post('/api/ask',limiter,async(req,res)=>{
  try {
    const question=typeof req.body?.question==='string'?req.body.question.trim():'';
    const location=typeof req.body?.location==='string'?req.body.location.trim():'';
    if(!question||question.length>1200||location.length>120) return res.status(400).json({error:'Please provide a question (up to 1,200 characters) and a short optional location.'});
    if(emergencies.test(question)) return res.json({answer:'This could be an emergency. Please call your local emergency number or seek emergency medical care now. I cannot assess emergencies or diagnose symptoms.',sources:[],model:'Safety guidance'});
    if(providers.test(question)) {
      const where=location && !/^-?\d+\.\d+\s*,\s*-?\d+\.\d+$/.test(location)?` in ${location}`:'';
      const url=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('hospitals doctors'+where)}`;
      return res.json({answer:`Quack! I can't verify live doctor listings, qualifications, or appointments without a dedicated provider service. You can explore nearby healthcare providers using the source link shown below. Please check qualifications, location, and availability directly. What kind of specialist are you looking for?`,sources:[{title:'Search healthcare providers on Google Maps (not independently verified)',url}],model:'Directory link only'});
    }
    const query=question.replace(/\b(what is|what are|tell me about|explain|symptoms of|causes of|how to treat|can you|please|lily)\b/gi,' ').replace(/[?!.]/g,' ').trim()||question;
    const result=await wiki(query);
    if(!result) return res.json({answer:'Oh, feathers! I could not find a reliable summary for that question. Please ask about a specific condition or health topic. For personal symptoms, speak with a qualified clinician.',sources:[],model:'Wikipedia search'});
    const excerpt=result.extract.slice(0,620).replace(/\s+\S*$/,'');
    res.json({answer:`Here's a general overview of ${result.title}. ${excerpt} This is educational information, not a diagnosis or treatment recommendation. Would you like to ask about another health topic?`,sources:[{title:`Wikipedia: ${result.title}`,url:result.url}],model:'Wikipedia summary'});
  } catch(err) {
    console.error('Lookup failed:',err?.message);
    res.status(502).json({error:'The public information source is temporarily unavailable. Please try again later.'});
  }
});
app.get('/{*path}',(req,res,next)=>{
  if(req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(root,'public','index.html'));
});
if (process.env.VERCEL !== "1") app.listen(port,()=>console.log(`Lily is listening at http://localhost:${port} — no AI API key required.`));
export default app;
