'use client'
import { useState, useEffect, useMemo } from 'react'

interface Categoria {
  id: string;
  nombre: string;
  porcentaje: number;
}

interface Registro {
  id: number;
  monto: number;
  nota: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  categoriaId?: string;
  esAutomatico?: boolean;
}

export default function Home() {
  const [categorias, setCategorias] = useState<Categoria[]>([
    { id: 'gastoDiario', nombre: 'Gasto Diario', porcentaje: 0.5 },
    { id: 'ahorro', nombre: 'Ahorro', porcentaje: 0.5 }
  ])
  const [historial, setHistorial] = useState<Registro[]>([])
  const [metaMonto, setMetaMonto] = useState(5000)
  const [metaTipo, setMetaTipo] = useState<string>('total') // 'total' o ID de una bolsa

  const [monto, setMonto] = useState<number>(0)
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [esAuto, setEsAuto] = useState(true)
  const [catSel, setCatSel] = useState('')
  
  const [showConfig, setShowConfig] = useState(false)
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())

  useEffect(() => {
    const c = localStorage.getItem('bolsas_user');
    if (c) setCategorias(JSON.parse(c));
    const h = localStorage.getItem('finanzas_pro_v6');
    if (h) setHistorial(JSON.parse(h));
    const m = localStorage.getItem('meta_user');
    if (m) setMetaMonto(Number(m));
    const mt = localStorage.getItem('meta_tipo');
    if (mt) setMetaTipo(mt);
  }, [])

  const guardarRegistro = () => {
    if (monto <= 0) return alert("Monto inválido");
    const registro: Registro = {
      id: Date.now(), monto, nota: nota || 'Sin concepto', fecha, tipo,
      categoriaId: (tipo === 'egreso' || !esAuto) ? catSel : undefined,
      esAutomatico: tipo === 'ingreso' ? esAuto : undefined
    };
    const nuevoH = [registro, ...historial];
    setHistorial(nuevoH);
    localStorage.setItem('finanzas_pro_v6', JSON.stringify(nuevoH));
    setMonto(0); setNota('');
  }

  const saldosPorBolsa = useMemo(() => {
    const saldos: {[key: string]: number} = {};
    categorias.forEach(c => saldos[c.id] = 0);
    historial.forEach(r => {
      if (r.tipo === 'ingreso') {
        if (r.esAutomatico) categorias.forEach(c => saldos[c.id] += r.monto * c.porcentaje);
        else if (r.categoriaId) saldos[r.categoriaId] += r.monto;
      } else if (r.tipo === 'egreso' && r.categoriaId) saldos[r.categoriaId] -= r.monto;
    });
    return saldos;
  }, [historial, categorias]);

  const ingresosMes = historial.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    return r.tipo === 'ingreso' && f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
  }).reduce((acc, r) => acc + r.monto, 0);

  // Lógica de Meta de Ahorro
  const progresoActual = metaTipo === 'total' ? ingresosMes : (saldosPorBolsa[metaTipo] || 0);
  const porcMeta = Math.min((progresoActual / metaMonto) * 100, 100);
  const saldoGlobal = Object.values(saldosPorBolsa).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-24 font-sans max-w-md mx-auto text-slate-900 overflow-x-hidden">
      <header className="flex justify-between items-center mb-6 pt-2">
        <div>
          <h1 className="text-2xl font-black text-blue-700 italic tracking-tighter leading-none">MI CONTROL S/</h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Total: S/ {saldoGlobal.toFixed(2)}</p>
        </div>
        <button onClick={() => setShowConfig(!showConfig)} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">⚙️</button>
      </header>

      {/* GRÁFICO SUTIL DE META */}
      <section className="bg-blue-900 rounded-[2.2rem] p-6 mb-6 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">
            Meta: {metaTipo === 'total' ? 'Ingresos Mensuales' : `Ahorro en ${categorias.find(c => c.id === metaTipo)?.nombre}`}
          </p>
          <h2 className="text-2xl font-black mb-3 italic">S/ {progresoActual.toFixed(2)} <span className="text-sm text-blue-400">/ S/ {metaMonto}</span></h2>
          <div className="h-2.5 bg-blue-950 rounded-full overflow-hidden border border-blue-800">
            <div className="h-full bg-gradient-to-r from-blue-400 to-green-400 rounded-full transition-all duration-700" style={{ width: `${porcMeta}%` }}></div>
          </div>
        </div>
      </section>

      {/* CONFIGURACIÓN DINÁMICA */}
      {showConfig && (
        <div className="bg-white rounded-3xl p-6 mb-6 border-2 border-blue-100 space-y-4 animate-in fade-in zoom-in duration-300">
          <p className="text-xs font-black text-blue-900 uppercase">Configurar Meta</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Monto Meta" value={metaMonto} onChange={(e) => {setMetaMonto(Number(e.target.value)); localStorage.setItem('meta_user', e.target.value)}} className="p-3 bg-slate-50 rounded-xl text-xs font-bold" />
            <select value={metaTipo} onChange={(e) => {setMetaTipo(e.target.value); localStorage.setItem('meta_tipo', e.target.value)}} className="p-3 bg-slate-50 rounded-xl text-[10px] font-bold">
              <option value="total">Ingresos Totales</option>
              {categorias.map(c => <option key={c.id} value={c.id}>Bolsa: {c.nombre}</option>)}
            </select>
          </div>
          <p className="text-xs font-black text-blue-900 uppercase mt-4">Mis Bolsas</p>
          <div className="space-y-2">
            {categorias.map(c => (
              <div key={c.id} className="flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase">{c.nombre} ({(c.porcentaje*100).toFixed(0)}%)</span>
                <button onClick={() => {const n=categorias.filter(x=>x.id!==c.id); setCategorias(n); localStorage.setItem('bolsas_user', JSON.stringify(n))}} className="text-red-400 text-xs">✕</button>
              </div>
            ))}
            <button onClick={() => {const n=prompt("Nombre:"); const p=Number(prompt("%:"))/100; if(n && p){const x=[...categorias, {id:Date.now().toString(), nombre:n, porcentaje:p}]; setCategorias(x); localStorage.setItem('bolsas_user', JSON.stringify(x))}}} className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-[10px] font-black text-blue-600">+ AÑADIR BOLSA</button>
          </div>
        </div>
      )}

      {/* BOLSAS SCROLL */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-4 no-scrollbar">
        {categorias.map(c => (
          <div key={c.id} className="min-w-[130px] bg-white p-4 rounded-[1.8rem] border-b-[6px] border-blue-600 shadow-md">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">{c.nombre}</p>
            <p className="text-base font-black text-slate-800">S/ {(saldosPorBolsa[c.id] || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* FORMULARIO */}
      <section className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/10 mb-6 border border-white space-y-4">
        <div className="flex justify-between">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setTipo('ingreso')} className={`px-4 py-2 rounded-lg text-[10px] font-black ${tipo === 'ingreso' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>RECIBIDO</button>
            <button onClick={() => setTipo('egreso')} className={`px-4 py-2 rounded-xl text-[10px] font-black ${tipo === 'egreso' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>PAGADO</button>
          </div>
          {tipo === 'ingreso' && (
            <button onClick={() => setEsAuto(!esAuto)} className={`text-[9px] font-black px-3 py-2 rounded-lg border-2 ${esAuto ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'}`}>
              {esAuto ? 'AUTO %' : 'MANUAL'}
            </button>
          )}
        </div>

        {(tipo === 'egreso' || !esAuto) && (
          <select value={catSel} onChange={(e) => setCatSel(e.target.value)} className="w-full text-xs font-black text-slate-700 bg-slate-50 p-4 rounded-2xl border-2 border-slate-50">
            <option value="">Selecciona la Bolsa</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}

        <div className="flex items-center border-b-4 border-slate-100 focus-within:border-blue-500 pb-2">
          <span className="text-3xl font-black text-slate-300 mr-2 italic">S/</span>
          <input type="number" value={monto || ''} placeholder="0.00" className="w-full text-5xl font-black outline-none bg-transparent" onChange={(e) => setMonto(Number(e.target.value))} />
        </div>
        <input type="text" value={nota} placeholder="¿Qué concepto es?" className="w-full text-base font-bold outline-none text-slate-700 bg-slate-50 p-4 rounded-2xl" onChange={(e) => setNota(e.target.value)} />
        
        <button onClick={guardarRegistro} className={`w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl transition-all active:scale-95 uppercase tracking-widest ${tipo === 'ingreso' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'}`}>
          Confirmar {tipo}
        </button>
      </section>

      {/* LISTA FILTRADA */}
      <div className="space-y-4">
        {historial.filter(r => {
          const f = new Date(r.fecha + 'T00:00:00');
          return f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
        }).map(r => (
          <div key={r.id} className="bg-white p-5 rounded-[2rem] flex justify-between items-center shadow-sm border border-slate-100 active:bg-blue-50 cursor-pointer transition-all">
            <div className="flex-1">
              <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{r.nota || 'Sin concepto'}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                {r.tipo === 'ingreso' ? (r.esAutomatico ? 'Repartido %' : `Bolsa: ${categorias.find(c => c.id === r.categoriaId)?.nombre}`) : `Pagado de: ${categorias.find(c => c.id === r.categoriaId)?.nombre}`}
              </p>
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
