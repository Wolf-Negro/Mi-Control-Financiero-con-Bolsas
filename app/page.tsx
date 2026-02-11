'use client'
import { useState, useEffect, useMemo } from 'react'
import { DISTRIBUCION_CUENTAS, NOMBRES_CUENTAS } from './config-financiera'

interface Registro {
  id: number;
  monto: number;
  nota: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  categoria?: string; // Para egresos: de qué bolsa sale
}

export default function Home() {
  const [monto, setMonto] = useState<number>(0)
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [categoriaEgreso, setCategoriaEgreso] = useState<string>('gastoDiario')
  const [busqueda, setBusqueda] = useState('')
  const [historial, setHistorial] = useState<Registro[]>([])
  const [editandoId, setEditandoId] = useState<number | null>(null)
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
    const datosBase = { 
      monto, 
      nota: nota || 'Sin concepto', 
      fecha, 
      tipo, 
      categoria: tipo === 'egreso' ? categoriaEgreso : undefined 
    };

    if (editandoId) {
      nuevoHistorial = historial.map(r => r.id === editandoId ? { ...r, ...datosBase } : r);
      setEditandoId(null);
    } else {
      nuevoHistorial = [{ id: Date.now(), ...datosBase }, ...historial];
    }

    setHistorial(nuevoHistorial);
    localStorage.setItem('mis_finanzas_v3', JSON.stringify(nuevoHistorial));
    setMonto(0); setNota('');
  }

  // CÁLCULO DE SALDOS POR BOLSA (HISTÓRICO)
  const saldosPorBolsa = useMemo(() => {
    const saldos = Object.fromEntries(Object.keys(DISTRIBUCION_CUENTAS).map(k => [k, 0]));
    historial.forEach(r => {
      if (r.tipo === 'ingreso') {
        Object.entries(DISTRIBUCION_CUENTAS).forEach(([bolsa, porc]) => {
          saldos[bolsa] += r.monto * porc;
        });
      } else if (r.tipo === 'egreso' && r.categoria) {
        saldos[r.categoria] -= r.monto;
      }
    });
    return saldos;
  }, [historial]);

  const historialFiltrado = historial
    .filter(r => {
      const f = new Date(r.fecha + 'T00:00:00');
      const coincideMes = f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
      const coincideBusqueda = r.nota.toLowerCase().includes(busqueda.toLowerCase());
      return coincideMes && coincideBusqueda;
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const registrosAgrupados = historialFiltrado.reduce((acc: {[key: string]: Registro[]}, reg) => {
    if (!acc[reg.fecha]) acc[reg.fecha] = [];
    acc[reg.fecha].push(reg);
    return acc;
  }, {});

  const saldoGlobal = Object.values(saldosPorBolsa).reduce((acc, val) => acc + val, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-24 font-sans max-w-md mx-auto text-slate-900">
      {/* HEADER DINÁMICO */}
      <header className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-black text-blue-700 italic tracking-tighter">MI CONTROL S/</h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Saldo Total: <span className="text-blue-600 font-black underline">S/ {saldoGlobal.toFixed(2)}</span></p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => setTipo('ingreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tipo === 'ingreso' ? 'bg-green-600 text-white shadow-lg' : 'text-slate-400'}`}>RECIBIDO</button>
          <button onClick={() => setTipo('egreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${tipo === 'egreso' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400'}`}>PAGADO</button>
        </div>
      </header>

      {/* RESUMEN DE BOLSAS (SCROLL HORIZONTAL) */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-4 no-scrollbar">
        {Object.entries(saldosPorBolsa).map(([bolsa, saldo]) => (
          <div key={bolsa} className="min-w-[120px] bg-white p-3 rounded-2xl border-b-4 border-blue-500 shadow-sm flex-shrink-0">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{NOMBRES_CUENTAS[bolsa as keyof typeof NOMBRES_CUENTAS]}</p>
            <p className={`text-sm font-black ${saldo < 0 ? 'text-red-500' : 'text-slate-800'}`}>S/ {saldo.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* FORMULARIO PRO */}
      <section className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-blue-900/5 mb-6 border border-white">
        <div className="flex justify-between mb-4">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full outline-none" />
          {tipo === 'egreso' && (
            <select value={categoriaEgreso} onChange={(e) => setCategoriaEgreso(e.target.value)} className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1.5 rounded-full outline-none border-none">
              {Object.entries(NOMBRES_CUENTAS).map(([id, nombre]) => <option key={id} value={id}>Bolsa: {nombre}</option>)}
            </select>
          )}
        </div>

        <div className="flex items-center border-b-4 border-slate-100 focus-within:border-blue-500 transition-all pb-2 mb-4">
          <span className="text-3xl font-black text-slate-300 mr-2">S/</span>
          <input type="number" value={monto || ''} placeholder="0.00" className="w-full text-5xl font-black outline-none bg-transparent" onChange={(e) => setMonto(Number(e.target.value))} />
        </div>

        <input type="text" value={nota} placeholder="Ej: Pago de Facebook Ads..." className="w-full text-base font-bold outline-none text-slate-700 bg-slate-50 p-4 rounded-2xl" onChange={(e) => setNota(e.target.value)} />
      </section>

      <button onClick={guardarRegistro} className={`w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl transition-all active:scale-95 mb-10 ${tipo === 'ingreso' ? 'bg-green-600' : 'bg-red-600'}`}>
        {editandoId ? 'ACTUALIZAR REGISTRO' : `CONFIRMAR ${tipo.toUpperCase()}`}
      </button>

      {/* BUSCADOR Y FILTROS */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <input type="text" placeholder="Buscar movimiento..." className="w-full bg-white p-4 pl-12 rounded-2xl text-sm font-bold shadow-sm border border-slate-100 outline-none focus:border-blue-400" onChange={(e) => setBusqueda(e.target.value)} />
          <span className="absolute left-4 top-4 text-slate-300 font-bold">🔍</span>
        </div>

        <div className="flex justify-between items-center bg-blue-900 p-4 rounded-3xl shadow-lg">
          <button onClick={() => setMesFiltro(m => m === 0 ? 11 : m - 1)} className="text-white font-black text-xl px-2">‹</button>
          <div className="text-center">
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">{meses[mesFiltro]} {anioFiltro}</p>
          </div>
          <button onClick={() => setMesFiltro(m => m === 11 ? 0 : m + 1)} className="text-white font-black text-xl px-2">›</button>
        </div>
      </div>

      {/* LISTA AGRUPADA POR DÍAS */}
      <div className="space-y-8">
        {Object.entries(registrosAgrupados).map(([fechaGrupo, regs]) => (
          <div key={fechaGrupo}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-3 py-1 rounded-full uppercase">{fechaGrupo}</span>
              <div className="h-[2px] bg-slate-200 flex-1"></div>
            </div>
            <div className="space-y-3">
              {regs.map(r => (
                <div key={r.id} onClick={() => cargarEdicion(r)} className="bg-white p-5 rounded-[2.2rem] flex justify-between items-center shadow-sm border-2 border-transparent hover:border-blue-200 transition-all cursor-pointer group">
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{r.nota}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {r.tipo === 'egreso' ? `DE: ${NOMBRES_CUENTAS[r.categoria as keyof typeof NOMBRES_CUENTAS]}` : 'RECIBIDO'}
                    </p>
                  </div>
                  <p className={`font-black text-lg ${r.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {r.tipo === 'ingreso' ? '+' : '-'} S/ {r.monto.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}