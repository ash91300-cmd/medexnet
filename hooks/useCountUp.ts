"use client";

import { useEffect, useState } from "react";

export function useCountUp(
  target: number,
  isActive: boolean,
  duration: number = 1500
): number {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setCurrent(0);
      return;
    }

    const startTime = performance.now();
    let animationId: number;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    }

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [target, isActive, duration]);

  return current;
}
