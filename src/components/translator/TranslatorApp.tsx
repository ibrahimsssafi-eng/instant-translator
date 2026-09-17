"use client";

import { useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import Workspace from "./Workspace";
import Playground from "./Playground";
import { nativeName } from "@/lib/langs";

export default function TranslatorApp() {
  const [auto, setAuto] = useState(true);
  const [target, setTarget] = useState("en");

  return (
    <>
      <Workspace auto={auto} onAutoChange={setAuto} target={target} onTargetChange={setTarget} />

      <section id="playground" className="mt-24 scroll-mt-28">
        <div className="mb-8">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-300">
            <MonitorSmartphone className="h-4 w-4" />
            بيئة سطح المكتب
          </p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">
            يُترجم <span className="gradient-text">أينما تكتب</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50 sm:text-base">
            نفس المحرك اللحظي يعمل داخل محرك البحث والبريد والمحادثة أدناه — اكتب بالعربية في أي حقل
            وشاهده يتحوّل إلى {nativeName(target)} داخل الحقل نفسه، تمامًا كما سيعمل على جهازك.
          </p>
        </div>
        <Playground auto={auto} target={target} />
      </section>
    </>
  );
}
