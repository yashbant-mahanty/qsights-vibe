"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface IsolatedTextInputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  multiline?: boolean;
  rows?: number;
}

/**
 * Completely isolated input component that prevents parent re-renders
 * Uses internal state and only notifies parent on blur
 */
const IsolatedTextInput = React.memo(({
  value,
  onValueChange,
  placeholder = "",
  className = "",
  autoFocus = false,
  multiline = false,
  rows = 3
}: IsolatedTextInputProps) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync internal value when prop changes (but not while focused)
  useEffect(() => {
    if (!isFocused) {
      setInternalValue(value);
    }
  }, [value, isFocused]);

  // Handle input changes - only update internal state
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
  }, []);

  // Only sync to parent when losing focus
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (internalValue !== value) {
      onValueChange(internalValue);
    }
  }, [internalValue, value, onValueChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  // Handle Enter key for single-line inputs (blur to save)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }, [multiline]);

  const commonProps = {
    ref: inputRef as any,
    value: internalValue,
    onChange: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    onKeyDown: handleKeyDown,
    placeholder,
    className,
    autoFocus,
    autoComplete: "off"
  };

  if (multiline) {
    return <textarea {...commonProps} rows={rows} />;
  }

  return <input {...commonProps} type="text" />;
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if value changes while not focused
  return prevProps.value === nextProps.value && 
         prevProps.placeholder === nextProps.placeholder &&
         prevProps.className === nextProps.className;
});

IsolatedTextInput.displayName = 'IsolatedTextInput';

export default IsolatedTextInput;
