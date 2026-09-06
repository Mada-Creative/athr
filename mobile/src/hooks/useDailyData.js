import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

const ATHKAR_CONTENT_FALLBACK_KEYS = ['morning', 'evening', 'afterPrayer', 'sleep', 'wakeup'];

// Central place that loads everything the Home + Tracker screens need for one
// day, and exposes small mutation helpers that optimistically patch local
// state after each API call so toggles feel instant.
export default function useDailyData(date) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prayerLog, setPrayerLog] = useState(null);
  const [athkar, setAthkar] = useState({});
  const [quran, setQuran] = useState(null);
  const [dailyDeedTasks, setDailyDeedTasks] = useState([]);
  const [otherTasks, setOtherTasks] = useState([]);
  const [taskLogs, setTaskLogs] = useState([]);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setError(null);
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
      setPrayerLog(prayerRes.log);
      setAthkar(athkarRes.categories);
      setQuran(quranRes.log);
      setDailyDeedTasks(dailyDeedsRes.tasks);
      setOtherTasks(otherRes.tasks);
      setTaskLogs(taskLogsRes.logs);
      setStats(statsRes);
    } catch (err) {
      setError(err.message || 'تعذر تحميل بيانات اليوم');
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
      setPrayerLog((prev) => ({
        ...prev,
        [group]: { ...prev?.[group], [key]: !currentValue },
      }));
      try {
        const res = await api.patch(`/prayers/${date}/toggle`, { group, key, value: !currentValue });
        setPrayerLog(res.log);
        load();
      } catch (err) {
        setPrayerLog((prev) => ({ ...prev, [group]: { ...prev?.[group], [key]: currentValue } }));
        setError(err.message || 'تعذر تسجيل الصلاة — تحقق من اتصالك بالإنترنت');
      }
    },
    [date, prayerLog, load]
  );

  const toggleExcused = useCallback(
    async (excused) => {
      setPrayerLog((prev) => ({ ...prev, excused }));
      try {
        const res = await api.patch(`/prayers/${date}/excuse`, { excused });
        setPrayerLog(res.log);
        load();
      } catch (err) {
        setPrayerLog((prev) => ({ ...prev, excused: !excused }));
      }
    },
    [date, load]
  );

  const toggleAthkarItem = useCallback(
    async (category, itemIndex) => {
      try {
        const res = await api.patch(`/athkar/${date}/${category}`, { itemIndex });
        setAthkar((prev) => ({ ...prev, [category]: res }));
        load();
      } catch (err) {
        // silently ignore; UI can re-fetch on next focus
      }
    },
    [date, load]
  );

  const toggleAthkarComplete = useCallback(
    async (category) => {
      const current = Boolean(athkar?.[category]?.completed);
      setError(null);
      setAthkar((prev) => ({ ...prev, [category]: { ...prev?.[category], completed: !current } }));
      try {
        const res = await api.patch(`/athkar/${date}/${category}`, { completed: !current });
        setAthkar((prev) => ({ ...prev, [category]: res }));
        load();
      } catch (err) {
        setAthkar((prev) => ({ ...prev, [category]: { ...prev?.[category], completed: current } }));
        setError(err.message || 'تعذر تسجيل الأذكار — تحقق من اتصالك بالإنترنت');
      }
    },
    [date, athkar, load]
  );

  const toggleQuran = useCallback(async () => {
    const currentValue = quran?.completed;
    setError(null);
    setQuran((prev) => ({ ...prev, completed: !currentValue }));
    try {
      const res = await api.patch(`/quran/${date}`, { completed: !currentValue });
      setQuran(res.log);
      load();
    } catch (err) {
      setQuran((prev) => ({ ...prev, completed: currentValue }));
      setError(err.message || 'تعذر الحفظ — تحقق من اتصالك بالإنترنت');
    }
  }, [date, quran, load]);

  const toggleTask = useCallback(
    async (taskId) => {
      const current = taskLogs.find((l) => l.task === taskId)?.completed;
      setError(null);
      try {
        const res = await api.patch(`/tasks/logs/${date}/${taskId}`, { completed: !current });
        setTaskLogs((prev) => {
          const others = prev.filter((l) => l.task !== taskId);
          return [...others, res.log];
        });
        load();
      } catch (err) {
        setError(err.message || 'تعذر الحفظ — تحقق من اتصالك بالإنترنت');
      }
    },
    [date, taskLogs, load]
  );

  return {
    loading,
    error,
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
