import React, { useEffect, useState } from 'react';
import AppText from './AppText';

function pad(n) {
  return String(n).padStart(2, '0');
}

// A always-ticking HH:MM:SS clock — a fixed point of reference on the home
// screen so the prayer countdown next to it always reads against "now".
export default function LiveClock({ color, size = 16 }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <AppText weight="bold" size={size} color={color} style={{ direction: 'ltr', fontVariant: ['tabular-nums'] }}>
      {`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`}
    </AppText>
  );
}
