import { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

export default function AnimatedNumber({ value, duration = 800 }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function for smoother animation
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const current = Math.floor(startValue + (value - startValue) * easedProgress);
      setDisplayValue(current);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <>{displayValue.toLocaleString()}</>;
}
