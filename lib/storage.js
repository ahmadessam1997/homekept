import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = { profile: 'hk.profile', history: 'hk.history', log: 'hk.log', costs: 'hk.costs' };

// Corrupt/partial JSON on device should never crash the app — fall back safely.
function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function getProfile() {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  return safeParse(raw, null);
}
export async function saveProfile(profile) {
  // `createdAt` anchors the schedule engine: seasonal work whose window closed
  // before the user ever had the app is not their debt, and without this stamp a
  // user who has completed nothing yet has no evidence of when they joined — so
  // outstanding seasonal tasks would skip a year instead of staying overdue.
  // Stamped once and preserved across "Edit home profile".
  const prev = await getProfile();
  const createdAt = prev?.createdAt || profile.createdAt || new Date().toISOString();
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify({ ...profile, createdAt }));
}

// history: { [taskId]: lastCompletedISO } — drives due-date math
export async function getHistory() {
  const raw = await AsyncStorage.getItem(KEYS.history);
  return safeParse(raw, {});
}

// log: append-only list of completions for the History screen
export async function getLog() {
  const raw = await AsyncStorage.getItem(KEYS.log);
  return safeParse(raw, []);
}

// cost: optional number (dollars) spent completing the task
export async function completeTask(task, cost = 0) {
  const nowISO = new Date().toISOString();
  const history = await getHistory();
  history[task.id] = nowISO;
  await AsyncStorage.setItem(KEYS.history, JSON.stringify(history));

  const log = await getLog();
  log.unshift({ id: task.id, title: task.title, icon: task.icon, at: nowISO, cost: Number(cost) || 0 });
  await AsyncStorage.setItem(KEYS.log, JSON.stringify(log.slice(0, 500)));

  if (Number(cost) > 0) {
    const costs = await getCosts();
    costs.unshift({ id: task.id, title: task.title, icon: task.icon, at: nowISO, cost: Number(cost) });
    await AsyncStorage.setItem(KEYS.costs, JSON.stringify(costs.slice(0, 500)));
  }
  return history;
}

export async function getCosts() {
  const raw = await AsyncStorage.getItem(KEYS.costs);
  return safeParse(raw, []);
}

export async function resetAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
