import { useEffect, useRef, useState, type ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  width?: string;
};

type Action<T> = {
  label: string;
  onClick: (row: T) => void;
  disabled?: boolean;
  danger?: boolean;
  icon?: ReactNode;
};

type TableProps<T> = {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  loading?: boolean;
  emptyMessage?: ReactNode;
  actionsLabel?: string;
  onRowClick?: (row: T) => void;
  rowKey?: (row: T, index: number) => string;
  style?: React.CSSProperties;
};

export default function Table<T>({
  data,
  columns,
  actions = [],
  loading = false,
  emptyMessage = "Nenhum registro encontrado.",
  actionsLabel = "Ações",
  onRowClick,
  rowKey,
  style,
}: TableProps<T>) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const getKey = (row: T, i: number) => rowKey ? rowKey(row, i) : String(i);

  return (
    <div className="u-table-card" style={style}>
      {loading ? (
        <div className="u-table__loading">
          <div className="u-table__spinner" />
          <span>Carregando...</span>
        </div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table className="u-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} style={{ width: col.width }}>{col.header}</th>
                  ))}
                  {actions.length > 0 && <th style={{ width: 56 }}>{actionsLabel}</th>}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)}>
                      <div className="u-table__vazio">
                        {typeof emptyMessage === "string" ? <p>{emptyMessage}</p> : emptyMessage}
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <TableRow
                      key={getKey(row, idx)}
                      rowId={getKey(row, idx)}
                      row={row}
                      columns={columns}
                      actions={actions}
                      onRowClick={onRowClick}
                      openKey={openKey}
                      setOpenKey={setOpenKey}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

type RowProps<T> = {
  row: T;
  rowId: string;
  columns: Column<T>[];
  actions: Action<T>[];
  onRowClick?: (row: T) => void;
  openKey: string | null;
  setOpenKey: (k: string | null) => void;
};

function TableRow<T>({ rowId, row, columns, actions, onRowClick, openKey, setOpenKey }: RowProps<T>) {
  const menuOpen = openKey === rowId;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!menuOpen) return;
    const update = () => {
      if (!triggerRef.current) return;
      const r = triggerRef.current.getBoundingClientRect();
      const menuH = Math.min(300, actions.length * 42 + 16);
      const menuW = 180;
      const top = (r.bottom + menuH > window.innerHeight - 8) ? r.top - menuH - 4 : r.bottom + 4;
      const left = Math.min(window.innerWidth - menuW - 8, r.right - menuW);
      setPos({ top, left: Math.max(8, left) });
    };
    update();
  }, [menuOpen, actions.length]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen, setOpenKey]);

  return (
    <tr
      className={onRowClick ? "u-table__row--clicavel" : undefined}
      onClick={() => onRowClick?.(row)}
    >
      {columns.map((col) => {
        const content = col.render?.(row) ?? (col.accessor ? (row as Record<string, unknown>)[col.accessor as string] as ReactNode : null);
        return (
          <td key={col.key}>{content}</td>
        );
      })}

      {actions.length > 0 && (
        <td onClick={(e) => e.stopPropagation()}>
          <button
            ref={triggerRef}
            type="button"
            className="u-action-trigger"
            onClick={() => setOpenKey(menuOpen ? null : rowId)}
          >
            ⋯
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="u-action-menu"
              style={{ top: pos.top, left: pos.left, minWidth: 160 }}
            >
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={action.disabled}
                  className={`u-action-item${action.danger ? " u-action-item--danger" : ""}`}
                  onClick={() => { setOpenKey(null); action.onClick(row); }}
                >
                  {action.icon && <span style={{ fontSize: 14 }}>{action.icon}</span>}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </td>
      )}
    </tr>
  );
}
