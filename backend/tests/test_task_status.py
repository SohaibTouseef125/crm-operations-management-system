from app.models.task import TaskStatus


def test_task_status_enum_values():
    assert TaskStatus.PENDING.value == "PENDING"
    assert TaskStatus.IN_PROGRESS.value == "IN_PROGRESS"
    assert TaskStatus.OVERDUE.value == "OVERDUE"
    assert TaskStatus.COMPLETED.value == "COMPLETED"


def test_allowed_forward_transitions():
    allowed = {
        TaskStatus.PENDING: [TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE, TaskStatus.COMPLETED],
        TaskStatus.IN_PROGRESS: [TaskStatus.COMPLETED, TaskStatus.OVERDUE],
        TaskStatus.OVERDUE: [TaskStatus.PENDING, TaskStatus.COMPLETED],
        TaskStatus.COMPLETED: [],
    }
    assert TaskStatus.IN_PROGRESS in allowed[TaskStatus.PENDING]
    assert TaskStatus.OVERDUE in allowed[TaskStatus.PENDING]
    assert TaskStatus.PENDING not in allowed[TaskStatus.COMPLETED]
