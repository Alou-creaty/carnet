import { useState } from "react";
import { Check, Circle, Pencil, Trash2, Save, X } from "lucide-react";

function TaskItem({ task, onDelete, onToggle, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);

  function saveEdit() {
    if (text.trim() === "") return;

    onEdit(task.id, text.trim());
    setEditing(false);
  }

  return (
    <article className={task.done ? "task completed" : "task"}>
      {/* CHECKBOX */}

      <button
        className="check-button"
        onClick={() => onToggle(task.id)}
        aria-label={
          task.done ? "Marquer comme non terminée" : "Marquer comme terminée"
        }
      >
        {task.done ? (
          <span className="check-circle">
            <Check size={17} />
          </span>
        ) : (
          <Circle size={23} />
        )}
      </button>

      {/* CONTENU */}

      <div className="task-content">
        {editing ? (
          <div className="edit-container">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveEdit();
                }

                if (e.key === "Escape") {
                  setEditing(false);
                  setText(task.text);
                }
              }}
              autoFocus
            />

            <button
              className="edit-action save"
              onClick={saveEdit}
              aria-label="Enregistrer"
            >
              <Save size={17} />
            </button>

            <button
              className="edit-action cancel"
              onClick={() => {
                setEditing(false);
                setText(task.text);
              }}
              aria-label="Annuler"
            >
              <X size={17} />
            </button>
          </div>
        ) : (
          <>
            <span className="task-text">{task.text}</span>

            <div className="task-actions">
              <button
                className="action-button edit"
                onClick={() => setEditing(true)}
                aria-label="Modifier"
              >
                <Pencil size={16} />
              </button>

              <button
                className="action-button delete"
                onClick={() => onDelete(task.id)}
                aria-label="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export default TaskItem;
