'use client'
import { useState, useEffect, useMemo } from 'react'

interface Categoria {
  id: string;
  nombre: string;
  porcentaje: number;
  minimo: number;
}

interface Registro {
  id: number;
  monto: number;
  nota: string;
  fecha: string;
  tipo: 'ingreso' | 'egreso' | 'ajuste';
  categoriaId?: string;
  esAutomatico?: boolean;
}

export default function Home() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [historial, setHistorial] = useState<Registro[]>([])
  const [metaMonto, setMetaMonto] = useState(5000)
  const [metaBolsas, setMetaBolsas] = useState<string[]>(['total'])

  // Estados de Formulario
  const [monto, setMonto] = useState<number>(0)
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [esAuto, setEsAuto] = useState(true)
  const [catSel, setCatSel] = useState('')
  
  // UI y Onboarding
  const [step, setStep] = useState(1) // 1: Crear Bolsas, 2: Saldo Inicial, 0: App Lista
  const [saldosIniciales, setSaldosIniciales] = useState<{[key: string]: number}>({})
  const [showConfig, setShowConfig] = useState(false)
  const [verDetalleId, setVerDetalleId] = useState<number | null>(null)
  
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  useEffect(() => {
    const c = localStorage.getItem('bolsas_v10');
    const h = localStorage.getItem('finanzas_v10');
    
    if (c) setCategorias(JSON.parse(c));
    if (h) setHistorial(JSON.parse(h));

    // Determinar paso del asistente
    if (!c || JSON.parse(c).length === 0) setStep(1);
    else if (!h || JSON.parse(h).length === 0) setStep(2);
    else setStep(0);

    const m = localStorage.getItem('meta_v10');
    if (m) setMetaMonto(Number(m));
    const mb = localStorage.getItem('meta_bolsas_v10');
    if (mb) setMetaBolsas(JSON.parse(mb));
  }, [])

  // Guardado de Registros
  const guardarRegistro = (m?: number, n?: string, t?: 'ingreso' | 'egreso' | 'ajuste', cId?: string, auto?: boolean) => {
    const finalMonto = m ?? monto;
    if (finalMonto <= 0) return;
    
    const registro: Registro = {
      id: Date.now() + Math.random(),
      monto: finalMonto,
      nota: n ?? (nota || 'Sin concepto'),
      fecha: fecha,
      tipo: t ?? tipo,
      categoriaId: cId ?? ((tipo === 'egreso' || !esAuto) ? catSel : undefined),
      esAutomatico: auto ?? (tipo === 'ingreso' ? esAuto : undefined)
    };

    const nuevoH = [registro, ...historial];
    setHistorial(nuevoH);
    localStorage.setItem('finanzas_v10', JSON.stringify(nuevoH));
    setMonto(0); setNota('');
  }

  // Lógica Saldo Inicial
  const finalizarOnboarding = () => {
    const nuevos: Registro[] = Object.entries(saldosIniciales).map(([id, val]) => ({
      id: Date.now() + Math.random(),
      monto: val,
      nota: "SALDO INICIAL",
      fecha: fecha,
      tipo: 'ingreso',
      categoriaId: id,
      esAutomatico: false
    }));
    const totalH = [...nuevos, ...historial];
    setHistorial(totalH);
    localStorage.setItem('finanzas_v10', JSON.stringify(totalH));
    setStep(0);
  }

  // Cálculos de saldo
  const saldosPorBolsa = useMemo(() => {
    const saldos: {[key: string]: number} = {};
    categorias.forEach(c => saldos[c.id] = 0);
    historial.forEach(r => {
      const val = Math.abs(r.monto);
      if (r.tipo === 'ingreso' || (r.tipo === 'ajuste' && r.monto > 0)) {
        if (r.esAutomatico) categorias.forEach(c => saldos[c.id] += val * c.porcentaje);
        else if (r.categoriaId) saldos[r.categoriaId] += val;
      } else {
        if (r.categoriaId) saldos[r.categoriaId] -= val;
      }
    });
    return saldos;
  }, [historial, categorias]);

  const ingresosMesTotal = useMemo(() => historial.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    return r.tipo === 'ingreso' && f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
  }).reduce((acc, r) => acc + r.monto, 0), [historial, mesFiltro, anioFiltro]);

  const progresoActual = metaBolsas.includes('total') ? ingresosMesTotal : metaBolsas.reduce((acc, id) => acc + (saldosPorBolsa[id] || 0), 0);
  const porcMeta = Math.min((progresoActual / metaMonto) * 100, 100);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-24 font-sans max-w-md mx-auto text-slate-900">
      
      {/* ASISTENTE DE BIENVENIDA (ONBOARDING) */}
      {step > 0 && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center p-4">
          <div className="bg-white w-full rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
            {step === 1 ? (
              <>
                <h2 className="text-2xl font-black text-blue-700 italic mb-2">¡HOLA!</h2>
                <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">Primero, crea tus bolsas de control:</p>
                <div className="space-y-3 mb-6">
                  {categorias.map(c => (
                    <div key={c.id} className="flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 items-center">
                      <span className="text-[10px] font-black uppercase">{c.nombre} ({(c.porcentaje*100)}%)</span>
                      <button onClick={() => setCategorias(categorias.filter(x=>x.id!==c.id))} className="text-red-400">✕</button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const n = prompt("Nombre (ej: Ahorro):");
                    const p = Number(prompt("% que recibirá (0-100):"))/100;
                    if(n && !isNaN(p)) {
                      const newC = [...categorias, {id: Date.now().toString(), nombre: n, porcentaje: p, minimo: 0}];
                      setCategorias(newC);
                      localStorage.setItem('bolsas_v10', JSON.stringify(newC));
                    }
                  }} className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600 font-black text-[10px]">+ AÑADIR BOLSA</button>
                </div>
                <button onClick={() => setStep(2)} disabled={categorias.length === 0} className="w-full py-5 bg-blue-700 text-white rounded-[2rem] font-black uppercase text-xs disabled:opacity-50">Siguiente Paso</button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-blue-700 italic mb-2">SALDOS</h2>
                <p className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">¿Cuánto dinero tienes hoy en cada una?</p>
                <div className="space-y-4 mb-8">
                  {categorias.map(c => (
                    <div key={c.id} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase flex-1">{c.nombre}</span>
                      <input type="number" placeholder="0.00" className="w-20 bg-transparent text-right font-black text-blue-600 outline-none border-b border-slate-200" onChange={(e) => setSaldosIniciales({...saldosIniciales, [c.id]: Number(e.target.value)})} />
                    </div>
                  ))}
                </div>
                <button onClick={finalizarOnboarding} className="w-full py-5 bg-green-600 text-white rounded-[2rem] font-black uppercase text-xs">Empezar ahora</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* HEADER Y APP */}
      <header className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-black text-blue-700 italic tracking-tighter leading-none uppercase">Mi Control S/</h1>
        <button onClick={() => setShowConfig(!showConfig)} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-lg">⚙️</button>
      </header>

      {/* META Y GRÁFICO */}
      <section className="bg-blue-900 rounded-[2.2rem] p-6 mb-6 text-white shadow-2xl relative overflow-hidden">
        <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-1">Tu Meta de Ingresos</p>
        <h2 className="text-2xl font-black mb-3 italic">S/ {progresoActual.toFixed(2)} <span className="text-xs text-blue-400">/ S/ {metaMonto}</span></h2>
        <div className="h-2 bg-blue-950 rounded-full overflow-hidden border border-blue-800">
          <div className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-1000" style={{ width: `${porcMeta}%` }}></div>
        </div>
      </section>

      {/* CONFIGURACIÓN */}
      {showConfig && (
        <div className="bg-white rounded-3xl p-6 mb-6 border-2 border-blue-100 space-y-4 animate-in slide-in-from-top-4 font-black text-[10px]">
          <input type="number" value={metaMonto} onChange={(e) => {setMetaMonto(Number(e.target.value)); localStorage.setItem('meta_v10', e.target.value)}} className="w-full p-4 bg-slate-50 rounded-xl outline-none" placeholder="Monto Meta" />
          <div className="space-y-2">
            {categorias.map(c => (
              <div key={c.id} className="flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 items-center">
                <span>{c.nombre} ({(c.porcentaje*100)}%) - Min: S/ {c.minimo}</span>
                <button onClick={() => {const n=categorias.filter(x=>x.id!==c.id); setCategorias(n); localStorage.setItem('bolsas_v10', JSON.stringify(n))}} className="text-red-400">✕</button>
              </div>
            ))}
            <button onClick={() => {
              const n=prompt("Nombre:"); 
              const p=Number(prompt("%:"))/100;
              const m=Number(prompt("Mínimo:"));
              if(n && !isNaN(p)){const x=[...categorias, {id:Date.now().toString(), nombre:n, porcentaje:p, minimo: m || 0}]; setCategorias(x); localStorage.setItem('bolsas_v10', JSON.stringify(x))}
            }} className="w-full py-2 border-2 border-dashed border-blue-200 rounded-xl text-blue-600">+ NUEVA BOLSA</button>
          </div>
        </div>
      )}

      {/* BOLSAS */}
      <div className="flex gap-3 overflow-x-auto pb-6 mb-2 no-scrollbar">
        {categorias.map(c => {
          const saldo = saldosPorBolsa[c.id] || 0;
          const bajoMin = saldo <= c.minimo;
          return (
            <div key={c.id} className={`min-w-[150px] p-5 rounded-[2rem] border-b-[6px] shadow-lg relative ${bajoMin ? 'bg-red-50 border-red-600' : 'bg-white border-blue-600'}`}>
              <button onClick={() => {
                const real = prompt(`¿Cuánto tienes realmente en ${c.nombre}? (App dice S/ ${saldo.toFixed(2)})`);
                if(real) {
                  const diff = Number(real) - saldo;
                  guardarRegistro(Math.abs(diff), "AJUSTE AUDITORÍA", 'ajuste', c.id, false);
                }
              }} className="absolute top-3 right-3 text-xs opacity-20">🔍</button>
              <p className={`text-[9px] font-black uppercase mb-1 ${bajoMin ? 'text-red-400' : 'text-slate-400'}`}>{c.nombre}</p>
              <p className="text-lg font-black tracking-tighter">S/ {saldo.toFixed(2)}</p>
            </div>
          )
        })}
      </div>

      {/* REGISTRO RÁPIDO */}
      <section className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/10 mb-6 border border-white space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['ingreso', 'egreso'].map(t => (
              <button key={t} onClick={() => setTipo(t as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase ${tipo === t ? (t==='ingreso'?'bg-green-600':'bg-red-600') + ' text-white' : 'text-slate-400'}`}>{t==='ingreso'?'Recibido':'Pagado'}</button>
            ))}
          </div>
          {tipo === 'ingreso' && (
            <button onClick={() => setEsAuto(!esAuto)} className={`text-[9px] font-black px-3 py-2 rounded-lg border-2 ${esAuto ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'}`}>{esAuto ? 'AUTO' : 'MANUAL'}</button>
          )}
        </div>

        {(tipo === 'egreso' || !esAuto) && (
          <select value={catSel} onChange={(e) => setCatSel(e.target.value)} className="w-full text-xs font-black text-slate-700 bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 outline-none">
            <option value="">Seleccionar Bolsa</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}

        <div className="flex items-center border-b-4 border-slate-100 focus-within:border-blue-500 pb-2">
          <span className="text-3xl font-black text-slate-300 mr-2">S/</span>
          <input type="number" value={monto || ''} placeholder="0.00" className="w-full text-5xl font-black outline-none bg-transparent" onChange={(e) => setMonto(Number(e.target.value))} />
        </div>
        <input type="text" value={nota} placeholder="¿Qué concepto es?" className="w-full text-base font-bold outline-none text-slate-700 bg-slate-50 p-4 rounded-2xl" onChange={(e) => setNota(e.target.value)} />
        <button onClick={() => guardarRegistro()} className={`w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl active:scale-95 uppercase ${tipo === 'ingreso' ? 'bg-green-600' : 'bg-red-600'}`}>Confirmar {tipo}</button>
      </section>

      {/* HISTORIAL */}
      <div className="space-y-4">
        {historial.filter(r => {
          const f = new Date(r.fecha + 'T00:00:00');
          return f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
        }).map(r => (
          <div key={r.id} className={`bg-white rounded-[2.2rem] shadow-sm border border-slate-100 overflow-hidden ${r.tipo === 'ajuste' ? 'border-l-8 border-l-orange-400' : ''}`}>
            <div onClick={() => setVerDetalleId(verDetalleId === r.id ? null : r.id)} className="p-5 flex justify-between items-center cursor-pointer active:bg-slate-50">
              <div className="flex-1">
                <p className={`text-sm font-black uppercase leading-none mb-1 ${r.tipo === 'ajuste' ? 'text-orange-600' : 'text-slate-900'}`}>{r.nota}</p>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tight">
                  {r.tipo === 'ajuste' ? '⚠️ Ajuste' : r.tipo === 'ingreso' ? (r.esAutomatico ? '⚡ Automático' : '🎯 Manual') : '💸 Gasto'}
                </p>
              </div>
              <p className={`font-black text-lg ${r.tipo === 'ingreso' || (r.tipo==='ajuste' && r.monto > 0) ? 'text-green-600' : 'text-red-600'}`}>
                {r.tipo === 'ingreso' || (r.tipo==='ajuste' && r.monto > 0) ? '+' : '-'} S/ {Math.abs(r.monto).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
