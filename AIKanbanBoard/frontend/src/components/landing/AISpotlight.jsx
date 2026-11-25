import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Check, FileText } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1];

const aiPoints = [
  "Создайте полный бэклог из цели в одну строку",
  "Мгновенно разбивайте любую задачу на четкие подзадачи",
  "Автоматически суммируйте прогресс спринта, блокеры и риски",
]

const mockTasks = [
  { title: "Дизайн корзины и оформления заказа", tag: "Высокий", color: "#ea580c" },
  { title: "Интеграция платежей", tag: "Срочный", color: "#e11d48" },
  { title: "Письма подтверждения заказа", tag: "Средний", color: "#d97706" },
  { title: "Валидация адреса", tag: "Низкий", color: "#0ea5e9" },
];

const AISpotlight = () => (
  <section id="ai" className="scroll-mt-24">
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE }}
      className="brand-gradient animate-gradient-pan relative overflow-hidden py-20 text-white sm:py-28"
    >
      {/* drifting ambient glows */}
      <motion.div
        className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, 18, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, -16, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
        {/* copy */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Встроенный ИИ
          </p>
          <h2 className="mt-3 font-display text-[clamp(26px,3.4vw,40px)] font-semibold leading-[1.08] tracking-tight">
            ИИ, который делает рутину
          </h2>
          <p className="mt-4 max-w-md leading-relaxed text-white/80">
            Хватит смотреть на пустую доску. ИИ Flowboard планирует, разбивает на части
            и отчитывается о вашей работе, чтобы вы могли сосредоточиться на релизах.
          </p>
          <ul className="mt-7 space-y-3.5">
            {aiPoints.map((p) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/15">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="text-[15px] text-white/90">{p}</span>
              </li>
            ))}
          </ul>
          <Link to="/register" className="mt-8 inline-block">
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-brand-700 shadow-[var(--shadow-card)] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.97]">
              Создавай бесплатно <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* mock UI */}
        <div className="relative">
          <div className="relative rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 p-2.5">
              <Sparkles className="h-4 w-4 shrink-0 text-white/80" />
              <span className="flex-1 truncate text-sm text-white/90">
                Создать оформление заказа для интернет-магазина
              </span>
              <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-brand-700">
                Сгенерировать
              </span>
            </div>
            <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
              Сгенерированные задачи
            </p>
            <div className="space-y-2">
              {mockTasks.map((t, i) => (
                <motion.div
                  key={t.title}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: 0.25 + i * 0.12,
                    ease: EASE,
                  }}
                  className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: t.color }}
                  />
                  <span className="flex-1 truncate text-sm text-white/90">
                    {t.title}
                  </span>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                    {t.tag}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  </section>
);

export default AISpotlight;
