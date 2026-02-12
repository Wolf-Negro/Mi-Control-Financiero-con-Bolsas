'use client'
import { useState, useEffect, useMemo } from 'react'
import { DISTRIBUCION_CUENTAS, NOMBRES_CUENTAS } from './config-financiera'

interface Registro {
  id: number;
  monto: number;
  nota: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  categoria?: string;
  esAutomatico?: boolean;
}

export default function Home() {
  const [monto, setMonto] = useState<number>(0)
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [esAuto, setEsAuto] = useState(true)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('gastoDiario')
  const [historial, setHistorial] = useState<Registro[]>([])
  const [metaMensual, setMetaMensual] = useState<number>(5000) // Meta por defecto
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [verDetalleId, setVerDetalleId] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  useEffect(() => {
    const guardados = localStorage.getItem('mis_finanzas_v4')
    if (guardados) setHistorial(JSON.parse(guardados))
    const metaGuardada = localStorage.getItem('meta_mensual')
    if (metaGuardada) setMetaMensual(Number(metaGuardada))
  }, [])

  const guardarRegistro = () => {
    if (monto <= 0) return alert("Monto inválido");
    let nuevoHistorial;
    const datosBase: Registro = { 
      id: editandoId || Date.now(),
      monto, nota: nota || 'Sin concepto', fecha, tipo, 
      categoria: (tipo === 'egreso' || !esAuto) ? categoriaSeleccionada : undefined,
      esAutomatico: tipo === 'ingreso' ? esAuto : undefined
    };
    nuevoHistorial = editandoId ? historial.map(r => r.id === editandoId ? datosBase : r) : [datosBase, ...historial];
    setHistorial(nuevoHistorial);
    localStorage.setItem('mis_finanzas_v4', JSON.stringify(nuevoHistorial));
    setMonto(0); setNota(''); setEditandoId(null);
  }

  const saldosPorBolsa = useMemo(() => {
    const saldos = Object.fromEntries(Object.keys(DISTRIBUCION_CUENTAS).map(k => [k, 0]));
    historial.forEach(r => {
      if (r.tipo === 'ingreso') {
        if (r.esAutomatico) Object.entries(DISTRIBUCION_CUENTAS).forEach(([b, p]) => saldos[b] += r.monto * p);
        else if (r.categoria) saldos[r.categoria] += r.monto;
      } else if (r.tipo === 'egreso' && r.categoria) saldos[r.categoria] -= r.monto;
    });
    return saldos;
  }, [historial]);

  const ingresosMes = useMemo(() => historial.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    return r.tipo === 'ingreso' && f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
  }).reduce((acc, r) => acc + r.monto, 0), [historial, mesFiltro, anioFiltro]);

  const porcMeta = Math.min((ingresosMes / metaMensual) * 100, 100);
  const saldoGlobal = Object.values(saldosPorBolsa).reduce((acc, val) => acc + val, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-24 font-sans max-w-md mx-auto text-slate-900 leading-tight">
      <header className="flex justify-between items-start mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-black text-blue-700 italic tracking-tighter leading-none uppercase">Mi Control S/</h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Saldo: <span className="text-blue-600">S/ {saldoGlobal.toFixed(2)}</span></p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => setTipo('ingreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tipo === 'ingreso' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>RECIBIDO</button>
          <button onClick={() => setTipo('egreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tipo === 'egreso' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>PAGADO</button>
        </div>
      </header>

      {/* SECCIÓN DE METAS Y GRÁFICO */}
      <section className="bg-blue-900 rounded-[2.2rem] p-6 shadow-2xl shadow-blue-900/20 mb-6 text-white overflow-hidden relative">
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] mb-1">Meta del Mes</p>
              <h2 className="text-2xl font-black tracking-tighter">S/ {ingresosMes.toFixed(2)} <span className="text-sm text-blue-400 font-bold">/ S/ {metaMensual}</span></h2>
            </div>
            <button onClick={() => { const n = prompt("Nueva meta:", metaMensual.toString()); if(n) { setMetaMensual(Number(n)); localStorage.setItem('meta_mensual', n); }}} className="bg-blue-800 p-2 rounded-full hover:bg-blue-700 transition-colors">⚙️</button>
          </div>
          
          {/* Gráfico de Progreso */}
          <div className="h-4 bg-blue-950 rounded-full overflow-hidden flex items-center p-1 border border-blue-800">
            <div className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(74,222,128,0.5)]" style={{ width: `${porcMeta}%` }}></div>
          </div>
          <div className="flex justify-between mt-2">
            <p className="text-[9px] font-black text-blue-400 uppercase">{porcMeta.toFixed(0)}% Completado</p>
            <p className="text-[9px] font-black text-blue-400 uppercase">Faltan: S/ {Math.max(metaMensual - ingresosMes, 0).toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* BOLSAS */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {Object.entries(saldosPorBolsa).map(([bolsa, saldo]) => (
          <div key={bolsa} className="min-w-[130px] bg-white p-4 rounded-3xl border-b-[6px] border-blue-600 shadow-xl shadow-blue-900/5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{NOMBRES_CUENTAS[bolsa as keyof typeof NOMBRES_CUENTAS]}</p>
            <p className={`text-base font-black ${saldo < 0 ? 'text-red-500' : 'text-slate-900'}`}>S/ {saldo.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* FORMULARIO */}
      <section className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/10 mb-6 border border-white space-y-4">
        <div className="flex justify-between items-center">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full outline-none" />
          {tipo === 'ingreso' && (
            <button onClick={() => setEsAuto(!esAuto)} className={`text-[9px] font-black px-4 py-2 rounded-full border-2 transition-all ${esAuto ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'}`}>
              {esAuto ? 'AUTO %' : 'MANUAL'}
            </button>
          )}
        </div>

        {(tipo === 'egreso' || !esAuto) && (
          <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)} className="w-full text-xs font-black text-slate-700 bg-slate-50 p-4 rounded-2xl outline-none border-2 border-slate-100">
            {Object.entries(NOMBRES_CUENTAS).map(([id, nombre]) => <option key={id} value={id}>Bolsa: {nombre}</option>)}
          </select>
        )}

        <div className="flex items-center border-b-4 border-slate-100 focus-within:border-blue-500 transition-all pb-2">
          <span className="text-3xl font-black text-slate-300 mr-2 italic">S/</span>
          <input type="number" value={monto || ''} placeholder="0.00" className="w-full text-5xl font-black outline-none bg-transparent" onChange={(e) => setMonto(Number(e.target.value))} />
        </div>
        <input type="text" value={nota} placeholder="¿Qué concepto es?" className="w-full text-base font-bold outline-none text-slate-700 bg-slate-50 p-4 rounded-2xl" onChange={(e) => setNota(e.target.value)} />
      </section>

      <button onClick={guardarRegistro} className={`w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl transition-all active:scale-95 mb-10 uppercase tracking-widest ${tipo === 'ingreso' ? 'bg-green-600' : 'bg-red-600'}`}>
        {editandoId ? 'Actualizar Registro' : `Confirmar ${tipo}`}
      </button>

      {/* BUSCADOR Y MES */}
      <div className="space-y-4 mb-8">
        <div className="relative">
          <input type="text" placeholder="Buscar movimiento..." className="w-full bg-white p-5 pl-14 rounded-3xl text-sm font-bold shadow-sm outline-none border-2 border-transparent focus:border-blue-200" onChange={(e) => setBusqueda(e.target.value)} />
          <span className="absolute left-6 top-5 text-lg">🔍</span>
        </div>
        <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm border border-slate-200 font-black text-[11px] text-blue-600 uppercase">
          <button onClick={() => setMesFiltro(m => m === 0 ? 11 : m - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full">‹</button>
          <span>{meses[mesFiltro]} {anioFiltro}</span>
          <button onClick={() => setMesFiltro(m => m === 11 ? 0 : m + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full">›</button>
        </div>
      </div>

      {/* LISTA DE MOVIMIENTOS */}
      <div className="space-y-4">
        {historial.filter(r => {
          const f = new Date(r.fecha + 'T00:00:00');
          return f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro && r.nota.toLowerCase().includes(busqueda.toLowerCase());
        }).map(r => (
          <div key={r.id} className="bg-white rounded-[2.2rem] shadow-sm border border-slate-50 overflow-hidden">
            <div onClick={() => { setEditandoId(r.id); setMonto(r.monto); setNota(r.nota); setFecha(r.fecha); setTipo(r.tipo); setEsAuto(r.esAutomatico ?? true); if(r.categoria) setCategoriaSeleccionada(r.categoria); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-5 flex justify-between items-center active:bg-blue-50 cursor-pointer">
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{r.nota}</p>
                <button onClick={(e) => { e.stopPropagation(); setVerDetalleId(verDetalleId === r.id ? null : r.id); }} className="text-[9px] font-black text-blue-500 uppercase underline">
                  {r.tipo === 'ingreso' ? (r.esAutomatico ? 'Detalle %' : `Bolsa: ${NOMBRES_CUENTAS[r.categoria as keyof typeof NOMBRES_CUENTAS]}`) : `De: ${NOMBRES_CUENTAS[r.categoria as keyof typeof NOMBRES_CUENTAS]}`}
                </button>
              </div>
              <div className="flex items-center gap-4">
                <p className={`font-black text-lg ${r.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                  {r.tipo === 'ingreso' ? '+' : '-'} S/ {r.monto.toFixed(2)}
                </p>
                <button onClick={(e) => { e.stopPropagation(); if(confirm("¿Borrar?")) { const n = historial.filter(x => x.id !== r.id); setHistorial(n); localStorage.setItem('mis_finanzas_v4', JSON.stringify(n)); } }} className="text-slate-200 hover:text-red-500 font-bold text-lg">✕</button>
              </div>
            </div>
            {verDetalleId === r.id && r.tipo === 'ingreso' && r.esAutomatico && (
              <div className="bg-slate-50 p-4 grid grid-cols-2 gap-2 border-t border-slate-100">
                {Object.entries(DISTRIBUCION_CUENTAS).map(([b, p]) => (
                  <div key={b} className="text-[9px] font-bold text-slate-500 flex justify-between bg-white p-2 rounded-lg">
                    <span>{NOMBRES_CUENTAS[b as keyof typeof NOMBRES_CUENTAS]}:</span>
                    <span className="text-blue-600 font-black">S/ {(r.monto * p).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
