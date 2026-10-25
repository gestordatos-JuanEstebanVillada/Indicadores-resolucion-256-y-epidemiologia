from app.core.dependencies import get_current_username

# Actor de auditoría = login JWT (obligatorio en mutaciones).
get_audit_actor = get_current_username
