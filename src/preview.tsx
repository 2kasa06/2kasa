/**
 * 単一HTMLプレビュー用のエントリーポイント。
 *
 * 本番（main.tsx）は履歴APIでルーティングしますが、こちらはURLを一切変えない
 * メモリ内ルーターを使います。file:// や静的ホスト上でも、1枚のHTMLだけで
 * 全ページを行き来できるようにするためです。
 */
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Router } from "wouter";
import App from "@/App";
import "@/index.css";

let currentPath = "/";
const listeners = new Set<() => void>();

function scrollToHash(hash: string) {
  window.setTimeout(() => {
    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, 80);
}

function navigate(to: string) {
  const [path, hash] = to.split("#");

  if (path && path !== currentPath) {
    currentPath = path;
    listeners.forEach((listener) => listener());
    window.scrollTo({ top: 0, left: 0 });
  }

  if (hash) {
    scrollToHash(hash);
  } else if (!path) {
    window.scrollTo({ top: 0, left: 0 });
  }
}

function useMemoryLocation(): [string, (to: string) => void] {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const listener = () => setPath(currentPath);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return [path, navigate];
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router hook={useMemoryLocation}>
      <App />
    </Router>
  </React.StrictMode>
);
