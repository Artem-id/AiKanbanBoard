import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { notificationApi } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Функция для загрузки уведомлений с сервера
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await notificationApi.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error("Ошибка загрузки уведомлений:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Загружаем при старте и при смене пользователя
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  // Слушаем сокет на новые уведомления
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    
    const onNewNotification = (notif) => {
      let isDuplicate = false;
      
      setNotifications((prev) => {
        if (prev.some((n) => n.id === notif.id)) {
          isDuplicate = true;
          return prev;
        }
        return [notif, ...prev];
      });
      
      // Показываем тост только если это не дубликат
      if (!isDuplicate) {
        toast.success(notif.title, { icon: '🔔' });
        setUnreadCount((prev) => prev + 1);
      }
    };

    socket.on("notification:new", onNewNotification);

    return () => {
      socket.off("notification:new", onNewNotification);
    };
  }, [user]);

  // Отметить одно как прочитанное
  const markAsRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error("Не удалось отметить уведомление");
    }
  };

  // Отметить все как прочитанные
  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      toast.error("Не удалось отметить все уведомления");
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};