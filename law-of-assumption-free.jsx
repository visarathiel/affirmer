import { useState, useEffect, useRef, useCallback } from "react";

const LS = {
  NAME:"loa_name", AFFIRMATIONS:"loa_affirmations",
  MANUAL_COUNTS:"loa_manual_counts", ALLTIME:"loa_alltime",
  ACTIVE_DAYS:"loa_active_days", THEME:"loa_theme",
  AUTO_DATE:"loa_auto_date", AUTO_COUNT:"loa_auto_count",
};

const FREE_LIMIT = 5;
const FREE_REP_CAP = 1000;
const FREE_SESSION_CAP = 3;

const DEFAULT_AFFIRMATIONS = [
  { id:1, text:"I am worthy of everything I desire.", category:"self", pinned:false },
  { id:2, text:"My assumptions shape my reality.", category:"mindset", pinned:false },
  { id:3, text:"I already have everything I need.", category:"mindset", pinned:false },
  { id:4, text:"Love flows to me effortlessly.", category:"love", pinned:false },
  { id:5, text:"Abundance is my natural state.", category:"wealth", pinned:false },
];

const PRESET_CATEGORIES = [
  "self","love","wealth","health","mindset",
  "body","career","purpose","family","home","travel","spirituality",
];

const CAT_COLORS = {
  self:"#c084fc", love:"#f472b6", wealth:"#34d399", health:"#38bdf8",
  mindset:"#fb923c", body:"#e879f9", career:"#60a5fa", purpose:"#fbbf24",
  family:"#f87171", home:"#a3e635", travel:"#2dd4bf", spirituality:"#818cf8",
};

const SPEED_PRESETS = [
  { label:"Slow", ms:4000, desc:"4s" },
  { label:"Medium", ms:2000, desc:"2s" },
  { label:"Fast", ms:1000, desc:"1s" },
];

const SESSION_MESSAGES = [
  n=>`You're doing beautifully, ${n}.`,
  n=>`Keep going, ${n}. It's already yours.`,
  n=>`The universe hears you, ${n}.`,
  n=>`Trust the process, ${n}.`,
  n=>`You're impressing this on your subconscious, ${n}.`,
];
const DONE_MESSAGES = [
  n=>`Well done, ${n}. Your assumption is law.`,
  n=>`${n}, you just rewired your reality.`,
  n=>`It is done, ${n}. Live in the end.`,
  n=>`Beautiful session, ${n}. ✦`,
];

function uid(){ return Date.now()+Math.floor(Math.random()*9999); }
function pad(n){ return String(n).padStart(2,"0"); }
function fmtTime(s){ return s>=60?`${Math.floor(s/60)}m ${pad(s%60)}s`:`${s}s`; }
function pick(arr,name){ return arr[Math.floor(Math.random()*arr.length)](name); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function getGreeting(){
  const h=new Date().getHours();
  if(h<5) return "Still up"; if(h<12) return "Good morning";
  if(h<17) return "Good afternoon"; if(h<21) return "Good evening"; return "Good night";
}
function lsGet(key,fallback){ try{ const v=localStorage.getItem(key); return v!==null?JSON.parse(v):fallback; }catch{ return fallback; } }
function lsSet(key,value){ try{ localStorage.setItem(key,JSON.stringify(value)); }catch{} }
function computeStreak(activeDays){
  if(!activeDays.length) return 0;
  const sorted=[...new Set(activeDays)].sort().reverse();
  const today=todayStr(), yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  if(sorted[0]!==today&&sorted[0]!==yesterday) return 0;
  let streak=1;
  for(let i=1;i<sorted.length;i++){
    const prev=new Date(sorted[i-1]+"T00:00:00"), cur=new Date(sorted[i]+"T00:00:00");
    if((prev-cur)/86400000===1) streak++; else break;
  }
  return streak;
}

const DARK = {
  bg:"#0a0a09", surface:"#111110", border:"rgba(240,237,232,0.09)",
  borderMid:"rgba(240,237,232,0.18)", borderStrong:"#f0ede8",
  fg:"#f0ede8", fgDim:"rgba(240,237,232,0.4)", fgFaint:"rgba(240,237,232,0.12)",
  fgGhost:"rgba(240,237,232,0.05)", pillBg:"rgba(240,237,232,0.06)",
  inputBg:"#1a1a18", btnPrimary:"#f0ede8", btnPrimaryFg:"#0a0a09",
  cardActive:"rgba(240,237,232,0.05)", green:"#34d399",
};
const LIGHT = {
  bg:"#faf9f7", surface:"#ffffff", border:"rgba(0,0,0,0.08)",
  borderMid:"rgba(0,0,0,0.18)", borderStrong:"#0a0a09",
  fg:"#0a0a09", fgDim:"rgba(10,10,9,0.45)", fgFaint:"rgba(10,10,9,0.1)",
  fgGhost:"rgba(10,10,9,0.04)", pillBg:"rgba(10,10,9,0.06)",
  inputBg:"#f0ede8", btnPrimary:"#0a0a09", btnPrimaryFg:"#faf9f7",
  cardActive:"rgba(10,10,9,0.04)", green:"#16a34a",
};

// ── icons ─────────────────────────────────────────────────────────────────────
function PlayIcon(){ return <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0L10 6L0 12V0Z"/></svg>; }
function PauseIcon(){ return <svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor"><rect x="0" y="0" width="4" height="12" rx="1"/><rect x="7" y="0" width="4" height="12" rx="1"/></svg>; }
function CheckIcon(){ return <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><polyline points="2,6.5 5,9.5 11,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function PencilIcon(){ return <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>; }
function PinIcon({ filled }){ return <svg width="12" height="12" viewBox="0 0 12 12" fill={filled?"currentColor":"none"}><path d="M9 1L11 3L7.5 5L8 9L6 11L4 7L1 9L3 5.5L1 3L5 3.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>; }
function GripIcon(){ return <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" opacity="0.3"><circle cx="4" cy="3" r="1"/><circle cx="8" cy="3" r="1"/><circle cx="4" cy="6" r="1"/><circle cx="8" cy="6" r="1"/><circle cx="4" cy="9" r="1"/><circle cx="8" cy="9" r="1"/></svg>; }
function SunIcon(){ return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><line x1="8" y1="1" x2="8" y2="2.5"/><line x1="8" y1="13.5" x2="8" y2="15"/><line x1="1" y1="8" x2="2.5" y2="8"/><line x1="13.5" y1="8" x2="15" y2="8"/><line x1="3" y1="3" x2="4.1" y2="4.1"/><line x1="11.9" y1="11.9" x2="13" y2="13"/><line x1="13" y1="3" x2="11.9" y2="4.1"/><line x1="4.1" y1="11.9" x2="3" y2="13"/></svg>; }
function MoonIcon(){ return <svg width="13" height="13" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 9.5A6 6 0 0 1 5.5 3a6 6 0 1 0 6.5 6.5z"/></svg>; }

function CatIcon({ category, color, size=12 }){
  const s=size;
  const icons = {
    self:        <circle cx={s/2} cy={s/2} r={s/2-1.2} fill="none" stroke={color} strokeWidth="1.4"/>,
    love:        <path d={`M${s/2} ${s*0.82} C${s*0.1} ${s*0.55} ${s*0.05} ${s*0.22} ${s/2} ${s*0.32} C${s*0.95} ${s*0.22} ${s*0.9} ${s*0.55} ${s/2} ${s*0.82}Z`} fill={color}/>,
    wealth:      <><line x1={s/2} y1="1.5" x2={s/2} y2={s-1.5} stroke={color} strokeWidth="1.4" strokeLinecap="round"/><path d={`M${s*0.28} ${s*0.32} Q${s/2} ${s*0.18} ${s*0.72} ${s*0.32} Q${s*0.72} ${s*0.52} ${s/2} ${s*0.52} Q${s*0.28} ${s*0.52} ${s*0.28} ${s*0.68} Q${s*0.28} ${s*0.84} ${s*0.72} ${s*0.72}`} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></>,
    health:      <><line x1={s/2} y1="1.5" x2={s/2} y2={s-1.5} stroke={color} strokeWidth="1.6" strokeLinecap="round"/><line x1="1.5" y1={s/2} x2={s-1.5} y2={s/2} stroke={color} strokeWidth="1.6" strokeLinecap="round"/></>,
    mindset:     <path d={`M${s*0.28} ${s*0.72} Q${s*0.1} ${s*0.42} ${s/2} ${s*0.18} Q${s*0.9} ${s*0.42} ${s*0.72} ${s*0.72} Q${s*0.62} ${s*0.88} ${s*0.38} ${s*0.88}Z`} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>,
    body:        <><circle cx={s/2} cy={s*0.28} r={s*0.14} fill={color}/><line x1={s/2} y1={s*0.42} x2={s/2} y2={s*0.72} stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1={s*0.22} y1={s*0.52} x2={s*0.78} y2={s*0.52} stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1={s/2} y1={s*0.72} x2={s*0.3} y2={s*0.94} stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1={s/2} y1={s*0.72} x2={s*0.7} y2={s*0.94} stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    career:      <><rect x="1.5" y={s*0.42} width={s-3} height={s*0.46} rx="1.5" fill="none" stroke={color} strokeWidth="1.4"/><path d={`M${s*0.35} ${s*0.42} V${s*0.3} Q${s*0.35} ${s*0.18} ${s/2} ${s*0.18} Q${s*0.65} ${s*0.18} ${s*0.65} ${s*0.3} V${s*0.42}`} fill="none" stroke={color} strokeWidth="1.4"/></>,
    purpose:     <path d={`M${s/2} 1.5 L${s*0.62} ${s*0.38} L${s-1.5} ${s*0.4} L${s*0.72} ${s*0.62} L${s*0.78} ${s-1.5} L${s/2} ${s*0.78} L${s*0.22} ${s-1.5} L${s*0.28} ${s*0.62} L1.5 ${s*0.4} L${s*0.38} ${s*0.38}Z`} fill="none" stroke={color} strokeWidth="1.3" strokeLinejoin="round"/>,
    family:      <><circle cx={s*0.35} cy={s*0.3} r={s*0.12} fill={color}/><circle cx={s*0.65} cy={s*0.3} r={s*0.12} fill={color}/><circle cx={s/2} cy={s*0.62} r={s*0.1} fill={color}/><path d={`M${s*0.18} ${s*0.88} Q${s*0.35} ${s*0.58} ${s/2} ${s*0.72} Q${s*0.65} ${s*0.58} ${s*0.82} ${s*0.88}`} fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></>,
    home:        <><path d={`M${s*0.12} ${s*0.52} L${s/2} ${s*0.14} L${s*0.88} ${s*0.52}`} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/><path d={`M${s*0.22} ${s*0.52} V${s*0.88} H${s*0.78} V${s*0.52}`} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/><rect x={s*0.4} y={s*0.66} width={s*0.2} height={s*0.22} rx="1" fill={color} opacity="0.7"/></>,
    travel:      <><path d={`M${s/2} 1.5 Q${s*0.82} 1.5 ${s*0.82} ${s*0.46} Q${s*0.82} ${s*0.72} ${s/2} ${s*0.88} Q${s*0.18} ${s*0.72} ${s*0.18} ${s*0.46} Q${s*0.18} 1.5 ${s/2} 1.5Z`} fill="none" stroke={color} strokeWidth="1.4"/><circle cx={s/2} cy={s*0.46} r={s*0.1} fill={color}/></>,
    spirituality:<path d={`M${s/2} 1.5 L${s*0.62} ${s*0.44} L${s-1.5} ${s*0.44} L${s*0.69} ${s*0.66} L${s*0.79} ${s-1.5} L${s/2} ${s*0.82} L${s*0.21} ${s-1.5} L${s*0.31} ${s*0.66} L1.5 ${s*0.44} L${s*0.38} ${s*0.44}Z`} fill={color} opacity="0.85"/>,
  };
  const icon=icons[category];
  if(!icon) return <circle cx={s/2} cy={s/2} r={s/2-1.5} fill="none" stroke={color} strokeWidth="1.4" strokeDasharray="2 2"/>;
  return <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" style={{flexShrink:0}}>{icon}</svg>;
}

// ── onboarding ────────────────────────────────────────────────────────────────
function Onboarding({ onDone, t }){
  const [val,setVal]=useState(""); const ref=useRef(null);
  useEffect(()=>{ setTimeout(()=>ref.current?.focus(),100); },[]);
  const submit=()=>{ if(val.trim()) onDone(val.trim()); };
  return(
    <div style={{position:"fixed",inset:0,background:t.bg,zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32}}>
      <div style={{maxWidth:360,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:11,letterSpacing:"0.18em",color:t.fgDim,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif",marginBottom:12}}>Welcome to Affirmer</div>
        <h2 style={{fontSize:28,fontWeight:300,fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",lineHeight:1.4,marginBottom:10,color:t.fg}}>What shall we call you?</h2>
        <p style={{fontSize:13,color:t.fgDim,fontFamily:"'DM Sans',sans-serif",marginBottom:32,lineHeight:1.6}}>Your name will be saved locally — just for you.</p>
        <input ref={ref} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") submit(); }}
          placeholder="Your name…"
          style={{width:"100%",background:t.fgGhost,border:`1px solid ${t.border}`,borderRadius:10,padding:"14px 18px",fontSize:18,fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",color:t.fg,outline:"none",textAlign:"center",marginBottom:14}}/>
        <button onClick={submit} disabled={!val.trim()} style={{width:"100%",background:val.trim()?t.btnPrimary:t.fgGhost,color:val.trim()?t.btnPrimaryFg:t.fgDim,border:"none",borderRadius:10,padding:"13px",fontSize:14,fontFamily:"'DM Sans',sans-serif",fontWeight:500,cursor:"pointer"}}>Begin</button>
      </div>
    </div>
  );
}

// ── main app ──────────────────────────────────────────────────────────────────
export default function App(){
  const [isDark,setIsDark]=useState(()=>lsGet(LS.THEME,true));
  const t=isDark?DARK:LIGHT;

  const [name,setName]=useState(()=>lsGet(LS.NAME,null));
  const [editingName,setEditingName]=useState(false);
  const [nameInput,setNameInput]=useState("");
  const nameInputRef=useRef(null);

  const [mode,setMode]=useState("manual");
  const [affirmations,setAffirmations]=useState(()=>lsGet(LS.AFFIRMATIONS,DEFAULT_AFFIRMATIONS));
  const [selectedId,setSelectedId]=useState(null);
  const [manualCounts,setManualCounts]=useState(()=>lsGet(LS.MANUAL_COUNTS,{}));
  const [speed,setSpeed]=useState(1);
  const [repTarget,setRepTarget]=useState(30);
  const [repTargetInput,setRepTargetInput]=useState("30");

  const [alltime,setAlltime]=useState(()=>lsGet(LS.ALLTIME,{}));
  const [activeDays,setActiveDays]=useState(()=>lsGet(LS.ACTIVE_DAYS,[]));

  // free session cap
  const [todayAutoSessions,setTodayAutoSessions]=useState(()=>{
    if(lsGet(LS.AUTO_DATE,null)===todayStr()) return lsGet(LS.AUTO_COUNT,0);
    return 0;
  });

  const [autoCount,setAutoCount]=useState(0);
  const [isRunning,setIsRunning]=useState(false);
  const [sessionDone,setSessionDone]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  const [sessionMsg,setSessionMsg]=useState("");
  const [doneMsg,setDoneMsg]=useState("");

  const [dragId,setDragId]=useState(null);
  const [dragOverId,setDragOverId]=useState(null);

  const [showAdd,setShowAdd]=useState(false);
  const [inputText,setInputText]=useState("");
  const [inputCat,setInputCat]=useState("self");
  const [customCatInput,setCustomCatInput]=useState("");
  const addInputRef=useRef(null);

  const intervalRef=useRef(null); const timerRef=useRef(null);
  const autoCountRef=useRef(0); const repTargetRef=useRef(repTarget);
  const speedRef=useRef(speed); const elapsedRef=useRef(0);

  useEffect(()=>{ repTargetRef.current=repTarget; },[repTarget]);
  useEffect(()=>{ speedRef.current=speed; },[speed]);
  useEffect(()=>{ lsSet(LS.THEME,isDark); },[isDark]);
  useEffect(()=>{ lsSet(LS.AFFIRMATIONS,affirmations); },[affirmations]);
  useEffect(()=>{ lsSet(LS.MANUAL_COUNTS,manualCounts); },[manualCounts]);
  useEffect(()=>{ lsSet(LS.ALLTIME,alltime); },[alltime]);
  useEffect(()=>{ lsSet(LS.ACTIVE_DAYS,activeDays); },[activeDays]);

  const startEditName=()=>{ setNameInput(name||""); setEditingName(true); setTimeout(()=>nameInputRef.current?.focus(),60); };
  const saveName=()=>{ if(nameInput.trim()){ setName(nameInput.trim()); lsSet(LS.NAME,nameInput.trim()); } setEditingName(false); };

  // ── auto ──────────────────────────────────────────────────────────────────
  const stopAuto=useCallback(()=>{
    clearInterval(intervalRef.current); clearInterval(timerRef.current); setIsRunning(false);
  },[]);

  const tick=useCallback(()=>{
    autoCountRef.current+=1; setAutoCount(autoCountRef.current);
    if(autoCountRef.current>=repTargetRef.current){ stopAuto(); setSessionDone(true); }
  },[stopAuto]);

  const startAuto=useCallback(()=>{
    if(!selectedId||todayAutoSessions>=FREE_SESSION_CAP) return;
    const effectiveTarget=Math.min(repTargetRef.current,FREE_REP_CAP);
    repTargetRef.current=effectiveTarget;
    autoCountRef.current=0; elapsedRef.current=0;
    setAutoCount(0); setElapsed(0); setSessionDone(false);
    setSessionMsg(name?pick(SESSION_MESSAGES,name):"");
    setIsRunning(true);
    clearInterval(intervalRef.current); clearInterval(timerRef.current);
    intervalRef.current=setInterval(tick,SPEED_PRESETS[speedRef.current].ms);
    timerRef.current=setInterval(()=>{ elapsedRef.current+=1; setElapsed(e=>e+1); },1000);
  },[selectedId,name,tick,todayAutoSessions]);

  const pauseResume=useCallback(()=>{
    if(isRunning){ stopAuto(); }
    else if(sessionDone){ startAuto(); }
    else if(autoCount>0){
      setIsRunning(true);
      intervalRef.current=setInterval(tick,SPEED_PRESETS[speedRef.current].ms);
      timerRef.current=setInterval(()=>{ elapsedRef.current+=1; setElapsed(e=>e+1); },1000);
    } else { startAuto(); }
  },[isRunning,sessionDone,autoCount,startAuto,stopAuto,tick]);

  const resetAuto=useCallback(()=>{
    stopAuto(); autoCountRef.current=0; elapsedRef.current=0;
    setAutoCount(0); setElapsed(0); setSessionDone(false); setSessionMsg(""); setDoneMsg("");
  },[stopAuto]);

  useEffect(()=>{
    if(sessionDone&&selectedId){
      const aff=affirmations.find(a=>a.id===selectedId);
      if(aff){
        const today=todayStr();
        setAlltime(prev=>({...prev,[aff.id]:(prev[aff.id]??0)+autoCountRef.current}));
        setActiveDays(prev=>prev.includes(today)?prev:[...prev,today]);
        if(name) setDoneMsg(pick(DONE_MESSAGES,name));
        const newCount=todayAutoSessions+1;
        setTodayAutoSessions(newCount);
        lsSet(LS.AUTO_DATE,today);
        lsSet(LS.AUTO_COUNT,newCount);
      }
    }
  },[sessionDone]); // eslint-disable-line

  useEffect(()=>()=>{ clearInterval(intervalRef.current); clearInterval(timerRef.current); },[]);

  const switchMode=(m)=>{ stopAuto(); resetAuto(); setMode(m); setSelectedId(null); };

  // ── manual ────────────────────────────────────────────────────────────────
  const tap=(id)=>{
    const aff=affirmations.find(a=>a.id===id);
    if(aff){
      const today=todayStr();
      setAlltime(prev=>({...prev,[id]:(prev[id]??0)+1}));
      setActiveDays(prev=>prev.includes(today)?prev:[...prev,today]);
    }
    setManualCounts(prev=>({...prev,[id]:(prev[id]??0)+1}));
  };
  const resetManual=()=>{ setManualCounts({}); };

  // ── organise ──────────────────────────────────────────────────────────────
  const togglePin=(id)=>setAffirmations(prev=>prev.map(a=>a.id===id?{...a,pinned:!a.pinned}:a));
  const remove=(id)=>{
    if(selectedId===id){ resetAuto(); setSelectedId(null); }
    setAffirmations(prev=>prev.filter(a=>a.id!==id));
    setManualCounts(prev=>{ const n={...prev}; delete n[id]; return n; });
  };
  const onDragStart=(id)=>setDragId(id);
  const onDragOver=(e,id)=>{ e.preventDefault(); setDragOverId(id); };
  const onDrop=(e,targetId)=>{
    e.preventDefault();
    if(dragId===null||dragId===targetId){ setDragId(null); setDragOverId(null); return; }
    setAffirmations(prev=>{
      const arr=[...prev];
      const fromIdx=arr.findIndex(a=>a.id===dragId);
      const toIdx=arr.findIndex(a=>a.id===targetId);
      const [moved]=arr.splice(fromIdx,1);
      arr.splice(toIdx,0,moved);
      return arr;
    });
    setDragId(null); setDragOverId(null);
  };

  const sortedAffirmations=[
    ...affirmations.filter(a=>a.pinned),
    ...affirmations.filter(a=>!a.pinned),
  ];

  useEffect(()=>{ if(showAdd) setTimeout(()=>addInputRef.current?.focus(),60); },[showAdd]);
  const addAffirmation=()=>{
    if(!inputText.trim()||affirmations.length>=FREE_LIMIT) return;
    const finalCat=inputCat==="custom"?(customCatInput.trim().toLowerCase()||"custom"):inputCat;
    setAffirmations(prev=>[...prev,{id:uid(),text:inputText.trim(),category:finalCat,pinned:false}]);
    setInputText(""); setCustomCatInput(""); setShowAdd(false);
  };

  const totalManual=Object.values(manualCounts).reduce((s,v)=>s+v,0);
  const selectedAff=affirmations.find(a=>a.id===selectedId);
  const autoPct=repTarget>0?Math.min(100,Math.round((autoCount/Math.min(repTarget,FREE_REP_CAP))*100)):0;
  const R=54, CIRC=2*Math.PI*R, dashOffset=CIRC*(1-autoPct/100);
  const streak=computeStreak(activeDays);
  const sessionsLeft=FREE_SESSION_CAP-todayAutoSessions;
  const isCapped=todayAutoSessions>=FREE_SESSION_CAP;

  if(!name) return <Onboarding onDone={n=>{ setName(n); lsSet(LS.NAME,n); }} t={t}/>;

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    ::selection{background:${t.btnPrimary};color:${t.btnPrimaryFg};}
    button{font-family:inherit;cursor:pointer;}
    input,textarea,select{font-family:inherit;}
    .mode-pill{transition:all 0.2s;}
    .mode-pill.active{background:${t.btnPrimary}!important;color:${t.btnPrimaryFg}!important;}
    .mode-pill:not(.active):hover{background:${t.pillBg}!important;}
    .tab-btn{transition:all 0.2s;border-bottom:2px solid transparent!important;}
    .tab-btn.active{color:${t.fg}!important;border-bottom-color:${t.fg}!important;}
    .aff-card{transition:all 0.2s;}
    .aff-card:hover .aff-actions{opacity:1!important;}
    .aff-card.drag-over{border-color:${t.borderStrong}!important;opacity:0.6;}
    .aff-card.selectable:hover{border-color:${t.borderMid}!important;}
    .aff-card.selected{border-color:${t.borderStrong}!important;background:${t.cardActive}!important;}
    .tap-btn{transition:transform 0.08s,opacity 0.1s;user-select:none;-webkit-user-select:none;}
    .tap-btn:active{transform:scale(0.96);opacity:0.8;}
    .speed-chip{transition:all 0.15s;}
    .speed-chip.active{background:${t.btnPrimary}!important;color:${t.btnPrimaryFg}!important;}
    .speed-chip:not(.active):hover{border-color:${t.borderMid}!important;}
    @keyframes breathe{0%,100%{opacity:0.55;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}
    .breathing{animation:breathe 2.5s ease-in-out infinite;}
    @keyframes fadein{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
    .fadein{animation:fadein 0.38s ease;}
    @keyframes shimmer{0%,100%{opacity:0.4}50%{opacity:0.8}}
    .shimmer{animation:shimmer 1.8s ease-in-out infinite;}
    .circle-progress{transition:stroke-dashoffset 0.5s ease;}
    .edit-name-btn{opacity:0;transition:opacity 0.15s;}
    .name-wrap:hover .edit-name-btn{opacity:1!important;}
    .add-dashed:hover{border-color:${t.borderMid}!important;color:${t.fgDim}!important;}
    .theme-btn:hover{opacity:0.7;}
  `;

  return(
    <div style={{minHeight:"100vh",background:t.bg,color:t.fg,fontFamily:"'Cormorant Garamond','Georgia',serif",paddingBottom:80,transition:"background 0.3s,color 0.3s"}}>
      <style>{css}</style>

      {/* Header */}
      <div style={{borderBottom:`1px solid ${t.border}`,padding:"18px 24px 0",position:"sticky",top:0,zIndex:10,background:t.bg,transition:"background 0.3s"}}>
        <div style={{maxWidth:560,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:14}}>

            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
              <div className="name-wrap" style={{display:"flex",alignItems:"baseline",gap:6,minWidth:0}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:10,letterSpacing:"0.14em",color:t.fgDim,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif",marginBottom:1}}>{getGreeting()},</div>
                  {editingName?(
                    <input ref={nameInputRef} value={nameInput} onChange={e=>setNameInput(e.target.value)}
                      onBlur={saveName} onKeyDown={e=>{ if(e.key==="Enter") saveName(); if(e.key==="Escape") setEditingName(false); }}
                      style={{fontSize:18,background:"transparent",border:"none",borderBottom:`1px solid ${t.borderMid}`,outline:"none",color:t.fg,width:140,padding:"0 0 1px"}}/>
                  ):(
                    <h1 style={{fontSize:18,fontWeight:400,letterSpacing:"0.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</h1>
                  )}
                </div>
                {!editingName&&(
                  <button className="edit-name-btn" onClick={startEditName} style={{background:"none",border:"none",color:t.fgDim,padding:3,display:"flex"}}><PencilIcon/></button>
                )}
              </div>
            </div>

            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              {streak>0&&(
                <div style={{display:"flex",alignItems:"center",gap:4,background:"rgba(251,146,60,0.1)",border:"1px solid rgba(251,146,60,0.25)",borderRadius:20,padding:"3px 9px"}}>
                  <span style={{fontSize:12}}>🔥</span>
                  <span style={{fontSize:11,fontWeight:500,color:"#fb923c",fontFamily:"'DM Sans',sans-serif"}}>{streak}d</span>
                </div>
              )}
              <button className="theme-btn" onClick={()=>setIsDark(d=>!d)} style={{background:"none",border:`1px solid ${t.border}`,borderRadius:8,padding:"6px 8px",color:t.fgDim,display:"flex",alignItems:"center",transition:"all 0.2s"}}>
                {isDark?<SunIcon/>:<MoonIcon/>}
              </button>
              <div style={{display:"flex",background:t.pillBg,borderRadius:10,padding:3,gap:2}}>
                {["manual","auto"].map(m=>(
                  <button key={m} className={`mode-pill${mode===m?" active":""}`} onClick={()=>switchMode(m)}
                    style={{padding:"5px 11px",borderRadius:7,border:"none",background:"transparent",color:mode===m?t.btnPrimaryFg:t.fgDim,fontSize:11,fontWeight:500,letterSpacing:"0.04em",textTransform:"capitalize",fontFamily:"'DM Sans',sans-serif"}}>{m}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:22}}>
            <div style={{borderBottom:`2px solid ${t.fg}`,paddingBottom:10,fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",color:t.fg}}>Session</div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:560,margin:"0 auto",padding:"24px 24px 0"}}>

        {/* MANUAL */}
        {mode==="manual"&&(
          <div className="fadein">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:t.fgDim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Tap to affirm</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {totalManual>0&&<span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:t.fgDim}}>{totalManual} total</span>}
                {totalManual>0&&<button onClick={resetManual} style={{background:"none",border:`1px solid ${t.border}`,borderRadius:6,padding:"3px 10px",fontSize:11,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>Reset</button>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {sortedAffirmations.map(a=>{
                const count=manualCounts[a.id]??0;
                const alltimeCount=alltime[a.id]??0;
                return(
                  <div key={a.id} className={`aff-card${dragOverId===a.id?" drag-over":""}`}
                    draggable onDragStart={()=>onDragStart(a.id)} onDragOver={e=>onDragOver(e,a.id)} onDrop={e=>onDrop(e,a.id)} onDragEnd={()=>{ setDragId(null); setDragOverId(null); }}
                    style={{border:`1px solid ${t.border}`,borderRadius:12,overflow:"hidden",background:t.surface,opacity:dragId===a.id?0.4:1}}>
                    <div style={{display:"flex",alignItems:"stretch"}}>
                      <div style={{display:"flex",alignItems:"center",padding:"0 8px 0 12px",color:t.fgDim,cursor:"grab"}}><GripIcon/></div>
                      <button className="tap-btn" onClick={()=>tap(a.id)} style={{flex:1,background:"none",border:"none",padding:"13px 10px",textAlign:"left",display:"flex",alignItems:"center",gap:12}}>
                        <div style={{minWidth:40,height:40,borderRadius:9,flexShrink:0,background:count>0?t.btnPrimary:t.fgGhost,display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s"}}>
                          <span style={{fontSize:15,fontWeight:600,color:count>0?t.btnPrimaryFg:t.fgDim,fontFamily:"'DM Sans',sans-serif",lineHeight:1}}>{count}</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            {a.pinned&&<span style={{fontSize:10,color:"#fb923c"}}>📌</span>}
                            <span style={{fontSize:14,lineHeight:1.5,color:t.fg,fontStyle:"italic",fontWeight:300}}>{a.text}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                            <CatIcon category={a.category} color={CAT_COLORS[a.category]||t.fgDim} size={11}/>
                            <span style={{fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",color:CAT_COLORS[a.category]||t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>{a.category}</span>
                            {alltimeCount>0&&<span style={{fontSize:10,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>✦ {alltimeCount} all‑time</span>}
                          </div>
                        </div>
                      </button>
                      <div className="aff-actions" style={{display:"flex",alignItems:"center",gap:0,opacity:0,transition:"opacity 0.15s"}}>
                        <button onClick={()=>togglePin(a.id)} style={{background:"none",border:"none",padding:"0 8px",color:a.pinned?"#fb923c":t.fgDim,lineHeight:1,display:"flex",alignItems:"center"}}><PinIcon filled={a.pinned}/></button>
                        <button onClick={()=>remove(a.id)} style={{background:"none",border:"none",borderLeft:`1px solid ${t.border}`,padding:"0 13px",color:t.fgDim,fontSize:17,lineHeight:1}}>×</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AUTO */}
        {mode==="auto"&&(
          <div className="fadein">
            {!isRunning&&!sessionDone&&autoCount===0&&(
              <>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,color:t.fgDim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12}}>Choose affirmation</div>
                <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:24}}>
                  {sortedAffirmations.map(a=>{
                    const alltimeCount=alltime[a.id]??0;
                    return(
                      <button key={a.id} className={`aff-card selectable${selectedId===a.id?" selected":""}`} onClick={()=>setSelectedId(a.id)}
                        style={{background:"transparent",border:`1px solid ${selectedId===a.id?t.borderStrong:t.border}`,borderRadius:12,padding:"13px 15px",textAlign:"left",display:"flex",alignItems:"center",gap:11}}>
                        <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${selectedId===a.id?t.borderStrong:t.borderMid}`,background:selectedId===a.id?t.btnPrimary:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:t.btnPrimaryFg,transition:"all 0.2s"}}>
                          {selectedId===a.id&&<CheckIcon/>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                            {a.pinned&&<span style={{fontSize:10,color:"#fb923c"}}>📌</span>}
                            <span style={{fontSize:14,fontStyle:"italic",fontWeight:300,color:t.fg,lineHeight:1.5}}>{a.text}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                            <CatIcon category={a.category} color={CAT_COLORS[a.category]||t.fgDim} size={11}/>
                            <span style={{fontSize:10,letterSpacing:"0.1em",textTransform:"uppercase",color:CAT_COLORS[a.category]||t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>{a.category}</span>
                            {alltimeCount>0&&<span style={{fontSize:10,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>✦ {alltimeCount} all‑time</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:24,flexWrap:"wrap"}}>
                  <div style={{display:"flex",gap:5}}>
                    {SPEED_PRESETS.map((s,i)=>(
                      <button key={i} className={`speed-chip${speed===i?" active":""}`} onClick={()=>setSpeed(i)}
                        style={{padding:"5px 11px",borderRadius:8,border:`1px solid ${t.border}`,background:speed===i?t.btnPrimary:"transparent",color:speed===i?t.btnPrimaryFg:t.fgDim,fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>
                        {s.label} <span style={{opacity:0.55,fontSize:10}}>{s.desc}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{flex:1}}/>
                  <div style={{display:"flex",alignItems:"center",gap:6,background:t.fgGhost,border:`1px solid ${t.border}`,borderRadius:8,padding:"5px 12px"}}>
                    <span style={{fontSize:12,color:t.fgDim,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>Stop at</span>
                    <input type="number" min={1} max={FREE_REP_CAP} value={repTargetInput}
                      onChange={e=>{ setRepTargetInput(e.target.value); const v=parseInt(e.target.value); if(v>0) setRepTarget(Math.min(v,FREE_REP_CAP)); }}
                      style={{width:48,background:"transparent",border:"none",outline:"none",fontSize:15,fontWeight:500,color:t.fg,textAlign:"center",fontFamily:"'DM Sans',sans-serif"}}/>
                    <span style={{fontSize:12,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>reps</span>
                    <span style={{fontSize:10,color:t.fgDim,opacity:0.5}}>max {FREE_REP_CAP}</span>
                  </div>
                </div>
              </>
            )}

            {(isRunning||sessionDone||autoCount>0)&&selectedAff&&(
              <div className="fadein" style={{textAlign:"center",paddingBottom:28}}>
                {isRunning&&sessionMsg&&<div className="shimmer" style={{fontSize:12,fontStyle:"italic",color:t.fgDim,marginBottom:20}}>{sessionMsg}</div>}
                <div style={{position:"relative",width:140,height:140,margin:"0 auto 26px"}}>
                  <svg width="140" height="140" style={{transform:"rotate(-90deg)"}}>
                    <circle cx="70" cy="70" r={R} fill="none" stroke={t.fgGhost} strokeWidth="3"/>
                    <circle className="circle-progress" cx="70" cy="70" r={R} fill="none" stroke={sessionDone?t.green:t.fg} strokeWidth="3" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={dashOffset}/>
                  </svg>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontSize:36,fontWeight:300,lineHeight:1,letterSpacing:"-0.02em",color:t.fg}}>{autoCount}</div>
                    <div style={{fontSize:11,color:t.fgDim,marginTop:2,fontFamily:"'DM Sans',sans-serif"}}>/ {Math.min(repTarget,FREE_REP_CAP)}</div>
                  </div>
                </div>
                <div className={isRunning?"breathing":""} style={{fontSize:20,fontStyle:"italic",fontWeight:300,lineHeight:1.65,color:t.fg,maxWidth:380,margin:"0 auto 4px"}}>"{selectedAff.text}"</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:CAT_COLORS[selectedAff.category]||t.fgDim,fontFamily:"'DM Sans',sans-serif",marginBottom:6}}>
                  <CatIcon category={selectedAff.category} color={CAT_COLORS[selectedAff.category]||t.fgDim} size={11}/>
                  {selectedAff.category}
                </div>
                {(alltime[selectedAff.id]??0)>0&&(
                  <div style={{fontSize:11,color:t.fgDim,fontFamily:"'DM Sans',sans-serif",marginBottom:20}}>✦ {alltime[selectedAff.id]} all‑time reps</div>
                )}
                {sessionDone&&(
                  <div className="fadein" style={{marginBottom:24,padding:"14px 20px",background:isDark?"rgba(52,211,153,0.07)":"rgba(22,163,74,0.06)",border:`1px solid ${isDark?"rgba(52,211,153,0.2)":"rgba(22,163,74,0.2)"}`,borderRadius:12}}>
                    <div style={{fontSize:14,fontStyle:"italic",color:t.green,marginBottom:4}}>{doneMsg}</div>
                    <div style={{fontSize:12,color:t.green,opacity:0.7,fontFamily:"'DM Sans',sans-serif"}}>{autoCount} reps · {fmtTime(elapsed)}</div>
                  </div>
                )}
                {isRunning&&(
                  <div style={{display:"flex",justifyContent:"center",gap:18,marginBottom:24}}>
                    <span className="shimmer" style={{fontSize:11,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>{SPEED_PRESETS[speed].label} · {SPEED_PRESETS[speed].desc}/rep</span>
                    <span style={{fontSize:11,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>{fmtTime(elapsed)} elapsed</span>
                  </div>
                )}
              </div>
            )}

            {/* session cap */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
              {isCapped?(
                <div style={{background:isDark?"rgba(251,146,60,0.07)":"rgba(251,146,60,0.06)",border:"1px solid rgba(251,146,60,0.22)",borderRadius:10,padding:"12px 18px",textAlign:"center",maxWidth:320}}>
                  <div style={{fontSize:13,color:"#fb923c",fontFamily:"'DM Sans',sans-serif",fontWeight:500,marginBottom:2}}>Daily limit reached</div>
                  <div style={{fontSize:12,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>3 auto sessions/day on free. Come back tomorrow! ✦</div>
                </div>
              ):(
                <div style={{fontSize:11,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>{sessionsLeft} auto session{sessionsLeft!==1?"s":""} left today</div>
              )}
              <div style={{display:"flex",gap:10}}>
                {autoCount>0&&<button onClick={resetAuto} style={{background:"none",border:`1px solid ${t.border}`,borderRadius:10,padding:"10px 18px",fontSize:13,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>Reset</button>}
                <button onClick={pauseResume} disabled={!selectedId||isCapped}
                  style={{background:(selectedId&&!isCapped)?t.btnPrimary:t.fgGhost,color:(selectedId&&!isCapped)?t.btnPrimaryFg:t.fgDim,border:"none",borderRadius:10,padding:"10px 28px",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:9,fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>
                  {isRunning?<><PauseIcon/> Pause</>:sessionDone?<>↺ Again</>:autoCount>0?<><PlayIcon/> Resume</>:<><PlayIcon/> Start</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add affirmation */}
        <div style={{marginTop:24}}>
          {affirmations.length>=FREE_LIMIT&&!showAdd?(
            <div style={{background:isDark?"rgba(251,146,60,0.07)":"rgba(251,146,60,0.06)",border:"1px solid rgba(251,146,60,0.22)",borderRadius:10,padding:"12px 16px"}}>
              <div style={{fontSize:12,color:"#fb923c",fontFamily:"'DM Sans',sans-serif"}}>5 affirmation limit reached. Remove one to add another.</div>
            </div>
          ):!showAdd?(
            <button className="add-dashed" onClick={()=>setShowAdd(true)} style={{width:"100%",padding:"11px",border:`1px dashed ${t.border}`,borderRadius:10,background:"transparent",color:t.fgDim,fontSize:13,transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif"}}>+ Add affirmation</button>
          ):(
            <div style={{border:`1.5px solid ${t.borderStrong}`,borderRadius:10,overflow:"hidden",background:t.surface}}>
              <textarea ref={addInputRef} value={inputText} onChange={e=>setInputText(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); addAffirmation(); } if(e.key==="Escape") setShowAdd(false); }}
                placeholder="Write as if it's already true…" rows={2}
                style={{width:"100%",padding:"13px 15px 8px",border:"none",fontSize:15,fontStyle:"italic",fontWeight:300,color:t.fg,background:"transparent",lineHeight:1.6,resize:"none",outline:"none"}}/>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 13px 11px",borderTop:`1px solid ${t.border}`,flexWrap:"wrap"}}>
                <select value={inputCat} onChange={e=>setInputCat(e.target.value)} style={{border:`1px solid ${t.border}`,borderRadius:6,padding:"4px 8px",fontSize:11,color:t.fg,background:t.inputBg,outline:"none",fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.05em",textTransform:"capitalize"}}>
                  {PRESET_CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  <option value="custom">+ Custom…</option>
                </select>
                {inputCat==="custom"&&(
                  <input value={customCatInput} onChange={e=>setCustomCatInput(e.target.value)} placeholder="category name…"
                    style={{border:`1px solid ${t.border}`,borderRadius:6,padding:"4px 8px",fontSize:11,color:t.fg,background:t.inputBg,outline:"none",fontFamily:"'DM Sans',sans-serif",width:110}}/>
                )}
                <div style={{flex:1}}/>
                <button onClick={()=>{ setShowAdd(false); setCustomCatInput(""); }} style={{background:"none",border:"none",fontSize:12,color:t.fgDim,fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
                <button onClick={addAffirmation} style={{background:t.btnPrimary,color:t.btnPrimaryFg,border:"none",borderRadius:7,padding:"6px 16px",fontSize:12,fontWeight:500,fontFamily:"'DM Sans',sans-serif"}}>Add</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{maxWidth:560,margin:"40px auto 0",padding:"16px 24px",borderTop:`1px solid ${t.border}`,textAlign:"center"}}>
        <span style={{fontSize:11,color:t.fgDim,fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.04em",opacity:0.7}}>
          © {new Date().getFullYear()} Affirmer — One practice. Perfected.
        </span>
      </div>
    </div>
  );
}
