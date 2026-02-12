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
  const [categorias, setCategorias] = useState<Categoria[]>([
    { id: '1', nombre: 'GASTO DIARIO', porcentaje: 0.5, minimo: 100 },
    { id: '2', nombre: 'AHORRO', porcentaje: 0.5, minimo: 500 }
  ])
  const [historial, setHistorial] = useState<Registro[]>([])
  const [metaMonto, setMetaMonto] = useState(5000)
  const [metaBolsas, setMetaBolsas] = useState<string[]>(['total'])

  const [monto, setMonto] = useState<number>(0)
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [esAuto, setEsAuto] = useState(true)
  const [catSel, setCatSel] = useState('')
  
  const [showConfig, setShowConfig] = useState(false)
  const [verDetalleId, setVerDetalleId] = useState<number | null>(null)
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())

  useEffect(() => {
    const c = localStorage.getItem('bolsas_user_v9');
    if (c) setCategorias(JSON.parse(c));
    const h = localStorage.getItem('finanzas_pro_v9');
    if (h) setHistorial(JSON.parse(h));
    const m = localStorage.getItem('meta_user_v9');
    if (m) setMetaMonto(Number(m));
    const mb = localStorage.getItem('meta_bolsas_v9');
    if (mb) setMetaBolsas(JSON.parse(mb));
  }, [])

  const guardarRegistro = (m?: number, n?: string, t?: 'ingreso' | 'egreso' | 'ajuste', cId?: string, auto?: boolean) => {
    const finalMonto = m ?? monto;
    if (finalMonto <= 0) return alert("Monto inválido");
    
    const registro: Registro = {
      id: Date.now(),
      monto: finalMonto,
      nota: n ?? (nota || 'Sin concepto'),
      fecha: fecha,
      tipo: t ?? tipo,
      categoriaId: cId ?? ((tipo === 'egreso' || !esAuto) ? catSel : undefined),
      esAutomatico: auto ?? (tipo === 'ingreso' ? esAuto : undefined)
    };

    const nuevoH = [registro, ...historial];
    setHistorial(nuevoH);
    localStorage.setItem('finanzas_pro_v9', JSON.stringify(nuevoH));
    setMonto(0); setNota('');
  }

  const saldosPorBolsa = useMemo(() => {
    const saldos: {[key: string]: number} = {};
    categorias.forEach(c => saldos[c.id] = 0);
    historial.forEach(r => {
      if (r.tipo === 'ingreso' || (r.tipo === 'ajuste' && r.monto > 0)) {
        if (r.esAutomatico) categorias.forEach(c => saldos[c.id] += r.monto * c.porcentaje);
        else if (r.categoriaId) saldos[r.categoriaId] += Math.abs(r.monto);
      } else if (r.tipo === 'egreso' || (r.tipo === 'ajuste' && r.monto < 0)) {
        if (r.categoriaId) saldos[r.categoriaId] -= Math.abs(r.monto);
      }
    });
    return saldos;
  }, [historial, categorias]);

  // FUNCIÓN DE AUDITORÍA (CORTE DE CAJA)
  const auditarBolsa = (cId: string) => {
    const actual = saldosPorBolsa[cId] || 0;
    const real = prompt(`Según la app tienes S/ ${actual.toFixed(2)}. ¿Cuánto tienes realmente en mano/banco?`);
    if (real !== null) {
      const diff = Number(real) - actual;
      if (diff === 0) return alert("¡Todo cuadra perfecto, animal!");
      const conf = confirm(`Hay una diferencia de S/ ${diff.toFixed(2)}. ¿Crear asiento de ajuste automático?`);
      if (conf) {
        guardarRegistro(Math.abs(diff), "AJUSTE POR AUDITORÍA", 'ajuste', cId, false);
      }
    }
  }

  const ingresosMesTotal = useMemo(() => historial.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    return r.tipo === 'ingreso' && f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
  }).reduce((acc, r) => acc + r.monto, 0), [historial, mesFiltro, anioFiltro]);

  const progresoActual = metaBolsas.includes('total') ? ingresosMesTotal : metaBolsas.reduce((acc, id) => acc + (saldosPorBolsa[id] || 0), 0);
  const porcMeta = Math.min((progresoActual / metaMonto) * 100, 100);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-24 font-sans max-w-md mx-auto text-slate-900 overflow-x-hidden">
      {/* ONBOARDING INICIAL */}
      {historial.length === 0 && (
        <div className="fixed inset-0 bg-blue-900/95 z-50 flex items-center p-6 text-white text-center animate-in fade-in duration-500">
          <div className="w-full">
            <h2 className="text-3xl font-black italic mb-2">¡BIENVENIDO, ANIMAL!</h2>
            <p className="text-sm font-bold text-blue-200 mb-8 uppercase tracking-widest">Vamos a setear tu saldo actual</p>
            <div className="space-y-4">
              {categorias.map(c => (
                <button key={c.id} onClick={() => {
                  const s = prompt(`¿Cuánto dinero tienes HOY en ${c.nombre}?`);
                  if(s) guardarRegistro(Number(s), "SALDO INICIAL", 'ingreso', c.id, false);
                }} className="w-full py-4 bg-white/10 border-2 border-white/20 rounded-[2rem] font-black uppercase text-xs">Añadir Saldo: {c.nombre}</button>
              ))}
              <button onClick={() => window.location.reload()} className="mt-8 text-blue-400 font-black underline uppercase text-[10px]">Ya terminé, entrar a la app</button>
            </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-6 pt-2">
        <h1 className="text-2xl font-black text-blue-700 italic tracking-tighter leading-none uppercase">MI CONTROL S/</h1>
        <button onClick={() => setShowConfig(!showConfig)} className={`bg-white p-3 rounded-2xl shadow-sm border ${showConfig ? 'border-blue-500' : 'border-slate-200'}`}>⚙️</button>
      </header>

      {/* META */}
      <section className="bg-blue-900 rounded-[2.2rem] p-6 mb-6 text-white shadow-2xl">
        <p className="text-[10px] font-black text-blue-300 uppercase mb-1">PROGRESO DE META</p>
        <h2 className="text-2xl font-black mb-3">S/ {progresoActual.toFixed(2)} <span className="text-xs text-blue-400">/ S/ {metaMonto}</span></h2>
        <div className="h-2.5 bg-blue-950 rounded-full overflow-hidden border border-blue-800">
          <div className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-1000" style={{ width: `${porcMeta}%` }}></div>
        </div>
      </section>

      {/* CONFIGURACIÓN PRO */}
      {showConfig && (
        <div className="bg-white rounded-3xl p-6 mb-6 border-2 border-blue-100 space-y-4 animate-in slide-in-from-top-4 font-black text-[10px]">
          <p className="text-blue-900 uppercase">Monto Meta Mensual:</p>
          <input type="number" value={metaMonto} onChange={(e) => {setMetaMonto(Number(e.target.value)); localStorage.setItem('meta_user_v9', e.target.value)}} className="w-full p-4 bg-slate-50 rounded-xl outline-none" />
          
          <p className="text-blue-900 uppercase mt-4">Mis Bolsas (Nombre / % / Mínimo):</p>
          <div className="space-y-2">
            {categorias.map(c => (
              <div key={c.id} className="flex justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 items-center">
                <span>{c.nombre} ({(c.porcentaje*100).toFixed(0)}%) - Min: S/ {c.minimo}</span>
                <button onClick={() => {const n=categorias.filter(x=>x.id!==c.id); setCategorias(n); localStorage.setItem('bolsas_user_v9', JSON.stringify(n))}} className="text-red-400">✕</button>
              </div>
            ))}
            <button onClick={() => {
              const n=prompt("Nombre:"); 
              const p=Number(prompt("% de distribución (0 a 100):"))/100;
              const m=Number(prompt("Colchón mínimo de seguridad (S/):"));
              if(n && !isNaN(p)){const x=[...categorias, {id:Date.now().toString(), nombre:n, porcentaje:p, minimo: m || 0}]; setCategorias(x); localStorage.setItem('bolsas_user_v9', JSON.stringify(x))}
            }} className="w-full py-3 border-2 border-dashed border-blue-200 rounded-xl text-blue-600">+ AÑADIR BOLSA</button>
          </div>
        </div>
      )}

      {/* BOLSAS CON SEMÁFORO Y AUDITORÍA */}
      <div className="flex gap-3 overflow-x-auto pb-6 mb-2 no-scrollbar">
        {categorias.map(c => {
          const saldo = saldosPorBolsa[c.id] || 0;
          const esPeligro = saldo <= c.minimo;
          const esAlerta = saldo <= c.minimo + (c.minimo * 0.1) && !esPeligro;

          return (
            <div key={c.id} className={`min-w-[150px] p-5 rounded-[2rem] border-b-[6px] transition-all shadow-lg relative ${esPeligro ? 'bg-red-50 border-red-600 text-red-900' : esAlerta ? 'bg-orange-50 border-orange-500' : 'bg-white border-blue-600'}`}>
              <button onClick={() => auditarBolsa(c.id)} className="absolute top-3 right-3 text-[10px] opacity-30 hover:opacity-100">🔍</button>
              <p className={`text-[9px] font-black uppercase mb-1 ${esPeligro ? 'text-red-400' : 'text-slate-400'}`}>{c.nombre}</p>
              <p className="text-lg font-black tracking-tighter">S/ {saldo.toFixed(2)}</p>
              {esPeligro && <p className="text-[7px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full absolute -bottom-3 left-4">BAJO MÍNIMO</p>}
            </div>
          )
        })}
      </div>

      {/* FORMULARIO */}
      <section className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/10 mb-6 border border-white space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['ingreso', 'egreso'].map(t => (
              <button key={t} onClick={() => setTipo(t as any)} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase ${tipo === t ? (t==='ingreso'?'bg-green-600':'bg-red-600') + ' text-white' : 'text-slate-400'}`}>{t==='ingreso'?'Recibido':'Pagado'}</button>
            ))}
          </div>
          {tipo === 'ingreso' && (
            <button onClick={() => setEsAuto(!esAuto)} className={`text-[9px] font-black px-3 py-2 rounded-lg border-2 ${esAuto ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'}`}>{esAuto ? 'AUTO %' : 'MANUAL'}</button>
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
        <button onClick={() => guardarRegistro()} className={`w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl transition-all active:scale-95 uppercase ${tipo === 'ingreso' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200'}`}>Confirmar {tipo}</button>
      </section>

      {/* HISTORIAL */}
      <div className="space-y-4">
        {historial.map(r => (
          <div key={r.id} className={`bg-white rounded-[2.2rem] shadow-sm border border-slate-100 overflow-hidden ${r.tipo === 'ajuste' ? 'border-l-8 border-l-orange-400' : ''}`}>
            <div onClick={() => setVerDetalleId(verDetalleId === r.id ? null : r.id)} className="p-5 flex justify-between items-center cursor-pointer active:bg-slate-50">
              <div className="flex-1">
                <p className={`text-sm font-black uppercase leading-none mb-1 ${r.tipo === 'ajuste' ? 'text-orange-600' : 'text-slate-900'}`}>{r.nota}</p>
                <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tight">
                  {r.tipo === 'ajuste' ? '⚠️ Ajuste de Auditoría' : r.tipo === 'ingreso' ? (r.esAutomatico ? '⚡ Repartido %' : `🎯 Bolsa: ${categorias.find(c => c.id === r.categoriaId)?.nombre}`) : `💸 De: ${categorias.find(c => c.id === r.categoriaId)?.nombre}`}
                </p>
              </div>
              <p className={`font-black text-lg ${r.tipo === 'ingreso' || (r.tipo==='ajuste' && r.monto > 0) ? 'text-green-600' : 'text-red-600'}`}>
                {r.tipo === 'ingreso' || (r.tipo==='ajuste' && r.monto > 0) ? '+' : '-'} S/ {Math.abs(r.monto).toFixed(2)}
              </p>
            </div>
            {verDetalleId === r.id && r.tipo === 'ingreso' && r.esAutomatico && (
              <div className="bg-slate-50 p-4 border-t grid grid-cols-2 gap-2">
                {categorias.map(c => (
                  <div key={c.id} className="flex justify-between bg-white p-2.5 rounded-xl border border-slate-100 text-[9px] font-bold">
                    <span className="text-slate-400 uppercase">{c.nombre}</span>
                    <span className="text-blue-600 font-black">S/ {(r.monto * c.porcentaje).toFixed(2)}</span>
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
