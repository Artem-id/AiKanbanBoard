import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import AuthAside from "../components/auth/AuthAside";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const fillDemo = async () => {
    const demoData = { email: "alex@novreg.ru", password: "Test@1234" };
    setForm(demoData);
    setLoading(true);
    try {
      await login(demoData);
      toast.success("Вы вошли в демо-аккаунт");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Обычная отправка формы
  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      toast.success("С возвращением!");
      // Если пользователь пришел со страницы, куда его редиректнуло, вернем его туда
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm animate-in">
          <Link
            to="/"
            className="mb-8 flex items-center justify-center gap-2.5 font-semibold"
          >
            <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-2xl shadow-[var(--shadow-brand)]">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              Flowboard
            </span>
          </Link>

          <div className="card rounded-3xl p-8 shadow-[var(--shadow-soft)]">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              С возвращением
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Войдите в рабочее пространство.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                id="password"
                label="Пароль"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={loading}
              >
                Войти
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={fillDemo}
              >
                Войти в демо-аккаунт
              </Button>
            </form>
          </div>

          <p className="mt-5 text-center text-sm text-muted">
            Впервые здесь?{" "}
            <Link
              to="/register"
              className="font-semibold text-brand-600 hover:text-brand-500"
            >
              Создать аккаунт
            </Link>
          </p>
        </div>
      </div>

      <AuthAside
        title="С возвращением в Flowboard"
        subtitle="Войдите и продолжите с того места, где остановились вы и ваша команда."
      />
    </div>
  );
};

export default Login;
