import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';

export default function AnimatedNumber({
  value,
  formatter = (v) => v,
  duration = 1.5,
  decimals = 0,
  prefix = '',
  suffix = '',
  shouldAnimate = true,
}) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((k) => k + 1);
  }, [value]);

  if (!shouldAnimate || value === 0 || value === undefined || value === null) {
    return <span>{prefix}{formatter(value)}{suffix}</span>;
  }

  return (
    <span>
      <CountUp
        key={key}
        end={value}
        duration={duration}
        decimals={decimals}
        formattingFn={(val) => `${prefix}${formatter(val)}${suffix}`}
        separator=","
      />
    </span>
  );
}
