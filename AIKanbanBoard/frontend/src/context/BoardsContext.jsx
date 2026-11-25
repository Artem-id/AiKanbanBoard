import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { boardApi } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";

const BoardsContext = createContext(null);

export const BoardsProvider = ({ children }) => {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const refresh = useCallback(async () => {
    try {
      setBoards(await boardApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Первоначальная загрузка досок
  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setBoards([]);
      setLoading(false);
    }
  }, [user, refresh]);

  // 2. Слушаем глобальные события
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const onBoardInvited = () => refresh();
    
    const onBoardUpdated = (updatedBoard) => {
      setBoards((prev) => 
        prev.map((b) => (b.id === updatedBoard.id ? { ...b, ...updatedBoard } : b))
      );
    };

    const onBoardDeleted = ({ id }) => {
      setBoards((prev) => prev.filter((b) => b.id !== id));
    };

    const onTaskChanged = () => {
      refresh();
    };

    // --- ОНЛАЙН СТАТУСЫ ---
    const onUserOnline = ({ userId }) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
    };

    const onUserOffline = ({ userId }) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }; // <-- ЗДЕСЬ БЫЛА ОШИБКА (закрываем функцию)

    const onInitOnlineUsers = ({ users }) => {
      setOnlineUsers(new Set(users));
    };
    // ----------------------

    socket.on("board:invited", onBoardInvited);
    socket.on("board:updated", onBoardUpdated);
    socket.on("board:deleted", onBoardDeleted);

    socket.on("task:created", onTaskChanged);
    socket.on("task:updated", onTaskChanged);
    socket.on("task:moved", onTaskChanged);
    socket.on("task:deleted", onTaskChanged);

    socket.on("user:online", onUserOnline);
    socket.on("user:offline", onUserOffline);
    socket.on("online_users:init", onInitOnlineUsers);

    return () => {
      socket.off("board:invited", onBoardInvited);
      socket.off("board:updated", onBoardUpdated);
      socket.off("board:deleted", onBoardDeleted);

      socket.off("task:created", onTaskChanged);
      socket.off("task:updated", onTaskChanged);
      socket.off("task:moved", onTaskChanged);
      socket.off("task:deleted", onTaskChanged);

      socket.off("user:online", onUserOnline);
      socket.off("user:offline", onUserOffline);
      socket.off("online_users:init", onInitOnlineUsers);
    };
  }, [user, refresh]);

  const create = useCallback(async (data) => {
    const board = await boardApi.create(data);
    const newBoard = { ...board, is_owner: true, my_role: "owner" };
    setBoards((prev) => [newBoard, ...prev]);
    return newBoard;
  }, []);

  const remove = useCallback(async (id) => {
    await boardApi.remove(id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <BoardsContext.Provider value={{ boards, loading, refresh, create, remove, onlineUsers }}>
      {children}
    </BoardsContext.Provider>
  );
};

export const useBoards = () => {
  const ctx = useContext(BoardsContext);
  if (!ctx) throw new Error("useBoards должен использоваться внутри BoardsProvider");
  return ctx;
};