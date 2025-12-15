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

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    // If it's a valid number, update immediately
    if (raw !== '' && raw !== '-' && raw !== '.') {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // On blur, ensure we have a valid number
    const num = parseFloat(displayValue);
    if (isNaN(num) || displayValue === '') {
      setDisplayValue(String(value));
    } else {
      onChange(num);
      setDisplayValue(String(num));
    }
  }, [displayValue, value, onChange]);

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



