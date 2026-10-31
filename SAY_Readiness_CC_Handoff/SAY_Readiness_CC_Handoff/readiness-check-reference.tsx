'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ClipboardCheck, Fingerprint, Mail, ShieldCheck, Timer, Bookmark, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Answers, CONSENT_TEXT, CONSENT_VERSION, getResult, isComplete, questions } from '@/lib/readiness';

type ModelContext = {registerTool: (tool: Record<string, unknown>, options: {signal: AbortSignal}) => void | Promise<void>};

export default function ReadinessCheck() {
  const [answers,setAnswers] = useState<Answers>(Array(7).fill(null));
  const [step,setStep] = useState(0);
  const [view,setView] = useState<'questions'|'result'>('questions');
  const [email,setEmail] = useState('');
  const [consent,setConsent] = useState(false);
  const [capture,setCapture] = useState<'idle'|'saving'|'saved'|'skipped'>('idle');
  const [error,setError] = useState('');
  const [restartPrompt,setRestartPrompt] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const submissionId = useRef('');
  const liveState = useRef({answers,step,view});
  liveState.current = {answers,step,view};
  const question = questions[step];
  const result = isComplete(answers) ? getResult(answers) : null;

  useEffect(() => {
    if (step > 0 || view === 'result') {
      heading.current?.focus({preventScroll:true});
      if (window.innerWidth < 780) document.getElementById('check-surface')?.scrollIntoView({behavior:'instant',block:'start'});
    }
  },[step,view]);

  useEffect(() => {
    const context = (document as Document & {modelContext?: ModelContext}).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {name:'read_readiness_check',title:'Read readiness check',description:'Read the seven process questions, current answers and the result if completed.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({questions:questions.map(q=>({id:q.id,title:q.title,options:q.options})),...liveState.current,result:isComplete(liveState.current.answers)?getResult(liveState.current.answers):null})},
      {name:'complete_readiness_check',title:'Complete readiness check',description:'Set seven answers and show the readiness result. 2 means routine, 1 means inconsistent, 0 means a gap or unsure. Does not submit an email.',inputSchema:{type:'object',properties:{answers:{type:'array',items:{type:'integer',minimum:0,maximum:2},minItems:7,maxItems:7}},required:['answers'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:unknown)=>{
        const a=(input as {answers?:unknown})?.answers;
        if (!isComplete(a)) throw new Error('Provide seven answers, each 0, 1 or 2.');
        if (Object.keys(input as object).some(k=>k!=='answers')) throw new Error('Unexpected field.');
        setAnswers([...a]);setView('result');setStep(6);setCapture('idle');setError('');setEmail('');setConsent(false);submissionId.current='';
        liveState.current={answers:[...a],step:6,view:'result'};
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
        return getResult(a);
      }},
    ];
    for(const tool of tools) {
      try { void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{}); } catch { /* Standard browsers can still use the full flow. */ }
    }
    return ()=>lifecycle.abort();
  },[]);

  function restart() {
    setAnswers(Array(7).fill(null));setStep(0);setView('questions');setEmail('');setConsent(false);setCapture('idle');setError('');setRestartPrompt(false);submissionId.current='';
    window.scrollTo({top:0,behavior:'instant'});
    requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));
  }

  async function saveLead(event:React.FormEvent) {
    event.preventDefault();
    if (!consent) {setError('Tick the permission box to request a follow-up.');return;}
    if (!isComplete(answers)) return;
    setError('');setCapture('saving');
    try {
      if (!submissionId.current) {
        const bytes=crypto.getRandomValues(new Uint8Array(16));
        bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
        const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
        submissionId.current=[hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
      }
      const params=new URLSearchParams(window.location.search);
      const response=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:submissionId.current,email,consent,consentVersion:CONSENT_VERSION,answers,source:params.get('source')||params.get('utm_source')||'show'}),signal:AbortSignal.timeout(12000)});
      const payload=await response.json() as {saved?:boolean;error?:string};
      if (!response.ok || payload.saved !== true) throw new Error(payload.error || 'We couldn’t save your request. Please try again.');
      setCapture('saved');setEmail('');setConsent(false);
    } catch(err) {
      setCapture('idle');setError(err instanceof Error && err.name !== 'TimeoutError' ? err.message : 'Connection taking too long. Your result is still here; please try again.');
    }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a href="/" className="brand" aria-label="SAY home">SAY<span className="brand-line" /> <span className="brand-caption">ADVANCED SKIN</span></a>
        <span className="passport-chip"><Fingerprint size={17}/><span>Beauty Passport</span></span>
      </header>
      <main className={`main-layout ${view==='result'?'result-layout':''}`}>
        <aside className="intro">
          <p className="eyebrow"><span className="gold-rule" /> THE PRE-ARRIVAL CHECK</p>
          <h1>Before the<br className="desktop-break"/> client <span>arrives.</span></h1>
          <p className="intro-description">Know what could affect the treatment before your client arrives.</p>
          <div className="check-meta"><span><ClipboardCheck size={16}/>7 questions</span><span><Timer size={16}/>About 60 seconds</span></div>
          <p className="intro-small">For practitioners offering peels, microneedling, laser and other advanced-skin treatments.</p>
          <div className="passport-panel">
            <div className="passport-heading"><Fingerprint size={24}/><span>Beauty Passport</span><Bookmark size={18}/></div>
            <p>A client-held record they can share with you.</p>
            <ul><li><Check size={15}/>Relevant health & reaction history</li><li><Check size={15}/>Recent treatments across providers</li><li><Check size={15}/>Updates before their next visit</li></ul>
            <div className="passport-bottom">Your beauty. Remembered.</div>
          </div>
        </aside>

        <section id="check-surface" className="check-surface" aria-label={view==='questions'?'Readiness questions':'Your readiness result'}>
          {view === 'questions' && <>
            <div className="surface-top"><span className="eyebrow">YOUR CURRENT PROCESS</span><span className="step-count">{String(step+1).padStart(2,'0')} <span>/ 07</span></span></div>
            <Progress className="check-progress" value={(step/7)*100} aria-label={`${step} of 7 questions completed`}/>
            <div className="question-body" key={step}>
              <p className="topic">{question.topic}</p>
              <h2 ref={heading} tabIndex={-1} id="question-title">{question.title}</h2>
              <p id="question-note" className="question-note">{question.note}</p>
              <RadioGroup className="answer-options" value={answers[step]===null?'':String(answers[step])} onValueChange={value=>setAnswers(previous=>previous.map((a,i)=>i===step?Number(value):a))} aria-labelledby="question-title" aria-describedby="question-note">
                {question.options.map((option,i)=>{
                  const value=2-i; const selected=answers[step]===value;
                  return <label className={`answer-option ${selected?'selected':''}`} key={option} htmlFor={`answer-${step}-${value}`}><RadioGroupItem id={`answer-${step}-${value}`} value={String(value)} className="answer-radio"/><span>{option}</span>{selected&&<Check size={18} className="selected-check" aria-hidden="true"/>}</label>;
                })}
              </RadioGroup>
            </div>
            <div className="question-nav"><Button className="back-button" variant="ghost" disabled={step===0} onClick={()=>setStep(step-1)}>Back</Button><Button className="continue-button" disabled={answers[step]===null} onClick={()=>step===6?setView('result'):setStep(step+1)}>{step===6?'See my result':'Continue'}</Button></div>
            <div className="surface-note"><ShieldCheck size={16}/><span>About your process. No client health details needed.</span></div>
          </>}

          {view==='result' && result && <>
            <div className="surface-top"><span className="eyebrow">YOUR READINESS SNAPSHOT</span><span className="complete-icon"><Check size={17}/>7 / 7</span></div>
            <h2 ref={heading} tabIndex={-1} className="result-title">{result.title}</h2>
            <p className="result-summary">{result.summary}</p>
            <div className="result-counts" aria-label="Your process summary"><div><strong>{result.established}</strong><span>In place</span></div><div><strong>{result.inconsistent}</strong><span>Inconsistent</span></div><div><strong>{result.gaps}</strong><span>Gaps / unsure</span></div></div>
            <h3 className="priorities-title">{result.priorities.length?'Your next practical steps':'Keep the foundation strong'}</h3>
            <ol className="priorities">
              {result.priorities.length?result.priorities.map((p,i)=><li key={p.id}><span className="priority-number">{i+1}</span><div><h4>{p.action}</h4><p>{p.detail}</p></div></li>):<li><span className="priority-number"><Check size={17}/></span><div><h4>Keep checking for changes</h4><p>Keep the review owner clear, confirm updates on the day and record the decision. Revisit your process when guidance, products or treatments change.</p></div></li>}
            </ol>
            <div className="result-passport"><Fingerprint size={26}/><div><h3>Bring the picture together with<br/> the Beauty Passport.</h3><p>A client-held record to share relevant history across providers. A starting point for your consultation and professional review.</p></div></div>
            <p className="result-limit">This is a self-reported process check, not clearance to treat, a clinical assessment or a compliance certificate.</p>
            <div className="email-panel">
              {capture==='saved'?<div className="capture-success" role="status"><Check size={23}/><div><h3>You’re on the follow-up list.</h3><p>Your request and readiness priorities have been saved for SAY to follow up. No email has been sent automatically.</p></div></div>:capture==='skipped'?<div className="skip-success" role="status"><h3>Your result is yours to use.</h3><p>No email needed. You can save a screenshot of your priorities.</p><Button className="text-button" variant="link" onClick={()=>setCapture('idle')}>Request a follow-up instead</Button></div>:<>
                <div className="email-heading"><Mail size={20}/><div><h3>Continue after the show?</h3><p>Optional: leave an email for a SAY follow-up about your result and the Beauty Passport.</p></div></div>
                <form onSubmit={saveLead}>
                  <label htmlFor="email" className="field-label">Email address</label>
                  <Input id="email" className="email-input" type="email" inputMode="email" autoComplete="email" placeholder="you@yourbusiness.co.uk" value={email} onChange={event=>setEmail(event.target.value)} maxLength={254} required disabled={capture==='saving'} aria-invalid={!!error} aria-describedby={error?'capture-error':'email-privacy'}/>
                  <div className="consent-row"><Checkbox id="consent" className="consent-checkbox" checked={consent} onCheckedChange={checked=>setConsent(checked===true)} disabled={capture==='saving'}/><label htmlFor="consent">{CONSENT_TEXT}</label></div>
                  {error&&<p className="capture-error" id="capture-error" role="alert">{error}</p>}
                  <div className="email-actions"><Button className="followup-button" type="submit" disabled={capture==='saving'}>{capture==='saving'?'Saving…':'Request a follow-up'}</Button><Button className="skip-button" variant="ghost" type="button" disabled={capture==='saving'} onClick={()=>{setCapture('skipped');setEmail('');setConsent(false);setError('');}}>No thanks</Button></div>
                </form>
                <p className="privacy-short" id="email-privacy">Email + result summary only. No client records. <a href="#privacy" onClick={()=>document.getElementById('privacy')?.setAttribute('open','')}>How we use your details</a></p>
              </>}
            </div>
            <div className="result-controls"><Button className="text-button" variant="link" onClick={()=>{setView('questions');setStep(6);setCapture('idle');setError('');submissionId.current='';}}>Review answers</Button>{!restartPrompt?<Button className="text-button" variant="link" onClick={()=>setRestartPrompt(true)}>Start a new check</Button>:<div className="restart-confirm"><span>Clear this result?</span><Button className="text-button" variant="link" onClick={restart}>Yes, start again</Button><Button variant="ghost" size="icon" aria-label="Keep this result" onClick={()=>setRestartPrompt(false)}><X size={17}/></Button></div>}</div>
          </>}
        </section>
        <div className="mobile-passport"><Fingerprint size={18}/><p><strong>Beauty Passport</strong><span>Client-held. Shared with you.</span></p></div>
      </main>
      <footer className="site-footer">
        <span>SAY · Your beauty. Remembered.</span>
        <div className="footer-details">
          <details><summary>About this check & UK rules</summary><p>This checks your consultation workflow, not an individual client’s suitability. Follow your training, manufacturer guidance, insurer conditions and applicable local requirements.</p><p>England is moving towards a licensing scheme for non-surgical cosmetic procedures. The government’s proposals require further legislation before taking effect. Requirements differ across the UK, and existing local licensing rules may apply.</p><a href="https://www.gov.uk/government/consultations/licensing-of-non-surgical-cosmetic-procedures" target="_blank" rel="noreferrer">Read the government’s proposals (GOV.UK)</a></details>
          <details id="privacy"><summary>Privacy</summary><p>Completing the check does not send your answers to SAY. They stay in this page while it is open.</p><p>If you request a follow-up, Servicesforyou LTD (SAY) stores your email, result title, up to three priorities, show source and your permission with a timestamp. We use these to follow up about this check and the Beauty Passport. No client health records are collected.</p><p>Only leave your email if you want that follow-up. You can withdraw your permission or request deletion by replying to any follow-up from SAY. No marketing or analytics cookies are used by this check; hosting sign-in may use necessary cookies.</p></details>
        </div>
      </footer>
    </div>
  );
}
