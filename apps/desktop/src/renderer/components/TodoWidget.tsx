import { useState, useEffect, useCallback, useRef } from 'react';

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

export function TodoWidget() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.attensa.settings.get().then((s: any) => {
      if (s?.todos) setTodos(s.todos);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((next: TodoItem[]) => {
    setTodos(next);
    window.attensa.settings.set('todos', next);
  }, []);

  const addTodo = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    persist([...todos, { id: Date.now(), text: trimmed, done: false }]);
    setInput('');
  };

  const toggleTodo = (id: number) => {
    persist(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id: number) => {
    persist(todos.filter((t) => t.id !== id));
  };

  const startEdit = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setTimeout(() => editRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (editingId === null) return;
    const trimmed = editText.trim();
    if (trimmed) {
      persist(todos.map((t) => (t.id === editingId ? { ...t, text: trimmed } : t)));
    }
    setEditingId(null);
  };

  const clearCompleted = () => {
    persist(todos.filter((t) => !t.done));
  };

  if (!loaded) return null;

  const pending = todos.filter((t) => !t.done);
  const completed = todos.filter((t) => t.done);
  const total = todos.length;
  const progress = total > 0 ? completed.length / total : 0;

  return (
    <div className="rounded-2xl border border-[var(--t-border-light)] bg-surface shadow-surface flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
            <rect x="2" y="2" width="12" height="12" rx="2" />
            <path d="M5 8l2 2 4-4" />
          </svg>
          <h3 className="text-sm font-semibold text-fg">
            To-do
          </h3>
        </div>
        {total > 0 && (
          <span className="text-[11px] text-fg-faint tabular-nums">
            {completed.length}/{total}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mx-4 mb-3 h-1 rounded-full bg-fg-ghost/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Add input */}
      <div className="flex items-center gap-2 mx-4 mb-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
          placeholder="Add a task..."
          className="flex-1 bg-transparent text-sm text-fg outline-none placeholder-fg-faint border-b border-[var(--t-border-subtle)] pb-1 focus:border-accent transition-colors"
        />
        <button
          onClick={addTodo}
          disabled={!input.trim()}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-fg-faint hover:text-accent hover:bg-overlay transition-colors disabled:opacity-30 disabled:hover:text-fg-faint disabled:hover:bg-transparent"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
        </button>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 min-h-0">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-fg-faint">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="mb-2 opacity-40">
              <rect x="4" y="4" width="20" height="20" rx="4" />
              <path d="M10 10h8M10 14h5" />
            </svg>
            <p className="text-xs">Plan your focus session</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {pending.map((todo) => (
              <div
                key={todo.id}
                className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-overlay transition-colors"
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className="flex-shrink-0 w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-fg-ghost hover:border-accent transition-colors"
                />

                {/* Text or edit input */}
                {editingId === todo.id ? (
                  <input
                    ref={editRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={commitEdit}
                    className="flex-1 bg-transparent text-sm text-fg outline-none border-b border-accent pb-0.5"
                  />
                ) : (
                  <span
                    onDoubleClick={() => startEdit(todo)}
                    className="flex-1 text-sm text-fg truncate cursor-default select-none"
                    title="Double-click to edit"
                  >
                    {todo.text}
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-fg-faint hover:text-focus-low transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Completed section */}
            {completed.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-2 mb-1 px-2">
                  <div className="h-px flex-1 bg-fg-ghost/50" />
                  <button
                    onClick={clearCompleted}
                    className="text-[10px] text-fg-faint hover:text-fg-muted transition-colors uppercase tracking-wider"
                  >
                    Clear done
                  </button>
                  <div className="h-px flex-1 bg-fg-ghost/50" />
                </div>
                {completed.map((todo) => (
                  <div
                    key={todo.id}
                    className="group flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-overlay transition-colors"
                  >
                    <button
                      onClick={() => toggleTodo(todo.id)}
                      className="flex-shrink-0 w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-accent bg-accent/15 flex items-center justify-center transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                        <path d="M2 5.5l2 2 4-4.5" />
                      </svg>
                    </button>
                    <span className="flex-1 text-sm text-fg-faint line-through truncate">{todo.text}</span>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 text-fg-faint hover:text-focus-low transition-all"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
                      </svg>
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
