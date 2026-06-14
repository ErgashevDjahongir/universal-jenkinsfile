import { useEffect, useRef, useState } from 'react';

/**
 * Server muddatiga (deadline) asoslangan teskari sanoq. Mijoz soati bilan server
 * soati orasidagi farq (`serverNow`) bir marta hisoblanadi va shu orqali qolgan
 * vaqt aniqlanadi — taymer faqat ko'rsatish uchun, haqiqiy nazorat serverda.
 * Vaqt tugaganda `onExpire` bir marta chaqiriladi.
 */
export function useCountdown(
  deadlineAt: string | null,
  serverNow: string,
  onExpire: () => void,
): number {
  // `ready` holatda (taymer hali boshlanmagan) deadline NULL — sanoq yurmaydi.
  const deadlineMs = deadlineAt ? new Date(deadlineAt).getTime() : null;
  // Server va mijoz soatlari farqi (musbat — server oldinda).
  const offsetRef = useRef(new Date(serverNow).getTime() - Date.now());
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const firedRef = useRef(false);

  const remaining = (): number =>
    deadlineMs === null
      ? 0
      : Math.max(0, Math.floor((deadlineMs - (Date.now() + offsetRef.current)) / 1000));

  const [seconds, setSeconds] = useState(remaining);

  useEffect(() => {
    if (deadlineMs === null) return; // taymer yo'q — interval ishga tushmaydi.
    const id = setInterval(() => {
      const s = remaining();
      setSeconds(s);
      if (s <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        onExpireRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
    // deadlineMs sessiya davomida o'zgarmaydi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  return seconds;
}
