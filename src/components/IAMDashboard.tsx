import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IAMBlocksChart } from './IAMBlocksChart';
import iamHeaderImage from '../assets/centro-excelencia-iam.png';
import { HeartPulse, Download, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { iamPatients, iamServices, iamSourceName, IAM_STAGES, IAM_EVENTS, IAMPatient, summarizeIAM, exportIAM } from '../data/iam';

const number = (v: number | null, digits = 1) => v === null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const percent = (n: number, d: number) => d ? `${number(100*n/d, 2)} %` : '—';
const status = (v: boolean | null) => v === null ? 'Dato no válido' : v ? 'Cumple' : 'No cumple';
const badge = (v: boolean | null) => v === null ? 'bg-slate-100 text-slate-600' : v ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800';
const field = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 min-w-0';
const pageSize = 50;

export function IAMDashboard() {
  const [search, setSearch] = useState('');
  const [service, setService] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [outcome, setOutcome] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<IAMPatient | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
      if (event.key === 'Tab') {
        // The close button is the only interactive element inside this dialog.
        event.preventDefault();
        dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, [selected]);
  const dateError = !!from && !!to && from > to;
  const patients = useMemo(() => dateError ? [] : iamPatients.filter(p =>
    (!search || p.id.toLowerCase().includes(search.toLowerCase().trim())) &&
    (!service || p.service === service) && (!from || p.date >= from) && (!to || p.date <= to) &&
    (!outcome || (outcome === 'total-ok' ? p.totalOK === true : outcome === 'total-fail' ? p.totalOK === false : p.allOK === true))
  ), [search, service, from, to, outcome, dateError]);
  const summary = useMemo(() => summarizeIAM(patients), [patients]);
  const pages = Math.max(1, Math.ceil(patients.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = patients.slice((currentPage-1)*pageSize, currentPage*pageSize);
  const reset = () => { setSearch(''); setService(''); setFrom(''); setTo(''); setOutcome(''); setPage(1); };

  return <div className="space-y-6">
    <section className="rounded-2xl bg-white border border-[#ececf1] p-5 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        <img
          src={iamHeaderImage}
          alt="Centro de Excelencia IAM: seguimiento de tiempos de atención, trazabilidad por paciente e indicadores de la ruta de admisión, EKG y reperfusión"
          width={1536}
          height={1024}
          className="block w-full max-w-sm mx-auto h-auto object-contain"
        />
      </div>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex gap-3 items-start">
          <div className="rounded-xl p-3 bg-rose-50 text-rose-600"><HeartPulse className="w-6 h-6" /></div>
          <div><p className="text-xs text-rose-600 font-semibold uppercase tracking-wide">Centro de Excelencia IAM</p>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1">Tiempos de atención y reperfusión</h1>
            <p className="text-sm text-slate-500 mt-1">7.000 pacientes ficticios · 1 ene – 20 oct 2026</p></div>
        </div>
        <button disabled={!patients.length} onClick={() => exportIAM(patients)} className="inline-flex gap-2 items-center rounded-lg bg-slate-900 text-white px-4 py-2 text-sm disabled:opacity-40"><Download className="w-4 h-4" />Exportar selección CSV</button>
      </div>
      </div>
      <p className="mt-4 rounded-lg bg-amber-50 text-amber-900 px-3 py-2 text-xs leading-relaxed">Simulación: estos datos no representan pacientes reales. La ruta admisión → inflado del balón y su meta de ≤40 min son supuestos del archivo, pendientes de validación institucional.</p>
      <details className="text-xs text-slate-500 mt-3"><summary className="cursor-pointer">Fuente y reglas de cálculo</summary>
        <p className="mt-2 break-words">Fuente: {iamSourceName}. Tiempos recalculados desde las fechas y horas originales, sin depender de resultados guardados en Excel. La activación se mide desde la toma del EKG y ocurre en paralelo; no se suma nuevamente a la ruta total. Los valores faltantes o intervalos negativos se excluyen del denominador del indicador afectado. Cumplimiento de todas las etapas exige los ocho indicadores evaluables y cumplidos. No hay datos faltantes ni intervalos negativos en esta base.</p>
      </details>
    </section>

    <section aria-label="Filtros de pacientes IAM" className="rounded-2xl bg-white border border-[#ececf1] p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <label className="text-xs text-slate-600 flex flex-col gap-1">ID ficticio<input className={field} placeholder="Buscar IAM-00001" value={search} onChange={e => {setSearch(e.target.value); setPage(1);}} /></label>
        <label className="text-xs text-slate-600 flex flex-col gap-1">Servicio<select className={field} value={service} onChange={e=>{setService(e.target.value);setPage(1);}}><option value="">Todos los servicios</option>{iamServices.map(s=><option key={s}>{s}</option>)}</select></label>
        <label className="text-xs text-slate-600 flex flex-col gap-1">Desde<input type="date" className={field} value={from} onInput={e=>{setFrom(e.currentTarget.value);setPage(1);}} onChange={e=>{setFrom(e.target.value);setPage(1);}} /></label>
        <label className="text-xs text-slate-600 flex flex-col gap-1">Hasta<input type="date" className={field} value={to} onInput={e=>{setTo(e.currentTarget.value);setPage(1);}} onChange={e=>{setTo(e.target.value);setPage(1);}} /></label>
        <label className="text-xs text-slate-600 flex flex-col gap-1">Cumplimiento<select className={field} value={outcome} onChange={e=>{setOutcome(e.target.value);setPage(1);}}><option value="">Todos los resultados</option><option value="total-ok">Ruta total ≤40 min</option><option value="total-fail">Ruta total &gt;40 min</option><option value="all-ok">Todas las etapas</option></select></label>
      </div>
      <div className="flex justify-between gap-3 mt-3 text-xs"><p className={dateError ? 'text-red-700' : 'text-slate-500'} role={dateError ? 'alert' : undefined}>{dateError ? 'La fecha inicial debe ser anterior o igual a la final.' : `${patients.length.toLocaleString('es-CO')} de 7.000 registros · Todos los indicadores reflejan estos filtros.`}</p><button className="text-violet-700 font-semibold shrink-0" onClick={reset}>Limpiar filtros</button></div>
    </section>

    <section aria-label="Indicadores de la cohorte IAM" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {[
        ['Pacientes de la selección', summary.count.toLocaleString('es-CO'), 'Registros ficticios'],
        ['Ruta total ≤40 min', percent(summary.totalOK, summary.valid), `${summary.totalOK.toLocaleString('es-CO')} de ${summary.valid.toLocaleString('es-CO')} evaluables`],
        ['Todas las etapas', percent(summary.allOK, summary.allValid), `${summary.allOK.toLocaleString('es-CO')} de ${summary.allValid.toLocaleString('es-CO')} evaluables`],
        ['Tiempo total promedio', summary.mean === null ? '—' : `${number(summary.mean,2)} min`, `Mediana: ${number(summary.median)} · P90: ${number(summary.p90)} min`],
      ].map(([title,value,note]) => <div key={title} className="bg-white border border-[#ececf1] rounded-2xl p-5"><p className="text-xs text-slate-500">{title}</p><p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{value}</p><p className="text-xs text-slate-500 mt-2">{note}</p></div>)}
    </section>

    <IAMBlocksChart patients={patients} />

    <section className="bg-white border border-[#ececf1] rounded-2xl p-5">
      <h2 className="font-bold text-slate-900">Cumplimiento por etapa</h2>
      <p className="text-xs text-slate-500 mt-1 mb-4">Metas tomadas de la hoja «Metas y definiciones». Cumplir la ruta total no implica cumplir cada etapa.</p>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left min-w-[650px]"><thead><tr className="text-xs text-slate-500 border-b border-slate-100"><th className="py-3">Etapa</th><th>Meta</th><th className="text-right">Promedio</th><th className="text-right">No cumplen</th><th className="text-right w-44">Cumplimiento</th></tr></thead>
        <tbody>{summary.stages.map(s => <tr key={s.name} className="border-b border-slate-50"><th scope="row" className="py-3 pr-3 font-medium text-slate-800">{s.name}</th><td className="text-slate-500">{s.strict ? '<' : '≤'}{s.goal} min</td><td className="text-right tabular-nums text-slate-700">{number(s.mean,2)} min</td><td className="text-right tabular-nums text-slate-700">{s.failed.toLocaleString('es-CO')}</td><td className="pl-5"><div className="flex items-center justify-between text-xs text-slate-600 mb-1"><span>{s.count.toLocaleString('es-CO')}/{s.valid.toLocaleString('es-CO')}</span><strong>{percent(s.count,s.valid)}</strong></div><div className="h-1.5 rounded bg-slate-100 overflow-hidden"><div className="h-full bg-rose-500 rounded" style={{width:`${s.valid ? 100*s.count/s.valid : 0}%`}} /></div></td></tr>)}</tbody>
      </table></div>
    </section>

    <section className="bg-white border border-[#ececf1] rounded-2xl overflow-hidden">
      <div className="p-5"><h2 className="font-bold text-slate-900">Pacientes y tiempos</h2><p className="text-xs text-slate-500 mt-1">Selecciona un ID para consultar las ocho marcas de tiempo y el cumplimiento de cada etapa.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm text-left"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['ID ficticio','Fecha','Edad / Sexo','Servicio','Ruta total','Meta total','Todas las etapas'].map(h=><th className="px-4 py-3" key={h}>{h}</th>)}</tr></thead><tbody>
        {visible.map(p=><tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-3"><button className="font-semibold text-violet-700 underline underline-offset-2" onClick={()=>setSelected(p)}>{p.id}</button></td><td className="px-4 py-3 text-slate-600">{p.date}</td><td className="px-4 py-3 text-slate-600">{p.age} / {p.sex}</td><td className="px-4 py-3 text-slate-600">{p.service}</td><td className="px-4 py-3 tabular-nums font-medium text-slate-800">{number(p.minutes[7],0)} min</td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs ${badge(p.totalOK)}`}>{status(p.totalOK)}</span></td><td className="px-4 py-3"><span className={`rounded px-2 py-1 text-xs ${badge(p.allOK)}`}>{status(p.allOK)}</span></td></tr>)}
        {!visible.length && <tr><td colSpan={7} className="text-center py-12 text-slate-500"><Search className="w-6 h-6 mx-auto mb-2" />No hay pacientes para estos filtros.</td></tr>}
      </tbody></table></div>
      <div className="p-4 flex justify-between items-center gap-3 border-t border-slate-100 text-xs text-slate-500"><span>{patients.length ? `${(currentPage-1)*pageSize+1}–${Math.min(currentPage*pageSize,patients.length)} de ${patients.length.toLocaleString('es-CO')}` : '0 registros'} · Página {currentPage} de {pages}</span><div className="flex gap-2"><button aria-label="Página anterior" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button><button aria-label="Página siguiente" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button></div></div>
    </section>

    {selected && <div className="fixed inset-0 z-50 bg-slate-900/40 p-4 flex items-center justify-center" onClick={()=>setSelected(null)}><section ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Detalle ${selected.id}`} className="bg-white rounded-2xl shadow-xl p-5 md:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
      <div className="flex justify-between gap-4 items-start"><div><h2 className="text-xl font-bold text-slate-900">{selected.id}</h2><p className="text-sm text-slate-500 mt-1">Paciente ficticio · {selected.age} años · {selected.sex} · {selected.service}</p></div><button autoFocus aria-label="Cerrar detalle" onClick={()=>setSelected(null)} className="p-2 rounded-lg border"><X className="w-5 h-5" /></button></div>
      <h3 className="font-semibold text-slate-800 mt-5 mb-2">Eventos originales</h3><dl className="grid sm:grid-cols-2 gap-2 text-xs">{IAM_EVENTS.map((event,i)=><div key={event} className="bg-slate-50 rounded-lg p-3"><dt className="text-slate-500">{event}</dt><dd className="font-medium text-slate-800 mt-1">{selected.events[i]?.replace('T',' ') ?? 'Sin dato'}</dd></div>)}</dl>
      <h3 className="font-semibold text-slate-800 mt-5 mb-2">Tiempos por etapa</h3><ul className="space-y-2">{IAM_STAGES.map((s,i)=><li key={s.name} className="flex justify-between gap-3 text-xs border-b border-slate-100 py-2"><span className="text-slate-700">{s.name} · {s.strict ? '<' : '≤'}{s.goal} min</span><span className={`rounded px-2 py-1 ${badge(selected.compliant[i])}`}>{number(selected.minutes[i],0)} min · {status(selected.compliant[i])}</span></li>)}</ul>
      <p className="text-xs text-slate-500 mt-4">Las fechas se muestran como están registradas en el Excel, sin conversión de zona horaria.</p>
    </section></div>}
  </div>;
}
