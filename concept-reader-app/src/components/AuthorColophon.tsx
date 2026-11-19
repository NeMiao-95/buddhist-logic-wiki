import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, GraduationCap } from "lucide-react";

export const RESEARCHMAP_URL = "https://researchmap.jp/miaoshoule";
export const WIKI_URL = "https://nemiao-95.github.io/buddhist-logic-wiki/";

export const AuthorColophon: React.FC = () => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div className="colophon-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`colophon-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="作者与方法论信息"
      >
        <span className="colophon-seal">印</span>
        <span>by Shoule Miao</span>
      </button>

      {open && (
        <div className="colophon-popover" role="dialog" aria-label="Author Colophon">
          <div className="colophon-name-row">
            <GraduationCap size={16} color="#4f46e5" />
            <strong>繆 寿楽（Shoule Miao）</strong>
          </div>
          <p className="colophon-affil">大谷大学 真宗総合研究所 博士研究員（PD）</p>
          <p className="colophon-fields">仏教認識論・論理学（Dharmottara 等）／老荘思想比較</p>
          <div className="colophon-links">
            <a href={RESEARCHMAP_URL} target="_blank" rel="noreferrer">
              researchmap <ExternalLink size={12} />
            </a>
            <a href={WIKI_URL}>
              Pramāṇa Wiki <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
