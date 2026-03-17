import { useState, useRef, useEffect } from "react";

// ─── DATA ───
const STAGES = [
  { key: "prospect", label: "Prospect", threshold: 10 },
  { key: "initial_contact", label: "Contact", threshold: 5 },
  { key: "discovery", label: "Discovery", threshold: 5 },
  { key: "pitch", label: "Pitch", threshold: 7 },
  { key: "active_engagement", label: "Engaged", threshold: 14 },
  { key: "soft_commit", label: "Committed", threshold: 5 },
  { key: "commitment_processing", label: "Processing", threshold: 5 },
  { key: "kyc_docs", label: "KYC", threshold: 3 },
  { key: "funded", label: "Funded", threshold: null },
];
const SOURCES = ["Velocis Network","CPA Referral","Legacy Event","LinkedIn","Ken — DBJ List","Ken — Event Follow-up","Tolleson WM","Cold Outreach","M&A Attorney","Other"];

const PROSPECTS = [
  { id:1, name:"Robert Calloway", company:"Calloway Family Office", email:"rcalloway@callowayfo.com", phone:"(214) 555-0142", stage:"active_engagement", initialInvestment:500000, growthTarget:1500000, committedAmount:null, daysIdle:3, touches:6, nextAction:"Send Q3 performance deck", nextDate:"2026-02-26", source:"Velocis Network", notes:"Interested after Velocis event. Wants to see historical returns by vintage year before committing. Wife is also involved in financial decisions.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2026-01-10",note:"Added from Velocis event list"},{stage:"Initial Contact",date:"2026-01-12",note:"Sent intro email"},{stage:"Discovery Meeting",date:"2026-01-20",note:"Coffee at Ascension"},{stage:"Pitch Delivered",date:"2026-01-28",note:"Full deck presented"},{stage:"Active Engagement",date:"2026-02-05",note:"Requested vintage data"}] },
  { id:2, name:"Sandra Kim", company:"Kim Holdings LLC", email:"skim@kimholdings.com", phone:"(214) 555-0198", stage:"soft_commit", initialInvestment:250000, growthTarget:null, committedAmount:250000, daysIdle:1, touches:8, nextAction:"Confirm entity for investment", nextDate:"2026-02-27", source:"CPA Referral", notes:"Committed $250K verbally. Checking with attorney on entity structure. CPA is Mike Lawson at Whitley Penn.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2025-12-15",note:"CPA referral"},{stage:"Initial Contact",date:"2025-12-18",note:"Intro call"},{stage:"Discovery Meeting",date:"2026-01-06",note:"Lunch meeting"},{stage:"Pitch Delivered",date:"2026-01-14",note:"Deck + case study"},{stage:"Active Engagement",date:"2026-01-22",note:"Multiple follow-ups"},{stage:"Soft Commit",date:"2026-02-18",note:"$250K verbal"}] },
  { id:3, name:"David Thornton", company:"Thornton Capital", email:"dthornton@thorntoncap.com", phone:"(972) 555-0234", stage:"discovery", initialInvestment:500000, growthTarget:2000000, committedAmount:null, daysIdle:0, touches:2, nextAction:"Discovery meeting — 2:00 PM today", nextDate:"2026-02-25", source:"M&A Attorney", notes:"Recently exited $12M manufacturing business. Looking for passive yield. Doesn't want to manage RE directly. Very high potential.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2026-02-10",note:"Intro from M&A attorney"},{stage:"Initial Contact",date:"2026-02-14",note:"Intro call — very engaged"},{stage:"Discovery Meeting",date:"2026-02-20",note:"Scheduled for 2/25"}] },
  { id:4, name:"Patricia Wells", company:"Wells Family Trust", email:"pwells@wellstrust.com", phone:"(214) 555-0311", stage:"pitch", initialInvestment:750000, growthTarget:750000, committedAmount:null, daysIdle:5, touches:3, nextAction:"Follow up on pitch — no response yet", nextDate:"2026-02-24", source:"Legacy Event", notes:"Third-generation wealth. Very conservative. Needs peer validation before committing — asked if she could speak with an existing investor.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2026-01-20",note:"Met at Legacy event"},{stage:"Initial Contact",date:"2026-01-25",note:"Follow-up email"},{stage:"Discovery Meeting",date:"2026-02-03",note:"Office visit"},{stage:"Pitch Delivered",date:"2026-02-14",note:"In-person at her office"}] },
  { id:5, name:"Marcus Johnson", company:"MJ Ventures", email:"mjohnson@mjventures.com", phone:"(469) 555-0178", stage:"active_engagement", initialInvestment:300000, growthTarget:800000, committedAmount:null, daysIdle:12, touches:4, nextAction:"Invite to investor dinner March 5", nextDate:"2026-03-01", source:"LinkedIn", notes:"Owns 12 rental properties. Interested in passive alternative but wants to see one more quarter of performance. Patient approach.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2026-01-05",note:"LinkedIn connection"},{stage:"Initial Contact",date:"2026-01-08",note:"LinkedIn DM + call"},{stage:"Discovery Meeting",date:"2026-01-18",note:"Zoom discovery"},{stage:"Pitch Delivered",date:"2026-01-30",note:"Full presentation"},{stage:"Active Engagement",date:"2026-02-06",note:"Comparing rental yields"}] },
  { id:6, name:"James Whitfield", company:"Whitfield Enterprises", email:"jwhitfield@whitfield.com", phone:"(214) 555-0456", stage:"commitment_processing", initialInvestment:500000, growthTarget:1000000, committedAmount:500000, daysIdle:2, touches:10, nextAction:"Check with attorney on LLC docs", nextDate:"2026-02-28", source:"Velocis Network", notes:"Setting up new LLC for investment. Attorney is reviewing sub docs. Needs 5 more business days. Very methodical.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2025-11-20",note:"Velocis event"},{stage:"Initial Contact",date:"2025-11-22",note:"Same-day follow-up"},{stage:"Discovery Meeting",date:"2025-12-05",note:"Breakfast meeting"},{stage:"Pitch Delivered",date:"2025-12-12",note:"Full deck"},{stage:"Active Engagement",date:"2025-12-20",note:"Due diligence phase"},{stage:"Soft Commit",date:"2026-02-01",note:"$500K verbal"},{stage:"Commitment Processing",date:"2026-02-15",note:"Setting up LLC"}] },
  { id:7, name:"Angela Torres", company:"Torres Family Office", email:"atorres@torresfam.com", phone:"(214) 555-0567", stage:"kyc_docs", initialInvestment:350000, growthTarget:null, committedAmount:350000, daysIdle:1, touches:9, nextAction:"Follow up on passport upload in Agora", nextDate:"2026-02-26", source:"CPA Referral", notes:"Moved to Agora for KYC. Waiting on passport upload. Everything else complete.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2025-11-10",note:"CPA referral"},{stage:"Initial Contact",date:"2025-11-13",note:"Intro call"},{stage:"Discovery Meeting",date:"2025-11-25",note:"Office meeting"},{stage:"Pitch Delivered",date:"2025-12-03",note:"Full deck"},{stage:"Active Engagement",date:"2025-12-15",note:"Due diligence"},{stage:"Soft Commit",date:"2026-01-20",note:"$350K verbal"},{stage:"Commitment Processing",date:"2026-02-05",note:"Docs submitted"},{stage:"KYC / Docs",date:"2026-02-20",note:"In Agora"}] },
  { id:8, name:"Richard Huang", company:"Huang Capital Partners", email:"", phone:"", stage:"prospect", initialInvestment:null, growthTarget:null, committedAmount:null, daysIdle:3, touches:0, nextAction:"Research background, prep outreach", nextDate:"2026-02-27", source:"Ken — DBJ List", notes:"Recently sold tech company. Ken flagged as high-value target from DBJ list.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2026-02-22",note:"Ken sourced from DBJ"}] },
  { id:9, name:"William Grant", company:"Grant Holdings", email:"wgrant@grantholdings.com", phone:"(214) 555-0789", stage:"initial_contact", initialInvestment:null, growthTarget:null, committedAmount:null, daysIdle:2, touches:1, nextAction:"Schedule intro call", nextDate:"2026-02-26", source:"Tolleson WM", notes:"Tolleson advisor made warm intro. Left voicemail, sent follow-up email.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2026-02-18",note:"Tolleson warm intro"},{stage:"Initial Contact",date:"2026-02-23",note:"Voicemail + email"}] },
  { id:10, name:"Catherine Blake", company:"Blake Trust", email:"cblake@blaketrust.com", phone:"(972) 555-0321", stage:"nurture", initialInvestment:200000, growthTarget:500000, committedAmount:null, daysIdle:30, touches:5, nextAction:"Re-engage after tax season", nextDate:"2026-04-15", source:"Legacy Event", notes:"Interested but completely tied up through April with tax season. Re-engage mid-April.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2025-12-01",note:"Legacy event"},{stage:"Nurture",date:"2026-01-20",note:"Parked until April"}] },
  { id:11, name:"Thomas Park", company:"Park Capital", email:"", phone:"", stage:"dead", initialInvestment:null, growthTarget:null, committedAmount:null, daysIdle:45, touches:3, nextAction:null, nextDate:null, source:"Cold Outreach", lostReason:"Not Accredited", notes:"Not accredited. Friendly conversation but doesn't meet requirements.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2025-12-10",note:"Cold outreach"},{stage:"Dead / Lost",date:"2026-01-15",note:"Not accredited"}] },
  { id:12, name:"Rachel Adams", company:"Adams Family Trust", email:"radams@adamstrust.com", phone:"(214) 555-0654", stage:"active_engagement", initialInvestment:250000, growthTarget:750000, committedAmount:null, daysIdle:6, touches:5, nextAction:"Send case study — similar investor profile", nextDate:"2026-02-28", source:"Ken — Event Follow-up", notes:"Met at Dallas RE event. Ken qualified and did warm handoff to Chad. Very engaged, asks smart questions about ITIN lending.", rep:"Chad Cormier",
    stageHistory:[{stage:"Prospect",date:"2026-01-15",note:"Ken sourced from event"},{stage:"Initial Contact",date:"2026-01-18",note:"Ken intro email"},{stage:"Discovery Meeting",date:"2026-01-28",note:"Zoom discovery"},{stage:"Pitch Delivered",date:"2026-02-06",note:"Full presentation"},{stage:"Active Engagement",date:"2026-02-12",note:"Wants case study"}] },
];

const FUNDED = [
  { id:101, name:"Steven Morrison", company:"Morrison Family Trust", amount:500000, date:"2026-01-15", track:"maintain", target:null, nextTouch:"2026-03-15", notes:"Happy. Quarterly check-in." },
  { id:102, name:"Lisa Chang", company:"Chang Investments", amount:100000, date:"2026-02-01", track:"grow", target:400000, nextTouch:"2026-03-01", notes:"Toe-dipper. Target $500K total." },
  { id:103, name:"Daniel Reeves", company:"Reeves Capital", amount:250000, date:"2025-12-01", track:"grow", target:250000, nextTouch:"2026-03-10", notes:"Wants to double after Q4 returns." },
];

// FULL TIMELINE — every interaction, stage change, document
const TIMELINE = [
  { date:"2026-02-25", time:"09:15", prospect:"Sandra Kim", type:"email", detail:"Sent entity structure options — LLC vs Trust comparison memo.", docs:["Entity Structure Options.pdf"] },
  { date:"2026-02-25", time:"08:30", prospect:"James Whitfield", type:"call", detail:"Called attorney's office. LLC docs in progress, needs 5 more business days. No concerns, just process.", docs:null },
  { date:"2026-02-24", time:"16:00", prospect:"Robert Calloway", type:"meeting", detail:"Coffee at Ascension. Reviewed performance data together. He pulled out a notepad and wrote down yield numbers — good sign. Wants vintage-level returns before committing. Wife is involved, may need a couple meeting. Asked about liquidity terms.", docs:["Q3 Performance Summary.pdf","Fund V Overview - 1 Pager.pdf"] },
  { date:"2026-02-24", time:"11:00", prospect:"Angela Torres", type:"email", detail:"Reminded to upload passport scan for KYC in Agora portal. She said she'd do it tonight.", docs:null },
  { date:"2026-02-23", time:"14:00", prospect:"Marcus Johnson", type:"meeting", detail:"Zoom call — 45 min. Walked through his rental portfolio yield (~6%) vs OwnEZ target (~9-11%). He's genuinely interested but wants to see one more quarter play out before committing. Not a stall — he's methodical. Suggested inviting him to March investor dinner.", docs:["Rental vs Credit Fund Comparison.pdf","Marcus Johnson - Portfolio Analysis.xlsx"] },
  { date:"2026-02-23", time:"10:00", prospect:"Rachel Adams", type:"email", detail:"Sent case study of anonymous investor with similar profile who started at $100K and scaled to $500K over 18 months.", docs:["Investor Case Study - Anonymous.pdf"] },
  { date:"2026-02-22", time:"15:30", prospect:"Patricia Wells", type:"email", detail:"Sent pitch deck follow-up. Referenced our conversation about peer validation — offered to connect her with an existing investor. No response yet.", docs:["OwnEZ Investor Deck v3.pdf"] },
  { date:"2026-02-21", time:"09:00", prospect:"David Thornton", type:"call", detail:"Intro call — 30 min. Just exited $12M manufacturing sale. Advisor told him to park cash in real estate credit. Very engaged, asked about default rates, underwriting standards, team background. Scheduled discovery for Feb 25 at 2pm.", docs:null },
  { date:"2026-02-20", time:"14:00", prospect:"Sandra Kim", type:"meeting", detail:"Lunch at Knife. She's ready to commit $250K. Checking with attorney on which entity to use — personal vs LLC. CPA (Mike Lawson) is supportive.", docs:null },
  { date:"2026-02-20", time:"14:00", prospect:"David Thornton", type:"stage", detail:"Moved to Discovery Meeting — scheduled for Feb 25.", docs:null },
  { date:"2026-02-19", time:"11:00", prospect:"Robert Calloway", type:"email", detail:"Sent Q2 performance summary as requested after our Jan meeting.", docs:["Q2 Performance Summary.pdf"] },
  { date:"2026-02-18", time:"16:00", prospect:"James Whitfield", type:"call", detail:"Confirmed soft commit — $500K. Wants to invest through new LLC rather than existing entity. Attorney will handle setup. Very straightforward conversation.", docs:null },
  { date:"2026-02-18", time:"16:30", prospect:"James Whitfield", type:"stage", detail:"Moved to Soft Commit — $500K confirmed.", docs:null },
  { date:"2026-02-18", time:"10:00", prospect:"Sandra Kim", type:"stage", detail:"Moved to Soft Commit — $250K verbal commitment at lunch.", docs:null },
  { date:"2026-02-17", time:"10:00", prospect:"William Grant", type:"call", detail:"Left voicemail referencing Tolleson advisor's warm intro. Sent follow-up email with one-pager.", docs:["OwnEZ Fund V - 1 Pager.pdf"] },
  { date:"2026-02-14", time:"14:00", prospect:"Patricia Wells", type:"meeting", detail:"In-person pitch at her Highland Park office. She was receptive but cautious. Third-gen wealth, very conservative allocation. Biggest concern: she wants to talk to someone who's already invested before she commits. Asked about minimum investment.", docs:["OwnEZ Investor Deck v3.pdf","Fund V Overview.pdf"] },
  { date:"2026-02-14", time:"15:00", prospect:"Patricia Wells", type:"stage", detail:"Moved to Pitch Delivered.", docs:null },
  { date:"2026-02-12", time:"11:00", prospect:"Rachel Adams", type:"stage", detail:"Moved to Active Engagement. Post-pitch interest confirmed — wants case study.", docs:null },
  { date:"2026-02-06", time:"15:00", prospect:"Rachel Adams", type:"meeting", detail:"Pitched OwnEZ via Zoom — 40 min. She asked detailed questions about ITIN lending model, default rates, and borrower demographics. Very analytical. Wants a case study of a similar investor before committing. Ken's warm intro clearly helped.", docs:["OwnEZ Investor Deck v3.pdf"] },
  { date:"2026-02-06", time:"15:45", prospect:"Rachel Adams", type:"stage", detail:"Moved to Pitch Delivered.", docs:null },
  { date:"2026-02-05", time:"10:00", prospect:"Robert Calloway", type:"stage", detail:"Moved to Active Engagement — requested vintage data.", docs:null },
  { date:"2026-01-30", time:"14:00", prospect:"Marcus Johnson", type:"meeting", detail:"Full presentation via Zoom. Walked through deck, Q&A was focused on how this compares to his direct RE holdings. He's doing the math himself — comparing 6% rental yield to 9-11% OwnEZ target.", docs:["OwnEZ Investor Deck v3.pdf"] },
  { date:"2026-01-28", time:"10:00", prospect:"Robert Calloway", type:"meeting", detail:"Full deck presentation over breakfast at The Mansion. He's serious — asked about fund structure, fee breakdown, and who else is in. Wants vintage returns.", docs:["OwnEZ Investor Deck v3.pdf"] },
  { date:"2026-01-28", time:"11:00", prospect:"Rachel Adams", type:"meeting", detail:"Zoom discovery — 25 min. Ken's warm intro set good context. She manages family trust, looking for yield alternatives to fixed income. Currently 60/40 traditional allocation.", docs:null },
];

const fmt = (n) => { if(!n) return "\u2014"; if(n>=1e6) return `$${(n/1e6).toFixed(1)}M`; if(n>=1e3) return `$${(n/1e3).toFixed(0)}K`; return `$${n}`; };
const today = "2026-02-25";
const isOverdue = (p) => p.nextDate && p.nextDate < today && p.stage !== "dead";
const isStale = (p) => { const s = STAGES.find(st=>st.key===p.stage); if(!s?.threshold||p.daysIdle==null) return false; if(p.nextDate&&p.nextDate>=today) return false; return p.daysIdle>=s.threshold; };
const typeIcon = { email:"\u2709\uFE0F", call:"\uD83D\uDCDE", meeting:"\uD83E\uDD1D", note:"\uD83D\uDCDD", stage:"\u27A1\uFE0F", doc:"\uD83D\uDCCE" };
const typeColor = { email:"#3B82F6", call:"#10B981", meeting:"#8B5CF6", note:"#F59E0B", stage:"#6B7280" };

// ─── GLOBAL SEARCH ───
function Search({ onSelect, autoFocus, placeholder }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const results = q.length >= 1 ? PROSPECTS.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    p.company.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 8) : [];
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, [autoFocus]);

  return (
    <div style={{ position: "relative", zIndex: 50 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#CCC",pointerEvents:"none" }}>⌕</span>
        <input ref={ref} value={q} onChange={e=>{setQ(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),200)}
          placeholder={placeholder||"Search name or company..."}
          style={{ width:"100%",padding:"9px 10px 9px 30px",border:"1.5px solid #E8E8E8",borderRadius:8,fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",color:"#1A1A1A",boxSizing:"border-box" }} />
      </div>
      {open && q.length >= 1 && (
        <div style={{ position:"absolute",top:"calc(100% + 2px)",left:0,right:0,background:"#fff",borderRadius:8,border:"1px solid #E0E0E0",boxShadow:"0 8px 30px rgba(0,0,0,0.12)",overflow:"hidden",maxHeight:360,overflowY:"auto" }}>
          {results.length === 0 ? (
            <div style={{ padding:"14px 16px",fontSize:13,color:"#CCC" }}>No results for "{q}"</div>
          ) : results.map(p => {
            const att = isOverdue(p) || isStale(p);
            return (
              <div key={p.id} onMouseDown={()=>{onSelect(p);setQ("");setOpen(false)}}
                style={{ padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #F5F5F5",display:"flex",justifyContent:"space-between",alignItems:"center" }}
                onMouseEnter={e=>e.currentTarget.style.background="#F8F8F8"} onMouseLeave={e=>e.currentTarget.style.background=""}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <span style={{ fontSize:14,fontWeight:500,color:"#1A1A1A" }}>{p.name}</span>
                    {att && <div style={{ width:5,height:5,borderRadius:"50%",background:"#E25C3E" }} />}
                  </div>
                  <div style={{ fontSize:11,color:"#999",marginTop:1 }}>{p.company}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10,fontWeight:600,color:"#999",letterSpacing:0.4,textTransform:"uppercase" }}>{STAGES.find(s=>s.key===p.stage)?.label||p.stage}</div>
                  {p.initialInvestment && <div style={{ fontSize:11,color:"#1A1A1A",fontWeight:500 }}>{fmt(p.initialInvestment)}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [section, setSection] = useState("today");
  const [stageFilter, setStageFilter] = useState(null);
  const [logging, setLogging] = useState(false);
  const [tlFilter, setTlFilter] = useState("all");
  const [logType, setLogType] = useState("call");
  const [logText, setLogText] = useState("");
  const [logNext, setLogNext] = useState("");
  const [logNextDate, setLogNextDate] = useState("");

  const selected = selectedId ? PROSPECTS.find(p=>p.id===selectedId) : null;
  const pipeline = PROSPECTS.filter(p=>!["nurture","dead"].includes(p.stage));
  const dueToday = PROSPECTS.filter(p=>p.nextDate===today&&p.stage!=="dead");
  const needsAttention = [...PROSPECTS.filter(isOverdue),...pipeline.filter(p=>isStale(p)&&!isOverdue(p))];
  const pipelineVal = pipeline.reduce((s,p)=>s+(p.initialInvestment||0),0);
  const commitVal = pipeline.filter(p=>["soft_commit","commitment_processing","kyc_docs"].includes(p.stage)).reduce((s,p)=>s+(p.committedAmount||p.initialInvestment||0),0);
  const fundedVal = FUNDED.reduce((s,f)=>s+f.amount,0);
  const growthVal = FUNDED.filter(f=>f.track==="grow").reduce((s,f)=>s+(f.target||0),0);
  const totalOpp = pipeline.reduce((s,p)=>s+(p.growthTarget||0),0);

  const openRecord = (p) => { setSelectedId(p.id); setScreen("record"); setLogging(false); setTlFilter("all"); setLogText(""); setLogNext(""); setLogNextDate(""); };

  const getList = () => {
    if(stageFilter) return PROSPECTS.filter(p=>p.stage===stageFilter);
    if(section==="today") return dueToday;
    if(section==="attention") return needsAttention;
    if(section==="all") return pipeline;
    if(section==="nurture") return PROSPECTS.filter(p=>p.stage==="nurture");
    return dueToday;
  };

  const lb = { fontSize:10,fontWeight:500,letterSpacing:0.5,color:"#BBB",textTransform:"uppercase",marginBottom:6 };
  const inputS = { width:"100%",padding:"9px 11px",border:"1.5px solid #E8E8E8",borderRadius:7,fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",color:"#1A1A1A",boxSizing:"border-box" };

  const Row = ({ p, i, total }) => {
    const ov=isOverdue(p); const st=isStale(p);
    return (
      <div onClick={()=>openRecord(p)} style={{ padding:"13px 18px",cursor:"pointer",borderBottom:i<total-1?"1px solid #F3F3F3":"none" }}
        onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{fontSize:14,fontWeight:500,color:"#1A1A1A"}}>{p.name}</span>
              {(ov||st)&&<div style={{width:6,height:6,borderRadius:"50%",background:"#E25C3E"}}/>}
              {p.source?.startsWith("Ken")&&<span style={{fontSize:8,fontWeight:600,color:"#7C6BBB",background:"#F3F0FF",padding:"1px 5px",borderRadius:3}}>KEN</span>}
            </div>
            <div style={{fontSize:12,color:"#999",marginTop:2}}>{p.company}</div>
            {p.nextAction&&<div style={{fontSize:12,marginTop:4,color:ov?"#E25C3E":"#666"}}>{ov?"Overdue: ":""}{st&&!ov?`Stale (${p.daysIdle}d): `:""}{p.nextAction}</div>}
          </div>
          <div style={{textAlign:"right",flexShrink:0,marginLeft:14}}>
            {p.initialInvestment&&<div style={{fontSize:14,fontWeight:600,color:"#1A1A1A"}}>{fmt(p.initialInvestment)}</div>}
            {p.growthTarget&&p.growthTarget!==p.initialInvestment&&<div style={{fontSize:11,color:"#34A853",marginTop:1}}>{fmt(p.growthTarget)} pot.</div>}
            <div style={{fontSize:10,fontWeight:600,letterSpacing:0.4,color:"#999",textTransform:"uppercase",marginTop:2}}>{STAGES.find(s=>s.key===p.stage)?.label||p.stage}</div>
          </div>
        </div>
      </div>
    );
  };

  const prospectTL = selected ? TIMELINE.filter(a=>a.prospect===selected.name).filter(a=>tlFilter==="all"||a.type===tlFilter) : [];

  return (
    <div style={{ fontFamily:"'SF Pro Display','Inter',-apple-system,system-ui,sans-serif", display:"flex", minHeight:"100vh", background:"#FAFAFA" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes fadeIn{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}input:focus,select:focus,textarea:focus{border-color:#1A1A1A!important}*{scrollbar-width:thin;scrollbar-color:#E0E0E0 transparent}`}</style>

      {/* SIDEBAR */}
      <div style={{width:170,background:"#fff",borderRight:"1px solid #E8E8E8",padding:"18px 0",flexShrink:0,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"0 14px 14px",borderBottom:"1px solid #F3F3F3",marginBottom:6}}>
          <div style={{fontSize:9,fontWeight:500,letterSpacing:1.5,color:"#999",textTransform:"uppercase"}}>OwnEZ Capital</div>
          <div style={{fontSize:14,fontWeight:600,color:"#1A1A1A",marginTop:2}}>KeyEZ</div>
        </div>
        {[
          {key:"dashboard",icon:"⊞",label:"Pipeline"},
          {key:"record",icon:"◉",label:"Prospect Record"},
          {key:"new",icon:"+",label:"New Prospect"},
          {key:"review",icon:"⟳",label:"Monday Review"},
          {key:"leadership",icon:"◈",label:"Leadership"},

          {key:"reports",icon:"▤",label:"Reports"},
        ].map(n=>(
          <button key={n.key} onClick={()=>{setScreen(n.key);if(n.key==="dashboard"){setSection("today");setStageFilter(null);}}}
            style={{display:"flex",alignItems:"center",gap:7,padding:"6px 14px",border:"none",background:screen===n.key?"#F5F5F5":"transparent",cursor:"pointer",width:"100%",textAlign:"left",fontSize:11,fontWeight:500,color:screen===n.key?"#1A1A1A":"#999",fontFamily:"inherit"}}>
            <span style={{fontSize:12,width:16,textAlign:"center"}}>{n.icon}</span>{n.label}
          </button>
        ))}
        <div style={{marginTop:"auto",padding:"8px 14px",borderTop:"1px solid #F3F3F3"}}><div style={{fontSize:9,color:"#CCC"}}>Chad Cormier</div></div>
      </div>

      <div style={{flex:1,overflow:"auto"}}>

        {/* ═══════════ DASHBOARD ═══════════ */}
        {screen==="dashboard"&&(
          <div style={{padding:"22px 32px",maxWidth:1200}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontSize:18,fontWeight:600,color:"#1A1A1A"}}>Investor Pipeline</div>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                {needsAttention.length>0&&<div onClick={()=>{setSection("attention");setStageFilter(null)}} style={{fontSize:11,fontWeight:500,color:"#E25C3E",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:"#E25C3E",animation:"pulse 2s infinite"}}/>{needsAttention.length} need attention</div>}
                <div style={{width:220}}><Search onSelect={openRecord} placeholder="Jump to prospect..." /></div>
              </div>
            </div>

            {/* Metrics */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:1,background:"#E8E8E8",borderRadius:10,overflow:"hidden",marginBottom:20}}>
              {[{l:"Pipeline",v:fmt(pipelineVal),d:`${pipeline.length} active`},{l:"Opportunity",v:fmt(totalOpp),d:"growth targets"},{l:"Committed",v:fmt(commitVal),d:`${pipeline.filter(p=>["soft_commit","commitment_processing","kyc_docs"].includes(p.stage)).length} advancing`},{l:"Funded YTD",v:fmt(fundedVal),d:`${FUNDED.length} investors`},{l:"Growth",v:fmt(growthVal),d:"post-close"}].map((m,i)=>(
                <div key={i} style={{background:"#fff",padding:"14px 16px"}}><div style={{fontSize:9,fontWeight:500,letterSpacing:0.5,color:"#999",textTransform:"uppercase"}}>{m.l}</div><div style={{fontSize:22,fontWeight:600,color:"#1A1A1A",marginTop:3,letterSpacing:-0.5}}>{m.v}</div><div style={{fontSize:10,color:"#CCC",marginTop:1}}>{m.d}</div></div>
              ))}
            </div>

            {/* Pipeline bars */}
            <div style={{background:"#fff",borderRadius:10,padding:"14px 16px",marginBottom:20,border:"1px solid #EFEFEF"}}>
              <div style={{display:"flex",gap:3}}>
                {STAGES.map(stage=>{const ps=PROSPECTS.filter(p=>p.stage===stage.key);const c=ps.length;const v=ps.reduce((s,p)=>s+(p.initialInvestment||0),0);const att=ps.some(p=>isOverdue(p)||isStale(p));const w=c>0?Math.max(v||60000,60000):35000;const act=stageFilter===stage.key;
                  return(<div key={stage.key} onClick={()=>{setStageFilter(stageFilter===stage.key?null:stage.key);setSection(null)}} style={{flex:w,minWidth:44,cursor:"pointer"}}><div style={{height:40,borderRadius:7,background:act?"#1A1A1A":(c===0?"#F7F7F7":(att?"#FEF2F0":"#F4F4F4")),border:act?"1.5px solid #1A1A1A":(att&&c>0?"1.5px solid #EAC8C0":"1.5px solid #E8E8E8"),display:"flex",alignItems:"center",justifyContent:"center",gap:4,transition:"all 0.15s"}}><span style={{fontSize:16,fontWeight:600,color:act?"#fff":(c===0?"#D5D5D5":(att?"#E25C3E":"#1A1A1A"))}}>{c}</span>{v>0&&<span style={{fontSize:9,fontWeight:500,color:act?"rgba(255,255,255,0.5)":(att?"#D4836F":"#B0B0B0")}}>{fmt(v)}</span>}</div><div style={{fontSize:8,fontWeight:500,color:act?"#1A1A1A":"#999",textAlign:"center",marginTop:4}}>{stage.label}</div></div>);
                })}
              </div>
            </div>

            {/* Tabs */}
            <div style={{display:"flex",gap:3,marginBottom:10,flexWrap:"wrap"}}>
              {[{k:"today",l:`Today (${dueToday.length})`},{k:"attention",l:`Attention (${needsAttention.length})`,red:needsAttention.length>0},{k:"all",l:"All"},{k:"funded",l:`Funded (${FUNDED.length})`},{k:"nurture",l:"Nurture"}].map(t=>(
                <button key={t.k} onClick={()=>{setSection(t.k);setStageFilter(null)}} style={{padding:"4px 10px",fontSize:11,fontWeight:500,border:"none",borderRadius:5,cursor:"pointer",background:(section===t.k&&!stageFilter)?"#1A1A1A":"transparent",color:(section===t.k&&!stageFilter)?"#fff":(t.red?"#E25C3E":"#999"),fontFamily:"inherit"}}>{t.l}</button>
              ))}
              {stageFilter&&<span style={{fontSize:11,fontWeight:600,color:"#1A1A1A",marginLeft:8,display:"flex",alignItems:"center",gap:4}}>{STAGES.find(s=>s.key===stageFilter)?.label}<button onClick={()=>{setStageFilter(null);setSection("today")}} style={{background:"none",border:"none",color:"#CCC",cursor:"pointer",fontSize:12}}>×</button></span>}
            </div>

            <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",overflow:"hidden"}}>
              {section==="funded"&&!stageFilter?FUNDED.map((f,i)=>(
                <div key={f.id} style={{padding:"13px 18px",borderBottom:i<FUNDED.length-1?"1px solid #F3F3F3":"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:14,fontWeight:500,color:"#1A1A1A"}}>{f.name}</div><div style={{fontSize:12,color:"#999"}}>{f.company}</div></div>
                  <div style={{display:"flex",alignItems:"center",gap:14}}><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:600}}>{fmt(f.amount)}</div>{f.track==="grow"&&f.target&&<div style={{fontSize:11,color:"#34A853"}}>+{fmt(f.target)}</div>}</div><div style={{fontSize:9,fontWeight:600,letterSpacing:0.4,textTransform:"uppercase",color:f.track==="grow"?"#34A853":"#999",background:f.track==="grow"?"#F0FAF2":"#F5F5F5",padding:"3px 6px",borderRadius:3}}>{f.track}</div></div>
                </div>
              )):section==="nurture"&&!stageFilter?(()=>{const ns=PROSPECTS.filter(p=>p.stage==="nurture").sort((a,b)=>(a.nextDate||"").localeCompare(b.nextDate||""));if(!ns.length)return<div style={{padding:32,textAlign:"center",color:"#CCC",fontSize:13}}>No one in nurture</div>;const months={};ns.forEach(p=>{const m=p.nextDate?p.nextDate.slice(0,7):"No date";if(!months[m])months[m]=[];months[m].push(p);});return Object.entries(months).map(([mo,ps])=>(<div key={mo}><div style={{padding:"10px 18px 4px",fontSize:11,fontWeight:600,color:"#999",letterSpacing:0.3}}>{mo==="No date"?"No re-engagement date":new Date(mo+"-01T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"})}</div>{ps.map((p,i)=><Row key={p.id} p={p} i={i} total={ps.length}/>)}</div>));})():(()=>{const list=getList();if(!list.length)return<div style={{padding:32,textAlign:"center",color:"#CCC",fontSize:13}}>Nothing here</div>;return list.map((p,i)=><Row key={p.id} p={p} i={i} total={list.length}/>);})()}
            </div>
          </div>
        )}

        {/* ═══════════ PROSPECT RECORD — THE CENTER OF GRAVITY ═══════════ */}
        {screen==="record"&&!selected&&(
          <div style={{padding:"22px 32px",maxWidth:500}}>
            <div style={{fontSize:18,fontWeight:600,color:"#1A1A1A",marginBottom:4}}>Prospect Record</div>
            <div style={{fontSize:13,color:"#999",marginBottom:16}}>Start typing to find anyone</div>
            <Search onSelect={openRecord} autoFocus placeholder="Name, company..." />
            <div style={{marginTop:22}}>
              <div style={{...lb,marginBottom:10}}>Recent prospects</div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",overflow:"hidden"}}>
                {PROSPECTS.filter(p=>!["dead"].includes(p.stage)).slice(0,6).map((p,i,arr)=><Row key={p.id} p={p} i={i} total={arr.length}/>)}
              </div>
            </div>
          </div>
        )}

        {screen==="record"&&selected&&(
          <div style={{padding:"22px 32px",maxWidth:1100,animation:"fadeIn 0.2s ease-out"}}>
            {/* Top: back + search */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <button onClick={()=>setScreen("dashboard")} style={{background:"none",border:"none",fontSize:12,color:"#999",cursor:"pointer",fontFamily:"inherit"}}>← Pipeline</button>
              <div style={{width:240}}><Search onSelect={openRecord} placeholder="Jump to another..." /></div>
            </div>

            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22}}>
              <div>
                <div style={{fontSize:24,fontWeight:600,color:"#1A1A1A"}}>{selected.name}</div>
                <div style={{fontSize:13,color:"#999",marginTop:2}}>{selected.company}</div>
                <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                  <div style={{fontSize:10,fontWeight:600,letterSpacing:0.6,textTransform:"uppercase",color:"#1A1A1A",background:"#F0F0F0",padding:"3px 9px",borderRadius:4}}>{STAGES.find(s=>s.key===selected.stage)?.label||selected.stage}</div>
                  {selected.stage==="kyc_docs"&&<div style={{fontSize:10,fontWeight:600,color:"#7C6BBB",background:"#F3F0FF",padding:"3px 8px",borderRadius:4}}>IN AGORA</div>}
                  {selected.source?.startsWith("Ken")&&<div style={{fontSize:10,fontWeight:600,color:"#7C6BBB",background:"#F3F0FF",padding:"3px 8px",borderRadius:4}}>KEN</div>}
                  {selected.lostReason&&<div style={{fontSize:10,fontWeight:600,color:"#E25C3E",background:"#FEF2F0",padding:"3px 8px",borderRadius:4}}>{selected.lostReason}</div>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                {selected.initialInvestment&&<div style={{fontSize:24,fontWeight:600,color:"#1A1A1A"}}>{fmt(selected.initialInvestment)}</div>}
                {selected.growthTarget&&<div style={{fontSize:12,color:"#34A853",marginTop:2}}>{fmt(selected.growthTarget)} opportunity</div>}
                {selected.committedAmount&&<div style={{fontSize:11,color:"#666",marginTop:1}}>Committed: {fmt(selected.committedAmount)}</div>}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:22}}>
              {/* ── LEFT: Profile ── */}
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {/* Next Action card */}
                {selected.nextAction&&(
                  <div style={{background:isOverdue(selected)?"#FEF8F6":"#fff",borderRadius:10,border:isOverdue(selected)?"1px solid #F0D0C8":"1px solid #EFEFEF",padding:"14px 16px"}}>
                    <div style={lb}>Next action</div>
                    <div style={{fontSize:13,color:"#1A1A1A",fontWeight:500,lineHeight:1.4}}>{selected.nextAction}</div>
                    {selected.nextDate&&<div style={{fontSize:11,marginTop:4,color:selected.nextDate<today?"#E25C3E":"#999",fontWeight:selected.nextDate<today?600:400}}>{selected.nextDate<today?"OVERDUE — ":""}{selected.nextDate}</div>}
                  </div>
                )}
                {/* Contact */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}>
                  <div style={lb}>Contact</div>
                  {[{l:"Email",v:selected.email},{l:"Phone",v:selected.phone},{l:"Source",v:selected.source},{l:"Rep",v:selected.rep}].map((f,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:i<3?"1px solid #F7F7F7":"none"}}>
                      <span style={{fontSize:10,color:"#CCC"}}>{f.l}</span>
                      <span style={{fontSize:12,color:f.v?"#1A1A1A":"#DDD",fontWeight:f.v?500:400}}>{f.v||"\u2014"}</span>
                    </div>
                  ))}
                </div>
                {/* Engagement */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}>
                  <div style={lb}>Engagement</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:2}}>
                    <div><div style={{fontSize:9,color:"#CCC"}}>Touches</div><div style={{fontSize:17,fontWeight:600,color:"#1A1A1A",marginTop:1}}>{selected.touches}</div></div>
                    <div><div style={{fontSize:9,color:"#CCC"}}>Idle</div><div style={{fontSize:17,fontWeight:600,color:isStale(selected)?"#E25C3E":"#1A1A1A",marginTop:1}}>{selected.daysIdle!=null?`${selected.daysIdle}d`:"New"}</div></div>
                    <div><div style={{fontSize:9,color:"#CCC"}}>Threshold</div><div style={{fontSize:17,fontWeight:600,color:"#1A1A1A",marginTop:1}}>{STAGES.find(s=>s.key===selected.stage)?.threshold?`${STAGES.find(s=>s.key===selected.stage).threshold}d`:"\u2014"}</div></div>
                  </div>
                </div>
                {/* Stage Journey */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}>
                  <div style={lb}>Stage journey</div>
                  {(selected.stageHistory||[]).map((h,i,arr)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"5px 0"}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:14}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:i===arr.length-1?"#1A1A1A":"#DDD",flexShrink:0,marginTop:2}}/>
                        {i<arr.length-1&&<div style={{width:1,flex:1,background:"#ECECEC",marginTop:2}}/>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:i===arr.length-1?600:400,color:"#1A1A1A"}}>{h.stage}</div>
                        {h.note&&<div style={{fontSize:10,color:"#BBB",marginTop:1}}>{h.note}</div>}
                      </div>
                      <div style={{fontSize:10,color:"#CCC",flexShrink:0}}>{h.date.slice(5)}</div>
                    </div>
                  ))}
                </div>
                {/* Notes */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}>
                  <div style={lb}>Notes</div>
                  <div style={{fontSize:12,color:"#666",lineHeight:1.6}}>{selected.notes}</div>
                </div>
              </div>

              {/* ── RIGHT: Timeline (THE RECORD) ── */}
              <div>
                {/* Quick Log + Filters */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{display:"flex",gap:2}}>
                    {[{k:"all",l:"All"},{k:"email",l:"✉ Email"},{k:"call",l:"📞 Call"},{k:"meeting",l:"🤝 Meeting"},{k:"stage",l:"→ Stage"}].map(f=>(
                      <button key={f.k} onClick={()=>setTlFilter(f.k)} style={{padding:"3px 8px",fontSize:10,fontWeight:500,border:"none",borderRadius:4,cursor:"pointer",background:tlFilter===f.k?"#1A1A1A":"transparent",color:tlFilter===f.k?"#fff":"#999",fontFamily:"inherit"}}>{f.l}</button>
                    ))}
                  </div>
                  <button onClick={()=>setLogging(!logging)} style={{fontSize:11,fontWeight:600,color:"#fff",background:logging?"#999":"#1A1A1A",border:"none",padding:"5px 14px",borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>{logging?"Cancel":"+ Quick Log"}</button>
                </div>

                {/* Inline Log Form */}
                {logging&&(
                  <div style={{background:"#FAFAFA",borderRadius:10,border:"1.5px solid #E8E8E8",padding:"14px 16px",marginBottom:14,animation:"fadeIn 0.15s ease-out"}}>
                    <div style={{display:"flex",gap:3,marginBottom:10}}>
                      {[{k:"call",l:"📞 Call"},{k:"email",l:"✉️ Email"},{k:"meeting",l:"🤝 Meeting"},{k:"note",l:"📝 Note"}].map(t=>(
                        <button key={t.k} onClick={()=>setLogType(t.k)} style={{flex:1,padding:"7px",border:logType===t.k?"1.5px solid #1A1A1A":"1.5px solid #E8E8E8",borderRadius:6,background:logType===t.k?"#F0F0F0":"#fff",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:logType===t.k?600:400}}>{t.l}</button>
                      ))}
                    </div>
                    <textarea value={logText} onChange={e=>setLogText(e.target.value)} placeholder="What happened? Key takeaways, details..." rows={3}
                      style={{...inputS,resize:"vertical",marginBottom:8}} autoFocus />
                    <div style={{background:"#F0F0FF",borderRadius:6,padding:"10px 12px",marginBottom:10,border:"1px solid #E8E8F0"}}>
                      <div style={{fontSize:9,fontWeight:500,color:"#999",letterSpacing:0.5,textTransform:"uppercase",marginBottom:5}}>Set next action</div>
                      <input value={logNext} onChange={e=>setLogNext(e.target.value)} placeholder="What's the next thing to do?" style={{...inputS,marginBottom:5,fontSize:12,padding:"7px 10px"}} />
                      <input type="date" value={logNextDate} onChange={e=>setLogNextDate(e.target.value)} style={{...inputS,fontSize:12,padding:"7px 10px"}} />
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button style={{padding:"7px 18px",background:"#1A1A1A",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer"}}>Save</button>
                      <label style={{fontSize:11,color:"#999",display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}><span>📎</span> Attach file</label>
                    </div>
                  </div>
                )}

                {/* THE TIMELINE — complete record of everything */}
                <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",overflow:"hidden"}}>
                  {prospectTL.length===0?(
                    <div style={{padding:32,textAlign:"center",color:"#CCC",fontSize:13}}>No activity{tlFilter!=="all"?" for this filter":""}</div>
                  ):prospectTL.map((a,i)=>(
                    <div key={i} style={{padding:"13px 16px",borderBottom:i<prospectTL.length-1?"1px solid #F5F5F5":"none",animation:`fadeIn 0.12s ease-out ${i*0.02}s both`}}>
                      <div style={{display:"flex",gap:10}}>
                        {/* Date + icon */}
                        <div style={{width:52,flexShrink:0}}>
                          <div style={{fontSize:11,color:"#CCC",fontWeight:500}}>{a.date.slice(5)}</div>
                          <div style={{fontSize:9,color:"#DDD"}}>{a.time}</div>
                        </div>
                        <div style={{width:3,borderRadius:2,background:typeColor[a.type]||"#E0E0E0",flexShrink:0}}/>
                        {/* Content */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:10,fontWeight:600,color:typeColor[a.type]||"#999",letterSpacing:0.3,textTransform:"uppercase",marginBottom:3}}>
                            {a.type==="email"?"Email":a.type==="call"?"Call":a.type==="meeting"?"Meeting":a.type==="stage"?"Stage Change":a.type==="note"?"Note":"Activity"}
                          </div>
                          <div style={{fontSize:13,color:"#333",lineHeight:1.55}}>{a.detail}</div>
                          {/* Documents */}
                          {a.docs&&a.docs.length>0&&(
                            <div style={{marginTop:6,display:"flex",gap:5,flexWrap:"wrap"}}>
                              {a.docs.map((d,j)=>(
                                <div key={j} style={{fontSize:11,color:"#666",background:"#F5F5F5",padding:"3px 8px",borderRadius:4,display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}
                                  onMouseEnter={e=>e.currentTarget.style.background="#ECECEC"} onMouseLeave={e=>e.currentTarget.style.background="#F5F5F5"}>
                                  <span style={{fontSize:10}}>📎</span>{d}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ NEW PROSPECT ═══════════ */}
        {screen==="new"&&(
          <div style={{padding:"22px 32px",maxWidth:520,animation:"fadeIn 0.2s ease-out"}}>
            <div style={{fontSize:18,fontWeight:600,color:"#1A1A1A",marginBottom:18}}>New Prospect</div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"20px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><div style={{...lb,display:"block"}}>Full Name *</div><input style={inputS} placeholder="First Last" /></div>
                <div><div style={{...lb,display:"block"}}>Company *</div><input style={inputS} placeholder="Company / Entity" /></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><div style={{...lb,display:"block"}}>Email</div><input type="email" style={inputS} placeholder="email@co.com" /></div>
                <div><div style={{...lb,display:"block"}}>Phone</div><input style={inputS} placeholder="(214) 555-0000" /></div>
              </div>
              <div style={{marginBottom:12}}><div style={{...lb,display:"block"}}>Lead Source *</div><select style={inputS}><option value="">Select...</option>{SOURCES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><div style={{...lb,display:"block"}}>Initial Investment</div><input style={inputS} placeholder="$250,000" /></div>
                <div><div style={{...lb,display:"block"}}>Growth Target</div><input style={inputS} placeholder="$750,000" /></div>
              </div>
              <div style={{marginBottom:12}}><div style={{...lb,display:"block"}}>Notes *</div><textarea rows={3} style={{...inputS,resize:"vertical"}} placeholder="Context — how you met, relevance..." /></div>
              <div style={{background:"#F0F0FF",borderRadius:8,padding:"12px 14px",border:"1px solid #E8E8F0",marginBottom:14}}>
                <div style={{...lb,display:"block"}}>First action</div>
                <input style={{...inputS,marginBottom:5}} placeholder="Next thing to do..." />
                <input type="date" style={inputS} />
              </div>
              <button style={{padding:"9px 22px",background:"#1A1A1A",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer"}}>Create Prospect</button>
            </div>
          </div>
        )}

        {/* ═══════════ MONDAY REVIEW ═══════════ */}
        {screen==="review"&&(
          <div style={{padding:"22px 32px",maxWidth:1000,animation:"fadeIn 0.2s ease-out"}}>
            <div style={{fontSize:18,fontWeight:600,color:"#1A1A1A",marginBottom:2}}>Monday Team Review</div>
            <div style={{fontSize:12,color:"#999",marginBottom:20}}>Week of Feb 24, 2026</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:20}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}><div style={lb}>Movements</div>{[{n:"Sandra Kim",f:"Engaged",t:"Committed",a:"$250K"},{n:"James Whitfield",f:"Committed",t:"Processing",a:"$500K"},{n:"Angela Torres",f:"Processing",t:"KYC",a:"$350K"}].map((m,i)=>(<div key={i} style={{padding:"6px 0",borderBottom:"1px solid #F7F7F7"}}><div style={{fontSize:12,fontWeight:500,color:"#1A1A1A"}}>{m.n}</div><div style={{fontSize:11,color:"#999"}}>{m.f} → <span style={{color:"#34A853",fontWeight:500}}>{m.t}</span></div><div style={{fontSize:10,color:"#CCC"}}>{m.a}</div></div>))}</div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}><div style={lb}>Activity</div>{[{t:"Emails",c:8},{t:"Calls",c:5},{t:"Meetings",c:3}].map((a,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #F7F7F7"}}><span style={{fontSize:12,color:"#666"}}>{a.t}</span><span style={{fontSize:13,fontWeight:600}}>{a.c}</span></div>))}<div style={{display:"flex",justifyContent:"space-between",paddingTop:8}}><span style={{fontSize:12,fontWeight:600}}>Total</span><span style={{fontSize:15,fontWeight:600}}>16</span></div></div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}><div style={lb}>Needs discussion</div>{needsAttention.map(p=>(<div key={p.id} onClick={()=>openRecord(p)} style={{padding:"6px 0",borderBottom:"1px solid #F7F7F7",cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:5,height:5,borderRadius:"50%",background:"#E25C3E"}}/><span style={{fontSize:12,fontWeight:500,color:"#1A1A1A"}}>{p.name}</span></div><div style={{fontSize:10,color:"#E25C3E"}}>{isOverdue(p)?"Overdue":`${p.daysIdle}d idle`}</div></div>))}{needsAttention.length===0&&<div style={{fontSize:11,color:"#34A853"}}>All clear</div>}</div>
            </div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}><div style={lb}>Discussion questions</div><div style={{fontSize:12,color:"#666",lineHeight:1.8,marginTop:4}}><div>1. What moved? What should have but didn't?</div><div>2. Who's closest to committing? What do they need?</div><div>3. Anyone moving to Nurture or Dead?</div><div>4. What does Ken have coming this week?</div></div></div>
          </div>
        )}

        {/* ═══════════ LEADERSHIP ═══════════ */}
        {screen==="leadership"&&(
          <div style={{padding:"22px 32px",maxWidth:1000,animation:"fadeIn 0.2s ease-out"}}>
            <div style={{fontSize:18,fontWeight:600,color:"#1A1A1A",marginBottom:20}}>Leadership View</div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"16px 18px",marginBottom:16}}>
              <div style={lb}>AUM toward $105M</div>
              <div style={{display:"flex",alignItems:"center",gap:16,marginTop:6}}>
                <div style={{flex:1}}><div style={{width:"100%",background:"#F0F0F0",borderRadius:6,height:22,overflow:"hidden"}}><div style={{background:"#1A1A1A",height:22,borderRadius:6,width:`${((60e6+fundedVal)/105e6)*100}%`,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8}}><span style={{fontSize:10,fontWeight:600,color:"#fff"}}>{fmt(60e6+fundedVal)}</span></div></div><div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#CCC",marginTop:2}}><span>$60M</span><span>$105M</span></div></div>
                <div style={{fontSize:26,fontWeight:600,color:"#1A1A1A"}}>{(((60e6+fundedVal)/105e6)*100).toFixed(1)}%</div>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}><div style={lb}>Funnel</div>{STAGES.map(s=>{const c=PROSPECTS.filter(p=>p.stage===s.key).length+(s.key==="funded"?FUNDED.length:0);return(<div key={s.key} style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}><div style={{width:62,fontSize:10,color:"#999",textAlign:"right"}}>{s.label}</div><div style={{flex:1,background:"#F5F5F5",borderRadius:3,height:16,overflow:"hidden"}}><div style={{background:"#1A1A1A",height:16,borderRadius:3,width:`${Math.max((c/Math.max(PROSPECTS.length,1))*100,c>0?5:0)}%`,display:"flex",alignItems:"center",paddingLeft:4}}>{c>0&&<span style={{fontSize:9,fontWeight:600,color:"#fff"}}>{c}</span>}</div></div></div>);})}</div>
              <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}><div style={lb}>Source attribution</div>{Object.entries([...PROSPECTS,...FUNDED].reduce((a,p)=>{const s=p.source||"Unknown";if(!a[s])a[s]={c:0,v:0};a[s].c++;a[s].v+=(p.amount||p.initialInvestment||0);return a;},{})).sort((a,b)=>b[1].v-a[1].v).map(([src,d],i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #F7F7F7"}}><span style={{fontSize:11,color:"#1A1A1A"}}>{src}</span><div style={{display:"flex",gap:10}}><span style={{fontSize:10,color:"#999"}}>{d.c}</span><span style={{fontSize:11,fontWeight:600,minWidth:46,textAlign:"right"}}>{fmt(d.v)}</span></div></div>))}</div>
            </div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}><div style={lb}>Red flags</div>{needsAttention.length>0?needsAttention.map(p=>(<div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #F7F7F7"}}><div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:5,height:5,borderRadius:"50%",background:"#E25C3E"}}/><span style={{fontSize:11,color:"#1A1A1A"}}>{p.name}</span></div><span style={{fontSize:10,color:"#E25C3E"}}>{isOverdue(p)?"Overdue":`${p.daysIdle}d idle`}</span></div>)):<div style={{fontSize:11,color:"#34A853",marginTop:4}}>Pipeline healthy</div>}</div>
          </div>
        )}

        {/* ═══════════ REPORTS ═══════════ */}
        {screen==="reports"&&(
          <div style={{padding:"22px 32px",maxWidth:1100,animation:"fadeIn 0.2s ease-out"}}>
            <div style={{fontSize:18,fontWeight:600,color:"#1A1A1A",marginBottom:20}}>Reports</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
              {[{t:"Pipeline Summary",d:"All prospects by stage, amounts, status.",r:pipeline.length},{t:"Activity Log",d:"Full history — filterable by date, type.",r:TIMELINE.length},{t:"Funded Investors",d:"Post-close track, amounts, touchpoints.",r:FUNDED.length},{t:"Lost Analysis",d:"Dead prospects with reason codes.",r:PROSPECTS.filter(p=>p.stage==="dead").length}].map((r,i)=>(
                <div key={i} style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",padding:"14px 16px"}}><div style={{fontSize:12,fontWeight:600,color:"#1A1A1A"}}>{r.t}</div><div style={{fontSize:11,color:"#999",marginTop:2}}>{r.d}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:8,borderTop:"1px solid #F3F3F3"}}><span style={{fontSize:10,color:"#CCC"}}>{r.r} records</span><button style={{fontSize:10,fontWeight:600,color:"#1A1A1A",background:"#F0F0F0",border:"none",padding:"4px 10px",borderRadius:4,cursor:"pointer",fontFamily:"inherit"}}>Export</button></div></div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #EFEFEF",overflow:"hidden"}}>
              <div style={{padding:"10px 16px",borderBottom:"1px solid #F3F3F3"}}><span style={{fontSize:12,fontWeight:600,color:"#1A1A1A"}}>Pipeline Detail</span></div>
              <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}><thead><tr style={{background:"#F8F8F8"}}>{["Name","Company","Stage","Initial","Growth","Source","Touches","Idle","Next Action"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",fontWeight:600,color:"#999",fontSize:9,textTransform:"uppercase"}}>{h}</th>)}</tr></thead><tbody>{pipeline.map(p=><tr key={p.id} onClick={()=>openRecord(p)} style={{borderBottom:"1px solid #F3F3F3",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="#FAFAFA"} onMouseLeave={e=>e.currentTarget.style.background=""}><td style={{padding:"6px 10px",fontWeight:500,color:"#1A1A1A"}}>{p.name}</td><td style={{padding:"6px 10px",color:"#999"}}>{p.company}</td><td style={{padding:"6px 10px"}}><span style={{fontSize:9,fontWeight:600,background:"#F0F0F0",padding:"2px 5px",borderRadius:3}}>{STAGES.find(s=>s.key===p.stage)?.label}</span></td><td style={{padding:"6px 10px",fontWeight:500}}>{fmt(p.initialInvestment)}</td><td style={{padding:"6px 10px",color:"#34A853"}}>{fmt(p.growthTarget)}</td><td style={{padding:"6px 10px",color:"#999"}}>{p.source}</td><td style={{padding:"6px 10px",textAlign:"center"}}>{p.touches}</td><td style={{padding:"6px 10px",textAlign:"center",color:isStale(p)?"#E25C3E":"#1A1A1A"}}>{p.daysIdle??"\u2014"}</td><td style={{padding:"6px 10px",color:"#666",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nextAction||"\u2014"}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
