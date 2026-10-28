"use client";

import { useRef, useState, type DragEvent } from "react";

interface Props {
  icon: string;
  label: string;
  sublabel: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

export function Dropzone({
  icon,
  label,
  sublabel,
  accept,
  multiple = false,
  onFiles,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    onFiles(multiple ? arr : arr.slice(0, 1));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-card p-7 text-center cursor-pointer transition-all bg-[#fafbff] ${
        over ? "border-primary bg-blue-50" : "border-slate-300 hover:border-primary hover:bg-blue-50"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = "";
        }}
      />
      <div className="text-[32px] mb-2 opacity-40">{icon}</div>
      <div className="font-semibold mb-1">{label}</div>
      <div className="text-xs text-muted">{sublabel}</div>
    </div>
  );
}
