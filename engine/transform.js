// Transformation layer — turns the two raw monthly files into the clean per-DSE inputs
// buildDseView() consumes. The incentive workbook (this-month, ₹) and the SP file
// (rolling 12-month, %) arrive SEPARATELY and are joined on the DSE code
// (incentive "Agent Code" == SP "BO Code"). Pure: it works on already-parsed rows/objects;
// Excel/CSV parsing is a thin adapter concern kept out of here.

const numOrNaN = v => {
  const s = String(v ?? '').trim();
  return (s === '' || s === '#N/A' || s === 'NA') ? NaN : Number(s);
};
const naFalse = v => v !== 'NA' && v != null && v !== '';

/** One incentive DSE-sheet row -> engine incentive inputs (+ minimal meta). */
export function parseIncentiveDseRow(row) {
  return {
    dse: { agent: row.agent, grade: row.desg },
    incentiveInputs: {
      target: Number(row.target),
      wfypOthers: Number(row.wfypOthers),
      ulipGap: Number(row.ulipGap),
      ulipFyp: Number(row.ulipFyp),
      persCM: numOrNaN(row.persCM),
      persLM: numOrNaN(row.persLM),
      nop: Number(row.nop),
      holdNotAchieved: row.holdFlag === 'Not Achieved',
    },
  };
}

/** One Summary-Sheet policy row -> Stage-1 policy shape. */
export function mapPolicyRow(row) {
  return {
    fyp: Number(row.fyp), adjFyp: Number(row.adjFyp), wfypPct: Number(row.wfypPct),
    s2sRate: Number(row.s2sRate ?? 1),
    ftZero: naFalse(row.ftZero), ft50: naFalse(row.ft50), ft75: naFalse(row.ft75),
    differential: naFalse(row.differential),
    protection: row.protection, category: row.productCategory, ulipGap: row.ulipGap, product: row.product,
  };
}

const addMonths = (key, d) => {
  const [y, m] = key.split('-').map(Number);
  const t = y * 12 + (m - 1) + d;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

/** The 12 month-keys ending at `maxMonth` (inclusive). */
export function trailingWindow(maxMonth, months = 12) {
  return Array.from({ length: months }, (_, k) => addMonths(maxMonth, k - (months - 1)));
}

/** Sum a BO's monthly WFYP/NOP over the window. */
export function rollingTotals(monthlyForBo, window) {
  let wfyp = 0, nop = 0;
  for (const k of window) {
    const r = (monthlyForBo || {})[k];
    if (r) { wfyp += r.w || 0; nop += r.n || 0; }
  }
  return { wfyp, nop };
}

function findMasterByBo(master, bo) {
  for (const e of Object.values(master)) if (e.bo === bo) return e;
  return null;
}

/** SP inputs for one BO from the rolling file, or null if the DSE/grade isn't found. */
export function buildSpInputs(spData, boCode) {
  const entry = findMasterByBo(spData.master, boCode);
  if (!entry) return null;
  const tg = spData.targets[entry.desg];
  if (!tg) return null;
  const { wfyp, nop } = rollingTotals(spData.monthly[boCode], trailingWindow(spData.meta.maxMonth));
  return {
    trailingWfyp: wfyp, trailingNop: nop,
    targetWfyp: tg.wfyp, targetNop: tg.nop,
    persistency: entry.pers === 'NA' ? 'NA' : entry.pers,
    persistencyThreshold: tg.thr,
  };
}

/** Group Summary-Sheet policy rows by their DSE code (Unit Manager_Code). */
export function groupPoliciesByDse(policyRows) {
  const map = new Map();
  for (const row of policyRows) {
    const key = row.dse;
    if (key == null || key === '') continue; // unattributed policies are skipped
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(mapPolicyRow(row));
  }
  return map;
}

/** Join both files for one DSE (key = agent code == BO code). */
export function transformDse(dseRow, spData, policiesByDse) {
  const { dse, incentiveInputs } = parseIncentiveDseRow(dseRow);
  const agent = dseRow.agent;
  const entry = findMasterByBo(spData.master, agent);
  const spInputs = buildSpInputs(spData, agent);
  return {
    dse: { ...dse, name: entry ? entry.name : undefined, zone: entry ? entry.zone : undefined },
    incentiveInputs,
    spInputs,
    policies: (policiesByDse && policiesByDse.get(agent)) || null,
    joined: spInputs != null,
  };
}

/**
 * Join a month's two files into per-DSE view inputs.
 * @returns joined records only (DSEs present in both files); pass `{ withUnjoined: true }` to keep the rest.
 */
export function transformMonth({ dseRows, spData, policyRows = [], withUnjoined = false }) {
  const byDse = groupPoliciesByDse(policyRows);
  const all = dseRows.map(row => transformDse(row, spData, byDse));
  return withUnjoined ? all : all.filter(r => r.joined);
}
