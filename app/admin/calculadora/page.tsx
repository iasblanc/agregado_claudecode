'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Save, RotateCcw, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'

// ─── DEFAULT BENCHMARKS (mesmos valores da calculadora) ──────────────────────
const DEFAULT_VEICULOS = [
  // simples
  {id:'auto', tipo:'simples', cavalo_id:null, lbl:'Automóvel',  ico:'🚗', dim:null, km_l:11.0, km:3000,  vc:60000,  vr:0,      sal:1800, pc:5,  pr:0,  aet:0,  vidc:60,  rpc:0.5,   vidr:0,   rpr:0,      manut:null, sort_order:0},
  {id:'van',  tipo:'simples', cavalo_id:null, lbl:'Van',        ico:'🚐', dim:null, km_l:8.0,  km:5000,  vc:90000,  vr:0,      sal:1800, pc:4,  pr:0,  aet:0,  vidc:60,  rpc:0.5,   vidr:0,   rpr:0,      manut:null, sort_order:1},
  {id:'34',   tipo:'simples', cavalo_id:null, lbl:'3/4',        ico:'🚚', dim:null, km_l:7.0,  km:6000,  vc:150000, vr:0,      sal:2200, pc:6,  pr:0,  aet:0,  vidc:72,  rpc:0.5,   vidr:0,   rpr:0,      manut:null, sort_order:2},
  {id:'toco', tipo:'simples', cavalo_id:null, lbl:'Toco',       ico:'🚛', dim:null, km_l:4.5,  km:7000,  vc:200000, vr:80000,  sal:2810, pc:7,  pr:6,  aet:0,  vidc:84,  rpc:0.6,   vidr:84,  rpr:0.6,    manut:null, sort_order:3},
  {id:'tk8',  tipo:'simples', cavalo_id:null, lbl:'Truck 8m',   ico:'🚛', dim:null, km_l:5.5,  km:8200,  vc:300000, vr:110000, sal:2810, pc:7,  pr:0,  aet:0,  vidc:96,  rpc:0.6,   vidr:100, rpr:0.7344, manut:null, sort_order:4},
  {id:'tk9',  tipo:'simples', cavalo_id:null, lbl:'Truck 9m',   ico:'🚛', dim:null, km_l:5.0,  km:8200,  vc:300000, vr:140000, sal:2810, pc:11, pr:0,  aet:0,  vidc:96,  rpc:0.6,   vidr:100, rpr:0.7344, manut:null, sort_order:5},
  // cavalos
  {id:'c4x2', tipo:'cavalo',  cavalo_id:null, lbl:'Cavalo 4x2', ico:'🚛', dim:null, km_l:null, km:null,  vc:null,   vr:null,   sal:2810, pc:null, pr:null, aet:null, vidc:null, rpc:null, vidr:null, rpr:null, manut:null, sort_order:10},
  {id:'c6x2', tipo:'cavalo',  cavalo_id:null, lbl:'Cavalo 6x2', ico:'🚛', dim:null, km_l:null, km:null,  vc:null,   vr:null,   sal:2810, pc:null, pr:null, aet:null, vidc:null, rpc:null, vidr:null, rpr:null, manut:null, sort_order:11},
  {id:'c6x4', tipo:'cavalo',  cavalo_id:null, lbl:'Cavalo 6x4', ico:'🚛', dim:null, km_l:null, km:null,  vc:null,   vr:null,   sal:3000, pc:null, pr:null, aet:null, vidc:null, rpc:null, vidr:null, rpr:null, manut:null, sort_order:12},
  // implementos c4x2
  {id:'cs12', tipo:'implemento', cavalo_id:'c4x2', lbl:'Carga Seca 12m', ico:null, dim:'12m·25,5t', km_l:3.3, km:10000, vc:620000, vr:200000, sal:null, pc:7,  pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.8062, sort_order:20},
  {id:'pr12', tipo:'implemento', cavalo_id:'c4x2', lbl:'Prancha 12m',    ico:null, dim:'12m·22,5t', km_l:2.8, km:10000, vc:620000, vr:380000, sal:null, pc:7,  pr:13, aet:15, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.9862, sort_order:21},
  {id:'fr12', tipo:'implemento', cavalo_id:'c4x2', lbl:'Frigorífico 12m',ico:null, dim:'12m·18,0t', km_l:3.0, km:10000, vc:620000, vr:280000, sal:null, pc:7,  pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.9462, sort_order:22},
  {id:'si12', tipo:'implemento', cavalo_id:'c4x2', lbl:'Sider 12m',      ico:null, dim:'12m·27,5t', km_l:3.2, km:10000, vc:620000, vr:160000, sal:null, pc:7,  pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.7862, sort_order:23},
  {id:'ba12', tipo:'implemento', cavalo_id:'c4x2', lbl:'Baú 12m',        ico:null, dim:'12m·23,5t', km_l:3.1, km:10000, vc:620000, vr:180000, sal:null, pc:7,  pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.8262, sort_order:24},
  {id:'gr12', tipo:'implemento', cavalo_id:'c4x2', lbl:'Graneleiro 12m', ico:null, dim:'12m·26,0t', km_l:3.2, km:10000, vc:620000, vr:150000, sal:null, pc:7,  pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.7662, sort_order:25},
  {id:'tn12', tipo:'implemento', cavalo_id:'c4x2', lbl:'Tanque',          ico:null, dim:'12m·30,0t', km_l:3.0, km:10000, vc:620000, vr:400000, sal:null, pc:7,  pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.9062, sort_order:26},
  // implementos c6x2
  {id:'cs15', tipo:'implemento', cavalo_id:'c6x2', lbl:'Carga Seca 15m', ico:null, dim:'15m·30,5t', km_l:3.0, km:10000, vc:700000, vr:200000, sal:null, pc:11, pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.8862, sort_order:30},
  {id:'pr15', tipo:'implemento', cavalo_id:'c6x2', lbl:'Prancha 15m',    ico:null, dim:'15m·26,3t', km_l:2.7, km:10000, vc:700000, vr:380000, sal:null, pc:11, pr:13, aet:15, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:1.057,  sort_order:31},
  {id:'at23', tipo:'implemento', cavalo_id:'c6x2', lbl:'Automotiva 23m', ico:null, dim:'23m·24,8t', km_l:2.7, km:10000, vc:700000, vr:400000, sal:null, pc:11, pr:13, aet:15, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:1.077,  sort_order:32},
  {id:'cg23', tipo:'implemento', cavalo_id:'c6x2', lbl:'Cegonha 23m',    ico:null, dim:'23m·24,8t', km_l:2.7, km:10000, vc:700000, vr:400000, sal:null, pc:11, pr:13, aet:15, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:1.077,  sort_order:33},
  {id:'fr15', tipo:'implemento', cavalo_id:'c6x2', lbl:'Frigorífico 15m',ico:null, dim:'15m·22,0t', km_l:2.8, km:10000, vc:700000, vr:320000, sal:null, pc:11, pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.9862, sort_order:34},
  {id:'si15', tipo:'implemento', cavalo_id:'c6x2', lbl:'Sider 15m',      ico:null, dim:'15m·32,5t', km_l:3.0, km:10000, vc:700000, vr:180000, sal:null, pc:11, pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.8262, sort_order:35},
  {id:'ba15', tipo:'implemento', cavalo_id:'c6x2', lbl:'Baú 15m',        ico:null, dim:'15m·28,0t', km_l:2.9, km:10000, vc:700000, vr:200000, sal:null, pc:11, pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.8462, sort_order:36},
  {id:'gr15', tipo:'implemento', cavalo_id:'c6x2', lbl:'Graneleiro 15m', ico:null, dim:'15m·31,0t', km_l:3.0, km:10000, vc:700000, vr:170000, sal:null, pc:11, pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.8062, sort_order:37},
  {id:'tn15', tipo:'implemento', cavalo_id:'c6x2', lbl:'Tanque',          ico:null, dim:'15m·33,0t', km_l:2.8, km:10000, vc:700000, vr:450000, sal:null, pc:11, pr:13, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.9662, sort_order:38},
  // implementos c6x4
  {id:'pr17', tipo:'implemento', cavalo_id:'c6x4', lbl:'Prancha 17m',    ico:null, dim:'17m·39,8t', km_l:2.5, km:10000, vc:740000, vr:450000, sal:null, pc:11, pr:17, aet:15, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:1.167,  sort_order:40},
  {id:'pr19', tipo:'implemento', cavalo_id:'c6x4', lbl:'Prancha 19m',    ico:null, dim:'19m·39,8t', km_l:2.5, km:10000, vc:740000, vr:480000, sal:null, pc:11, pr:17, aet:15, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:1.197,  sort_order:41},
  {id:'bt24', tipo:'implemento', cavalo_id:'c6x4', lbl:'Bi-Trem 24m',    ico:null, dim:'24m·36,8t', km_l:2.5, km:10000, vc:740000, vr:320000, sal:null, pc:11, pr:25, aet:15, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:1.037,  sort_order:42},
  {id:'rt27', tipo:'implemento', cavalo_id:'c6x4', lbl:'Rodotrem 27m',   ico:null, dim:'27m·53,8t', km_l:2.5, km:10000, vc:740000, vr:320000, sal:null, pc:11, pr:25, aet:15, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:1.037,  sort_order:43},
  {id:'cs17', tipo:'implemento', cavalo_id:'c6x4', lbl:'Carga Seca 17m', ico:null, dim:'17m·41,5t', km_l:2.5, km:10000, vc:740000, vr:220000, sal:null, pc:11, pr:17, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.9062, sort_order:44},
  {id:'fr17', tipo:'implemento', cavalo_id:'c6x4', lbl:'Frigorífico 17m',ico:null, dim:'17m·36,0t', km_l:2.3, km:10000, vc:740000, vr:380000, sal:null, pc:11, pr:17, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:1.047,  sort_order:45},
  {id:'si17', tipo:'implemento', cavalo_id:'c6x4', lbl:'Sider 17m',      ico:null, dim:'17m·42,0t', km_l:2.5, km:10000, vc:740000, vr:200000, sal:null, pc:11, pr:17, aet:0,  vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.9262, sort_order:46},
  // implementos 3/4
  {id:'34cs', tipo:'implemento', cavalo_id:'34',   lbl:'Carga Seca', ico:null, dim:'4m·3,5t',  km_l:7.0, km:6000, vc:150000, vr:50000,  sal:null, pc:6,  pr:4,  aet:0, vidc:72, rpc:0.5, vidr:84,  rpr:0.6,    manut:0.65, sort_order:50},
  {id:'34fr', tipo:'implemento', cavalo_id:'34',   lbl:'Frigorífico', ico:null, dim:'4m·2,5t',  km_l:6.5, km:6000, vc:150000, vr:90000,  sal:null, pc:6,  pr:4,  aet:0, vidc:72, rpc:0.5, vidr:84,  rpr:0.6,    manut:0.85, sort_order:51},
  {id:'34si', tipo:'implemento', cavalo_id:'34',   lbl:'Sider',      ico:null, dim:'4m·3,5t',  km_l:7.0, km:6000, vc:150000, vr:60000,  sal:null, pc:6,  pr:4,  aet:0, vidc:72, rpc:0.5, vidr:84,  rpr:0.6,    manut:0.68, sort_order:52},
  {id:'34ba', tipo:'implemento', cavalo_id:'34',   lbl:'Baú',        ico:null, dim:'4m·3,0t',  km_l:7.0, km:6000, vc:150000, vr:55000,  sal:null, pc:6,  pr:4,  aet:0, vidc:72, rpc:0.5, vidr:84,  rpr:0.6,    manut:0.67, sort_order:53},
  // implementos toco
  {id:'tccs', tipo:'implemento', cavalo_id:'toco', lbl:'Carga Seca', ico:null, dim:'6m·8,0t',  km_l:4.5, km:7000, vc:200000, vr:80000,  sal:null, pc:7,  pr:6,  aet:0, vidc:84, rpc:0.6, vidr:84,  rpr:0.6,    manut:0.72, sort_order:60},
  {id:'tcfr', tipo:'implemento', cavalo_id:'toco', lbl:'Frigorífico', ico:null, dim:'6m·6,5t',  km_l:4.2, km:7000, vc:200000, vr:130000, sal:null, pc:7,  pr:6,  aet:0, vidc:84, rpc:0.6, vidr:84,  rpr:0.6,    manut:0.90, sort_order:61},
  {id:'tcsi', tipo:'implemento', cavalo_id:'toco', lbl:'Sider',      ico:null, dim:'6m·9,0t',  km_l:4.5, km:7000, vc:200000, vr:90000,  sal:null, pc:7,  pr:6,  aet:0, vidc:84, rpc:0.6, vidr:84,  rpr:0.6,    manut:0.74, sort_order:62},
  {id:'tcba', tipo:'implemento', cavalo_id:'toco', lbl:'Baú',        ico:null, dim:'6m·7,5t',  km_l:4.5, km:7000, vc:200000, vr:85000,  sal:null, pc:7,  pr:6,  aet:0, vidc:84, rpc:0.6, vidr:84,  rpr:0.6,    manut:0.73, sort_order:63},
  {id:'tcgr', tipo:'implemento', cavalo_id:'toco', lbl:'Graneleiro', ico:null, dim:'6m·9,5t',  km_l:4.5, km:7000, vc:200000, vr:70000,  sal:null, pc:7,  pr:6,  aet:0, vidc:84, rpc:0.6, vidr:84,  rpr:0.6,    manut:0.70, sort_order:64},
  // implementos tk8
  {id:'t8cs', tipo:'implemento', cavalo_id:'tk8',  lbl:'Carga Seca', ico:null, dim:'8m·13,0t', km_l:5.5, km:8200, vc:300000, vr:110000, sal:null, pc:7,  pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.78, sort_order:70},
  {id:'t8fr', tipo:'implemento', cavalo_id:'tk8',  lbl:'Frigorífico', ico:null, dim:'8m·10,0t', km_l:5.0, km:8200, vc:300000, vr:170000, sal:null, pc:7,  pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.95, sort_order:71},
  {id:'t8si', tipo:'implemento', cavalo_id:'tk8',  lbl:'Sider',      ico:null, dim:'8m·14,0t', km_l:5.5, km:8200, vc:300000, vr:120000, sal:null, pc:7,  pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.80, sort_order:72},
  {id:'t8ba', tipo:'implemento', cavalo_id:'tk8',  lbl:'Baú',        ico:null, dim:'8m·12,0t', km_l:5.5, km:8200, vc:300000, vr:115000, sal:null, pc:7,  pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.79, sort_order:73},
  {id:'t8gr', tipo:'implemento', cavalo_id:'tk8',  lbl:'Graneleiro', ico:null, dim:'8m·15,0t', km_l:5.5, km:8200, vc:300000, vr:100000, sal:null, pc:7,  pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.76, sort_order:74},
  // implementos tk9
  {id:'t9cs', tipo:'implemento', cavalo_id:'tk9',  lbl:'Carga Seca', ico:null, dim:'9m·14,0t', km_l:5.0, km:8200, vc:300000, vr:140000, sal:null, pc:11, pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.82, sort_order:80},
  {id:'t9fr', tipo:'implemento', cavalo_id:'tk9',  lbl:'Frigorífico', ico:null, dim:'9m·11,0t', km_l:4.5, km:8200, vc:300000, vr:200000, sal:null, pc:11, pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.99, sort_order:81},
  {id:'t9si', tipo:'implemento', cavalo_id:'tk9',  lbl:'Sider',      ico:null, dim:'9m·15,0t', km_l:5.0, km:8200, vc:300000, vr:150000, sal:null, pc:11, pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.84, sort_order:82},
  {id:'t9ba', tipo:'implemento', cavalo_id:'tk9',  lbl:'Baú',        ico:null, dim:'9m·13,0t', km_l:5.0, km:8200, vc:300000, vr:145000, sal:null, pc:11, pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.83, sort_order:83},
  {id:'t9gr', tipo:'implemento', cavalo_id:'tk9',  lbl:'Graneleiro', ico:null, dim:'9m·16,0t', km_l:5.0, km:8200, vc:300000, vr:130000, sal:null, pc:11, pr:0,  aet:0, vidc:96, rpc:0.6, vidr:100, rpr:0.7344, manut:0.80, sort_order:84},
]

const DEFAULT_K = {
  enc:0.9918, iof:0.0738, ipva:0.015, lic:69.12, taco:170, dpvat:110.38,
  salmec:1951.78, plr:1497.68, txrc:0.6, txrr:0.7344, txcap:0.035,
  ppn:2300, recap:2, recapp:650, vpn:275000, pnperda:0.07,
  kmoleo:30000, carter:35, rcar:9, kmdif:53000, cdif:47.2, ocarter:16, odif:20.23,
  arlar:0.06493, arlap:1.52, lav:290, kmlav:15000,
  gris:22.5, rastr:100, aet:0, cintas:256.67, ppq:0.12,
  dias:24, horas:9.5, vel:61, vmec:3,
}

const DEFAULT_ADM_TBL = [
  {km:10,a:.0943,l:.350}, {km:50,a:.0644,l:.350}, {km:100,a:.040,l:.350},
  {km:200,a:.0392,l:.3465}, {km:300,a:.0384,l:.343}, {km:400,a:.0376,l:.3396},
  {km:500,a:.0369,l:.3362}, {km:600,a:.0362,l:.3328}, {km:700,a:.0354,l:.3295},
  {km:800,a:.0347,l:.3262}, {km:900,a:.034,l:.323}, {km:1000,a:.0333,l:.3197},
  {km:1200,a:.032,l:.3134}, {km:1500,a:.0301,l:.3041}, {km:2000,a:.029,l:.2987},
  {km:4000,a:.026,l:.280},
]

type VRow = {
  id: string; tipo: string; cavalo_id: string | null; lbl: string; ico: string | null; dim: string | null
  km_l: number | null; km: number | null; vc: number | null; vr: number | null; sal: number | null
  pc: number | null; pr: number | null; aet: number | null; vidc: number | null; rpc: number | null
  vidr: number | null; rpr: number | null; manut: number | null; sort_order: number
}
type KRow = typeof DEFAULT_K
type AdmRow = {km: number; a: number; l: number}

function n(v: number | null | undefined) { return v ?? '' }

export default function AdminCalculadoraPage() {
  const [veiculos, setVeiculos] = useState<VRow[]>([])
  const [kData, setKData] = useState<KRow>(DEFAULT_K)
  const [admTbl, setAdmTbl] = useState<AdmRow[]>(DEFAULT_ADM_TBL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editVId, setEditVId] = useState<string | null>(null)
  const [editVRow, setEditVRow] = useState<VRow | null>(null)
  const [openSection, setOpenSection] = useState<string>('simples')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('calc_veiculos').select('*').order('sort_order'),
      supabase.from('calc_constantes').select('*').eq('id', 1).maybeSingle(),
    ]).then(([{data: vd}, {data: cd}]) => {
      if (vd && vd.length > 0) setVeiculos(vd as VRow[])
      else setVeiculos(DEFAULT_VEICULOS)
      if (cd) {
        if (cd.k && Object.keys(cd.k).length > 0) setKData(cd.k as KRow)
        if (cd.adm_tbl && (cd.adm_tbl as AdmRow[]).length > 0) setAdmTbl(cd.adm_tbl as AdmRow[])
      }
      setLoading(false)
    })
  }, [])

  async function handleRestoreDefaults() {
    if (!confirm('Restaurar todos os benchmarks para os valores padrão do sistema?')) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('calc_veiculos').delete().neq('id', '__never__')
    const {error} = await supabase.from('calc_veiculos').insert(DEFAULT_VEICULOS)
    if (!error) {
      await supabase.from('calc_constantes').upsert({id:1, k:DEFAULT_K, adm_tbl:DEFAULT_ADM_TBL, updated_at: new Date().toISOString()}, {onConflict:'id'})
      setVeiculos(DEFAULT_VEICULOS)
      setKData(DEFAULT_K)
      setAdmTbl(DEFAULT_ADM_TBL)
      setMsg('Defaults restaurados com sucesso!')
    } else {
      setMsg('Erro ao restaurar: ' + error.message)
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  async function saveVeiculo(row: VRow) {
    const supabase = createClient()
    const {error} = await supabase.from('calc_veiculos').upsert(row, {onConflict:'id'})
    if (!error) {
      setVeiculos(prev => prev.map(v => v.id === row.id ? row : v))
      setEditVId(null)
      setEditVRow(null)
      setMsg('Salvo!')
      setTimeout(() => setMsg(''), 2000)
    } else {
      setMsg('Erro: ' + error.message)
    }
  }

  async function saveConstantes() {
    setSaving(true)
    const supabase = createClient()
    const {error} = await supabase.from('calc_constantes').upsert({id:1, k:kData, adm_tbl:admTbl, updated_at: new Date().toISOString()}, {onConflict:'id'})
    setSaving(false)
    setMsg(error ? 'Erro: ' + error.message : 'Constantes salvas!')
    setTimeout(() => setMsg(''), 3000)
  }

  function startEdit(v: VRow) {
    setEditVId(v.id)
    setEditVRow({...v})
  }

  function SectionHeader({id, label}: {id: string; label: string}) {
    const open = openSection === id
    return (
      <button onClick={() => setOpenSection(open ? '' : id)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#E8E4DC] border-b border-border text-sm font-semibold text-text-primary">
        {label}
        {open ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
      </button>
    )
  }

  const simples = veiculos.filter(v => v.tipo === 'simples')
  const cavalos = veiculos.filter(v => v.tipo === 'cavalo')
  const impls = veiculos.filter(v => v.tipo === 'implemento')
  const kEntries = Object.entries(kData) as [keyof KRow, number][]

  if (loading) return <div className="py-20 text-center text-text-muted">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-text-muted text-sm font-sans">Calculadora de Custo/KM</p>
          <h1 className="font-serif text-2xl font-bold text-text-primary">Benchmarks & Constantes</h1>
          <p className="text-text-secondary text-sm mt-0.5">Gerencie os valores padrão exibidos aos agregados</p>
        </div>
        <button onClick={handleRestoreDefaults} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:text-danger hover:border-danger transition-colors">
          <RotateCcw size={14}/>
          Restaurar defaults
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-2.5 rounded-lg text-sm font-medium ${msg.startsWith('Erro') ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
          {msg}
        </div>
      )}

      {/* ── Veículos Simples ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <SectionHeader id="simples" label="Veículos Simples" />
        {openSection === 'simples' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['ID','Label','Ico','km/L','km/mês','Valor cav','Valor impl','Salário','Pneus C','Pneus R',''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-muted font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {simples.map(v => editVId === v.id && editVRow ? (
                  <tr key={v.id} className="bg-accent/5">
                    <td className="px-3 py-2 font-mono text-text-muted">{v.id}</td>
                    {(['lbl','ico'] as const).map(f => (
                      <td key={f} className="px-2 py-1">
                        <input type="text" value={String(editVRow[f]??'')} onChange={e=>setEditVRow(p=>p?({...p,[f]:e.target.value}):p)}
                          className="w-16 px-1.5 py-1 border border-accent rounded text-xs bg-bg"/>
                      </td>
                    ))}
                    {(['km_l','km','vc','vr','sal','pc','pr'] as const).map(f => (
                      <td key={f} className="px-2 py-1">
                        <input type="number" value={n(editVRow[f] as number)} onChange={e=>setEditVRow(p=>p?({...p,[f]:parseFloat(e.target.value)||0}):p)}
                          className="w-20 px-1.5 py-1 border border-accent rounded text-xs bg-bg font-mono"/>
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <div className="flex gap-1">
                        <button onClick={()=>saveVeiculo(editVRow)} className="p-1 text-success hover:bg-success/10 rounded"><Check size={14}/></button>
                        <button onClick={()=>{setEditVId(null);setEditVRow(null)}} className="p-1 text-danger hover:bg-danger/10 rounded"><X size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={v.id} className="hover:bg-[#E8E4DC]/40">
                    <td className="px-3 py-2 font-mono text-text-muted">{v.id}</td>
                    <td className="px-3 py-2 font-medium text-text-primary">{v.lbl}</td>
                    <td className="px-3 py-2">{v.ico}</td>
                    <td className="px-3 py-2 font-mono">{v.km_l}</td>
                    <td className="px-3 py-2 font-mono">{v.km?.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-mono">{v.vc?.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-mono">{v.vr?.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-mono">{v.sal?.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-mono">{v.pc}</td>
                    <td className="px-3 py-2 font-mono">{v.pr}</td>
                    <td className="px-3 py-2">
                      <button onClick={()=>startEdit(v)} className="p-1 text-text-muted hover:text-accent rounded"><Pencil size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Cavalos ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <SectionHeader id="cavalos" label="Cavalos Mecânicos" />
        {openSection === 'cavalos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['ID','Label','Ico','Salário Motorista',''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-muted font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cavalos.map(v => editVId === v.id && editVRow ? (
                  <tr key={v.id} className="bg-accent/5">
                    <td className="px-3 py-2 font-mono text-text-muted">{v.id}</td>
                    {(['lbl','ico'] as const).map(f => (
                      <td key={f} className="px-2 py-1">
                        <input type="text" value={String(editVRow[f]??'')} onChange={e=>setEditVRow(p=>p?({...p,[f]:e.target.value}):p)}
                          className="w-20 px-1.5 py-1 border border-accent rounded text-xs bg-bg"/>
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <input type="number" value={n(editVRow.sal)} onChange={e=>setEditVRow(p=>p?({...p,sal:parseFloat(e.target.value)||0}):p)}
                        className="w-24 px-1.5 py-1 border border-accent rounded text-xs bg-bg font-mono"/>
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex gap-1">
                        <button onClick={()=>saveVeiculo(editVRow)} className="p-1 text-success hover:bg-success/10 rounded"><Check size={14}/></button>
                        <button onClick={()=>{setEditVId(null);setEditVRow(null)}} className="p-1 text-danger hover:bg-danger/10 rounded"><X size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={v.id} className="hover:bg-[#E8E4DC]/40">
                    <td className="px-3 py-2 font-mono text-text-muted">{v.id}</td>
                    <td className="px-3 py-2 font-medium text-text-primary">{v.lbl}</td>
                    <td className="px-3 py-2">{v.ico}</td>
                    <td className="px-3 py-2 font-mono">R$ {v.sal?.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2">
                      <button onClick={()=>startEdit(v)} className="p-1 text-text-muted hover:text-accent rounded"><Pencil size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Implementos ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <SectionHeader id="implementos" label="Implementos / Carretas" />
        {openSection === 'implementos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['ID','Cavalo','Label','Dim','km/L','km/mês','Valor cav','Valor impl','Pneus C','Pneus R','AET','Manut R$/km',''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-muted font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {impls.map(v => editVId === v.id && editVRow ? (
                  <tr key={v.id} className="bg-accent/5">
                    <td className="px-3 py-2 font-mono text-text-muted">{v.id}</td>
                    <td className="px-3 py-2 text-text-muted">{v.cavalo_id}</td>
                    {(['lbl','dim'] as const).map(f => (
                      <td key={f} className="px-2 py-1">
                        <input type="text" value={String(editVRow[f]??'')} onChange={e=>setEditVRow(p=>p?({...p,[f]:e.target.value}):p)}
                          className="w-20 px-1.5 py-1 border border-accent rounded text-xs bg-bg"/>
                      </td>
                    ))}
                    {(['km_l','km','vc','vr','pc','pr','aet','manut'] as const).map(f => (
                      <td key={f} className="px-2 py-1">
                        <input type="number" value={n(editVRow[f] as number)} onChange={e=>setEditVRow(p=>p?({...p,[f]:parseFloat(e.target.value)||0}):p)}
                          className="w-20 px-1.5 py-1 border border-accent rounded text-xs bg-bg font-mono"/>
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <div className="flex gap-1">
                        <button onClick={()=>saveVeiculo(editVRow)} className="p-1 text-success hover:bg-success/10 rounded"><Check size={14}/></button>
                        <button onClick={()=>{setEditVId(null);setEditVRow(null)}} className="p-1 text-danger hover:bg-danger/10 rounded"><X size={14}/></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={v.id} className="hover:bg-[#E8E4DC]/40">
                    <td className="px-3 py-2 font-mono text-text-muted">{v.id}</td>
                    <td className="px-3 py-2 text-text-muted">{v.cavalo_id}</td>
                    <td className="px-3 py-2 font-medium text-text-primary">{v.lbl}</td>
                    <td className="px-3 py-2 text-text-muted">{v.dim}</td>
                    <td className="px-3 py-2 font-mono">{v.km_l}</td>
                    <td className="px-3 py-2 font-mono">{v.km?.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-mono">{v.vc?.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-mono">{v.vr?.toLocaleString('pt-BR')}</td>
                    <td className="px-3 py-2 font-mono">{v.pc}</td>
                    <td className="px-3 py-2 font-mono">{v.pr}</td>
                    <td className="px-3 py-2 font-mono">{v.aet}</td>
                    <td className="px-3 py-2 font-mono">{v.manut}</td>
                    <td className="px-3 py-2">
                      <button onClick={()=>startEdit(v)} className="p-1 text-text-muted hover:text-accent rounded"><Pencil size={13}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Constantes K ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <SectionHeader id="constantes" label="Constantes do Sistema (K)" />
        {openSection === 'constantes' && (
          <div className="p-4">
            <p className="text-xs text-text-muted mb-4">Parâmetros técnicos do setor usados nos cálculos. Altere com cuidado — afetam todos os planos.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {kEntries.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase tracking-wide text-text-muted">{k}</label>
                  <input type="number" step="any" value={v}
                    onChange={e => setKData(prev => ({...prev, [k]: parseFloat(e.target.value) || 0}))}
                    className="px-2 py-1.5 border border-border rounded text-xs font-mono bg-bg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/40 focus:border-accent"/>
                </div>
              ))}
            </div>
            <button onClick={saveConstantes} disabled={saving}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-[#1A1915] transition-colors disabled:opacity-50">
              <Save size={14}/>
              {saving ? 'Salvando...' : 'Salvar constantes K'}
            </button>
          </div>
        )}
      </div>

      {/* ── Tabela ADM ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <SectionHeader id="adm" label="Tabela ADM (Interpolação por Distância)" />
        {openSection === 'adm' && (
          <div className="p-4">
            <p className="text-xs text-text-muted mb-4">Pontos para interpolação linear de ADM% e Lucro% por distância de viagem.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-muted font-semibold">Distância (km)</th>
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-muted font-semibold">ADM (decimal)</th>
                    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-text-muted font-semibold">Lucro (decimal)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {admTbl.map((row, i) => (
                    <tr key={i} className="hover:bg-[#E8E4DC]/40">
                      <td className="px-3 py-1.5">
                        <input type="number" value={row.km} onChange={e => setAdmTbl(prev => prev.map((r,j) => j===i ? {...r, km: parseFloat(e.target.value)||0} : r))}
                          className="w-20 px-2 py-1 border border-border rounded text-xs font-mono bg-bg focus:outline-none focus:border-accent"/>
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" step="0.0001" value={row.a} onChange={e => setAdmTbl(prev => prev.map((r,j) => j===i ? {...r, a: parseFloat(e.target.value)||0} : r))}
                          className="w-24 px-2 py-1 border border-border rounded text-xs font-mono bg-bg focus:outline-none focus:border-accent"/>
                      </td>
                      <td className="px-3 py-1.5">
                        <input type="number" step="0.0001" value={row.l} onChange={e => setAdmTbl(prev => prev.map((r,j) => j===i ? {...r, l: parseFloat(e.target.value)||0} : r))}
                          className="w-24 px-2 py-1 border border-border rounded text-xs font-mono bg-bg focus:outline-none focus:border-accent"/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={saveConstantes} disabled={saving}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-accent text-bg rounded-lg text-sm font-medium hover:bg-[#1A1915] transition-colors disabled:opacity-50">
              <Save size={14}/>
              {saving ? 'Salvando...' : 'Salvar tabela ADM'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
