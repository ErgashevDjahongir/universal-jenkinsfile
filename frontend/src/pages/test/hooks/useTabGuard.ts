import { useEffect, useRef } from 'react';

/**
 * Tab/oyna almashtirishni aniqlaydi (halollik nazorati). Sahifa ko'rinmas holatga
 * o'tganda (boshqa tab, ilova yoki minimallashtirish) `onSwitch` chaqiriladi.
 * `visibilitychange` ishlatiladi — telefonda ham, brauzerda ham ishonchli; native
 * select/menu ochilishidan kelib chiqadigan yolg'on signal bermaydi.
 */
export function useTabGuard(active: boolean, onSwitch: () => void): void {
  const onSwitchRef = useRef(onSwitch);
  onSwitchRef.current = onSwitch;
  const lastRef = useRef(0);

  useEffect(() => {
    if (!active) {
      return;
    }
    function handle(): void {
      if (document.visibilityState !== 'hidden') {
        return;
      }
      const now = Date.now();
      // Bir almashtirishda ketma-ket signal kelishidan himoya.
      if (now - lastRef.current < 800) {
        return;
      }
      lastRef.current = now;
      onSwitchRef.current();
    }
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, [active]);
}
