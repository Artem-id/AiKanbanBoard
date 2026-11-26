import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Loader2, X } from "lucide-react";
import Avatar from "./Avatar";
import { userApi } from "../../lib/api";
import { cn } from "../../lib/utils";

const UserSearchCombobox = ({ onSelect, placeholder = "Поиск по имени или email...", className }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Обновляем координаты при открытии или ресайзе
  const updateCoords = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
      return () => {
        window.removeEventListener("resize", updateCoords);
        window.removeEventListener("scroll", updateCoords, true);
      };
    }
  }, [isOpen]);

  // Дебаунс для поиска
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Если это точное имя выбранного пользователя — не ищем снова
    if (results.length === 1 && results[0].name === query) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const users = await userApi.search(query);
        setResults(users);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Закрытие при клике вне компонента (и вне портала)
  useEffect(() => {
    const onClick = (e) => {
      if (
        ref.current && !ref.current.contains(e.target) &&
        !e.target.closest(".search-results-portal")
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSelect = (user) => {
    onSelect(user);
    setQuery(user.name);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-line bg-surface py-2 pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand-500"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-faint" />
        )}
        {query && !loading && (
          <button
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && createPortal(
        <div
          className="search-results-portal fixed z-[9999] w-full overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-lift)]"
          style={{ top: coords.top, left: coords.left, width: coords.width }}
        >
          {results.length > 0 ? (
            <div className="max-h-[180px] overflow-y-auto p-1">
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2"
                >
                  <Avatar name={u.name} id={u.id} src={u.avatar_url} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="p-3 text-center text-sm text-muted">
              Ничего не найдено
            </div>
          ) : null}
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserSearchCombobox;