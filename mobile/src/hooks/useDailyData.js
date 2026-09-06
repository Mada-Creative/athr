import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { enqueueAction, flushPendingActions } from '../utils/pendingActions';

const ATHKAR_CONTENT_FALLBACK_KEYS = ['morning', 'evening', 'afterPrayer', 'sleep', 'wakeup'];

const cacheKey = (date) => `athr_daily_cache_${date}`;

async function readCache(date) {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(date));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

async function writeCache(date, snapshot) {
  try {
    await AsyncStorage.setItem(cacheKey(date), JSON.stringify(snapshot));
  } catch (err) {
    // best-effort only
  }
}

// Central place that loads everything the Home + Tracker screens need for one
// day, and exposes small mutation helpers that optimistically patch local
// state after each API call so toggles feel instant.
//
// Offline behavior: every successful load is cached to disk per-day, so a
// day already seen once keeps showing (and staying interactive) with no
// connection at all. A toggle made offline is never reverted — it's kept
// and queued, then replayed automatically the next time anything talks to
// the server successfully.
export default function useDailyData(date) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Distinct from `error`: "this is saved locally and will sync once
  // you're back online" is not a failure, so it renders differently.
  const [syncNotice, setSyncNotice] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [prayerLog, setPrayerLog] = useState(null);
  const [athkar, setAthkar] = useState({});
  const [quran, setQuran] = useState(null);
  const [dailyDeedTasks, setDailyDeedTasks] = useState([]);
  const [otherTasks, setOtherTasks] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    // If connectivity just came back, get queued writes out of the way
    // first so the fetch right after reflects them.
    await flushPendingActions();
    try {
      const [prayerRes, athkarRes, quranRes, dailyDeedsRes, otherRes, taskLogsRes, statsRes] = await Promise.all([
        api.get(`/prayers/${date}`),
        api.get(`/athkar/${date}`),
        api.get(`/quran/${date}`),
        api.get('/tasks?group=dailyDeeds'),
        api.get('/tasks?group=other'),
        api.get(`/tasks/logs/${date}`),
        api.get(`/stats/day/${date}`),
      ]);
      const snapshot = {
        prayerLog: prayerRes.log,
        athkar: athkarRes.categories,
        quran: quranRes.log,
        dailyDeedTasks: dailyDeedsRes.tasks,
        otherTasks: otherRes.tasks,
        taskLogs: taskLogsRes.logs,
        stats: statsRes,
      };
      setPrayerLog(snapshot.prayerLog);
      setAthkar(snapshot.athkar);
      setQuran(snapshot.quran);
      setDailyDeedTasks(snapshot.dailyDeedTasks);
      setOtherTasks(snapshot.otherTasks);
      setTaskLogs(snapshot.taskLogs);
      setStats(snapshot.stats);
      setIsOffline(false);
      writeCache(date, snapshot);
    } catch (err) {
      if (err.isNetworkError) {
        const cached = await readCache(date);
        if (cached) {
          setPrayerLog(cached.prayerLog);
          setAthkar(cached.athkar);
          setQuran(cached.quran);
          setDailyDeedTasks(cached.dailyDeedTasks);
          setOtherTasks(cached.otherTasks);
          setTaskLogs(cached.taskLogs);
          setStats(cached.stats);
          setIsOffline(true);
          // Data is showing fine from cache — no need for a scary error.
        } else {
          setError('لا يوجد اتصال بالإنترنت ولا بيانات محفوظة لهذا اليوم بعد');
        }
      } else {
        setError(err.message || 'تعذر تحميل بيانات اليوم');
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const togglePrayer = useCallback(
    async (group, key) => {
      if (prayerLog?.excused) return; // guarded again server-side, but avoid the round trip
      const currentValue = prayerLog?.[group]?.[key];
      setError(null);
      setSyncNotice(null);
      setPrayerLog((prev) => ({
        ...prev,
        [group]: { ...prev?.[group], [key]: !currentValue },
      }));
      const path = `/prayers/${date}/toggle`;
      const body = { group, key, value: !currentValue };
      try {
        const res = await api.patch(path, body);
        setPrayerLog(res.log);
        load();
      } catch (err) {
        if (err.isNetworkError) {
          await enqueueAction({ method: 'patch', path, body });
          setSyncNotice('تم الحفظ على جهازك — سيُرفع عند عودة الاتصال');
        } else {
          setPrayerLog((prev) => ({ ...prev, [group]: { ...prev?.[group], [key]: currentValue } }));
          setError(err.message || 'تعذر تسجيل الصلاة');
        }
      }
    },
    [date, prayerLog, load]
  );

  const toggleExcused = useCallback(
    async (excused) => {
      setPrayerLog((prev) => ({ ...prev, excused }));
      const path = `/prayers/${date}/excuse`;
      try {
        const res = await api.patch(path, { excused });
        setPrayerLog(res.log);
        load();
      } catch (err) {
        if (err.isNetworkError) {
          await enqueueAction({ method: 'patch', path, body: { excused } });
          setSyncNotice('تم الحفظ على جهازك — سيُرفع عند عودة الاتصال');
        } else {
          setPrayerLog((prev) => ({ ...prev, excused: !excused }));
        }
      }
    },
    [date, load]
  );

  const toggleAthkarItem = useCallback(
    async (category, itemIndex) => {
      const path = `/athkar/${date}/${category}`;
      try {
        const res = await api.patch(path, { itemIndex });
        setAthkar((prev) => ({ ...prev, [category]: res }));
        load();
      } catch (err) {
        if (err.isNetworkError) {
          await enqueueAction({ method: 'patch', path, body: { itemIndex } });
        }
        // otherwise silently ignore; UI can re-fetch on next focus
      }
    },
    [date, load]
  );

  const toggleAthkarComplete = useCallback(
    async (category) => {
      const current = Boolean(athkar?.[category]?.completed);
      setError(null);
      setSyncNotice(null);
      setAthkar((prev) => ({ ...prev, [category]: { ...prev?.[category], completed: !current } }));
      const path = `/athkar/${date}/${category}`;
      const body = { completed: !current };
      try {
        const res = await api.patch(path, body);
        setAthkar((prev) => ({ ...prev, [category]: res }));
        load();
      } catch (err) {
        if (err.isNetworkError) {
          await enqueueAction({ method: 'patch', path, body });
          setSyncNotice('تم الحفظ على جهازك — سيُرفع عند عودة الاتصال');
        } else {
          setAthkar((prev) => ({ ...prev, [category]: { ...prev?.[category], completed: current } }));
          setError(err.message || 'تعذر تسجيل الأذكار');
        }
      }
    },
    [date, athkar, load]
  );

  const toggleQuran = useCallback(async () => {
    const currentValue = quran?.completed;
    setError(null);
    setSyncNotice(null);
    setQuran((prev) => ({ ...prev, completed: !currentValue }));
    const path = `/quran/${date}`;
    const body = { completed: !currentValue };
    try {
      const res = await api.patch(path, body);
      setQuran(res.log);
      load();
    } catch (err) {
      if (err.isNetworkError) {
        await enqueueAction({ method: 'patch', path, body });
        setSyncNotice('تم الحفظ على جهازك — سيُرفع عند عودة الاتصال');
      } else {
        setQuran((prev) => ({ ...prev, completed: currentValue }));
        setError(err.message || 'تعذر الحفظ');
      }
    }
  }, [date, quran, load]);

  const toggleTask = useCallback(
    async (taskId) => {
      const current = taskLogs.find((l) => l.task === taskId)?.completed;
      setError(null);
      setSyncNotice(null);
      const path = `/tasks/logs/${date}/${taskId}`;
      const body = { completed: !current };
      try {
        const res = await api.patch(path, body);
        setTaskLogs((prev) => {
          const others = prev.filter((l) => l.task !== taskId);
          return [...others, res.log];
        });
        load();
      } catch (err) {
        if (err.isNetworkError) {
          await enqueueAction({ method: 'patch', path, body });
          setSyncNotice('تم الحفظ على جهازك — سيُرفع عند عودة الاتصال');
        } else {
          setError(err.message || 'تعذر الحفظ');
        }
      }
    },
    [date, taskLogs, load]
  );

  return {
    loading,
    error,
    syncNotice,
    isOffline,
    prayerLog,
    athkar,
    quran,
    dailyDeedTasks,
    otherTasks,
    taskLogs,
    stats,
    reload: load,
    togglePrayer,
    toggleExcused,
    toggleAthkarItem,
    toggleAthkarComplete,
    toggleQuran,
    toggleTask,
  };
}

export { ATHKAR_CONTENT_FALLBACK_KEYS };
