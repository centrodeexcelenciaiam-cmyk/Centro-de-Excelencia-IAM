import React from 'react';
import { consolidateIAM, IAMPatient } from '../data/iam';

const format = (value: number | null) => value === null ? '—' : value.toLocaleString('es-CO', {minimumFractionDigits:2, maximumFractionDigits:2});
const colors: Record<number, string> = {0:'#0e7490', 1:'#0891b2', 3:'#22d3ee', 4:'#a5f3fc', 5:'#7c3aed', 6:'#c4b5fd'};

export function IAMBlocksChart({patients}: {patients: IAMPatient[]}) {
  const data = React.useMemo(()=>consolidateIAM(patients),[patients]);
  const max = Math.max(5, Math.ceil(Math.max(...data.blocks.map(b=>b.mean ?? 0))/5)*5);
  return <section aria-label="Consolidado de tiempos por área" className="bg-white border border-[#ececf1] rounded-2xl p-5 md:p-6 space-y-5">
    <div className="flex flex-wrap gap-3 items-start justify-between">
      <div><h2 className="font-bold text-slate-900 text-lg">Tiempos por área de atención</h2>
        <p className="text-sm text-slate-500 mt-1">Dos partes de la misma ruta · Tiempo promedio por paciente, en minutos.</p></div>
      <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{data.count.toLocaleString('es-CO')} pacientes evaluables</span>
    </div>
    {!data.count ? <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">No hay pacientes con tiempos evaluables en ambos bloques para esta selección.</p> : <>
      <figure aria-label="Gráfica de tiempo promedio: Urgencias y Hemodinamia" className="space-y-5">
        <figcaption className="sr-only">Comparación en una escala común de minutos. Los segmentos muestran las etapas secuenciales de cada área. La activación del código IAM se muestra aparte porque ocurre en paralelo.</figcaption>
        {data.blocks.map((block,index)=><div key={block.name}>
          <div className="flex justify-between items-start gap-3 mb-2">
            <div><h3 className={`text-sm font-bold ${index===0?'text-cyan-700':'text-violet-700'}`}>{index+1}. {block.name}</h3><p className="text-xs text-slate-500 mt-0.5">{block.description}</p></div>
            <strong className="text-xl tabular-nums text-slate-900 whitespace-nowrap">{format(block.mean)} <span className="text-xs font-normal text-slate-500">min</span></strong>
          </div>
          <div className="h-10 rounded-lg bg-slate-50 relative overflow-hidden" role="img" aria-label={`${block.name}: ${format(block.mean)} minutos promedio`}>
            {[0,1,2,3,4].map(i=><span key={i} aria-hidden="true" className="absolute inset-y-0 border-l border-slate-200" style={{left:`${25*i}%`}} />)}
            <div className="h-full flex relative">
              {block.stages.map(stage=><div key={stage.index} title={`${stage.name}: ${format(stage.mean)} min`} style={{width:`${100*(stage.mean ?? 0)/max}%`,backgroundColor:colors[stage.index]}} className="h-full border-r border-white/60" />)}
            </div>
          </div>
        </div>)}
        <div className="flex justify-between text-[11px] text-slate-500 tabular-nums -mt-2" aria-label="Escala compartida en minutos">{[0,1,2,3,4].map(i=><span key={i}>{format(max*i/4)}{i===4?' min':''}</span>)}</div>
      </figure>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.blocks.map((block,index)=><div key={block.name} className="rounded-xl border border-slate-100 p-4">
          <h3 className="font-semibold text-sm text-slate-800">{block.name} · desglose del promedio</h3>
          <ul className="mt-3 space-y-2">{block.stages.map(stage=><li key={stage.index} className="flex justify-between gap-3 text-xs text-slate-600"><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{backgroundColor:colors[stage.index]}} />{stage.name}</span><strong className="tabular-nums whitespace-nowrap text-slate-800">{format(stage.mean)} min</strong></li>)}</ul>
          {index===0 && <div className="mt-3 pt-3 border-t border-dashed border-cyan-200"><div className="flex justify-between gap-3 text-xs text-slate-600"><span>Activación código IAM · en paralelo</span><strong className="tabular-nums whitespace-nowrap text-slate-800">{format(data.activationMean)} min</strong></div><p className="text-[11px] text-slate-500 mt-1">Toma EKG → comunicación a hemodinamia. Se supervisa en Urgencias; no se suma al consolidado.</p></div>}
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">Mediana: {format(block.median)} min · P90: {format(block.p90)} min</p>
        </div>)}
      </div>
      <div className="rounded-xl bg-slate-50 p-4 flex flex-wrap justify-between gap-2 text-sm"><span className="text-slate-600">Consolidado de la ruta · Urgencias + Hemodinamia</span><strong className="text-slate-900 tabular-nums">{format(data.blocks[0].mean)} + {format(data.blocks[1].mean)} = {format(data.routeMean)} min</strong></div>
    </>}
    <p className="text-xs text-slate-500 leading-relaxed">Los dos bloques usan los mismos pacientes y responden a todos los filtros. Urgencias incluye el alistamiento y el traslado hasta la llegada a hemodinamia. Los totales se calculan antes de redondear.{data.excluded>0 ? ` ${data.excluded.toLocaleString('es-CO')} registros excluidos por tiempos incompletos o no válidos.` : ''}</p>
  </section>;
}
