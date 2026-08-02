import { Pencil, Trash2 } from "lucide-react"
import { ActionIconButton } from "@/components/action-icon-button"

export function TableEditDeleteActions({
  canEdit,
  canDelete,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
  className = "flex items-center gap-1",
  deleteDisabled,
}) {
  if (!canEdit && !canDelete) return null

  return (
    <div className={className}>
      {canEdit && (
        <ActionIconButton label={editLabel} tone="info" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden />
        </ActionIconButton>
      )}
      {canDelete && (
        <ActionIconButton
          label={deleteLabel}
          tone="danger"
          onClick={onDelete}
          disabled={deleteDisabled}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </ActionIconButton>
      )}
    </div>
  )
}
