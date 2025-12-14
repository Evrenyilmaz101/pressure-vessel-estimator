import { useState, useEffect, useCallback } from 'react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Number input that allows clearing the field while typing
 * Only commits the value on blur or when a valid number is entered
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  className,
  style,
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync display value when external value changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(String(value));
    }
  }, [value, isFocused]);

  // Clamp value to min/max bounds
  const clampValue = useCallback((num: number): number => {
    let clamped = num;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    return clamped;
  }, [min, max]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    // If it's a valid number, update immediately (clamped)
    if (raw !== '' && raw !== '-' && raw !== '.') {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        onChange(clampValue(num));
      }
    }
  }, [onChange, clampValue]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // On blur, ensure we have a valid number (clamped)
    const num = parseFloat(displayValue);
    if (isNaN(num) || displayValue === '') {
      setDisplayValue(String(value));
    } else {
      const clamped = clampValue(num);
      onChange(clamped);
      setDisplayValue(String(clamped));
    }
  }, [displayValue, value, onChange, clampValue]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  return (
    <input
      type="number"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className={className}
      style={style}
    />
  );
}

