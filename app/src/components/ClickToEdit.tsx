import { useState, useRef, useEffect } from 'react';

interface ClickToEditProps {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

export function ClickToEdit({
  value,
  onCommit,
  className = '',
  inputClassName = '',
  placeholder = '',
}: ClickToEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onCommit(trimmed);
    }
    setEditing(false);
  }

  function revert() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            revert();
          }
        }}
        placeholder={placeholder}
        className={`rounded border border-indigo-300 px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 ${inputClassName}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`group inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-left transition hover:bg-gray-100 ${className}`}
    >
      <span>{value || placeholder}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5 shrink-0 text-gray-400 opacity-0 transition group-hover:opacity-100"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    </button>
  );
}
