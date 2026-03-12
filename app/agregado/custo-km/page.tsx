'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { Save } from 'lucide-react'

// ─── DADOS ────────────────────────────────────────────────────────────────────
type VD = {
  id: string; lbl: string; ico: string
  kmL: number; km: number; vc: number; vr: number
  sal: number; pc: number; pr: number; aet: number
  vidc: number; rpc: number; vidr: number; rpr: number; manut?: number
}
type CD = { id: string; lbl: string; ico: string; sal: number }
type ID = VD & { dim: string }

const VS: VD[] = [
  {id:'auto',lbl:'Automóvel', ico:'🚗',kmL:11.0,km:3000, vc:60000, vr:0,     sal:1800,pc:5, pr:0, aet:0,vidc:60, rpc:.5,vidr:0,  rpr:0     },
  {id:'van', lbl:'Van',       ico:'🚐',kmL:8.0, km:5000, vc:90000, vr:0,     sal:1800,pc:4, pr:0, aet:0,vidc:60, rpc:.5,vidr:0,  rpr:0     },
  {id:'34',  lbl:'3/4',       ico:'🚚',kmL:7.0, km:6000, vc:150000,vr:0,     sal:2200,pc:6, pr:0, aet:0,vidc:72, rpc:.5,vidr:0,  rpr:0     },
  {id:'toco',lbl:'Toco',      ico:'🚛',kmL:4.5, km:7000, vc:200000,vr:80000, sal:2810,pc:7, pr:6, aet:0,vidc:84, rpc:.6,vidr:84, rpr:.6    },
  {id:'tk8', lbl:'Truck 8m',  ico:'🚛',kmL:5.5, km:8200, vc:300000,vr:110000,sal:2810,pc:7, pr:0, aet:0,vidc:96, rpc:.6,vidr:100,rpr:.7344 },
  {id:'tk9', lbl:'Truck 9m',  ico:'🚛',kmL:5.0, km:8200, vc:300000,vr:140000,sal:2810,pc:11,pr:0, aet:0,vidc:96, rpc:.6,vidr:100,rpr:.7344 },
]
const CAVALOS: CD[] = [
  {id:'c4x2',lbl:'Cavalo 4x2',ico:'🚛',sal:2810},
  {id:'c6x2',lbl:'Cavalo 6x2',ico:'🚛',sal:2810},
  {id:'c6x4',lbl:'Cavalo 6x4',ico:'🚛',sal:3000},
]
const IMPL: Record<string,ID[]> = {
  c4x2:[
    {id:'cs12',lbl:'Carga Seca 12m', ico:'🚜',dim:'12m · 25,5t',vc:620000,vr:200000,km:10000,kmL:3.3,sal:2810,pc:7, pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.8062},
    {id:'pr12',lbl:'Prancha 12m',    ico:'🚜',dim:'12m · 22,5t',vc:620000,vr:380000,km:10000,kmL:2.8,sal:2810,pc:7, pr:13,aet:15,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.9862},
    {id:'fr12',lbl:'Frigorífico 12m',ico:'🚜',dim:'12m · 18,0t',vc:620000,vr:280000,km:10000,kmL:3.0,sal:2810,pc:7, pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.9462},
    {id:'si12',lbl:'Sider 12m',      ico:'🚜',dim:'12m · 27,5t',vc:620000,vr:160000,km:10000,kmL:3.2,sal:2810,pc:7, pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.7862},
    {id:'ba12',lbl:'Baú 12m',        ico:'🚜',dim:'12m · 23,5t',vc:620000,vr:180000,km:10000,kmL:3.1,sal:2810,pc:7, pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.8262},
    {id:'gr12',lbl:'Graneleiro 12m', ico:'🚜',dim:'12m · 26,0t',vc:620000,vr:150000,km:10000,kmL:3.2,sal:2810,pc:7, pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.7662},
    {id:'tn12',lbl:'Tanque',         ico:'🚜',dim:'12m · 30,0t',vc:620000,vr:400000,km:10000,kmL:3.0,sal:2810,pc:7, pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.9062},
  ],
  c6x2:[
    {id:'cs15',lbl:'Carga Seca 15m', ico:'🚜',dim:'15m · 30,5t',vc:700000,vr:200000,km:10000,kmL:3.0,sal:2810,pc:11,pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.8862},
    {id:'pr15',lbl:'Prancha 15m',    ico:'🚜',dim:'15m · 26,3t',vc:700000,vr:380000,km:10000,kmL:2.7,sal:2810,pc:11,pr:13,aet:15,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:1.057 },
    {id:'at23',lbl:'Automotiva 23m', ico:'🚜',dim:'23m · 24,8t',vc:700000,vr:400000,km:10000,kmL:2.7,sal:2810,pc:11,pr:13,aet:15,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:1.077 },
    {id:'cg23',lbl:'Cegonha 23m',    ico:'🚜',dim:'23m · 24,8t',vc:700000,vr:400000,km:10000,kmL:2.7,sal:2810,pc:11,pr:13,aet:15,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:1.077 },
    {id:'fr15',lbl:'Frigorífico 15m',ico:'🚜',dim:'15m · 22,0t',vc:700000,vr:320000,km:10000,kmL:2.8,sal:2810,pc:11,pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.9862},
    {id:'si15',lbl:'Sider 15m',      ico:'🚜',dim:'15m · 32,5t',vc:700000,vr:180000,km:10000,kmL:3.0,sal:2810,pc:11,pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.8262},
    {id:'ba15',lbl:'Baú 15m',        ico:'🚜',dim:'15m · 28,0t',vc:700000,vr:200000,km:10000,kmL:2.9,sal:2810,pc:11,pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.8462},
    {id:'gr15',lbl:'Graneleiro 15m', ico:'🚜',dim:'15m · 31,0t',vc:700000,vr:170000,km:10000,kmL:3.0,sal:2810,pc:11,pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.8062},
    {id:'tn15',lbl:'Tanque',         ico:'🚜',dim:'15m · 33,0t',vc:700000,vr:450000,km:10000,kmL:2.8,sal:2810,pc:11,pr:13,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.9662},
  ],
  c6x4:[
    {id:'pr17',lbl:'Prancha 17m',    ico:'🚜',dim:'17m · 39,8t',vc:740000,vr:450000,km:10000,kmL:2.5,sal:3000,pc:11,pr:17,aet:15,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:1.167},
    {id:'pr19',lbl:'Prancha 19m',    ico:'🚜',dim:'19m · 39,8t',vc:740000,vr:480000,km:10000,kmL:2.5,sal:3000,pc:11,pr:17,aet:15,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:1.197},
    {id:'bt24',lbl:'Bi-Trem 24m',    ico:'🚜',dim:'24m · 36,8t',vc:740000,vr:320000,km:10000,kmL:2.5,sal:3000,pc:11,pr:25,aet:15,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:1.037},
    {id:'rt27',lbl:'Rodotrem 27m',   ico:'🚜',dim:'27m · 53,8t',vc:740000,vr:320000,km:10000,kmL:2.5,sal:3000,pc:11,pr:25,aet:15,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:1.037},
    {id:'cs17',lbl:'Carga Seca 17m', ico:'🚜',dim:'17m · 41,5t',vc:740000,vr:220000,km:10000,kmL:2.5,sal:3000,pc:11,pr:17,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.9062},
    {id:'fr17',lbl:'Frigorífico 17m',ico:'🚜',dim:'17m · 36,0t',vc:740000,vr:380000,km:10000,kmL:2.3,sal:3000,pc:11,pr:17,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:1.047},
    {id:'si17',lbl:'Sider 17m',      ico:'🚜',dim:'17m · 42,0t',vc:740000,vr:200000,km:10000,kmL:2.5,sal:3000,pc:11,pr:17,aet:0, vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.9262},
  ],
  '34':[
    {id:'34cs',lbl:'Carga Seca', ico:'📦',dim:'4m · 3,5t', vc:150000,vr:50000, km:6000,kmL:7.0,sal:2200,pc:6,pr:4,aet:0,vidc:72,rpc:.5,vidr:84,rpr:.6,manut:.65},
    {id:'34fr',lbl:'Frigorífico',ico:'🧊',dim:'4m · 2,5t', vc:150000,vr:90000, km:6000,kmL:6.5,sal:2200,pc:6,pr:4,aet:0,vidc:72,rpc:.5,vidr:84,rpr:.6,manut:.85},
    {id:'34si',lbl:'Sider',      ico:'🚛',dim:'4m · 3,5t', vc:150000,vr:60000, km:6000,kmL:7.0,sal:2200,pc:6,pr:4,aet:0,vidc:72,rpc:.5,vidr:84,rpr:.6,manut:.68},
    {id:'34ba',lbl:'Baú',        ico:'📫',dim:'4m · 3,0t', vc:150000,vr:55000, km:6000,kmL:7.0,sal:2200,pc:6,pr:4,aet:0,vidc:72,rpc:.5,vidr:84,rpr:.6,manut:.67},
  ],
  toco:[
    {id:'tccs',lbl:'Carga Seca', ico:'📦',dim:'6m · 8,0t', vc:200000,vr:80000, km:7000,kmL:4.5,sal:2810,pc:7,pr:6,aet:0,vidc:84,rpc:.6,vidr:84,rpr:.6,manut:.72},
    {id:'tcfr',lbl:'Frigorífico',ico:'🧊',dim:'6m · 6,5t', vc:200000,vr:130000,km:7000,kmL:4.2,sal:2810,pc:7,pr:6,aet:0,vidc:84,rpc:.6,vidr:84,rpr:.6,manut:.90},
    {id:'tcsi',lbl:'Sider',      ico:'🚛',dim:'6m · 9,0t', vc:200000,vr:90000, km:7000,kmL:4.5,sal:2810,pc:7,pr:6,aet:0,vidc:84,rpc:.6,vidr:84,rpr:.6,manut:.74},
    {id:'tcba',lbl:'Baú',        ico:'📫',dim:'6m · 7,5t', vc:200000,vr:85000, km:7000,kmL:4.5,sal:2810,pc:7,pr:6,aet:0,vidc:84,rpc:.6,vidr:84,rpr:.6,manut:.73},
    {id:'tcgr',lbl:'Graneleiro', ico:'🌾',dim:'6m · 9,5t', vc:200000,vr:70000, km:7000,kmL:4.5,sal:2810,pc:7,pr:6,aet:0,vidc:84,rpc:.6,vidr:84,rpr:.6,manut:.70},
  ],
  tk8:[
    {id:'t8cs',lbl:'Carga Seca', ico:'📦',dim:'8m · 13,0t',vc:300000,vr:110000,km:8200,kmL:5.5,sal:2810,pc:7, pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.78},
    {id:'t8fr',lbl:'Frigorífico',ico:'🧊',dim:'8m · 10,0t',vc:300000,vr:170000,km:8200,kmL:5.0,sal:2810,pc:7, pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.95},
    {id:'t8si',lbl:'Sider',      ico:'🚛',dim:'8m · 14,0t',vc:300000,vr:120000,km:8200,kmL:5.5,sal:2810,pc:7, pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.80},
    {id:'t8ba',lbl:'Baú',        ico:'📫',dim:'8m · 12,0t',vc:300000,vr:115000,km:8200,kmL:5.5,sal:2810,pc:7, pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.79},
    {id:'t8gr',lbl:'Graneleiro', ico:'🌾',dim:'8m · 15,0t',vc:300000,vr:100000,km:8200,kmL:5.5,sal:2810,pc:7, pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.76},
  ],
  tk9:[
    {id:'t9cs',lbl:'Carga Seca', ico:'📦',dim:'9m · 14,0t',vc:300000,vr:140000,km:8200,kmL:5.0,sal:2810,pc:11,pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.82},
    {id:'t9fr',lbl:'Frigorífico',ico:'🧊',dim:'9m · 11,0t',vc:300000,vr:200000,km:8200,kmL:4.5,sal:2810,pc:11,pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.99},
    {id:'t9si',lbl:'Sider',      ico:'🚛',dim:'9m · 15,0t',vc:300000,vr:150000,km:8200,kmL:5.0,sal:2810,pc:11,pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.84},
    {id:'t9ba',lbl:'Baú',        ico:'📫',dim:'9m · 13,0t',vc:300000,vr:145000,km:8200,kmL:5.0,sal:2810,pc:11,pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.83},
    {id:'t9gr',lbl:'Graneleiro', ico:'🌾',dim:'9m · 16,0t',vc:300000,vr:130000,km:8200,kmL:5.0,sal:2810,pc:11,pr:0,aet:0,vidc:96,rpc:.6,vidr:100,rpr:.7344,manut:.80},
  ],
}
const ADM_TBL = [
  {km:10,a:.0943,l:.350},{km:50,a:.0644,l:.350},{km:100,a:.040,l:.350},
  {km:200,a:.0392,l:.3465},{km:300,a:.0384,l:.343},{km:400,a:.0376,l:.3396},
  {km:500,a:.0369,l:.3362},{km:600,a:.0362,l:.3328},{km:700,a:.0354,l:.3295},
  {km:800,a:.0347,l:.3262},{km:900,a:.034,l:.323},{km:1000,a:.0333,l:.3197},
  {km:1200,a:.032,l:.3134},{km:1500,a:.0301,l:.3041},{km:2000,a:.029,l:.2987},
  {km:4000,a:.026,l:.280},
]
const K = {enc:.9918,iof:.0738,ipva:.015,lic:69.12,taco:170,dpvat:110.38,salmec:1951.78,plr:1497.68,txrc:.6,txrr:.7344,txcap:.035,ppn:2300,recap:2,recapp:650,vpn:275000,kmoleo:30000,carter:35,rcar:9,kmdif:53000,cdif:47.2,ocarter:16,odif:20.23,arlar:.06493,arlap:1.52,lav:290,kmlav:15000,gris:22.5,rastr:100,aet:0,cintas:256.67,ppq:.12,dias:24,horas:9.5,vel:61,vmec:3}

// ─── UTILS ────────────────────────────────────────────────────────────────────
type AdmRow = {km:number;a:number;l:number}
function admLucro(dist: number, aOv: string, lOv: string, tbl: AdmRow[] = ADM_TBL) {
  let a: number | undefined, l: number | undefined
  dist = Math.max(dist, 1)
  let prev = tbl[0]
  for (const r of tbl) {
    if (dist <= r.km) {
      const t = r.km === prev.km ? 1 : (dist - prev.km) / (r.km - prev.km)
      a = prev.a + t * (r.a - prev.a)
      l = prev.l + t * (r.l - prev.l)
      break
    }
    prev = r
  }
  if (a === undefined) { a = tbl[tbl.length-1].a; l = tbl[tbl.length-1].l }
  if (aOv !== '' && !isNaN(+aOv)) a = +aOv / 100
  if (lOv !== '' && !isNaN(+lOv)) l = +lOv / 100
  return { a, l: l! }
}

// ─── DB → LOCAL MAPPERS ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToVD(r: any): VD {
  return {id:r.id,lbl:r.lbl,ico:r.ico??'🚛',kmL:r.km_l??0,km:r.km??0,vc:r.vc??0,vr:r.vr??0,sal:r.sal??0,pc:r.pc??0,pr:r.pr??0,aet:r.aet??0,vidc:r.vidc??96,rpc:r.rpc??.6,vidr:r.vidr??100,rpr:r.rpr??.7344,manut:r.manut??undefined}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToID(r: any): ID {
  return {...mapDbToVD(r),dim:r.dim??''}
}
const fmt = (v: number, d=2) => isNaN(v)||!isFinite(v) ? '—' : v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})
const fR = (v: number) => `R$ ${fmt(v)}/km`

// ─── INTERFACES ────────────────────────────────────────────────────────────────
type Plano = 'f' | 'p' | 'fu'
type PlanSel = { vId:string; cavId:string; implId:string; cont:boolean }
type FIn = { diesel:number; km:number; dist:number; admOv:string; lucroOv:string; useRealKml:boolean; kmlC:number }
type PIn = { diesel:number; kml:number; km:number; dist:number; vcav:number; vimpl:number; sal:number; enc:number; dias:number; remvar:number; manut:number; ppneu:number; qpneu:number; pcav:number; vpneu:number; admOv:string; lucroOv:string }
type FUIn = { diesel:number; arlap:number; kml:number; km:number; dist:number; vel:number; vcav:number; vimpl:number; vidc:number; vidr:number; rpc:number; rpr:number; txcap:number; salm:number; salmec:number; plr:number; enc:number; vmec:number; dias:number; horas:number; ppq:number; pc:number; pr:number; ppn:number; prec:number; qrec:number; vpn:number; coepn:number; carter:number; rcar:number; kmoleo:number; cdif:number; kmdif:number; ocarter:number; odif:number; ipva:number; lic:number; taco:number; dpvat:number; secc:number; secr:number; iof:number; gris:number; rastr:number; aet:number; cintas:number; lav:number; kmlav:number; admOv:string; lucroOv:string }
type PercIn = { km:number; tipo:string; ped:number; segPct:number; nf:number; esc:number }

interface CalcResult {
  ckm:number; ft:number; fkm:number; vt:number; frete:number; adm:number; lucro:number
  // fixos/km
  fRep:number; fSal:number; fCap:number; fSeg:number; fRastr:number
  // extras plano P/FU
  fOfic?:number; fLic?:number; fSegG?:number; fAet?:number; fGris?:number; fCintas?:number; fFtm?:number
  // separados para FU (A-O)
  fA?:number;fB?:number;fC?:number;fD?:number;fE?:number;fF?:number;fG?:number;fI?:number;fJ?:number;fN?:number;fO?:number
  // variáveis/km
  vComb:number; vManut:number; vPneus:number; vArlaLubr:number; vRemvar:number
  vArla?:number; vLubr?:number; vLav?:number
  // FU extra
  vd?:number; hora?:number
  plan: Plano
}
interface PercResult { kmt:number; op:number; ped:number; total:number; fefkm:number; segv?:number; esc?:number; dias?:number }

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEF_V = VS[4] // Truck 8m
const mkFIn = (v: VD): FIn => ({diesel:5.80,km:v.km,dist:500,admOv:'',lucroOv:'',useRealKml:false,kmlC:0})
const mkPIn = (v: VD): PIn => ({diesel:5.80,kml:v.kmL,km:v.km,dist:500,vcav:v.vc,vimpl:v.vr,sal:v.sal,enc:99.18,dias:24,remvar:.40,manut:v.manut??.65,ppneu:2300,qpneu:v.pc+v.pr,pcav:v.pc,vpneu:275000,admOv:'',lucroOv:''})
const mkFUIn = (v: VD): FUIn => ({diesel:5.80,arlap:1.52,kml:v.kmL,km:v.km,dist:500,vel:61,vcav:v.vc,vimpl:v.vr,vidc:v.vidc,vidr:v.vidr,rpc:v.rpc*100,rpr:v.rpr*100,txcap:3.5,salm:v.sal,salmec:1951.78,plr:1497.68,enc:99.18,vmec:3,dias:24,horas:9.5,ppq:.12,pc:v.pc,pr:v.pr,ppn:2300,prec:650,qrec:2,vpn:275000,coepn:.07,carter:35,rcar:9,kmoleo:30000,cdif:47.2,kmdif:53000,ocarter:16,odif:20.23,ipva:1.5,lic:69.12,taco:170,dpvat:110.38,secc:.5,secr:.5,iof:7.38,gris:22.5,rastr:100,aet:v.aet,cintas:256.67,lav:290,kmlav:15000,admOv:'',lucroOv:''})

// ─── UI HELPERS (nível de módulo para evitar perda de foco) ──────────────────
const NF = ({label,value,onChange,step='0.01',hint,unit,placeholder='0'}:{label:string;value:number;onChange:(v:number)=>void;step?:string;hint?:string;unit?:string;placeholder?:string}) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-medium tracking-widest uppercase text-text-muted">{label}{unit&&<span className="ml-1 normal-case tracking-normal">({unit})</span>}</label>
    <input type="number" min="0" step={step} value={value||''} onChange={e=>onChange(parseFloat(e.target.value)||0)} placeholder={placeholder}
      className="w-full px-3 py-2 rounded-md border border-border bg-[#FAF8F4] text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors" />
    {hint&&<p className="text-[10px] text-text-muted">{hint}</p>}
  </div>
)
const SL = ({label}:{label:string}) => (
  <div className="flex items-center gap-3 mt-7 mb-3">
    <span className="text-[10px] font-medium tracking-widest uppercase text-text-muted whitespace-nowrap">{label}</span>
    <div className="flex-1 h-px bg-border"/>
  </div>
)
const BDR = ({label,value}:{label:string;value:number}) => (
  <div className="flex justify-between items-center py-1 border-b border-border/40 text-sm">
    <span className="text-text-secondary">{label}</span>
    <span className="font-mono text-xs text-text-primary">{fR(value)}</span>
  </div>
)

// ─── COMPONENTE ───────────────────────────────────────────────────────────────
export default function CustoKmPage() {
  const [userId, setUserId] = useState<string|null>(null)
  const [vsActive, setVsActive] = useState<VD[]>(VS)
  const [cavActive, setCavActive] = useState<CD[]>(CAVALOS)
  const [implActive, setImplActive] = useState<Record<string,ID[]>>(IMPL)
  const kRef = useRef<typeof K>(K)
  const admRef = useRef<AdmRow[]>(ADM_TBL)
  const [plano, setPlano] = useState<Plano>('f')
  const defSel = (): PlanSel => ({vId:'tk8', cavId:'', implId:'', cont:false})
  const [sel, setSel] = useState<Record<Plano,PlanSel>>({
    f: defSel(), p: defSel(), fu: defSel()
  })
  const [fIn, setFIn] = useState<FIn>(mkFIn(DEF_V))
  const [pIn, setPIn] = useState<PIn>(mkPIn(DEF_V))
  const [fuIn, setFuIn] = useState<FUIn>(mkFUIn(DEF_V))
  const [percIn, setPercIn] = useState<PercIn>({km:0,tipo:'1',ped:0,segPct:0,nf:0,esc:0})
  const [result, setResult] = useState<CalcResult|null>(null)
  const [percResult, setPercResult] = useState<PercResult|null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // Load benchmarks from DB (with fallback to hardcoded defaults)
    supabase.from('calc_veiculos').select('*').order('sort_order').then(({data:vd}) => {
      if (vd && vd.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const simples: VD[] = vd.filter((r:any) => r.tipo === 'simples').map(mapDbToVD)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cavalos: CD[] = vd.filter((r:any) => r.tipo === 'cavalo').map((r:any) => ({id:r.id,lbl:r.lbl,ico:r.ico??'🚛',sal:r.sal??0}))
        const impl: Record<string,ID[]> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vd.filter((r:any) => r.tipo === 'implemento').forEach((r:any) => {
          if (!impl[r.cavalo_id]) impl[r.cavalo_id] = []
          impl[r.cavalo_id].push(mapDbToID(r))
        })
        if (simples.length) setVsActive(simples)
        if (cavalos.length) setCavActive(cavalos)
        if (Object.keys(impl).length) setImplActive(impl)
      }
    })
    supabase.from('calc_constantes').select('*').eq('id', 1).maybeSingle().then(({data:cd}) => {
      if (cd?.k && Object.keys(cd.k as object).length) kRef.current = {...K, ...(cd.k as typeof K)}
      if (cd?.adm_tbl && (cd.adm_tbl as AdmRow[]).length) admRef.current = cd.adm_tbl as AdmRow[]
    })
    supabase.auth.getUser().then(async ({data:{user}}) => {
      if (!user) return
      setUserId(user.id)
      const {data:cfg} = await supabase.from('custo_km_config').select('*').eq('agregado_id',user.id).maybeSingle()
      if (cfg?.params && typeof cfg.params === 'object') {
        const p = cfg.params as Record<string,unknown>
        const pl = (cfg.plano as Plano) ?? 'f'
        setPlano(pl)
        if (pl === 'f' && p.fIn) setFIn(p.fIn as FIn)
        if (pl === 'p' && p.pIn) setPIn(p.pIn as PIn)
        if (pl === 'fu' && p.fuIn) setFuIn(p.fuIn as FUIn)
        if (p.sel) setSel(p.sel as Record<Plano,PlanSel>)
        else {
          // fallback para formato antigo (sem per-plan sel)
          const oldSel: Partial<PlanSel> = {}
          if (p.selVId) oldSel.vId = p.selVId as string
          if (p.selCavId) oldSel.cavId = p.selCavId as string
          if (p.selImplId) oldSel.implId = p.selImplId as string
          if (p.contratante) oldSel.cont = p.contratante as boolean
          if (Object.keys(oldSel).length) setSel(s => ({...s, [pl]: {...s[pl as Plano], ...oldSel}}))
        }
      }
    })
  }, [])

  // Seleção do plano atual
  const cs = sel[plano]
  const cavalo = cs.cavId ? cavActive.find(c => c.id === cs.cavId) : null

  // Obter dados do veículo atual (usa seleção do plano ativo)
  function getVehicleData(): VD | null {
    if (cs.cavId && cs.implId) {
      const impl = implActive[cs.cavId]?.find(i => i.id === cs.implId)
      if (impl) return impl
    }
    if (!cs.cavId && cs.vId && cs.implId) {
      const impl = implActive[cs.vId]?.find(i => i.id === cs.implId)
      if (impl) return impl
    }
    if (cs.vId) return vsActive.find(v => v.id === cs.vId) ?? null
    return null
  }

  function selectVehicle(v: VD) {
    const firstImpl = implActive[v.id]?.[0]
    setSel(s => ({...s, [plano]: {vId:v.id, cavId:'', implId:firstImpl?.id??'', cont:false}}))
    if (firstImpl) {
      applyImpl(firstImpl, firstImpl.sal)
    } else {
      if (plano==='f') setFIn(p=>({...p, km:v.km}))
      if (plano==='p') setPIn(p=>({...p, km:v.km, kml:v.kmL, vcav:v.vc, vimpl:v.vr, sal:v.sal, qpneu:v.pc+v.pr, pcav:v.pc, manut:v.manut??.65}))
      if (plano==='fu') setFuIn(p=>({...p, km:v.km, kml:v.kmL, vcav:v.vc, vimpl:v.vr, salm:v.sal, pc:v.pc, pr:v.pr, aet:v.aet, vidc:v.vidc, vidr:v.vidr, rpc:v.rpc*100, rpr:v.rpr*100}))
    }
    setResult(null); setPercResult(null)
  }
  function selectCavalo(c: CD) {
    const firstImpl = implActive[c.id]?.[0]
    setSel(s => ({...s, [plano]: {vId:'', cavId:c.id, implId:firstImpl?.id??'', cont:false}}))
    if (firstImpl) applyImpl(firstImpl, c.sal)
    setResult(null); setPercResult(null)
  }
  function selectImpl(im: ID, cavSal: number) {
    setSel(s => ({...s, [plano]: {...s[plano], implId:im.id}}))
    applyImpl(im, cavSal)
    setResult(null); setPercResult(null)
  }
  function applyImpl(im: ID, cavSal: number) {
    if (plano==='f') setFIn(p=>({...p, km:im.km}))
    if (plano==='p') setPIn(p=>({...p, km:im.km, kml:im.kmL, vcav:im.vc, vimpl:im.vr, sal:cavSal, qpneu:im.pc+im.pr, pcav:im.pc, manut:im.manut??p.manut}))
    if (plano==='fu') setFuIn(p=>({...p, km:im.km, kml:im.kmL, vcav:im.vc, vimpl:im.vr, salm:cavSal, pc:im.pc, pr:im.pr, aet:im.aet, vidc:im.vidc, vidr:im.vidr, rpc:im.rpc*100, rpr:im.rpr*100}))
  }

  // ─── CÁLCULOS ───────────────────────────────────────────────────────────────
  function calcF() {
    const K = kRef.current
    const d = getVehicleData(); if (!d) { alert('Selecione um veículo.'); return }
    const {diesel,km,dist,admOv,lucroOv,useRealKml,kmlC} = fIn
    const kml = (useRealKml && kmlC > 0) ? kmlC : d.kmL
    const cont = cs.cont && !!cs.cavId
    const vc=d.vc, sal=d.sal, vidc=d.vidc, rpc=d.rpc, aet=d.aet
    const vr=cont?0:d.vr, vidr=cont?100:d.vidr, rpr=cont?0:d.rpr
    const pc=d.pc, pr=cont?0:d.pr
    const A=(vc+vr)*K.txcap/12
    const Sm=sal*(1+K.enc)
    const Rc=(vc*rpc)/vidc
    const Rr=vr>0?(vr*rpr)/vidr:0
    const Sg=(vc*.005+vr*.005)*(1+K.iof)/12
    const Lic=(vc*K.ipva/12)+(K.lic+K.taco+K.dpvat)/12
    const Rg=K.rastr+K.gris+aet
    const ft=A+Sm+Rc+Rr+Sg+Lic+Rg, fkm=ft/km
    const comb=diesel/kml
    const pnv=(pc+pr)*(K.ppn+K.recap*K.recapp)/K.vpn
    const arla=(1/kml)*K.arlar*K.arlap
    const lubr=.041
    const remvar=K.ppq+(sal/(K.dias*K.horas*K.vel))
    const manut=d.manut??(vc*.01/km)
    const vt=comb+manut+pnv+arla+lubr+remvar
    const ckm=fkm+vt
    const {a,l}=admLucro(dist,admOv,lucroOv,admRef.current)
    const frete=ckm/(1-a-l)
    setResult({ckm,ft,fkm,vt,frete,adm:a,lucro:l,fRep:(Rc+Rr)/km,fSal:Sm/km,fCap:A/km,fSeg:(Sg+Lic)/km,fRastr:Rg/km,vComb:comb,vManut:manut,vPneus:pnv,vArlaLubr:arla+lubr,vRemvar:remvar,plan:'f'})
    setPercResult(null)
  }

  function calcP() {
    const K = kRef.current
    const d = getVehicleData(); if (!d) { alert('Selecione um veículo.'); return }
    const {diesel,kml,km,dist,vcav,vimpl: vimplIn,sal,enc,dias,remvar,manut,ppneu,qpneu,pcav,vpneu,admOv,lucroOv} = pIn
    const cont = cs.cont && !!cs.cavId
    const vc=vcav, vr=cont?0:vimplIn
    const qpneuEf = cont ? (pcav ?? 0) : qpneu
    const encD=enc/100, aet=cont?0:(d.aet||0)
    const A=(vc+vr)*K.txcap/12
    const Sm=sal*(1+encD)+(K.plr/12)*(1+encD)
    const So=(K.salmec*(1+K.enc)+K.plr*(1+K.enc)/12)/K.vmec
    const Rc=(vc*K.txrc)/96
    const Rr=vr>0?(vr*K.txrr)/100:0
    const Sg=(vc*.005+vr*.005)*(1+K.iof)/12
    const Lic=(vc*K.ipva/12)+(K.lic+K.taco+K.dpvat)/12
    const Rg=K.rastr+K.gris+aet
    const ft=A+Sm+So+Rc+Rr+Sg+Lic+Rg, fkm=ft/km
    const comb=diesel/kml
    const arla=(1/kml)*K.arlar*K.arlap
    const lubr=.041
    const lav=K.lav/K.kmlav
    const pnv=qpneuEf*(ppneu+K.recap*K.recapp)/vpneu
    const vt=comb+arla+lubr+lav+manut+pnv+remvar
    const ckm=fkm+vt
    const {a,l}=admLucro(dist,admOv,lucroOv,admRef.current)
    const frete=ckm/(1-a-l)
    setResult({ckm,ft,fkm,vt,frete,adm:a,lucro:l,fRep:(Rc+Rr)/km,fSal:Sm/km,fCap:A/km,fSeg:Sg/km,fLic:Lic/km,fRastr:Rg/km,fOfic:So/km,vComb:comb,vManut:manut,vPneus:pnv,vArlaLubr:arla+lubr,vArla:arla,vLubr:lubr,vLav:lav,vRemvar:remvar,plan:'p'})
    setPercResult(null)
  }

  function calcFU() {
    const K = kRef.current
    const {diesel,arlap,kml,km,dist,vel,vcav,vimpl:vimplIn,vidc,vidr,rpc,rpr,txcap,salm,salmec,plr,enc,vmec,dias,horas,ppq,pc,pr:prIn,ppn,prec,qrec,vpn,coepn,carter,rcar,kmoleo,cdif,kmdif,ocarter,odif,ipva,lic,taco,dpvat,secc,secr,iof,gris,rastr,aet:aetIn,cintas,lav,kmlav,admOv,lucroOv} = fuIn
    const cont = cs.cont && !!cs.cavId
    const vc=vcav, vr=cont?0:vimplIn
    const secrEf=cont?0:secr/100, aetEf=cont?0:aetIn, pnrEf=cont?0:prIn, cintasEf=cont?0:cintas
    const vidrEf=cont?100:vidr, rprEf=cont?0:rpr/100
    const encD=enc/100, rpcD=rpc/100, txcapD=txcap/100, ipvaD=ipva/100, seccD=secc/100, iofD=iof/100
    const A=(vc+vr)*txcapD/12
    const B=salm*(1+encD)+(plr/12)*(1+encD)
    const C=(salmec*(1+encD)+plr*(1+encD)/12)/vmec
    const D=(vc*rpcD)/vidc
    const E=vr>0?(vr*rprEf)/vidrEf:0
    const F=(vc*ipvaD/12)+(lic+taco+dpvat)/12
    const G=((vc*seccD+vr*secrEf)*(1+iofD))/12
    const I=aetEf, J=gris, N=cintasEf, O=rastr
    const ft=A+B+C+D+E+F+G+I+J+N+O, fkm=ft/km
    const va=(vc+vr)*.01/km
    const vb=diesel/kml
    const vc2=(1/kml)*K.arlar*arlap
    const vd=((carter+rcar)*ocarter)/kmoleo+(cdif*odif)/kmdif
    const ve=lav/kmlav
    const vf=(pc+pnrEf)*(ppn*(1+coepn)+qrec*prec)/vpn
    const rv=ppq+salm/(dias*horas*vel)
    const vt=va+vb+vc2+vd+ve+vf+rv
    const ckm=fkm+vt
    const hora=(ft/(dias*horas))*1.3
    const {a,l}=admLucro(dist,admOv,lucroOv,admRef.current)
    const frete=ckm/(1-a-l)
    setResult({ckm,ft,fkm,vt,frete,adm:a,lucro:l,fRep:0,fSal:0,fCap:0,fSeg:0,fRastr:0,fA:A/km,fB:B/km,fC:C/km,fD:D/km,fE:E/km,fF:F/km,fG:G/km,fI:I/km,fJ:J/km,fN:N/km,fO:O/km,fFtm:ft,vComb:vb,vManut:va,vPneus:vf,vArlaLubr:vc2+vd,vArla:vc2,vLubr:vd,vLav:ve,vRemvar:rv,vd,hora,plan:'fu'})
    setPercResult(null)
  }

  function calcPerc() {
    if (!result) { alert('Calcule o custo/km primeiro.'); return }
    const {km,tipo,ped,segPct,nf,esc} = percIn
    if (km <= 0) { alert('Informe a distância do percurso.'); return }
    const kmt = tipo === 'rt' ? km*2 : km
    const op = result.ckm * kmt
    const segv = plano !== 'f' ? nf*segPct/100 : 0
    const escv = plano === 'fu' ? esc : 0
    const total = result.frete*kmt + ped + segv + escv
    const fefkm = total/kmt
    const dias = plano === 'fu' ? Math.ceil(kmt/fuIn.vel/10) : undefined
    setPercResult({kmt, op, ped, total, fefkm, segv: plano !== 'f' ? segv : undefined, esc: plano === 'fu' ? escv : undefined, dias})
  }

  async function handleSave() {
    if (!userId || !result) { alert('Calcule o custo/km antes de salvar.'); return }
    setSaving(true)
    const supabase = createClient()
    const d = getVehicleData()
    await supabase.from('custo_km_config').upsert({
      agregado_id: userId,
      veiculo_id: null,
      custo_km_calculado: result.ckm,
      distancia_media: plano === 'f' ? fIn.dist : plano === 'p' ? pIn.dist : fuIn.dist,
      plano,
      params: { sel, fIn, pIn, fuIn },
      preco_diesel: plano === 'f' ? fIn.diesel : plano === 'p' ? pIn.diesel : fuIn.diesel,
      consumo_km_litro: plano === 'f' ? (fIn.useRealKml ? fIn.kmlC : d?.kmL ?? 0) : plano === 'p' ? pIn.kml : fuIn.kml,
      km_mes: plano === 'f' ? fIn.km : plano === 'p' ? pIn.km : fuIn.km,
      salario_motorista: plano === 'f' ? (d?.sal ?? 0) : plano === 'p' ? pIn.sal : fuIn.salm,
      parcela_caminhao: 0, seguro: 0, licenciamento: 0, rastreador: 0, outros_fixos: 0,
      manutencao_mensal: 0, pneus_mensal: 0, pedagio_mensal: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'agregado_id,veiculo_id' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-5 pb-20">
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-semibold text-text-primary">Custo por KM</h1>
        <p className="text-sm text-text-secondary mt-1">Calcule seu custo real por quilômetro rodado</p>
      </div>

      {/* ── Plano tabs ── */}
      <div className="flex border-b border-border mb-5">
        {([['f','Iniciante'],['p','Intermediário'],['fu','Avançado']] as [Plano,string][]).map(([p,lbl]) => (
          <button key={p} onClick={()=>{setPlano(p);setResult(null);setPercResult(null)}}
            className={`px-4 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors border-b-2 -mb-px ${plano===p?'border-accent text-text-primary':'border-transparent text-text-muted hover:text-text-secondary'}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* ── Veículo ── */}
      <SL label="1 · Tipo de veículo" />
      <div className="grid grid-cols-3 gap-2 mb-2 sm:grid-cols-5">
        {vsActive.map(v => {
          const hasImpl = !!implActive[v.id]?.length
          const isSelected = cs.vId===v.id&&!cs.cavId
          return (
            <button key={v.id} onClick={()=>selectVehicle(v)}
              className={`border rounded-xl p-2 text-center transition-all text-xs ${isSelected?'border-accent bg-accent text-bg':'border-border bg-bg text-text-primary hover:border-text-secondary'}`}>
              <div className="text-lg mb-1">{v.ico}</div>
              <div className="font-medium text-[11px] leading-tight">{v.lbl}</div>
              <div className={`text-[10px] mt-0.5 ${isSelected?'text-bg/50':'text-text-muted'}`}>{hasImpl?'+ carroceria':`${v.kmL} km/L`}</div>
            </button>
          )
        })}
        {cavActive.map(c => (
          <button key={c.id} onClick={()=>selectCavalo(c)}
            className={`border rounded-xl p-2 text-center transition-all text-xs ${cs.cavId===c.id?'border-accent bg-accent text-bg':'border-border bg-bg text-text-primary hover:border-text-secondary'}`}>
            <div className="text-lg mb-1">{c.ico}</div>
            <div className="font-medium text-[11px] leading-tight">{c.lbl}</div>
            <div className={`text-[10px] mt-0.5 ${cs.cavId===c.id?'text-bg/50':'text-text-muted'}`}>+ implemento</div>
          </button>
        ))}
      </div>

      {/* ── Implemento (cavalo + carreta) ── */}
      {cs.cavId && implActive[cs.cavId] && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-2">
          <p className="text-[10px] font-medium tracking-widest uppercase text-text-muted mb-2">2 · Implemento / Carreta</p>
          <div className="grid grid-cols-2 gap-2">
            {implActive[cs.cavId].map(im => (
              <button key={im.id} onClick={()=>selectImpl(im, cavalo?.sal??2810)}
                className={`border rounded-lg p-2.5 text-left transition-all ${cs.implId===im.id?'border-accent bg-accent text-bg':'border-border bg-bg text-text-primary hover:border-text-secondary'}`}>
                <div className={`font-semibold text-xs font-serif ${cs.implId===im.id?'text-bg':'text-text-primary'}`}>{im.lbl}</div>
                <div className={`text-[10px] mt-0.5 ${cs.implId===im.id?'text-bg/50':'text-text-muted'}`}>{im.dim}</div>
                <div className={`text-[10px] mt-0.5 ${cs.implId===im.id?'text-bg/40':'text-text-muted'}`}>Cavalo R${(im.vc/1000).toFixed(0)}k + Impl R${(im.vr/1000).toFixed(0)}k · {im.kmL} km/L</div>
              </button>
            ))}
          </div>
          <label className="flex items-start gap-2 mt-3 p-2.5 bg-bg/60 border border-border rounded-lg cursor-pointer text-xs text-text-secondary">
            <input type="checkbox" checked={cs.cont} onChange={e=>setSel(s=>({...s,[plano]:{...s[plano],cont:e.target.checked}}))} className="mt-0.5 accent-accent w-3.5 h-3.5 flex-shrink-0" />
            <span>Carreta/implemento é do <strong className="text-text-primary">contratante</strong> — excluir todos os custos do reboque do cálculo</span>
          </label>
        </div>
      )}

      {/* ── Carroceria (veículos simples com opções) ── */}
      {!cs.cavId && cs.vId && implActive[cs.vId] && (
        <div className="bg-surface border border-border rounded-xl p-3 mb-2">
          <p className="text-[10px] font-medium tracking-widest uppercase text-text-muted mb-2">2 · Tipo de carroceria</p>
          <div className="grid grid-cols-2 gap-2">
            {implActive[cs.vId].map(im => (
              <button key={im.id} onClick={()=>selectImpl(im, im.sal)}
                className={`border rounded-lg p-2.5 text-left transition-all ${cs.implId===im.id?'border-accent bg-accent text-bg':'border-border bg-bg text-text-primary hover:border-text-secondary'}`}>
                <div className={`font-semibold text-xs font-serif ${cs.implId===im.id?'text-bg':'text-text-primary'}`}>{im.ico} {im.lbl}</div>
                <div className={`text-[10px] mt-0.5 ${cs.implId===im.id?'text-bg/50':'text-text-muted'}`}>{im.dim}</div>
                <div className={`text-[10px] mt-0.5 ${cs.implId===im.id?'text-bg/40':'text-text-muted'}`}>{im.kmL} km/L</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Inputs por plano ── */}
      {plano === 'f' && (
        <>
          <SL label="Dados da operação" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Diesel" unit="R$/litro" value={fIn.diesel} onChange={v=>setFIn(p=>({...p,diesel:v}))} step="0.05" hint="Média: R$ 5,80" />
            <NF label="Km/mês" value={fIn.km} onChange={v=>setFIn(p=>({...p,km:v}))} step="100" />
            <div className="col-span-2">
              <NF label="Distância média/viagem" unit="km" value={fIn.dist} onChange={v=>setFIn(p=>({...p,dist:v}))} step="50" hint="Usado para calcular ADM e margem automaticamente" />
            </div>
          </div>
          <label className="flex items-center gap-2 mt-3 cursor-pointer text-xs text-text-secondary font-medium">
            <input type="checkbox" checked={fIn.useRealKml} onChange={e=>setFIn(p=>({...p,useRealKml:e.target.checked}))} className="accent-accent w-3.5 h-3.5" />
            Informar consumo real do meu veículo
          </label>
          {fIn.useRealKml && (
            <div className="mt-2">
              <NF label="Consumo real" unit="km/litro" value={fIn.kmlC} onChange={v=>setFIn(p=>({...p,kmlC:v}))} step="0.1" />
            </div>
          )}
        </>
      )}

      {plano === 'p' && (
        <>
          <SL label="Veículo e operação" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Diesel" unit="R$/litro" value={pIn.diesel} onChange={v=>setPIn(p=>({...p,diesel:v}))} step="0.05" />
            <NF label="Consumo real" unit="km/litro" value={pIn.kml} onChange={v=>setPIn(p=>({...p,kml:v}))} step="0.1" />
            <NF label="Km/mês" value={pIn.km} onChange={v=>setPIn(p=>({...p,km:v}))} step="100" />
            <NF label="Distância média/viagem" unit="km" value={pIn.dist} onChange={v=>setPIn(p=>({...p,dist:v}))} step="50" />
            <NF label="Valor do cavalo" unit="R$" value={pIn.vcav} onChange={v=>setPIn(p=>({...p,vcav:v}))} step="5000" />
            <NF label="Valor implemento" unit="R$" value={pIn.vimpl} onChange={v=>setPIn(p=>({...p,vimpl:v}))} step="5000" />
          </div>
          <SL label="Pessoal" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Salário motorista" unit="R$" value={pIn.sal} onChange={v=>setPIn(p=>({...p,sal:v}))} step="50" />
            <NF label="Encargos sociais" unit="%" value={pIn.enc} onChange={v=>setPIn(p=>({...p,enc:v}))} step="0.1" />
            <NF label="Dias trabalhados/mês" value={pIn.dias} onChange={v=>setPIn(p=>({...p,dias:v}))} step="1" />
            <NF label="Rem. variável" unit="R$/km" value={pIn.remvar} onChange={v=>setPIn(p=>({...p,remvar:v}))} step="0.01" hint="Diária + PPQ. Ref: R$ 0,40" />
          </div>
          <SL label="Custos variáveis" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Manutenção" unit="R$/km" value={pIn.manut} onChange={v=>setPIn(p=>({...p,manut:v}))} step="0.01" hint="Peças + mão de obra" />
            <NF label="Preço pneu novo" unit="R$" value={pIn.ppneu} onChange={v=>setPIn(p=>({...p,ppneu:v}))} step="50" />
            <NF label="Qtde pneus total" value={pIn.qpneu} onChange={v=>setPIn(p=>({...p,qpneu:v}))} step="1" />
            <NF label="Vida útil pneu" unit="km" value={pIn.vpneu} onChange={v=>setPIn(p=>({...p,vpneu:v}))} step="5000" />
          </div>
        </>
      )}

      {plano === 'fu' && (
        <>
          <SL label="Parâmetros técnicos" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Diesel S-10" unit="R$/L" value={fuIn.diesel} onChange={v=>setFuIn(p=>({...p,diesel:v}))} step="0.05" />
            <NF label="Arla 32" unit="R$/L" value={fuIn.arlap} onChange={v=>setFuIn(p=>({...p,arlap:v}))} step="0.05" />
            <NF label="Consumo" unit="km/litro" value={fuIn.kml} onChange={v=>setFuIn(p=>({...p,kml:v}))} step="0.1" />
            <NF label="Km/mês" value={fuIn.km} onChange={v=>setFuIn(p=>({...p,km:v}))} step="100" />
            <NF label="Distância média/viagem" unit="km" value={fuIn.dist} onChange={v=>setFuIn(p=>({...p,dist:v}))} step="50" />
            <NF label="Velocidade média" unit="km/h" value={fuIn.vel} onChange={v=>setFuIn(p=>({...p,vel:v}))} step="1" />
          </div>
          <SL label="Valor do conjunto" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Valor cavalo" unit="R$" value={fuIn.vcav} onChange={v=>setFuIn(p=>({...p,vcav:v}))} step="5000" />
            <NF label="Valor reboque" unit="R$" value={fuIn.vimpl} onChange={v=>setFuIn(p=>({...p,vimpl:v}))} step="5000" />
            <NF label="Vida útil cavalo" unit="meses" value={fuIn.vidc} onChange={v=>setFuIn(p=>({...p,vidc:v}))} step="6" />
            <NF label="Vida útil reboque" unit="meses" value={fuIn.vidr} onChange={v=>setFuIn(p=>({...p,vidr:v}))} step="6" />
            <NF label="Taxa repos. cavalo" unit="%" value={fuIn.rpc} onChange={v=>setFuIn(p=>({...p,rpc:v}))} step="1" />
            <NF label="Taxa repos. reboque" unit="%" value={fuIn.rpr} onChange={v=>setFuIn(p=>({...p,rpr:v}))} step="1" />
            <NF label="Taxa remuneração capital" unit="% a.a." value={fuIn.txcap} onChange={v=>setFuIn(p=>({...p,txcap:v}))} step="0.1" />
          </div>
          <SL label="Pessoal" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Salário motorista" unit="R$" value={fuIn.salm} onChange={v=>setFuIn(p=>({...p,salm:v}))} step="50" />
            <NF label="Salário mecânico" unit="R$" value={fuIn.salmec} onChange={v=>setFuIn(p=>({...p,salmec:v}))} step="50" />
            <NF label="PLR" unit="R$" value={fuIn.plr} onChange={v=>setFuIn(p=>({...p,plr:v}))} step="50" />
            <NF label="Encargos sociais" unit="%" value={fuIn.enc} onChange={v=>setFuIn(p=>({...p,enc:v}))} step="0.1" />
            <NF label="Veículos/mecânico" value={fuIn.vmec} onChange={v=>setFuIn(p=>({...p,vmec:v}))} step="1" />
            <NF label="Dias trabalhados/mês" value={fuIn.dias} onChange={v=>setFuIn(p=>({...p,dias:v}))} step="1" />
            <NF label="Horas/dia" value={fuIn.horas} onChange={v=>setFuIn(p=>({...p,horas:v}))} step="0.5" />
            <NF label="PPQ" unit="R$/km" value={fuIn.ppq} onChange={v=>setFuIn(p=>({...p,ppq:v}))} step="0.01" />
          </div>
          <SL label="Pneus" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Qtde pneus cavalo" value={fuIn.pc} onChange={v=>setFuIn(p=>({...p,pc:v}))} step="1" />
            <NF label="Qtde pneus reboque" value={fuIn.pr} onChange={v=>setFuIn(p=>({...p,pr:v}))} step="1" />
            <NF label="Preço pneu novo" unit="R$" value={fuIn.ppn} onChange={v=>setFuIn(p=>({...p,ppn:v}))} step="50" />
            <NF label="Preço recapagem" unit="R$" value={fuIn.prec} onChange={v=>setFuIn(p=>({...p,prec:v}))} step="50" />
            <NF label="Qtde recapagens/pneu" value={fuIn.qrec} onChange={v=>setFuIn(p=>({...p,qrec:v}))} step="1" />
            <NF label="Vida útil pneu" unit="km" value={fuIn.vpn} onChange={v=>setFuIn(p=>({...p,vpn:v}))} step="5000" />
            <NF label="Coef. perda pneu novo" value={fuIn.coepn} onChange={v=>setFuIn(p=>({...p,coepn:v}))} step="0.01" />
          </div>
          <SL label="Lubrificantes" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="Cap. óleo cárter" unit="L" value={fuIn.carter} onChange={v=>setFuIn(p=>({...p,carter:v}))} step="1" />
            <NF label="Repos. cárter entre trocas" unit="L" value={fuIn.rcar} onChange={v=>setFuIn(p=>({...p,rcar:v}))} step="1" />
            <NF label="Km troca de óleo" value={fuIn.kmoleo} onChange={v=>setFuIn(p=>({...p,kmoleo:v}))} step="1000" />
            <NF label="Cap. câmbio+dif" unit="L" value={fuIn.cdif} onChange={v=>setFuIn(p=>({...p,cdif:v}))} step="0.5" />
            <NF label="Km troca diferencial" value={fuIn.kmdif} onChange={v=>setFuIn(p=>({...p,kmdif:v}))} step="1000" />
            <NF label="Preço óleo cárter" unit="R$/L" value={fuIn.ocarter} onChange={v=>setFuIn(p=>({...p,ocarter:v}))} step="0.5" />
            <NF label="Preço óleo câmbio/dif" unit="R$/L" value={fuIn.odif} onChange={v=>setFuIn(p=>({...p,odif:v}))} step="0.5" />
          </div>
          <SL label="Licenciamento e Seguro" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="IPVA" unit="% s/veículo" value={fuIn.ipva} onChange={v=>setFuIn(p=>({...p,ipva:v}))} step="0.1" />
            <NF label="Licenciamento" unit="R$/ano" value={fuIn.lic} onChange={v=>setFuIn(p=>({...p,lic:v}))} step="1" />
            <NF label="Vistoria tacógrafo" unit="R$/ano" value={fuIn.taco} onChange={v=>setFuIn(p=>({...p,taco:v}))} step="10" />
            <NF label="DPVAT" unit="R$/ano" value={fuIn.dpvat} onChange={v=>setFuIn(p=>({...p,dpvat:v}))} step="1" />
            <NF label="Prêmio IS cavalo" unit="% a.a." value={fuIn.secc} onChange={v=>setFuIn(p=>({...p,secc:v}))} step="0.05" />
            <NF label="Prêmio IS reboque" unit="% a.a." value={fuIn.secr} onChange={v=>setFuIn(p=>({...p,secr:v}))} step="0.05" />
            <NF label="IOF sobre seguros" unit="%" value={fuIn.iof} onChange={v=>setFuIn(p=>({...p,iof:v}))} step="0.1" />
          </div>
          <SL label="Outros custos fixos mensais" />
          <div className="grid grid-cols-2 gap-3">
            <NF label="GRIS/mês" unit="R$" value={fuIn.gris} onChange={v=>setFuIn(p=>({...p,gris:v}))} step="5" />
            <NF label="Rastreador/mês" unit="R$" value={fuIn.rastr} onChange={v=>setFuIn(p=>({...p,rastr:v}))} step="10" />
            <NF label="AET/mês" unit="R$" value={fuIn.aet} onChange={v=>setFuIn(p=>({...p,aet:v}))} step="5" />
            <NF label="Cintas de amarração" unit="R$/mês" value={fuIn.cintas} onChange={v=>setFuIn(p=>({...p,cintas:v}))} step="10" />
            <NF label="Lavagem do veículo" unit="R$" value={fuIn.lav} onChange={v=>setFuIn(p=>({...p,lav:v}))} step="10" />
            <NF label="Km entre lavagens" value={fuIn.kmlav} onChange={v=>setFuIn(p=>({...p,kmlav:v}))} step="1000" />
          </div>
        </>
      )}

      {/* ── ADM / Lucro ── */}
      <div className="bg-surface border border-border rounded-xl p-4 mt-5">
        <p className="font-serif text-sm font-medium text-text-primary mb-0.5">ADM e Margem de Lucro</p>
        <p className="text-[11px] text-text-muted mb-3">Deixe em branco para cálculo automático pela distância média da viagem.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium tracking-widest uppercase text-text-muted">ADM %</label>
            <input type="number" min="0" step="0.1" placeholder="Auto"
              value={plano==='f'?fIn.admOv:plano==='p'?pIn.admOv:fuIn.admOv}
              onChange={e=>{const s=e.target.value;plano==='f'?setFIn(p=>({...p,admOv:s})):plano==='p'?setPIn(p=>({...p,admOv:s})):setFuIn(p=>({...p,admOv:s}))}}
              className="w-full px-3 py-2 rounded-md border border-border bg-[#FAF8F4] text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors" />
            <p className="text-[10px] text-text-muted">Vazio = automático</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium tracking-widest uppercase text-text-muted">Lucro %</label>
            <input type="number" min="0" step="0.1" placeholder="Auto"
              value={plano==='f'?fIn.lucroOv:plano==='p'?pIn.lucroOv:fuIn.lucroOv}
              onChange={e=>{const s=e.target.value;plano==='f'?setFIn(p=>({...p,lucroOv:s})):plano==='p'?setPIn(p=>({...p,lucroOv:s})):setFuIn(p=>({...p,lucroOv:s}))}}
              className="w-full px-3 py-2 rounded-md border border-border bg-[#FAF8F4] text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors" />
            <p className="text-[10px] text-text-muted">Vazio = automático</p>
          </div>
        </div>
      </div>

      {/* ── Botão calcular ── */}
      <button onClick={()=>plano==='f'?calcF():plano==='p'?calcP():calcFU()}
        className="mt-5 w-full flex items-center justify-center gap-2 bg-accent text-bg py-3.5 rounded-pill font-medium text-xs tracking-widest uppercase hover:opacity-80 transition-opacity">
        Calcular custo por km →
      </button>

      {/* ── Resultado ── */}
      {result && (
        <div className="mt-5 bg-surface border border-border rounded-xl overflow-hidden">
          {/* Hero */}
          <div className="p-5 border-b border-border">
            <p className="text-[10px] font-medium tracking-widest uppercase text-text-muted mb-1">Custo total por km rodado</p>
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <span className="font-serif text-5xl font-medium text-text-primary tracking-tight">{fmt(result.ckm)}</span>
                <span className="font-serif text-lg text-text-muted ml-1">R$/km</span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Custo fixo mensal</p>
                <p className="font-mono text-sm font-semibold text-text-primary">R$ {fmt(result.ft)}</p>
                <p className="text-[10px] text-text-muted uppercase tracking-wider mt-1.5">Variável/km</p>
                <p className="font-mono text-sm font-semibold text-text-primary">R$ {fmt(result.vt)}/km</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
            {/* Fixos */}
            <div className="bg-bg border border-border rounded-lg p-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-text-muted mb-2 pb-2 border-b border-border">Custos Fixos ÷ km/mês</p>
              {result.plan === 'fu' ? (
                <>
                  {result.fA !== undefined && <BDR label="a · Remuneração capital" value={result.fA} />}
                  {result.fB !== undefined && <BDR label="b · Salário motorista" value={result.fB} />}
                  {result.fC !== undefined && <BDR label="c · Salário oficina" value={result.fC} />}
                  {result.fD !== undefined && <BDR label="d · Reposição cavalo" value={result.fD} />}
                  {result.fE !== undefined && <BDR label="e · Reposição reboque" value={result.fE} />}
                  {result.fF !== undefined && <BDR label="f · Licenciamento + tacógrafo" value={result.fF} />}
                  {result.fG !== undefined && <BDR label="g · Seguro (casco + IOF)" value={result.fG} />}
                  {result.fI !== undefined && <BDR label="i · AET" value={result.fI} />}
                  {result.fJ !== undefined && <BDR label="j · GRIS" value={result.fJ} />}
                  {result.fN !== undefined && <BDR label="n · Cintas de amarração" value={result.fN} />}
                  {result.fO !== undefined && <BDR label="o · Rastreador" value={result.fO} />}
                </>
              ) : result.plan === 'p' ? (
                <>
                  <BDR label="Remuneração capital (3,5% a.a.)" value={result.fCap} />
                  <BDR label="Reposição veículo + implemento" value={result.fRep} />
                  <BDR label="Salário + encargos" value={result.fSal} />
                  {result.fOfic !== undefined && <BDR label="Salário oficina" value={result.fOfic} />}
                  <BDR label="Seguro casco (0,5% a.a.)" value={result.fSeg} />
                  {result.fLic !== undefined && <BDR label="IPVA + Licença + Tacógrafo" value={result.fLic} />}
                  <BDR label="Rastreador + GRIS + AET" value={result.fRastr} />
                </>
              ) : (
                <>
                  <BDR label="Reposição do veículo" value={result.fRep} />
                  <BDR label="Salário + encargos" value={result.fSal} />
                  <BDR label="Remuneração capital" value={result.fCap} />
                  <BDR label="Seguro + IPVA + licença" value={result.fSeg} />
                  <BDR label="Rastreador + GRIS + AET" value={result.fRastr} />
                </>
              )}
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-border font-semibold text-sm">
                <span className="text-text-primary">Total fixo/km</span>
                <span className="font-mono text-xs text-text-primary">{fR(result.fkm)}</span>
              </div>
              {result.plan === 'fu' && result.fFtm !== undefined && (
                <div className="mt-1">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mt-2">÷ km/mês = fixo/km</p>
                  <p className="font-mono text-sm font-semibold text-text-primary mt-0.5">{fR(result.fkm)}</p>
                </div>
              )}
            </div>

            {/* Variáveis */}
            <div className="bg-bg border border-border rounded-lg p-3">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-text-muted mb-2 pb-2 border-b border-border">Custos Variáveis / km</p>
              <BDR label="Combustível" value={result.vComb} />
              {result.plan === 'p' && result.vArla !== undefined && (
                <>
                  <BDR label="Arla 32" value={result.vArla} />
                  <BDR label="Lubrificantes" value={result.vLubr ?? 0} />
                  {result.vLav !== undefined && <BDR label="Lavagem" value={result.vLav} />}
                </>
              )}
              {result.plan === 'fu' && (
                <>
                  {result.vArla !== undefined && <BDR label="c · Arla 32" value={result.vArla} />}
                  {result.vd !== undefined && <BDR label="d · Lubrificantes" value={result.vd} />}
                  {result.vLav !== undefined && <BDR label="e · Lavagem" value={result.vLav} />}
                </>
              )}
              {result.plan === 'f' && <BDR label="Arla 32 + Lubrificantes" value={result.vArlaLubr} />}
              <BDR label="Manutenção" value={result.vManut} />
              <BDR label="Pneus" value={result.vPneus} />
              {result.plan === 'p' && <BDR label="Rem. Variável (Diária + PPQ)" value={result.vRemvar} />}
              {result.plan === 'f' && <BDR label="Rem. Variável (Diária + PPQ)" value={result.vRemvar} />}
              {result.plan === 'fu' && <BDR label="Rem. Variável (PPQ + Diária)" value={result.vRemvar} />}
              <div className="flex justify-between items-center pt-2 mt-1 border-t border-border font-semibold text-sm">
                <span className="text-text-primary">Total variável/km</span>
                <span className="font-mono text-xs text-text-primary">{fR(result.vt)}</span>
              </div>
            </div>
          </div>

          {/* Frete box (dark) */}
          <div className="bg-accent mx-4 mb-4 rounded-xl p-5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-bg/40 mb-4">Sugestão de Frete</p>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-[10px] text-bg/40 uppercase tracking-wider">Frete sugerido/km</p>
                <p className="font-serif text-4xl font-medium text-bg mt-1">{fmt(result.frete)}</p>
                <p className="text-[10px] text-bg/40 mt-0.5">R$/km</p>
              </div>
              <div>
                <p className="text-[10px] text-bg/40 uppercase tracking-wider">ADM aplicada</p>
                <p className="font-serif text-2xl font-medium text-bg mt-1">{fmt(result.adm*100,1)}</p>
                <p className="text-[10px] text-bg/40 mt-0.5">%</p>
              </div>
              <div>
                <p className="text-[10px] text-bg/40 uppercase tracking-wider">Margem de lucro</p>
                <p className="font-serif text-2xl font-medium text-bg mt-1">{fmt(result.lucro*100,1)}</p>
                <p className="text-[10px] text-bg/40 mt-0.5">%</p>
              </div>
              {(result.plan === 'p' || result.plan === 'fu') && (
                <div>
                  <p className="text-[10px] text-bg/40 uppercase tracking-wider">Custo mensal total</p>
                  <p className="font-serif text-2xl font-medium text-bg mt-1">{fmt(result.ckm*(plano==='p'?pIn.km:fuIn.km))}</p>
                  <p className="text-[10px] text-bg/40 mt-0.5">R$/mês</p>
                </div>
              )}
              {result.plan === 'fu' && result.hora !== undefined && (
                <div>
                  <p className="text-[10px] text-bg/40 uppercase tracking-wider">Custo hora parada</p>
                  <p className="font-serif text-2xl font-medium text-bg mt-1">{fmt(result.hora)}</p>
                  <p className="text-[10px] text-bg/40 mt-0.5">R$/hora</p>
                </div>
              )}
            </div>

            {/* Percurso */}
            <div className="border-t border-bg/10 pt-4 mt-5">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-bg/40 mb-3">Calcular frete para um percurso específico</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex flex-col gap-1 flex-1 min-w-[90px]">
                  <label className="text-[10px] text-bg/40 uppercase tracking-wider">Distância (km)</label>
                  <input type="number" min="0" step="10" value={percIn.km||''} onChange={e=>setPercIn(p=>({...p,km:parseFloat(e.target.value)||0}))} placeholder="Ex: 850"
                    className="w-full px-2 py-1.5 rounded-md bg-bg/10 border border-bg/10 text-bg text-sm font-mono placeholder:text-bg/30 focus:outline-none focus:ring-1 focus:ring-bg/40"/>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                  <label className="text-[10px] text-bg/40 uppercase tracking-wider">Tipo</label>
                  <select value={percIn.tipo} onChange={e=>setPercIn(p=>({...p,tipo:e.target.value}))}
                    className="w-full px-2 py-1.5 rounded-md bg-bg/10 border border-bg/10 text-bg text-xs focus:outline-none focus:ring-1 focus:ring-bg/40">
                    <option value="1">Somente ida</option>
                    <option value="rt">Round trip (ida e volta)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-[90px]">
                  <label className="text-[10px] text-bg/40 uppercase tracking-wider">Pedágio (R$)</label>
                  <input type="number" min="0" step="10" value={percIn.ped||''} onChange={e=>setPercIn(p=>({...p,ped:parseFloat(e.target.value)||0}))} placeholder="0"
                    className="w-full px-2 py-1.5 rounded-md bg-bg/10 border border-bg/10 text-bg text-sm font-mono placeholder:text-bg/30 focus:outline-none focus:ring-1 focus:ring-bg/40"/>
                </div>
                {plano !== 'f' && (
                  <>
                    <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                      <label className="text-[10px] text-bg/40 uppercase tracking-wider">Seg. carga (% NF)</label>
                      <input type="number" min="0" step="0.01" value={percIn.segPct||''} onChange={e=>setPercIn(p=>({...p,segPct:parseFloat(e.target.value)||0}))} placeholder="Ex: 0.28"
                        className="w-full px-2 py-1.5 rounded-md bg-bg/10 border border-bg/10 text-bg text-sm font-mono placeholder:text-bg/30 focus:outline-none focus:ring-1 focus:ring-bg/40"/>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                      <label className="text-[10px] text-bg/40 uppercase tracking-wider">Valor NF (R$)</label>
                      <input type="number" min="0" step="1000" value={percIn.nf||''} onChange={e=>setPercIn(p=>({...p,nf:parseFloat(e.target.value)||0}))} placeholder="0"
                        className="w-full px-2 py-1.5 rounded-md bg-bg/10 border border-bg/10 text-bg text-sm font-mono placeholder:text-bg/30 focus:outline-none focus:ring-1 focus:ring-bg/40"/>
                    </div>
                  </>
                )}
                {plano === 'fu' && (
                  <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                    <label className="text-[10px] text-bg/40 uppercase tracking-wider">Escolta/AET (R$)</label>
                    <input type="number" min="0" step="100" value={percIn.esc||''} onChange={e=>setPercIn(p=>({...p,esc:parseFloat(e.target.value)||0}))} placeholder="0"
                      className="w-full px-2 py-1.5 rounded-md bg-bg/10 border border-bg/10 text-bg text-sm font-mono placeholder:text-bg/30 focus:outline-none focus:ring-1 focus:ring-bg/40"/>
                  </div>
                )}
                <button onClick={calcPerc}
                  className="flex items-center bg-bg/10 text-bg px-4 py-1.5 rounded-pill text-xs font-medium tracking-widest uppercase border border-bg/15 hover:bg-bg/20 transition-all whitespace-nowrap">
                  Calcular →
                </button>
              </div>

              {percResult && (
                <div className="mt-4 bg-bg/5 border border-bg/10 rounded-lg p-3">
                  <p className="text-[10px] font-semibold tracking-widest uppercase text-bg/40 mb-3">Resultado do Percurso</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                      <p className="text-[10px] text-bg/40 uppercase tracking-wider">Km total</p>
                      <p className="font-mono text-sm text-bg font-semibold mt-0.5">{fmt(percResult.kmt,0)} km{percIn.tipo==='rt'?' (ida+volta)':''}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-bg/40 uppercase tracking-wider">Custo operacional</p>
                      <p className="font-mono text-sm text-bg font-semibold mt-0.5">R$ {fmt(percResult.op)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-bg/40 uppercase tracking-wider">Pedágio</p>
                      <p className="font-mono text-sm text-bg font-semibold mt-0.5">R$ {fmt(percResult.ped)}</p>
                    </div>
                    {percResult.segv !== undefined && (
                      <div>
                        <p className="text-[10px] text-bg/40 uppercase tracking-wider">Seguro carga</p>
                        <p className="font-mono text-sm text-bg font-semibold mt-0.5">R$ {fmt(percResult.segv)}</p>
                      </div>
                    )}
                    {percResult.esc !== undefined && (
                      <div>
                        <p className="text-[10px] text-bg/40 uppercase tracking-wider">Escolta / AET</p>
                        <p className="font-mono text-sm text-bg font-semibold mt-0.5">R$ {fmt(percResult.esc)}</p>
                      </div>
                    )}
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-[10px] text-bg/40 uppercase tracking-wider">Frete total sugerido</p>
                      <p className="font-serif text-xl text-bg font-medium mt-0.5">R$ {fmt(percResult.total)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-bg/40 uppercase tracking-wider">Frete/km efetivo</p>
                      <p className="font-mono text-sm text-bg font-semibold mt-0.5">R$ {fmt(percResult.fefkm)}/km</p>
                    </div>
                    {percResult.dias !== undefined && (
                      <div>
                        <p className="text-[10px] text-bg/40 uppercase tracking-wider">Dias estimados</p>
                        <p className="font-mono text-sm text-bg font-semibold mt-0.5">{percResult.dias} dias (est.)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {plano === 'f' && (
            <p className="px-4 pb-4 text-[11px] text-text-muted leading-relaxed">
              <strong>Atenção:</strong> Versão gratuita com benchmarks de mercado. Para maior precisão use as versões Profissional ou Completa.
            </p>
          )}
        </div>
      )}

      {/* ── Salvar ── */}
      <div className="mt-5">
        <Button onClick={handleSave} loading={saving} fullWidth size="lg" variant={saved?'success':'primary'} disabled={!result}>
          <Save size={18} />
          {saved ? 'Custo/km salvo!' : result ? 'Salvar custo/km' : 'Calcule primeiro para salvar'}
        </Button>
      </div>
    </div>
  )
}
