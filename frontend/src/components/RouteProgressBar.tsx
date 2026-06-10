import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export function RouteProgressBar() {
  const location = useLocation();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setVisible(true);
    setWidth(0);

    let current = 0;
    function tick() {
      current += (85 - current) * 0.12;
      setWidth(current);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    timerRef.current = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      setWidth(100);
      setTimeout(() => { setWidth(0); setVisible(false); }, 280);
    }, 320);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timerRef.current);
    };
  }, [location.pathname + location.search]);

  if (!visible && width === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed left-0 top-0 z-[999] h-[2px] bg-emerald-500 shadow-[0_0_6px_#10b981] transition-[width,opacity] duration-200"
      style={{ width: `${width}%`, opacity: width >= 100 ? 0 : 1 }}
    />
  );
}
