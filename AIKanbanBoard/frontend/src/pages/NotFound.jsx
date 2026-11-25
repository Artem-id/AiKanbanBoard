import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
    <p className="font-display text-8xl font-bold tracking-tight tabular text-gradient">404</p>
    <h1 className="font-display text-2xl font-semibold tracking-tight">Страница не найдена</h1>
    <p className="max-w-sm text-muted">
      Страница, которую вы ищете, не существует или была перемещена.
    </p>
    <Link to="/dashboard">
      <Button className="mt-2">Вернуться к Дашборду</Button>
    </Link>
  </div>
);

export default NotFound;
