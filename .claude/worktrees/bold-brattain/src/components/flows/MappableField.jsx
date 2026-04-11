import { useState, useRef, useCallback, useEffect } from 'react';
import NodeOutputPicker from './NodeOutputPicker';

/**
 * Get the pixel position of the caret inside a textarea/input
 * by mirroring the text into an offscreen div.
 */
function getCaretCoords(element) {
  const rect = element.getBoundingClientRect();
  const pos = element.selectionStart || 0;

  // For single-line inputs, position at bottom-left of the field
  if (element.tagName === 'INPUT') {
    return { top: rect.height, left: 0 };
  }

  // For textareas, approximate line position
  const text = element.value.substring(0, pos);
  const lines = text.split('\n');
  const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20;
  const paddingTop = parseInt(getComputedStyle(element).paddingTop) || 0;

  return {
    top: paddingTop + lines.length * lineHeight - element.scrollTop,
    left: 0,
    height: lineHeight,
  };
}

/**
 * MappableTextarea — drop-in replacement for <textarea> that supports
 * the `/` slash command to insert node output references.
 *
 * onChange signature: (newStringValue) => void  (NOT event-based)
 */
export function MappableTextarea({
  value = '',
  onChange,
  upstreamOutputs = [],
  flowVariables = {},
  className = '',
  ...rest
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [slashPos, setSlashPos] = useState(null); // position of the '/' in the string
  const [filter, setFilter] = useState('');
  const textareaRef = useRef(null);
  const wrapperRef = useRef(null);
  const [anchorRect, setAnchorRect] = useState(null);

  const hasData = upstreamOutputs.length > 0 || Object.keys(flowVariables || {}).length > 0;

  const openPicker = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const coords = getCaretCoords(el);
    setAnchorRect(coords);
    setPickerOpen(true);
    setFilter('');
  }, []);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setSlashPos(null);
    setFilter('');
  }, []);

  const handleSelect = useCallback((reference) => {
    const el = textareaRef.current;
    if (!el || slashPos == null) { closePicker(); return; }

    // Replace `/filter` with the reference
    const before = value.slice(0, slashPos);
    const afterSlashAndFilter = slashPos + 1 + filter.length;
    const after = value.slice(afterSlashAndFilter);
    const newVal = before + reference + after;

    onChange(newVal);
    closePicker();

    // Restore focus and cursor
    requestAnimationFrame(() => {
      el.focus();
      const newCursor = slashPos + reference.length;
      el.setSelectionRange(newCursor, newCursor);
    });
  }, [value, onChange, slashPos, filter, closePicker]);

  const handleKeyDown = useCallback((e) => {
    if (pickerOpen) return; // Let NodeOutputPicker handle keys when open

    if (e.key === '/' && hasData) {
      const el = textareaRef.current;
      const pos = el?.selectionStart ?? 0;
      // Only trigger at start of line or after whitespace
      const charBefore = pos > 0 ? value[pos - 1] : '\n';
      if (pos === 0 || charBefore === '\n' || charBefore === ' ' || charBefore === '\t') {
        // Don't prevent default — let the '/' character be typed
        setSlashPos(pos);
        requestAnimationFrame(() => openPicker());
      }
    }
  }, [pickerOpen, hasData, value, openPicker]);

  // Track filter text as user types after '/'
  const handleChange = useCallback((e) => {
    const newVal = e.target.value;
    onChange(newVal);

    if (pickerOpen && slashPos != null) {
      const cursorPos = e.target.selectionStart;
      // Extract everything between slash and cursor
      const afterSlash = newVal.slice(slashPos + 1, cursorPos);
      // Close if user typed space or newline
      if (afterSlash.includes(' ') || afterSlash.includes('\n')) {
        closePicker();
      } else {
        setFilter(afterSlash);
      }
    }
  }, [onChange, pickerOpen, slashPos, closePicker]);

  // Close picker if cursor moves away from the slash
  useEffect(() => {
    if (!pickerOpen) return;
    const handleSelectionChange = () => {
      const el = textareaRef.current;
      if (!el || slashPos == null) return;
      const cursor = el.selectionStart;
      if (cursor < slashPos) closePicker();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [pickerOpen, slashPos, closePicker]);

  return (
    <div ref={wrapperRef} className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        {...rest}
      />
      {/* Subtle hint badge */}
      {hasData && !pickerOpen && (
        <span className="absolute top-2 right-2 text-[9px] text-slate-400/50 font-mono pointer-events-none select-none">/</span>
      )}
      {pickerOpen && (
        <NodeOutputPicker
          upstreamOutputs={upstreamOutputs}
          flowVariables={flowVariables}
          filter={filter}
          onSelect={handleSelect}
          onClose={closePicker}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
}

/**
 * MappableInput — same as MappableTextarea but for single-line <input>.
 */
export function MappableInput({
  value = '',
  onChange,
  upstreamOutputs = [],
  flowVariables = {},
  className = '',
  ...rest
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [slashPos, setSlashPos] = useState(null);
  const [filter, setFilter] = useState('');
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const [anchorRect, setAnchorRect] = useState(null);

  const hasData = upstreamOutputs.length > 0 || Object.keys(flowVariables || {}).length > 0;

  const openPicker = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const coords = getCaretCoords(el);
    setAnchorRect(coords);
    setPickerOpen(true);
    setFilter('');
  }, []);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    setSlashPos(null);
    setFilter('');
  }, []);

  const handleSelect = useCallback((reference) => {
    const el = inputRef.current;
    if (!el || slashPos == null) { closePicker(); return; }

    const before = value.slice(0, slashPos);
    const afterSlashAndFilter = slashPos + 1 + filter.length;
    const after = value.slice(afterSlashAndFilter);
    const newVal = before + reference + after;

    onChange(newVal);
    closePicker();

    requestAnimationFrame(() => {
      el.focus();
      const newCursor = slashPos + reference.length;
      el.setSelectionRange(newCursor, newCursor);
    });
  }, [value, onChange, slashPos, filter, closePicker]);

  const handleKeyDown = useCallback((e) => {
    if (pickerOpen) return;

    if (e.key === '/' && hasData) {
      const el = inputRef.current;
      const pos = el?.selectionStart ?? 0;
      const charBefore = pos > 0 ? value[pos - 1] : ' ';
      if (pos === 0 || charBefore === ' ' || charBefore === '\t') {
        setSlashPos(pos);
        requestAnimationFrame(() => openPicker());
      }
    }
  }, [pickerOpen, hasData, value, openPicker]);

  const handleChange = useCallback((e) => {
    const newVal = e.target.value;
    onChange(newVal);

    if (pickerOpen && slashPos != null) {
      const cursorPos = e.target.selectionStart;
      const afterSlash = newVal.slice(slashPos + 1, cursorPos);
      if (afterSlash.includes(' ')) {
        closePicker();
      } else {
        setFilter(afterSlash);
      }
    }
  }, [onChange, pickerOpen, slashPos, closePicker]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handleSelectionChange = () => {
      const el = inputRef.current;
      if (!el || slashPos == null) return;
      if (el.selectionStart < slashPos) closePicker();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [pickerOpen, slashPos, closePicker]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        {...rest}
      />
      {hasData && !pickerOpen && (
        <span className="absolute top-1/2 -translate-y-1/2 right-2 text-[9px] text-slate-400/50 font-mono pointer-events-none select-none">/</span>
      )}
      {pickerOpen && (
        <NodeOutputPicker
          upstreamOutputs={upstreamOutputs}
          flowVariables={flowVariables}
          filter={filter}
          onSelect={handleSelect}
          onClose={closePicker}
          anchorRect={anchorRect}
        />
      )}
    </div>
  );
}
