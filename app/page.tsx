'use client'
import { useState, useEffect, useMemo } from 'react'
// Ruta corregida para estar en la misma carpeta
import { DISTRIBUCION_CUENTAS, NOMBRES_CUENTAS } from './config-financiera'

interface Registro {
  id: number;
  monto: number;
  nota: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  categoria?: string;
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

  const historialFiltrado = historial.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    return f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro && r.nota.toLowerCase().includes(busqueda.toLowerCase());
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const saldoGlobal = Object.values(saldosPorBolsa).reduce((acc, val) => acc + val, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-24 font-sans max-w-md mx-auto text-slate-900">
      <header className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-black text-blue-700 italic tracking-tighter leading-none">MI CONTROL S/</h1>
          <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Saldo: <span className="text-blue-600 font-black">S/ {saldoGlobal.toFixed(2)}</span></p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={() => setTipo('ingreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${tipo === 'ingreso' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400'}`}>RECIBIDO</button>
          <button onClick={() => setTipo('egreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${tipo === 'egreso' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400'}`}>PAGADO</button>
        </div>
      </header>

      <section className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/10 mb-6 border border-white">
        <div className="flex justify-between mb-4">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full outline-none" />
          {tipo === 'egreso' && (
            <select value={categoriaEgreso} onChange={(e) => setCategoriaEgreso(e.target.value)} className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1.5 rounded-full outline-none">
              {Object.entries(NOMBRES_CUENTAS).map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center border-b-4 border-slate-100 focus-within:border-blue-500 transition-all pb-2 mb-4 text-slate-900">
          <span className="text-3xl font-black text-slate-300 mr-2 italic">S/</span>
          <input type="number" value={monto || ''} placeholder="0.00" className="w-full text-5xl font-black outline-none bg-transparent" onChange={(e) => setMonto(Number(e.target.value))} />
        </div>
        <input type="text" value={nota} placeholder="¿Qué concepto es?" className="w-full text-base font-bold outline-none text-slate-700 bg-slate-50 p-4 rounded-2xl" onChange={(e) => setNota(e.target.value)} />
      </section>

      <button onClick={guardarRegistro} className={`w-full py-5 rounded-3xl font-black text-sm text-white shadow-2xl transition-all active:scale-95 mb-10 ${tipo === 'ingreso' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'}`}>
        {editandoId ? 'ACTUALIZAR' : `CONFIRMAR ${tipo.toUpperCase()}`}
      </button>

      <div className="flex justify-between items-center bg-blue-900 p-4 rounded-3xl shadow-lg mb-6 text-white">
        <button onClick={() => setMesFiltro(m => m === 0 ? 11 : m - 1)} className="font-black text-xl">‹</button>
        <p className="text-xs font-black uppercase tracking-widest">{meses[mesFiltro]} {anioFiltro}</p>
        <button onClick={() => setMesFiltro(m => m === 11 ? 0 : m + 1)} className="font-black text-xl">›</button>
      </div>

      <div className="space-y-4">
        {historialFiltrado.map(r => (
          <div key={r.id} className="bg-white p-5 rounded-[2.2rem] flex justify-between items-center shadow-sm border-2 border-transparent active:bg-blue-50">
            <div className="flex-1">
              <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{r.nota}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{r.tipo === 'egreso' ? `De: ${NOMBRES_CUENTAS[r.categoria as keyof typeof NOMBRES_CUENTAS]}` : 'Ingreso'}</p>
            </div>
            <p className={`font-black text-lg ${r.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
              {r.tipo === 'ingreso' ? '+' : '-'} S/ {r.monto.toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
