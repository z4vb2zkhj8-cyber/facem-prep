(()=>{
const el=document.querySelector('#osce'),s=window.FACEM_OSCE_STATIONS[0];let stage='intro',seconds=0,interval=null,turns=[],recorder=null,chunks=[],audioBlob=null,stream=null,recognizer=null,listening=false,asked={},revealed=false,discussedPartner=false,voiceOn=true,autoPrompted=new Set(),startedAt=0,turnRecorder=null,turnChunks=[],turnRecording=false,turnStream=null,busy=false,recordingOK=false,aiMode=true,aiRequest=null;
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
let patientAudio=null,patientAudioUrl=null,voiceSequence=0;
function stopPatientAudio(){voiceSequence++;if(patientAudio){patientAudio.pause();patientAudio.removeAttribute('src');patientAudio.load();patientAudio=null}if(patientAudioUrl){URL.revokeObjectURL(patientAudioUrl);patientAudioUrl=null}const b=document.querySelector('#play-sami');if(b)b.hidden=true}
function voiceFallback(text){if(!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-NZ';u.rate=.94;speechSynthesis.speak(u)}catch{}}
async function speak(text){
 if(!voiceOn||stage!=='station')return;
 stopPatientAudio();const seq=voiceSequence;
 const playButton=document.querySelector('#play-sami');
 if(playButton){playButton.hidden=true;playButton.textContent='🔊 Play Sami’s voice'}
 try{
  const res=await fetch('/api/osce-voice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:AbortSignal.timeout(18000)});
  if(!res.ok){const data=await res.json().catch(()=>({}));throw Error(data.error||'Voice service unavailable')}
  const blob=await res.blob();if(seq!==voiceSequence||stage!=='station')return;
  patientAudioUrl=URL.createObjectURL(blob);patientAudio=new Audio(patientAudioUrl);patientAudio.preload='auto';patientAudio.playsInline=true;
  if(playButton){playButton.hidden=false;playButton.onclick=async()=>{try{await patientAudio.play();playButton.hidden=true;setStatus('Sami is speaking…')}catch(e){setStatus('Audio playback blocked. Check iPhone volume and tap Play again.',true)}}}
  try{await patientAudio.play();if(playButton)playButton.hidden=true}
  catch(e){setStatus('Tap “Play Sami’s voice” to hear her response (iPhone playback permission).',true)}
 }catch(e){if(seq!==voiceSequence||stage!=='station')return;setStatus('Generated voice unavailable: '+e.message+'. Using browser voice if supported.',true);voiceFallback(text)}
}
function stopTimers(){if(interval)clearInterval(interval);interval=null}
function tick(){seconds--;document.querySelector('#clock')?.replaceChildren(document.createTextNode(fmt(Math.max(0,seconds))));if(stage==='station'){let elapsed=420-seconds;for(const p of s.prompts){if(elapsed>=p.at&&!autoPrompted.has(p.at)){autoPrompted.add(p.at);if(p.at===150&&revealed)continue;patient(p.text);}}}if(seconds<=0){if(stage==='reading')beginStation();else if(stage==='station')finish()}}
function clockStart(n){seconds=n;stopTimers();interval=setInterval(tick,1000)}
function showIntro(){stopPatientAudio();stage='intro';busy=false;el.innerHTML=`<section class="panel"><h1>🎭 OSCE Simulator</h1><p><b>${escape(s.title)}</b></p><p>Four minutes reading time, followed by seven minutes of interaction with a simulated patient.</p><p class="warning"><b>AI role-player:</b> Sami can respond conversationally using OpenAI. You can switch to scripted fallback. AI may make mistakes; this is an educational simulation, not clinical advice. Recording is saved locally and is <b>not</b> uploaded to a reviewer dashboard.</p><label class="row"><input type="checkbox" id="consent"> I consent to recording my own voice for this practice station.</label><label class="row"><input type="checkbox" id="voice" checked> Read patient responses aloud</label><label class="row"><input type="checkbox" id="ai-mode" checked> Conversational AI patient (uses API credits)</label><p class="small">Microphone access requires HTTPS and permission. Spoken answers are sent to a secure server for transcription when configured. Candidate audio is kept on this device unless you download or share it. Do not include real patient-identifiable information.</p><button id="start">Start reading time</button></section>`;el.querySelector('#start').onclick=()=>{if(!el.querySelector('#consent').checked){alert('Recording consent is required for this prototype.');return}voiceOn=el.querySelector('#voice').checked;aiMode=el.querySelector('#ai-mode').checked;beginReading()}}
function beginReading(){stage='reading';el.innerHTML=`<section class="panel"><div class="row"><span class="pill">Reading time</span><strong id="clock" class="timer">04:00</strong></div><h1>Candidate instructions</h1><p>${escape(s.candidate.context)}</p><h2>Available results</h2><ul>${s.candidate.results.map(x=>`<li>${escape(x)}</li>`).join('')}</ul><h2>Your tasks</h2><ul>${s.candidate.tasks.map(x=>`<li>${escape(x)}</li>`).join('')}</ul><h2>Domains assessed</h2><ul class="candidate-domains">${s.candidate.domains.map(d=>`<li><strong>${escape(d.name)}</strong> — ${d.weight}%</li>`).join('')}</ul><p class="small">Detailed examiner marking criteria remain hidden until the station ends.</p><button id="begin">Begin station now</button></section>`;el.querySelector('#begin').onclick=beginStation;clockStart(240)}
async function beginRecording(){try{stream=await navigator.mediaDevices.getUserMedia({audio:true});let supported=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));recorder=new MediaRecorder(stream,supported?{mimeType:supported}:undefined);chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{audioBlob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});stream?.getTracks().forEach(t=>t.stop());if(stage==='done')renderReview()};recorder.start(1000);recordingOK=true;return true}catch(e){recordingOK=false;setStatus('Full-station audio recording failed: '+e.message+' — text entry remains available.',true);return false}}
function patient(text){turns.push({who:'Sami',time:420-seconds,text});updateChat();void speak(text)}
function updateChat(){const chat=el.querySelector('#chat');if(!chat)return;chat.innerHTML=turns.map(t=>`<div class="bubble ${t.who==='Candidate'?'candidate':''}"><small>${escape(t.who)} · ${fmt(t.time)}</small><div>${escape(t.text)}</div></div>`).join('');chat.scrollTop=chat.scrollHeight}
function respond(input){const t=input.toLowerCase();let answer='';if(/chlamydia|positive|sexually transmitted|sti|infection/.test(t)){revealed=true;answer='Chlamydia? I do not understand. Is that something you get from sex?';if(/partner|boyfriend|husband|caught it/.test(t))answer='I feel so embarrassed. Does this mean my partner has been sleeping with someone else?'}else if(/bleed|spot|pad|clot|tissue/.test(t))answer=s.patient.facts.bleeding;else if(/pain|ache|intercourse|sex hurt/.test(t))answer=s.patient.facts.pain;else if(/fever|vomit|dysuria|urine|bowel/.test(t))answer=s.patient.facts.systemic;else if(/partner|sexual history|partners|previous sti|screen|condom/.test(t)){discussedPartner=true;answer=s.patient.facts.sexual}else if(/pregnan|baby|miscarriage/.test(t))answer=s.patient.facts.pregnancy;else if(/allerg|medic|medical history|previous pregnan/.test(t))answer=s.patient.facts.history;else if(/treat|antibiotic|azithromycin|safe to take/.test(t))answer='Is the treatment safe for my baby? And how will I know the infection is gone?';else if(/tell him|contact trac|notify|his test/.test(t))answer=s.patient.facts.partner;else if(/follow.up|midwife|sexual health|gp/.test(t))answer='I could not get in to my GP. Who can help me with the pregnancy and with this infection?';else if(/sorry|understand|difficult|support|take your time/.test(t))answer='Thank you. I am frightened about the baby, and I do not know what to say to my partner.';else answer='I am still worried about the spotting and whether my baby is going to be okay.';patient(answer)}
async function submit(text){
 text=text.trim();if(!text||stage!=='station'||busy)return;
 turns.push({who:'Candidate',time:420-seconds,text});updateChat();
 const box=el.querySelector('#answer');if(box)box.value='';
 if(!aiMode){respond(text);return}
 busy=true;setStatus('Sami is thinking…');
 const send=el.querySelector('#send'),listen=el.querySelector('#listen');
 if(send)send.disabled=true;if(listen)listen.disabled=true;
 aiRequest=new AbortController();
 try{
  const history=turns.filter(t=>t.who==='Candidate'||t.who==='Sami').slice(-18).map(t=>({role:t.who==='Candidate'?'user':'assistant',content:t.text}));
  const r=await fetch('/api/osce-patient',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stationId:s.id,messages:history}),signal:aiRequest.signal});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(data.error||'AI patient unavailable');
  if(stage!=='station')return;
  if(typeof data.reply!=='string'||!data.reply.trim())throw Error('Empty AI response');
  patient(data.reply.trim());setStatus('AI patient ready. Tap to speak again.');
 }catch(e){if(e.name!=='AbortError'&&stage==='station')setStatus('AI response unavailable: '+e.message+'. You can retry, or restart in scripted mode.',true)}
 finally{busy=false;aiRequest=null;if(send)send.disabled=false;if(listen)listen.disabled=false}
}
function setStatus(text,error=false){const el=document.querySelector('#voice-status');if(el){el.textContent=text;el.style.color=error?'#ffb3b3':'#d6ffe9'}}
function preferredMime(){return ['audio/mp4','audio/webm;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t))||''}
async function toggleVoice(){
 if(busy)return;
 if(turnRecording){
  busy=true;const button=document.querySelector('#listen');button.disabled=true;
  try{
   const blob=await new Promise((resolve,reject)=>{const r=turnRecorder;r.onerror=e=>reject(Error('Voice recording failed'));r.onstop=()=>resolve(new Blob(turnChunks,{type:r.mimeType||'audio/webm'}));r.stop()});
   turnRecording=false;turnRecorder=null;
   if(blob.size<500){setStatus('No speech captured. Try again.',true);return}
   setStatus('Transcribing your answer…');
   const response=await fetch('/api/transcribe',{method:'POST',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});
   const data=await response.json().catch(()=>({error:'Transcription server returned an invalid response'}));
   if(!response.ok)throw Error(data.error||'Transcription unavailable');
   if(!data.text?.trim())throw Error('No words recognised. Please try again.');
   document.querySelector('#answer').value=data.text;
   busy=false;await submit(data.text);
   if(!aiMode)setStatus('Your spoken answer was received. Tap to speak again.');
  }catch(e){setStatus('Speech-to-text unavailable: '+e.message+'. Your full-station recording continues; you can type your answer.',true)}
  finally{busy=false;button.disabled=false;button.textContent='🎙 Tap to speak'}
  return;
 }
 try{
  if(!recordingOK||!stream?.active)throw Error('Microphone is not available; check Safari permissions.');
  try{speechSynthesis.cancel()}catch{}
  stopPatientAudio();
  const mime=preferredMime();turnChunks=[];turnRecorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);
  turnRecorder.ondataavailable=e=>{if(e.data.size)turnChunks.push(e.data)};
  turnRecorder.start(250);turnRecording=true;
  document.querySelector('#listen').textContent='⏹ Finish speaking';
  setStatus('Listening to your answer. Tap Finish speaking when done.');
 }catch(e){setStatus(e.message,true)}
}
async function beginStation(){stopTimers();stage='station';turns=[];autoPrompted=new Set();revealed=false;startedAt=Date.now();el.innerHTML=`<section class="panel"><div class="row"><span class="pill">OSCE station</span><strong class="timer" id="clock">07:00</strong><span class="pill" id="recording-indicator">🎙 Recording requested</span></div><h1>Consultation with Sami</h1><p class="small">${aiMode?'AI patient enabled — Sami responds to your words and conversation history.':'Scripted patient mode.'} Tap Speak, say your answer, then Finish speaking. You can type instead. Sami’s voice is generated by OpenAI. On iPhone, tap Play Sami’s voice if automatic playback is blocked.</p><p id="voice-status" class="small" role="status">Requesting microphone access…</p><div id="chat" class="scroll" aria-live="polite"></div><button id="play-sami" class="outline" hidden>🔊 Play Sami’s voice</button><label for="answer">Your response</label><textarea id="answer" placeholder="Speak or type what you would say to Sami..."></textarea><div class="row"><button id="listen">🎙 Tap to speak</button><button id="send">Send response</button><button id="finish" class="outline">End station</button></div></section>`;el.querySelector('#listen').onclick=toggleVoice;el.querySelector('#send').onclick=()=>submit(el.querySelector('#answer').value);el.querySelector('#finish').onclick=()=>{if(confirm('End the OSCE early?'))finish()};clockStart(420);await beginRecording();const indicator=el.querySelector('#recording-indicator');if(indicator)indicator.textContent=recordingOK?'🔴 Recording candidate audio':'⚠️ Audio not recording';setStatus(recordingOK?'Audio recording active. Tap to speak.':'Microphone unavailable: typed replies only.',!recordingOK);patient(s.patient.opening)}
function finish(){if(stage!=='station')return;stopPatientAudio();aiRequest?.abort();stage='done';stopTimers();try{if(turnRecording&&turnRecorder?.state==='recording'){turnRecorder.stop();turnRecording=false}}catch{}try{speechSynthesis.cancel()}catch{}if(recorder&&recorder.state!=='inactive'){recorder.stop()}else{stream?.getTracks().forEach(t=>t.stop());renderReview()}}
function saveFile(name,blob){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
function renderReview(){el.innerHTML=`<section class="panel"><h1>Station complete · Debrief</h1><p>${turns.filter(t=>t.who==='Candidate').length} candidate responses captured.</p><p class="warning">The transcript is an unverified record of speech recognition and/or typed input. It may omit speech or contain errors. No automatic clinical score is assigned.</p><div class="row"><button id="download">Download transcript (.json)</button>${audioBlob&&audioBlob.size?'<button id="audio">Download candidate audio</button>':''}<button id="again" class="outline">Restart</button></div><h2>Transcript</h2><div id="chat" class="scroll"></div></section><section class="panel"><h2>Examiner review checklist</h2><p class="small">Source domains and weights; mark manually after listening to the recording. This is not an official ACEM result.</p>${s.rubric.map(r=>`<div><h3>${escape(r.domain)} · ${r.weight}%</h3>${r.items.map(x=>`<label class="row"><input type="checkbox"> ${escape(x)}</label>`).join('')}</div>`).join('')}<p class="warning">${escape(s.editorial_note)}</p></section>`;updateChat();el.querySelector('#download').onclick=()=>saveFile('facem-osce-sami-transcript.json',new Blob([JSON.stringify({station:s.id,completedAt:new Date().toISOString(),turns},null,2)],{type:'application/json'}));if(audioBlob)el.querySelector('#audio').onclick=()=>saveFile('facem-osce-sami-audio.'+(audioBlob.type.includes('mp4')?'mp4':'webm'),audioBlob);el.querySelector('#again').onclick=showIntro}
showIntro();
})();