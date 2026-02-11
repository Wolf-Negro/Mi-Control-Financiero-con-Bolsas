'use client'
import { useState, useEffect, useMemo } from 'react'
import { DISTRIBUCION_CUENTAS, NOMBRES_CUENTAS } from './config-financiera'

interface Registro {
  id: number;
  monto: number;
  nota: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  categoria?: string; // Bolsa específica (Manual o Egreso)
  esAutomatico?: boolean; // Solo para ingresos
}

export default function Home() {
  const [monto, setMonto] = useState<number>(0)
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [esAuto, setEsAuto] = useState(true)
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('gastoDiario')
  
  const [busqueda, setBusqueda] = useState('')
  const [historial, setHistorial] = useState<Registro[]>([])
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [verDetalleId, setVerDetalleId] = useState<number | null>(null)
  
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  useEffect(() => {
    const guardados = localStorage.getItem('mis_finanzas_v3')
    if (guardados) setHistorial(JSON.parse(guardados))
  }, [])

  const guardarRegistro = () => {
    if (monto <= 0) return alert("Monto inválido");
    let nuevoHistorial;
    const datosBase: Registro = { 
      id: editandoId || Date.now(),
      monto, 
      nota: nota || 'Sin concepto', 
      fecha, 
      tipo, 
      categoria: (tipo === 'egreso' || !esAuto) ? categoriaSeleccionada : undefined,
      esAutomatico: tipo === 'ingreso' ? esAuto : undefined
    };

    if (editandoId) {
      nuevoHistorial = historial.map(r => r.id === editandoId ? datosBase : r);
      setEditandoId(null);
    } else {
      nuevoHistorial = [datosBase, ...historial];
    }

    setHistorial(nuevoHistorial);
    localStorage.setItem('mis_finanzas_v3', JSON.stringify(nuevoHistorial));
    setMonto(0); setNota('');
  }

  const saldosPorBolsa = useMemo(() => {
    const saldos = Object.fromEntries(Object.keys(DISTRIBUCION_CUENTAS).map(k => [k, 0]));
    historial.forEach(r => {
      if (r.tipo === 'ingreso') {
        if (r.esAutomatico) {
          Object.entries(DISTRIBUCION_CUENTAS).forEach(([bolsa, porc]) => {
            saldos[bolsa] += r.monto * porc;
          });
        } else if (r.categoria) {
          saldos[r.categoria] += r.monto;
        }
      } else if (r.tipo === 'egreso' && r.categoria) {
        saldos[r.categoria] -= r.monto;
      }
    });
    return saldos;
  }, [historial]);

  const historialFiltrado = historial.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    return f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro && r.nota.toLowerCase().includes(busqueda.toLowerCase());
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const registrosAgrupados = historialFiltrado.reduce((acc: {[key: string]: Registro[]}, reg) => {
    if (!acc[reg.fecha]) acc[reg.fecha] = [];
    acc[reg.fecha].push(reg);
    return acc;
  }, {});

  const saldoGlobal = Object.values(saldosPorBolsa).reduce((acc, val) => acc + val, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-24 font-sans max-w-md mx-auto text-slate-900">
      <header className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-black text-blue-700 italic tracking-tighter leading-none uppercase">Mi Control S/</h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Total: <span className="text-blue-600">S/ {saldoGlobal.toFixed(2)}</span></p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => setTipo('ingreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${tipo === 'ingreso' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>RECIBIDO</button>
          <button onClick={() => setTipo('egreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${tipo === 'egreso' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>PAGADO</button>
        </div>
      </header>

      {/* SALDOS DE BOLSAS */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {Object.entries(saldosPorBolsa).map(([bolsa, saldo]) => (
          <div key={bolsa} className="min-w-[120px] bg-white p-4 rounded-3xl border-b-[6px] border-blue-600 shadow-xl shadow-blue-900/5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{NOMBRES_CUENTAS[bolsa as keyof typeof NOMBRES_CUENTAS]}</p>
            <p className={`text-base font-black ${saldo < 0 ? 'text-red-500' : 'text-slate-900'}`}>S/ {saldo.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* FORMULARIO */}
      <section className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/10 mb-6 border border-white space-y-4">
        <div className="flex justify-between items-center gap-2">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full outline-none" />
          
          {tipo === 'ingreso' ? (
            <button onClick={() => setEsAuto(!esAuto)} className={`text-[9px] font-black px-3 py-1.5 rounded-full border-2 transition-all ${esAuto ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'}`}>
              {esAuto ? 'AUTO: % DISTRIBUIDO' : 'MANUAL: 1 BOLSA'}
            </button>
          ) : (
            <span className="text-[9px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-full uppercase">Salida de caja</span>
          )}
        </div>

        {(tipo === 'egreso' || !esAuto) && (
          <div className="animate-in fade-in duration-300">
            <label className="text-[9px] font-black text-slate-300 uppercase block mb-1">Seleccionar Bolsa:</label>
            <select value={categoriaSeleccionada} onChange={(e) => setCategoriaSeleccionada(e.target.value)} className="w-full text-xs font-black text-slate-700 bg-slate-50 p-3 rounded-xl outline-none border-2 border-slate-100 focus:border-blue-500">
              {Object.entries(NOMBRES_CUENTAS).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center border-b-4 border-slate-100 focus-within:border-blue-500 transition-all pb-2 text-slate-900">
          <span className="text-3xl font-black text-slate-300 mr-2 italic">S/</span>
          <input type="number" value={monto || ''} placeholder="0.00" className="w-full text-5xl font-black outline-none bg-transparent" onChange={(e) => setMonto(Number(e.target.value))} />
        </div>
        <input type="text" value={nota} placeholder="¿Qué concepto es?" className="w-full text-base font-bold outline-none text-slate-700 bg-slate-50 p-4 rounded-2xl" onChange={(e) => setNota(e.target.value)} />
      </section>

      <button onClick={guardarRegistro} className={`w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl transition-all active:scale-95 mb-8 uppercase tracking-widest ${tipo === 'ingreso' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'}`}>
        {editandoId ? 'Actualizar Registro' : `Confirmar ${tipo}`}
      </button>

      {/* LISTA Y FILTROS */}
      <div className="space-y-4 mb-8">
        <div className="relative">
          <input type="text" placeholder="Buscar concepto..." className="w-full bg-white p-4 pl-12 rounded-3xl text-sm font-bold shadow-sm outline-none border-2 border-transparent focus:border-blue-200" onChange={(e) => setBusqueda(e.target.value)} />
          <span className="absolute left-4 top-4">🔍</span>
        </div>
        <div className="flex justify-between items-center bg-blue-900 p-4 rounded-[2rem] shadow-lg text-white font-black text-xs uppercase">
          <button onClick={() => setMesFiltro(m => m === 0 ? 11 : m - 1)}>‹</button>
          <span>{meses[mesFiltro]} {anioFiltro}</span>
          <button onClick={() => setMesFiltro(m => m === 11 ? 0 : m + 1)}>›</button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(registrosAgrupados).map(([fechaGrupo, regs]) => (
          <div key={fechaGrupo}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-3 py-1 rounded-full uppercase">{fechaGrupo}</span>
              <div className="h-[2px] bg-slate-200 flex-1 rounded-full"></div>
            </div>
            <div className="space-y-3">
              {regs.map(r => (
                <div key={r.id} className="bg-white rounded-[2.2rem] shadow-sm border-2 border-transparent overflow-hidden">
                  <div onClick={() => { setEditandoId(r.id); setMonto(r.monto); setNota(r.nota); setFecha(r.fecha); setTipo(r.tipo); setEsAuto(r.esAutomatico ?? true); if(r.categoria) setCategoriaSeleccionada(r.categoria); window.scrollTo({top:0, behavior:'smooth'}); }} className="p-5 flex justify-between items-center cursor-pointer active:bg-blue-50">
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase leading-tight mb-1">{r.nota}</p>
                      <button onClick={(e) => { e.stopPropagation(); setVerDetalleId(verDetalleId === r.id ? null : r.id); }} className="text-[9px] font-black text-blue-500 uppercase underline">
                        {r.tipo === 'ingreso' ? (r.esAutomatico ? 'Ver Distribución %' : `Bolsa: ${NOMBRES_CUENTAS[r.categoria as keyof typeof NOMBRES_CUENTAS]}`) : `Pagado desde: ${NOMBRES_CUENTAS[r.categoria as keyof typeof NOMBRES_CUENTAS]}`}
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`font-black text-lg ${r.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                        {r.tipo === 'ingreso' ? '+' : '-'} S/ {r.monto.toFixed(2)}
                      </p>
                      <button onClick={(e) => { e.stopPropagation(); if(confirm("¿Borrar?")) { const n = historial.filter(x => x.id !== r.id); setHistorial(n); localStorage.setItem('mis_finanzas_v3', JSON.stringify(n)); } }} className="text-slate-200 hover:text-red-500 font-bold text-lg">✕</button>
                    </div>
                  </div>
                  
                  {/* DESGLOSE DETALLADO */}
                  {verDetalleId === r.id && r.tipo === 'ingreso' && r.esAutomatico && (
                    <div className="bg-slate-50 p-4 grid grid-cols-2 gap-2 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
                      {Object.entries(DISTRIBUCION_CUENTAS).map(([bolsa, porc]) => (
                        <div key={bolsa} className="text-[9px] font-bold text-slate-500 flex justify-between bg-white p-2 rounded-lg">
                          <span>{NOMBRES_CUENTAS[bolsa as keyof typeof NOMBRES_CUENTAS]}:</span>
                          <span className="text-blue-600">S/ {(r.monto * porc).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
