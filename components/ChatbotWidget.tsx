"use client";

import { useEffect, useState } from "react";

const CHATBOT_URL = "https://chatbot.aiconvergencelab.com/bot-d60ef01c";
const CHATBOT_TITLE = "예빈봇";

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openInNewWindow = () => {
    window.open(
      CHATBOT_URL,
      "_blank",
      "width=450,height=680,resizable=yes,scrollbars=yes",
    );
  };

  return (
    <>
      <div
        role="dialog"
        aria-label={CHATBOT_TITLE}
        aria-hidden={!open}
        className={[
          "fixed right-4 bottom-24 sm:right-6 z-[9998]",
          "w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-7rem)]",
          "bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200",
          "flex flex-col overflow-hidden",
          "transition-all duration-200 ease-out",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
        ].join(" ")}
      >
        <header className="h-12 shrink-0 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="text-lg leading-none">💬</span>
            <span className="font-semibold text-[14px]">{CHATBOT_TITLE}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openInNewWindow}
              title="새 창으로 열기"
              aria-label="새 창으로 열기"
              className="w-8 h-8 rounded hover:bg-white/15 flex items-center justify-center text-[13px]"
            >
              ⤢
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="닫기"
              aria-label="닫기"
              className="w-8 h-8 rounded hover:bg-white/15 flex items-center justify-center text-xl leading-none"
            >
              ×
            </button>
          </div>
        </header>

        <div className="relative flex-1 bg-slate-50">
          {mounted && (
            <iframe
              src={CHATBOT_URL}
              title={CHATBOT_TITLE}
              className="absolute inset-0 w-full h-full border-0"
              allow="clipboard-write; microphone"
            />
          )}
          <div className="absolute bottom-0 inset-x-0 bg-slate-100/95 backdrop-blur-sm border-t border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 text-center">
            챗봇이 보이지 않나요?{" "}
            <button
              type="button"
              onClick={openInNewWindow}
              className="underline hover:text-indigo-600 font-medium"
            >
              새 창으로 열기
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${CHATBOT_TITLE} ${open ? "닫기" : "열기"}`}
        aria-expanded={open}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        <span className="text-2xl leading-none">{open ? "×" : "💬"}</span>
      </button>
    </>
  );
}
