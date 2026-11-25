import { Link } from "react-router-dom";
import { Zap, Layers } from "lucide-react";

const columns = [
  {
    heading: "Продукт",
    links: [
      ["Возможности", "#features"],
      ["Как это работает?", "#how-it-works"],
      ["Встроенный ИИ", "#ai"],
    ],
  },
  {
    heading: "Начать работу",
    links: [
      ["Войти", "/login"],
      ["Создать аккаунт", "/register"],
      ["Демострационная версия", "/login"],
    ],
  },
];

const isRoute = (href) => href.startsWith("/");

const Footer = () => (
  <footer className="border-t">
    <div className="mx-auto max-w-6xl px-6 py-14">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {/* brand */}
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2.5 font-semibold">
            <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-[var(--shadow-brand)]">
              <Zap className="h-4.5 w-4.5 fill-white text-white" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Flowboard</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Канбан-доска с ИИ, которая помогает превращать цели в готовый продукт.
          </p>
        </div>

        {/* link columns */}
        {columns.map((col) => (
          <div key={col.heading}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">{col.heading}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  {isRoute(href) ? (
                    <Link to={href} className="text-sm text-muted transition-colors hover:text-ink">
                      {label}
                    </Link>
                  ) : (
                    <a href={href} className="text-sm text-muted transition-colors hover:text-ink">
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* bottom bar */}
      <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 text-sm text-muted sm:flex-row">
        <span>© {new Date().getFullYear()} Flowboard. Все права защищены.</span>
        <a href="#" className="flex items-center gap-1.5 transition-colors hover:text-ink">
          <Layers className="h-4 w-4" /> Сделано на стеке PERN
        </a>
      </div>
    </div>
  </footer>
);

export default Footer;
