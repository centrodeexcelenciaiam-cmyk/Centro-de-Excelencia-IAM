import source from './iamPatients.json';

export const IAM_STAGES = [
  { name: 'Admisión a EKG', goal: 8, strict: true, from: 0, to: 1 },
  { name: 'Lectura de EKG', goal: 2, strict: false, from: 1, to: 2 },
  { name: 'Activación código IAM', goal: 2, strict: false, from: 1, to: 3 },
  { name: 'Alistamiento', goal: 10, strict: false, from: 2, to: 4 },
  { name: 'Llegada a hemodinamia', goal: 3, strict: false, from: 4, to: 5 },
  { name: 'Inicio del procedimiento', goal: 10, strict: false, from: 5, to: 6 },
  { name: 'Inflado del balón', goal: 5, strict: false, from: 6, to: 7 },
  { name: 'Ruta total', goal: 40, strict: false, from: 0, to: 7 },
] as const;
export const IAM_EVENTS = ['Admisión', 'Toma EKG', 'Lectura EKG', 'Comunicación hemodinamia', 'Paciente listo', 'Llegada hemodinamia', 'Primera punción', 'Inflado balón'];
export interface IAMPatient {
  id: string; date: string; age: number; sex: string; service: string;
  events: (string | null)[]; minutes: (number | null)[];
  compliant: (boolean | null)[]; totalOK: boolean | null; allOK: boolean | null;
}

// Workbook timestamps are hospital wall-clock times, without timezone metadata.
// Parse all as UTC solely for interval arithmetic, avoiding device DST changes.
export function calculateIntervals(events: (string | null)[]) {
  return IAM_STAGES.map(({ from, to }) => {
    if (!events[from] || !events[to]) return null;
    const elapsed = (Date.parse(`${events[to]}Z`) - Date.parse(`${events[from]}Z`)) / 60000;
    return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null;
  });
}
export function classifyIntervals(minutes: (number | null)[]) {
  return IAM_STAGES.map((stage, i) => {
    const value = minutes[i];
    return value == null || !Number.isFinite(value) || value < 0
      ? null : stage.strict ? value < stage.goal : value <= stage.goal;
  });
}
export const iamPatients: IAMPatient[] = source.records.map((row) => {
  const events = row.slice(5, 13) as string[];
  const minutes = calculateIntervals(events);
  const compliant = classifyIntervals(minutes);
  return {
    id: String(row[0]), date: String(row[1]).slice(0, 10), age: Number(row[2]),
    sex: String(row[3]), service: String(row[4]), events, minutes, compliant,
    totalOK: compliant[7],
    allOK: compliant.includes(null) ? null : compliant.every(Boolean),
  };
});
export const iamSourceName = source.source;
export const iamServices = [...new Set(iamPatients.map(p => p.service))].sort();
export const IAM_BLOCKS = [
  { name: 'Urgencias', description: 'Admisión → llegada a hemodinamia', stages: [0, 1, 3, 4] },
  { name: 'Hemodinamia', description: 'Llegada a hemodinamia → inflado del balón', stages: [5, 6] },
] as const;

export function getIAMBlockTimes(patient: IAMPatient): (number | null)[] {
  return IAM_BLOCKS.map(block => {
    const values = block.stages.map(i => patient.minutes[i]);
    return values.some(v => v === null || !Number.isFinite(v) || v < 0)
      ? null : (values as number[]).reduce((sum, value) => sum + value, 0);
  });
}

export function consolidateIAM(patients: IAMPatient[]) {
  // Both means use the same evaluable cohort, so their sum reconciles to the route.
  // Activation (stage 2) runs in parallel to reading/preparation and is not additive.
  const evaluable = patients.map(patient => ({ patient, times: getIAMBlockTimes(patient) }))
    .filter(row => row.times.every(v => v !== null));
  const mean = (values: number[]) => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const quantile = (values: number[], q: number) => {
    if (!values.length) return null;
    const sorted = [...values].sort((a,b)=>a-b);
    const position = (sorted.length-1)*q;
    const lower = Math.floor(position);
    return sorted[lower] + (sorted[Math.ceil(position)]-sorted[lower])*(position-lower);
  };
  const blocks = IAM_BLOCKS.map((block, index) => {
    const values = evaluable.map(row => row.times[index]!);
    return { ...block, mean: mean(values), median: quantile(values, .5), p90: quantile(values, .9),
      stages: block.stages.map(i => ({ index: i, name: IAM_STAGES[i].name, mean: mean(evaluable.map(row=>row.patient.minutes[i]!)) })) };
  });
  const activation = evaluable.map(row=>row.patient.minutes[2]).filter((v): v is number=>v!==null && Number.isFinite(v) && v>=0);
  return { blocks, count: evaluable.length, excluded: patients.length-evaluable.length,
    routeMean: mean(evaluable.map(row=>row.times[0]!+row.times[1]!)),
    activationMean: mean(activation), activationCount: activation.length };
}
export function summarizeIAM(patients: IAMPatient[]) {
  const totals = patients.map(p => p.minutes[7]).filter((v): v is number => v !== null).sort((a,b) => a-b);
  const percentile = (q: number) => {
    if (!totals.length) return null;
    const position = (totals.length - 1) * q;
    const lower = Math.floor(position);
    return totals[lower] + (totals[Math.ceil(position)] - totals[lower]) * (position - lower);
  };
  return {
    count: patients.length, valid: totals.length,
    totalOK: patients.filter(p => p.totalOK === true).length,
    allOK: patients.filter(p => p.allOK === true).length,
    allValid: patients.filter(p => p.allOK !== null).length,
    mean: totals.length ? totals.reduce((a,b) => a+b,0) / totals.length : null,
    median: percentile(.5), p90: percentile(.9),
    stages: IAM_STAGES.map((stage, i) => {
      const values = patients.map(p => p.minutes[i]).filter((v): v is number => v !== null);
      const valid = patients.filter(p => p.compliant[i] !== null).length;
      const count = patients.filter(p => p.compliant[i] === true).length;
      return { ...stage, count, valid, failed: valid-count, mean: values.length ? values.reduce((a,b)=>a+b,0)/values.length : null };
    }),
  };
}
export function exportIAM(patients: IAMPatient[]) {
  const headers = ['ID ficticio', 'Fecha', 'Edad', 'Sexo', 'Servicio', ...IAM_EVENTS,
    ...IAM_STAGES.map(s => `${s.name} (min)`), ...IAM_STAGES.map(s => `Cumple ${s.name}`), 'Cumple todas las etapas'];
  const status = (v: boolean | null) => v === null ? 'Dato no válido' : v ? 'Cumple' : 'No cumple';
  const rows = patients.map(p => [p.id, p.date, p.age, p.sex, p.service, ...p.events,
    ...p.minutes, ...p.compliant.map(status), status(p.allOK)]);
  const quote = (v: unknown) => `"${String(v ?? '').replace(/"/g,'""')}"`;
  const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(quote).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'IAM_pacientes_ficticios.csv';
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
