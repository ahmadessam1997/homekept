// Schedule engine. Pure functions: profile + history in, personalized dated task list out.
import { TASKS } from '../data/taskLibrary';

// Everything below works in whole *local calendar days*. The card, the bucket and the
// 9 AM reminder all have to agree on what "due today" means, and a task finished at
// 22:00 must not fall due a day later than the same task finished at 08:00.
function startOfDay(d) {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
}

function addDays(d, n) {
  const day = new Date(d);
  day.setDate(day.getDate() + n);
  return day;
}

// Rounding absorbs the 23- and 25-hour days DST produces, which plain division reports
// as 0.96 / 1.04 days and would push a due date to the wrong side of midnight.
function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

// How far a seasonal window reaches on either side of the 1st of its month.
// Before it: seasonal jobs happen when the weather (or the contractor) allows, so
// gutters cleaned on Oct 25 satisfy the November window instead of re-listing days
// later. After it: a window that opened this recently is still worth doing now, so
// someone installing the app in mid-November is told to clean the gutters rather than
// being sent away until May.
const SEASON_WINDOW_DAYS = 45;

// The 1st of every listed month, over a span wide enough that both an old completion
// and next year's target are always present.
function seasonalOccurrences(months, year) {
  const sorted = [...months].sort((a, b) => a - b);
  const out = [];
  for (let y = year - 2; y <= year + 2; y++) {
    for (const m of sorted) out.push(new Date(y, m - 1, 1));
  }
  return out;
}

// Oldest timestamp we hold for this user — a proxy for "since when have they had the
// app". profile.createdAt when it exists, otherwise their earliest completion.
function earliestKnown(profile, history) {
  const stamps = [(profile || {}).createdAt, ...Object.values(history)]
    .map((s) => (s ? new Date(s) : null))
    .filter((d) => d && !isNaN(d));
  return stamps.length ? new Date(Math.min(...stamps)) : null;
}

// Does this task apply to this home?
export function taskApplies(task, profile) {
  const c = task.conditions || {};
  for (const key of Object.keys(c)) {
    const rule = c[key];
    if (Array.isArray(rule)) {
      if (!rule.includes(profile[key])) return false;
    } else if (typeof rule === 'boolean') {
      if (Boolean(profile[key]) !== rule) return false;
    }
  }
  return true;
}

// Next due date for a task, at local midnight, given the last time it was completed
// (ISO string or null). startedAt (ISO string or Date, optional) is when this user
// began using the app; it only affects a seasonal task that has never been done.
export function nextDueDate(task, lastDoneISO, now = new Date(), startedAt) {
  const today = startOfDay(now);

  if (task.schedule.type === 'interval') {
    if (!lastDoneISO) return today; // never done -> the cycle starts today
    return addDays(startOfDay(lastDoneISO), task.schedule.days);
  }

  // seasonal: due on the 1st of each listed month; find the window still outstanding.
  const occurrences = seasonalOccurrences(task.schedule.months, now.getFullYear());
  const start = lastDoneISO ? null : startOfDay(startedAt || now);
  let live;

  if (lastDoneISO) {
    const done = startOfDay(lastDoneISO);
    // A window is still outstanding only if it opened after the completion. The lead is
    // capped at half the gap to the previous window so a single completion can never
    // swallow two windows, however close together a task's months sit.
    live = occurrences.filter((o, i) => {
      const gap = i ? daysBetween(occurrences[i - 1], o) : 365;
      return addDays(o, -Math.min(SEASON_WINDOW_DAYS, Math.floor(gap / 2))) > done;
    });
  } else {
    // Never done: only windows this user was around for. Work whose window closed
    // before they installed the app is not their debt, so nobody starts out overdue.
    live = occurrences.filter((o) => addDays(o, SEASON_WINDOW_DAYS) >= start);
  }

  if (!live.length) live = occurrences.filter((o) => o > today); // corrupt timestamp: just look ahead

  // Stay on the outstanding window — the latest one that has arrived — so work that was
  // never done stays overdue instead of silently jumping eleven months into the future.
  const arrived = live.filter((o) => o <= today);
  const due = arrived.length ? arrived[arrived.length - 1] : live[0];

  // Never backdate past the day the user joined: a window they missed before they had
  // the app reads as due now, not as overdue.
  return start && due < start ? start : due;
}

// Build the full personalized schedule.
// history: { [taskId]: lastCompletedISO }
// startedAt: optional; when this user began using the app. Omitted, we use the earliest
// evidence we have, and with no evidence at all, `now` — the honest reading of a user we
// hold no earlier record of, and what keeps day one free of overdue items they never had
// a chance to do.
export function buildSchedule(profile, history = {}, now = new Date(), startedAt) {
  const flat = { ...profile };
  (profile.features || []).forEach((f) => (flat[f] = true));
  const start = startedAt || earliestKnown(profile, history) || now;

  return TASKS.filter((t) => taskApplies(t, flat))
    .map((t) => {
      const due = nextDueDate(t, history[t.id], now, start);
      const daysUntil = daysBetween(now, due);
      return { ...t, due, daysUntil, overdue: daysUntil < 0 };
    })
    .sort((a, b) => a.due - b.due);
}

export function formatDue(item) {
  if (item.overdue) return `Overdue by ${Math.abs(item.daysUntil)}d`;
  if (item.daysUntil === 0) return 'Due today';
  if (item.daysUntil <= 14) return `Due in ${item.daysUntil}d`;
  return item.due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function bucketOf(item) {
  if (item.overdue || item.daysUntil <= 30) return 'Up next';
  if (item.daysUntil <= 90) return 'Coming up';
  return 'Later this year';
}
