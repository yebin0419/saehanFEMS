"use client";

import { useEffect, useRef, useState } from "react";

const CHATBOT_URL = "https://chatbot.aiconvergencelab.com";
const CHATBOT_TITLE = "예빈봇";

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openChatbotWindow = () => {
    window.open(
      CHATBOT_URL,
      "_blank",
      "width=450,height=650,resizable=yes,scrollbars=yes",
    );
    setOpen(false);
  };

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-[9999]">
      {open && (
        <div className="mb-3 w-[300px] rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">💬</span>
              <span className="font-semibold text-[14px]">{CHATBOT_TITLE}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="text-white/80 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="px-4 py-3.5 text-[13px] text-slate-600 leading-relaxed">
            챗봇은 <span className="font-medium text-slate-800">새 창</span>에서
            열립니다. 아래 버튼을 눌러 대화를 시작하세요.
          </div>
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={openChatbotWindow}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-medium py-2.5 transition-colors"
            >
              챗봇 새 창으로 열기
            </button>
            <a
              href={CHATBOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-center text-[11.5px] text-slate-400 hover:text-slate-600"
            >
              혹은 전체 페이지에서 열기 →
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${CHATBOT_TITLE} 열기`}
        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <span className="text-2xl leading-none">{open ? "×" : "💬"}</span>
      </button>
    </div>
  );
}
