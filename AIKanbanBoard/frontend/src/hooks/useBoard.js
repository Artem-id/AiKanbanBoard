import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBoards } from "../context/BoardsContext";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { boardApi, taskApi, columnApi } from "../lib/api";
import { connectSocket } from "../lib/socket";

/**
 * Loads a board and keeps it in sync via Socket.IO. Returns board state plus
 * mutation helpers that update optimistically and persist to the API.
 */
export const useBoard = (boardId) => {
  const navigate = useNavigate();
  const { refresh } = useBoards();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [presence, setPresence] = useState([]);

  const upsertTask = useCallback((task) => {
  setTasks((prev) => {
    const idx = prev.findIndex((t) => t.id === task.id);
    if (idx === -1) {
      // Если задачи нет, добавляем, но с проверкой на дублирование
      if (prev.some((t) => t.id === task.id)) return prev;
      return [...prev, task];
    }
    const next = [...prev];
    next[idx] = task;
    return next;
  });
}, []);

  const removeTaskLocal = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initial load
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    boardApi
      .get(boardId)
      .then((data) => {
        if (!alive) return;
        setBoard(data.board);
        setColumns(data.columns);
        setTasks(data.tasks);
        setMembers(data.members);
        setRole(data.role);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [boardId]);

  // Real-time sync
  useEffect(() => {
    const socket = connectSocket();
    socket.emit("board:join", boardId);

    const onCreated = (t) => upsertTask(t);
    const onUpdated = (t) => upsertTask(t);
    const onMoved = (t) => upsertTask(t);
    const onDeleted = ({ id }) => removeTaskLocal(id);
    const onColMoved = (c) => {
      setColumns((p) => p.map((x) => (x.id === c.id ? c : x)).sort((a, b) => a.position - b.position));
    };
    
    const onColCreated = (c) => {
        setColumns((p) => {
          if (p.some((col) => col.id === c.id)) return p; // Защита от дубликата
          return [...p, c].sort((a, b) => a.position - b.position);
        });
    };

    const onColUpdated = (c) =>
      setColumns((p) => p.map((x) => (x.id === c.id ? c : x)).sort((a, b) => a.position - b.position));
    const onColDeleted = ({ id }) => setColumns((p) => p.filter((x) => x.id !== id));

    const onMemberRemoved = ({ id }) => {
      if (id === user?.id && !isLeaving) {
        setIsLeaving(true); // Ставим блокировку
        toast.error("Вас удалили с этой доски");
        refresh();
        navigate("/dashboard");
      }
    };

    const onMemberUpdated = (updatedMember) => {
      // Обновляем роль и список участников в реальном времени
      setMembers((prev) => 
        prev.map((m) => m.id === updatedMember.id ? { ...m, ...updatedMember } : m)
      );
      // Если обновили текущего пользователя, меняем его роль
      if (updatedMember.id === user?.id) {
        setRole(updatedMember.role);
        toast.success(`Ваша роль изменена на: ${updatedMember.role === 'admin' ? 'Администратор' : 'Участник'}`);
      }
    };

    const onBoardUpdated = (updatedBoard) => {
      // Обновляем локальный стейт доски ТОЛЬКО если это та доска, которую мы сейчас смотрим
      if (updatedBoard.id === boardId) {
        setBoard(updatedBoard);
      }
    };
    const onPresenceSync = ({ users }) => setPresence(users || []);
    const onPresenceJoin = ({ user }) =>
      setPresence((p) => (p.find((u) => u.id === user.id) ? p : [...p, user]));
    const onPresenceLeave = ({ user }) => setPresence((p) => p.filter((u) => u.id !== user.id));

    

    socket.on("task:created", onCreated);
    socket.on("task:updated", onUpdated);
    socket.on("member:removed", onMemberRemoved);
    socket.on("member:updated", onMemberUpdated);
    socket.on("task:moved", onMoved);
    socket.on("task:deleted", onDeleted);
    socket.on("column:moved", onColMoved);
    socket.on("column:created", onColCreated);
    socket.on("column:updated", onColUpdated);
    socket.on("column:deleted", onColDeleted);
    socket.on("board:updated", onBoardUpdated);
    socket.on("presence:sync", onPresenceSync);
    socket.on("presence:join", onPresenceJoin);
    socket.on("presence:leave", onPresenceLeave);

    return () => {
      socket.emit("board:leave", boardId);
      socket.off("task:created", onCreated);
      socket.off("member:removed", onMemberRemoved);
      socket.off("member:updated", onMemberUpdated);
      socket.off("task:updated", onUpdated);
      socket.off("task:moved", onMoved);
      socket.off("task:deleted", onDeleted);
      socket.off("column:moved", onColMoved); 
      socket.off("column:created", onColCreated);
      socket.off("column:updated", onColUpdated);
      socket.off("column:deleted", onColDeleted);
      socket.off("board:updated", onBoardUpdated);
      socket.off("presence:sync", onPresenceSync);
      socket.off("presence:join", onPresenceJoin);
      socket.off("presence:leave", onPresenceLeave);

      setPresence([]);
    };
  }, [boardId, upsertTask, removeTaskLocal, user, refresh, navigate, isLeaving]);

  /* ----------------------------- mutations ----------------------------- */

  const createTask = useCallback(
    async (data) => {
      try {
        const task = await taskApi.create(boardId, data);
        upsertTask(task);
        return task;
      } catch (err) {
        toast.error(err.message);
        throw err;
      }
    },
    [boardId, upsertTask]
  );

  const updateTask = useCallback(
    async (taskId, data) => {
      const prev = tasks.find((t) => t.id === taskId);
      upsertTask({ ...prev, ...data }); // optimistic
      try {
        const task = await taskApi.update(boardId, taskId, data);
        upsertTask(task);
        return task;
      } catch (err) {
        if (prev) upsertTask(prev);
        toast.error(err.message);
        throw err;
      }
    },
    [boardId, tasks, upsertTask]
  );

  const deleteTask = useCallback(
    async (taskId) => {
      const prev = tasks.find((t) => t.id === taskId);
      removeTaskLocal(taskId); // optimistic
      try {
        await taskApi.remove(boardId, taskId);
        toast.success("Задача удалена");
      } catch (err) {
        if (prev) upsertTask(prev);
        toast.error(err.message);
      }
    },
    [boardId, tasks, removeTaskLocal, upsertTask]
  );

  // Apply a local move immediately, then persist.
  const moveTask = useCallback(
    async (taskId, columnId, position) => {
      const prev = tasks.find((t) => t.id === taskId);
      if (!prev) return;
      upsertTask({ ...prev, column_id: columnId, position });
      try {
        await taskApi.move(boardId, taskId, { column_id: columnId, position });
      } catch (err) {
        upsertTask(prev);
        toast.error(err.message);
      }
    },
    [boardId, tasks, upsertTask]
  );

  const moveColumn = useCallback(async (columnId, newPosition) => {
    setColumns((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c.id === columnId);
      if (idx !== -1) next[idx] = { ...next[idx], position: newPosition };
      return next.sort((a, b) => a.position - b.position);
    });
    try {
      await columnApi.move(boardId, columnId, { position: newPosition });
    } catch (err) {
      toast.error(err.message);
    }
  }, [boardId]);

  const addColumn = useCallback(
    async (title, color) => {
      if (columns.some((c) => c.title.toLowerCase() === title.toLowerCase())) {
        toast.error("Колонка с таким названием уже существует");
        return;
      }
      try {
        await columnApi.create(boardId, { title, color });
        // Не добавляем колонку здесь! Она придет через WebSocket (onColCreated)
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId, columns]
  );

  const renameColumn = useCallback(
    async (columnId, title, color) => {
      // Оптимистично обновляем стейт
      setColumns((p) => p.map((c) => (c.id === columnId ? { ...c, title, ...(color !== undefined ? { color } : {}) } : c)));
      try {
        // Отправляем на бэкенд
        await columnApi.update(boardId, columnId, { title, ...(color !== undefined ? { color } : {}) });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId]
  );

  const deleteColumn = useCallback(
    async (columnId) => {
      try {
        await columnApi.remove(boardId, columnId);
        setColumns((p) => p.filter((c) => c.id !== columnId));
        setTasks((p) => p.filter((t) => t.column_id !== columnId));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId]
  );

  const updateBoard = useCallback(
    async (data) => {
      try {
        const updatedBoard = await boardApi.update(boardId, data);
        setBoard(updatedBoard);
        refresh();
        toast.success("Доска обновлена");
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId, refresh]
  );

  const deleteBoard = useCallback(
    async () => {
      try {
        await boardApi.remove(boardId);
        toast.success("Доска удалена");
        refresh();
        navigate("/dashboard"); // Перенаправляем на дашборд
      } catch (err) {
        toast.error(err.message);
      }
    },
    [boardId, navigate, refresh]
  );

  return {
    board, columns, tasks, members, role, loading, error, presence,
    setBoard, setMembers,
    createTask, updateTask, deleteTask, moveTask, upsertTask,
    addColumn, renameColumn, deleteColumn,
    updateBoard, deleteBoard, moveColumn
  };
};
