from rest_framework.permissions import BasePermission

from .models import PerfilUsuario


def _es_jefe(user):
    """True si el usuario autenticado tiene perfil con es_jefe=True (Agrónomo)."""
    return PerfilUsuario.objects.filter(user=user, es_jefe=True).exists()


class EsAgronomo(BasePermission):
    """Solo el Agrónomo (es_jefe=True)."""
    message = "Esta acción es exclusiva del rol Agrónomo."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _es_jefe(request.user))


class EsOperario(BasePermission):
    """Solo el Operario (usuario autenticado que NO es jefe)."""
    message = "Esta acción es exclusiva del rol Operario."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and not _es_jefe(request.user))
