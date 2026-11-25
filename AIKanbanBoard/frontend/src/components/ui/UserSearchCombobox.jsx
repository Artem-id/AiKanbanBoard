import { useState, useEffect, useRef } from "react";
import { Search, Loader2, X } from "lucide-react";
import Avatar from "./Avatar";
import { userApi } from "../../lib/api";
import { cn } from "../../lib/utils";

const UserSearchCombobox = ({ onSelect, placeholder = "Поиск по имени или email...", className }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Дебаунс для поиска (чтобы не спамить сервер)
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
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

  // Закрытие при клике вне компонента
  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
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

      {isOpen && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow-lift)]">
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
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-line bg-surface p-3 text-center text-sm text-muted shadow-[var(--shadow-lift)]">
          Ничего не найдено
        </div>
      )}
    </div>
  );
};

export default UserSearchCombobox;