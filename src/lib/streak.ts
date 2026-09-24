'use client';

export function recordStudyDay() {
  if (typeof window === 'undefined') return;
  
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem('study_dates_v1');
  const dates: string[] = stored ? JSON.parse(stored) : [];
  
  if (!dates.includes(today)) {
    dates.push(today);
    // Sort ascending just in case
    dates.sort();
    localStorage.setItem('study_dates_v1', JSON.stringify(dates));
  }
}

export function getStreakInfo(): { currentStreak: number, longestStreak: number, totalDays: number, lastStudyDate: string | null, last7Days: boolean[] } {
  if (typeof window === 'undefined') return { currentStreak: 0, longestStreak: 0, totalDays: 0, lastStudyDate: null, last7Days: Array(7).fill(false) };

  const stored = localStorage.getItem('study_dates_v1');
  const dates: string[] = stored ? JSON.parse(stored) : [];
  
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0, lastStudyDate: null, last7Days: Array(7).fill(false) };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateObjs = dates.map(d => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day);
  });
  
  // Calculate longest
  let longestStreak = 0;
  let currentStreakRun = 0;
  let prevTime: number | null = null;
  
  for (let i = 0; i < dateObjs.length; i++) {
    if (prevTime === null) {
      currentStreakRun = 1;
    } else {
      const diffDays = Math.round((dateObjs[i].getTime() - prevTime) / (1000 * 3600 * 24));
      if (diffDays === 1) {
        currentStreakRun++;
      } else if (diffDays > 1) {
        currentStreakRun = 1;
      }
    }
    prevTime = dateObjs[i].getTime();
    if (currentStreakRun > longestStreak) {
      longestStreak = currentStreakRun;
    }
  }

  // Calculate current streak backwards from today
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  while (true) {
    const checkStr = checkDate.toISOString().split('T')[0];
    if (dates.includes(checkStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      if (currentStreak === 0 && checkStr === today.toISOString().split('T')[0]) {
        // If today is missing, check yesterday. If yesterday has it, streak continues but today is empty
        checkDate.setDate(checkDate.getDate() - 1);
        const checkYdayStr = checkDate.toISOString().split('T')[0];
        if (dates.includes(checkYdayStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  // Last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    last7Days.push(dates.includes(dStr));
  }

  return {
    currentStreak,
    longestStreak,
    totalDays: dates.length,
    lastStudyDate: dates[dates.length - 1],
    last7Days
  };
}
