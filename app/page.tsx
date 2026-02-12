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
  // ESTADOS DE DATOS
  const [categorias, setCategorias] = useState<Categoria[]>([
    { id: 'gastoDiario', nombre: 'Gasto Diario', porcentaje: 0.5 },
    { id: 'ahorro', nombre: 'Ahorro', porcentaje: 0.2 }
  ])
  const [historial, setHistorial] = useState<Registro[]>([])
  const [metaMensual, setMetaMensual] = useState(5000)

  // ESTADOS DE FORMULARIO
  const [monto, setMonto] = useState<number>(0)
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('ingreso')
  const [esAuto, setEsAuto] = useState(true)
  const [catSel, setCatSel] = useState('')
  
  // UI CONTROL
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth())
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear())

  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

  // CARGA INICIAL
  useEffect(() => {
    const c = localStorage.getItem('bolsas_user');
    if (c) setCategorias(JSON.parse(c));
    const h = localStorage.getItem('finanzas_pro_v5');
    if (h) setHistorial(JSON.parse(h));
    const m = localStorage.getItem('meta_user');
    if (m) setMetaMensual(Number(m));
  }, [])

  // GUARDAR REGISTRO
  const guardarRegistro = () => {
    if (monto <= 0) return alert("Monto inválido");
    if (tipo === 'egreso' && !catSel) return alert("Selecciona una bolsa");
    
    const registro: Registro = {
      id: editandoId || Date.now(),
      monto, nota, fecha, tipo,
      categoriaId: (tipo === 'egreso' || !esAuto) ? catSel : undefined,
      esAutomatico: tipo === 'ingreso' ? esAuto : undefined
    };

    const nuevoH = editandoId ? historial.map(r => r.id === editandoId ? registro : r) : [registro, ...historial];
    setHistorial(nuevoH);
    localStorage.setItem('finanzas_pro_v5', JSON.stringify(nuevoH));
    setMonto(0); setNota(''); setEditandoId(null);
  }

  // GESTIÓN DE CATEGORÍAS
  const agregarCategoria = () => {
    const nombre = prompt("Nombre de la bolsa:");
    const porc = Number(prompt("% para esta bolsa (0 a 100):")) / 100;
    if (nombre && !isNaN(porc)) {
      const nuevas = [...categorias, { id: Date.now().toString(), nombre, porcentaje: porc }];
      setCategorias(nuevas);
      localStorage.setItem('bolsas_user', JSON.stringify(nuevas));
    }
  }

  const eliminarCat = (id: string) => {
    if(confirm("¿Eliminar bolsa? Los registros antiguos podrían no mostrar el nombre.")) {
      const nuevas = categorias.filter(c => c.id !== id);
      setCategorias(nuevas);
      localStorage.setItem('bolsas_user', JSON.stringify(nuevas));
    }
  }

  // CÁLCULOS
  const saldosPorBolsa = useMemo(() => {
    const saldos: {[key: string]: number} = {};
    categorias.forEach(c => saldos[c.id] = 0);
    
    historial.forEach(r => {
      if (r.tipo === 'ingreso') {
        if (r.esAutomatico) {
          categorias.forEach(c => saldos[c.id] = (saldos[c.id] || 0) + (r.monto * c.porcentaje));
        } else if (r.categoriaId) {
          saldos[r.categoriaId] = (saldos[r.categoriaId] || 0) + r.monto;
        }
      } else if (r.tipo === 'egreso' && r.categoriaId) {
        saldos[r.categoriaId] = (saldos[r.categoriaId] || 0) - r.monto;
      }
    });
    return saldos;
  }, [historial, categorias]);

  const ingresosMes = historial.filter(r => {
    const f = new Date(r.fecha + 'T00:00:00');
    return r.tipo === 'ingreso' && f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
  }).reduce((acc, r) => acc + r.monto, 0);

  const saldoGlobal = Object.values(saldosPorBolsa).reduce((a, b) => a + b, 0);

  return (
    <main className="min-h-screen bg-slate-50 p-5 pb-24 font-sans max-w-md mx-auto text-slate-900 overflow-x-hidden">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-blue-700 italic leading-none">MI CONTROL S/</h1>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Saldo Total: S/ {saldoGlobal.toFixed(2)}</p>
        </div>
        <button onClick={() => setShowConfig(!showConfig)} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-lg">⚙️</button>
      </header>

      {/* PANEL DE CONFIGURACIÓN DE BOLSAS */}
      {showConfig && (
        <section className="bg-white rounded-[2.5rem] p-6 mb-6 border-2 border-blue-100 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-sm uppercase text-blue-900 text-center flex-1">Configurar Mis Bolsas</h3>
          </div>
          <div className="space-y-3 mb-4">
            {categorias.map(c => (
              <div key={c.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <p className="text-xs font-black uppercase">{c.nombre}</p>
                  <p className="text-[10px] font-bold text-blue-600">Recibe el {(c.porcentaje * 100).toFixed(0)}%</p>
                </div>
                <button onClick={() => eliminarCat(c.id)} className="text-red-400 p-2">✕</button>
              </div>
            ))}
          </div>
          <button onClick={agregarCategoria} className="w-full py-3 bg-blue-50 text-blue-700 rounded-xl font-black text-[10px] uppercase border-2 border-dashed border-blue-200">+ Nueva Categoría</button>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 mb-2 uppercase">Meta Mensual de Ingresos:</p>
            <input type="number" value={metaMensual} onChange={(e) => {setMetaMensual(Number(e.target.value)); localStorage.setItem('meta_user', e.target.value)}} className="w-full p-3 bg-slate-50 rounded-xl font-black text-blue-600 outline-none" />
          </div>
        </section>
      )}

      {/* DASHBOARD DE SALDOS */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-4 no-scrollbar">
        {categorias.map(c => (
          <div key={c.id} className="min-w-[140px] bg-blue-900 text-white p-4 rounded-[2rem] shadow-xl">
            <p className="text-[9px] font-bold text-blue-300 uppercase mb-1">{c.nombre}</p>
            <p className="text-lg font-black tracking-tighter text-white">S/ {(saldosPorBolsa[c.id] || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* FORMULARIO */}
      <section className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/10 mb-6 space-y-4 border border-white">
        <div className="flex justify-between items-center">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setTipo('ingreso')} className={`px-4 py-2 rounded-lg text-[10px] font-black ${tipo === 'ingreso' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>RECIBIDO</button>
            <button onClick={() => setTipo('egreso')} className={`px-4 py-2 rounded-lg text-[10px] font-black ${tipo === 'egreso' ? 'bg-red-600 text-white' : 'text-slate-400'}`}>PAGADO</button>
          </div>
          {tipo === 'ingreso' && (
            <button onClick={() => setEsAuto(!esAuto)} className={`text-[9px] font-black px-3 py-2 rounded-lg border-2 ${esAuto ? 'border-green-500 text-green-600' : 'border-orange-500 text-orange-600'}`}>
              {esAuto ? 'AUTO %' : 'MANUAL'}
            </button>
          )}
        </div>

        {(tipo === 'egreso' || !esAuto) && (
          <select value={catSel} onChange={(e) => setCatSel(e.target.value)} className="w-full text-xs font-black text-slate-700 bg-slate-50 p-4 rounded-2xl border-2 border-slate-50 outline-none">
            <option value="">Selecciona la Bolsa</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}

        <div className="flex items-center border-b-4 border-slate-100 focus-within:border-blue-500 pb-2">
          <span className="text-3xl font-black text-slate-300 mr-2 italic">S/</span>
          <input type="number" value={monto || ''} placeholder="0.00" className="w-full text-5xl font-black outline-none bg-transparent" onChange={(e) => setMonto(Number(e.target.value))} />
        </div>
        <input type="text" value={nota} placeholder="¿Qué concepto es?" className="w-full text-base font-bold outline-none text-slate-700 bg-slate-50 p-4 rounded-2xl" onChange={(e) => setNota(e.target.value)} />
        
        <button onClick={guardarRegistro} className={`w-full py-5 rounded-[2rem] font-black text-sm text-white shadow-2xl transition-all active:scale-95 uppercase ${tipo === 'ingreso' ? 'bg-green-600' : 'bg-red-600'}`}>
          {editandoId ? 'Actualizar Movimiento' : `Confirmar ${tipo}`}
        </button>
      </section>

      {/* FILTROS Y LISTA */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm mb-6 font-black text-[10px] text-blue-600 border border-slate-200">
        <button onClick={() => setMesFiltro(m => m === 0 ? 11 : m - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full">‹</button>
        <span className="uppercase tracking-widest">{meses[mesFiltro]} {anioFiltro}</span>
        <button onClick={() => setMesFiltro(m => m === 11 ? 0 : m + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full">›</button>
      </div>

      <div className="space-y-4">
        {historial.filter(r => {
          const f = new Date(r.fecha + 'T00:00:00');
          return f.getMonth() === mesFiltro && f.getFullYear() === anioFiltro;
        }).map(r => (
          <div key={r.id} className="bg-white p-5 rounded-[2.2rem] flex justify-between items-center shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="flex-1" onClick={() => { setEditandoId(r.id); setMonto(r.monto); setNota(r.nota); setTipo(r.tipo); setEsAuto(r.esAutomatico ?? true); setCatSel(r.categoriaId || ''); window.scrollTo({top:0, behavior:'smooth'}); }}>
              <p className="text-sm font-black text-slate-900 uppercase leading-none mb-1">{r.nota || 'Sin concepto'}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">
                {r.tipo === 'ingreso' ? (r.esAutomatico ? 'Repartido en %' : `Bolsa: ${categorias.find(c => c.id === r.categoriaId)?.nombre}`) : `Pagado de: ${categorias.find(c => c.id === r.categoriaId)?.nombre}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className={`font-black text-lg ${r.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                {r.tipo === 'ingreso' ? '+' : '-'} S/ {r.monto.toFixed(2)}
              </p>
              <button onClick={() => { if(confirm("¿Borrar?")) setHistorial(historial.filter(x => x.id !== r.id)) }} className="text-slate-200 font-bold text-lg">✕</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
