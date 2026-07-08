import { useRef, useState, type ReactNode } from 'react';

interface Props {
  onFile: (file: File) => void;
  compact?: boolean;
  children?: ReactNode;
}

/** Drop zone + file picker for .mxl / .musicxml / .xml scores. */
export function UploadZone({ onFile, compact = false, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`cursor-pointer rounded-2xl border-2 border-dashed transition ${
        compact ? 'p-5' : 'p-10'
      } ${
        dragOver
          ? 'border-emerald-400 bg-emerald-400/10'
          : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
      }`}
    >
      {children ?? (
        <>
          <svg
            viewBox="0 0 24 24"
            className={`mx-auto fill-none stroke-neutral-500 ${compact ? 'h-7 w-7' : 'h-10 w-10'}`}
            strokeWidth="1.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          <p className={`font-medium text-neutral-200 ${compact ? 'mt-2 text-sm' : 'mt-3'}`}>
            Tap to choose a file
          </p>
          <p className="mt-1 text-xs text-neutral-500">.mxl · .musicxml · .xml</p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".mxl,.musicxml,.xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
