"""Shared role lists for RBAC checks across routers."""
from app.models.user import UserRole

CLIENT_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.BUSINESS,
    UserRole.BDM,
    UserRole.AGRONOMY,
    UserRole.ACCOUNTS,
]

CLIENT_CREATE_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.BUSINESS,
    UserRole.BDM,
]

CLIENT_UPDATE_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.BUSINESS,
    UserRole.BDM,
    UserRole.AGRONOMY,
]

CLIENT_DELETE_ROLES = [
    UserRole.ADMIN,
]

DEVICE_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.HARDWARE,
    UserRole.AGRONOMY,
]

DEVICE_WRITE_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.HARDWARE,
]

INVOICE_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTS,
    UserRole.BDM,
    UserRole.BUSINESS,
]

INVOICE_WRITE_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTS,
]

BILLING_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTS,
    UserRole.BUSINESS,
]

BILLING_WRITE_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTS,
]

INVOICE_DELETE_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
]

INVOICE_SEND_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.ACCOUNTS,
]

REPORT_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.AGRONOMY,
    UserRole.BUSINESS,
    UserRole.ACCOUNTS,
    UserRole.BDM,
]

ISSUE_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.BUSINESS,
    UserRole.HARDWARE,
    UserRole.AGRONOMY,
]

PUBLIC_REGISTER_ROLES = [UserRole.EMPLOYEE]

TASK_READ_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.BUSINESS,
    UserRole.BDM,
    UserRole.AGRONOMY,
    UserRole.HARDWARE,
    UserRole.EMPLOYEE,
]

TASK_CREATE_ROLES = [
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.BUSINESS,
    UserRole.AGRONOMY,
]
