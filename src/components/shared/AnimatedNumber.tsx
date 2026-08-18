import React, { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  prefix = '',
  suffix = '',
  duration = 1200,
  decimals = 0,
  className = '',
}: AnimatedNumberProps) {
  const prefersReduced = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(prefersReduced ? value : 0);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(value);
      return;
    }

    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out expo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = easeProgress * value;
      
      setDisplayValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration, decimals, prefersReduced]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toLocaleString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default AnimatedNumber;
