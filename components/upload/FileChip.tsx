"use client";

interface Props {
  file: File;
  onRemove: () => void;
}

export function FileChip({ file, onRemove }: Props) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-100 rounded text-[13px]">
      <div>
        <span className="font-medium">{file.name}</span>{" "}
        <span className="text-muted text-[11px]">
          ({(file.size / 1024).toFixed(1)} KB)
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="제거"
        className="bg-transparent border-0 cursor-pointer text-muted text-base leading-none hover:text-stop"
      >
        ×
      </button>
    </div>
  );
}
