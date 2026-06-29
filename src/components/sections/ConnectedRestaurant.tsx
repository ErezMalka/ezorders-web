"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type NodeId =
    | "website"
  | "app"
  | "kiosk"
  | "pos"
  | "kitchen"
  | "kds"
  | "credit"
  | "wolt"
  | "tenbis"
  | "cibus"
  | "haat"
  | "loyalty"
  | "ai"
  | "reports";

type NodeDef = {
    id: NodeId;
    label: string;
    x: number;
    y: number;
    group: "channel" | "core" | "delivery" | "growth";
    connects: NodeId[];
};

const NODES: NodeDef[] = [
  { id: "website", label: "אתר הזמנות", x: 175, y: 95, group: "channel", connects: ["pos", "kitchen", "credit", "loyalty", "reports"] },
  { id: "app", label: "אפליקציה", x: 360, y: 70, group: "channel", connects: ["pos", "kitchen", "credit", "loyalty", "reports"] },
  { id: "kiosk", label: "קיוסק", x: 545, y: 95, group: "channel", connects: ["pos", "kitchen", "kds", "credit", "loyalty", "reports", "ai"] },
  { id: "pos", label: "קופה", x: 500, y: 300, group: "core", connects: ["website", "app", "kiosk", "kitchen", "kds", "credit", "loyalty", "reports", "ai", "wolt", "tenbis", "cibus", "haat"] },
  { id: "kitchen", label: "מטבח", x: 720, y: 250, group: "core", connects: ["pos", "kds", "kiosk", "website", "app", "wolt", "tenbis", "haat"] },
  { id: "kds", label: "KDS", x: 760, y: 410, group: "core", connects: ["kitchen", "pos", "kiosk", "reports", "ai"] },
  { id: "credit", label: "מסוף אשראי", x: 280, y: 300, group: "core", connects: ["pos", "website", "app", "kiosk", "reports"] },
  { id: "wolt", label: "וולט", x: 120, y: 470, group: "delivery", connects: ["pos", "kitchen", "reports"] },
  { id: "tenbis", label: "תן ביס", x: 300, y: 520, group: "delivery", connects: ["pos", "kitchen", "reports"] },
  { id: "cibus", label: "סיבוס", x: 490, y: 540, group: "delivery", connects: ["pos", "reports"] },
  { id: "haat", label: "HAAT", x: 670, y: 540, group: "delivery", connects: ["pos", "kitchen", "reports"] },
  { id: "loyalty", label: "מועדון לקוחות", x: 250, y: 175, group: "growth", connects: ["pos", "website", "app", "kiosk", "reports", "ai"] },
  { id: "ai", label: "AI", x: 880, y: 175, group: "growth", connects: ["reports", "kds", "pos", "kiosk", "loyalty"] },
  { id: "reports", label: "דוחות", x: 880, y: 330, group: "growth", connects: ["pos", "kds", "credit", "loyalty", "ai", "wolt", "tenbis", "cibus", "haat", "website", "app", "kiosk"] },
  ];

const GROUP_COLOR: Record<NodeDef["group"], string> = {
  channel: "#3B33C8",
  core: "#191D2A",
  delivery: "#F05D86",
  growth: "#0EA5A4",
};

const NODE_W = 132;
const NODE_H = 64;

function buildLinkSet(active: NodeId | null): Set<string> {
  const set = new Set<string>();
  if (!active) return set;
  const node = NODES.find((n) => n.id === active);
  if (!node) return set;
  node.connects.forEach((c) => {
    set.add([active, c].sort().join("__"));
  });
  return set;
}

export function ConnectedRestaurant() {
  const [active, setActive] = useState<NodeId | null>(null);
  const [autoIdx, setAutoIdx] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCycle: NodeId[] = ["kiosk", "pos", "reports", "loyalty", "kitchen"];

useEffect(() => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  setReduceMotion(mq.matches);
  const handler = () => setReduceMotion(mq.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}, []);

useEffect(() => {
  if (interacted || reduceMotion) return;
  idleTimer.current = setInterval(() => {
    setAutoIdx((i) => (i + 1) % autoCycle.length);
  }, 2200);
  return () => {
    if (idleTimer.current) clearInterval(idleTimer.current);
  };
}, [interacted, reduceMotion]);

const effectiveActive: NodeId | null = active ?? (interacted ? null : autoCycle[autoIdx]);
  const linkSet = buildLinkSet(effectiveActive);
  const connectedNodes = new Set<string>(
    effectiveActive ? [effectiveActive, ...(NODES.find((n) => n.id === effectiveActive)?.connects ?? [])] : []
    );

const onEnter = useCallback((id: NodeId) => {
  setInteracted(true);
  setActive(id);
}, []);
  const onLeave = useCallback(() => setActive(null), []);

const links: { a: NodeDef; b: NodeDef; key: string }[] = [];
  const seen = new Set<string>();
  NODES.forEach((n) => {
    n.connects.forEach((cid) => {
      const key = [n.id, cid].sort().join("__");
      if (seen.has(key)) return;
      seen.add(key);
      const b = NODES.find((x) => x.id === cid);
      if (b) links.push({ a: n, b, key });
    });
  });

return (
  <section dir="rtl" className="relative w-full bg-white py-20 md:py-28 font-sans">
  <div className="mx-auto max-w-container px-5">
  <div className="text-center mb-10 md:mb-14">
  <p className="text-brand-pink font-semibold tracking-wide mb-3">פלטפורמה אחת לכל המסעדה</p>p>
  <h2 className="text-brand-dark font-extrabold leading-tight text-4xl md:text-6xl mb-4">המסעדה שלך. מחוברת.</h2>h2>
  <p className="text-brand-muted text-lg md:text-2xl max-w-2xl mx-auto">תראה איך כל חלק במסעדה עובד יחד – ממקום אחד.</p>p>
  </div>div>
  
  <div className="relative rounded-card border border-slate-100 bg-white shadow-[0_20px_60px_-30px_rgba(25,29,42,0.25)] p-3 md:p-6">
  <svg viewBox="0 0 1000 620" className="w-full h-auto select-none" role="img" aria-label="connected restaurant" onMouseLeave={onLeave}>
  <defs>
  <radialGradient id="floorGlow" cx="50%" cy="45%" r="60%">
  <stop offset="0%" stopColor="#F5F6FF" />
  <stop offset="100%" stopColor="#FFFFFF" />
  </radialGradient>radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
  <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#191D2A" floodOpacity="0.10" />
  </filter>filter>
  </defs>defs>
  <rect x="0" y="0" width="1000" height="620" fill="url(#floorGlow)" rx="20" />
  <g strokeLinecap="round" fill="none">
    {links.map(({ a, b, key }) => {
    const isActive = linkSet.has(key);
    const dim = effectiveActive && !isActive;
    return (
      <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isActive ? "#3B33C8" : "#E5E7F0"} strokeWidth={isActive ? 3 : 1.5} style={{ opacity: dim ? 0.18 : isActive ? 1 : 0.55, transition: "all 360ms cubic-bezier(0.22,1,0.36,1)" }} className={isActive && !reduceMotion ? "er-flow" : ""} />
      );
  })}
  </g>g>
  
  <g>
    {NODES.map((n) => {
    const isActive = effectiveActive === n.id;
    const isConnected = connectedNodes.has(n.id);
    const dim = effectiveActive && !isActive && !isConnected;
    const color = GROUP_COLOR[n.group];
    return (
      <g key={n.id} transform={"translate(" + (n.x - NODE_W / 2) + "," + (n.y - NODE_H / 2) + ")"} style={{ cursor: "pointer", opacity: dim ? 0.32 : 1, transition: "opacity 320ms ease" }} onMouseEnter={() => onEnter(n.id)} onClick={() => onEnter(n.id)} tabIndex={0} onFocus={() => onEnter(n.id)} role="button" aria-label={n.label}>
      <rect width={NODE_W} height={NODE_H} rx="16" fill="#FFFFFF" stroke={isActive || isConnected ? color : "#E5E7F0"} strokeWidth={isActive ? 3 : 1.5} filter="url(#soft)" style={{ transition: "stroke 320ms ease" }} />
      <circle cx="26" cy={NODE_H / 2} r="7" fill={color} style={{ opacity: dim ? 0.4 : 1 }} />
      <text x={NODE_W - 18} y={NODE_H / 2 + 6} textAnchor="end" fontSize="20" fontWeight="700" fill="#191D2A">{n.label}</text>text>
      </g>g>
      );
  })}
  </g>g>
  </svg>svg>
  
  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-brand-muted">
  <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: "#3B33C8" }} />ערוצי הזמנה</span>span>
  <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: "#191D2A" }} />תפעול</span>span>
  <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: "#F05D86" }} />משלוחים</span>span>
  <span className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-full" style={{ background: "#0EA5A4" }} />צמיחה ובינה</span>span>
  </div>div>
  <p className="mt-2 text-center text-brand-muted text-sm md:hidden">הקש על כל רכיב כדי לראות את החיבורים</p>p>
  <p className="mt-2 text-center text-brand-muted text-sm hidden md:block">העבר את העכבר מעל כל רכיב כדי לראות את החיבורים</p>p>
  </div>div>
  </div>div>
  <style jsx>{STYLE}</style>style>
  </section>section>
  );
}

const STYLE = ".er-flow{stroke-dasharray:8 10;animation:erflow 1.1s linear infinite}@keyframes erflow{to{stroke-dashoffset:-36}}@media (prefers-reduced-motion:reduce){.er-flow{animation:none}}";
</section>
