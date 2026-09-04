# Estructura Figma — Dashboard Pepes

**Ya está hecha.** Abre `figma/archivo.html` en el navegador: son las 7 páginas y los frames. Prioridad **alta** en seguridad (página 00 primero).

Para pasarlo a Figma (nube): File → New, crea las mismas páginas y captura cada frame.

Prioridad **alta** en seguridad. En Figma replica estas **páginas** (el menú izquierdo). Cada carpeta de este directorio es una página.

Convención de nombre: `00` se diseña y revisa **antes** que el resto. No mezclar login con tablas operativas.

```
Dashboard Pepes (archivo Figma)
│
├── 00 Seguridad          ← prioridad alta · revisar primero
├── 01 Acceso y sesión
├── 02 Dashboard
├── 03 Estados y errores
├── 04 Móvil
├── 05 Componentes
└── 06 Handoff
```

---

## 00 Seguridad (prioridad alta)

Cubierta del archivo. Todo lo que un atacante o un revisor de seguridad debe ver **antes** del diseño bonito.

| Frame | Qué mostrar | Regla de diseño |
|---|---|---|
| `00.00 Cubierta seguridad` | Título, dueño, fecha, “datos reales = Firestore + Auth” | Texto: la `apiKey` del HTML **no** se trata como secreto |
| `00.01 Superficie de ataque` | Cliente estático → Firebase. Sin API propia | Anotar: el claim vive en Auth; el JS no es candado de servidor |
| `00.02 Quién entra` | Claim `dashboardAccess: true` + perfil activo + rol de oficina | Cualquier otra cuenta → pantalla de rechazo, nunca el dashboard |
| `00.03 Datos sensibles` | Cortes, visitas, teléfonos, nombres | No mockear con datos reales de producción en el archivo compartido |
| `00.04 Prohibido en UI` | PIN, hashes, `userCredentials`, tokens | Nunca un frame que muestre secretos “para el demo” |
| `00.05 Checklist pre-publicar` | Sesión de pestaña, dashboard oculto, claim, escape HTML, rango acotado | Casilla: no publicar si el shell se ve sin login |

---

## 01 Acceso y sesión

| Frame | Estado |
|---|---|
| `01.01 Login vacío` | Formulario, correo + contraseña, sin hints de usuarios |
| `01.02 Login cargando` | Botón deshabilitado, sin filtrar si el correo existe |
| `01.03 Error credenciales` | “Usuario o contraseña incorrectos” — **un solo mensaje** |
| `01.04 Error sin permiso` | “Esta cuenta no tiene acceso al dashboard.” (caso Goreti histórico / repartidor) |
| `01.05 Error desactivada` | Cuenta `isActive` false |
| `01.06 Error de red` | Fallo Firebase / sin conexión |
| `01.07 Sesión cerrada` | Logout: listeners cortados, shell oculto |
| `01.08 Token expirado` | Volver a login, sin dejar cifras en pantalla |

---

## 02 Dashboard

Solo se abre en el prototipo **después** de un login con `dashboardAccess`.

| Frame | Contenido |
|---|---|
| `02.01 Resumen en vivo` | Encabezado “En vivo”, métricas, filtros |
| `02.02 Finanzas preliminares vs corte` | Distinción visual obligatoria |
| `02.03 Tiendas / rutas / productos` | Tablas; textos como texto, no HTML crudo |
| `02.04 Exportar listo` | Botón activo solo con datos completos |
| `02.05 Exportar bloqueado` | Botón disabled + motivo |

---

## 03 Estados y errores

| Frame | Contenido |
|---|---|
| `03.01 Cargando` | Skeleton, dashboard ya autenticado |
| `03.02 Vacío` | Rango sin visitas |
| `03.03 Parcial` | Colección operativa fallida — no exportar |
| `03.04 Catálogo users limitado` | Cifras OK, nombres como ID (aviso, no bloqueo) |
| `03.05 Rango inválido` | Más de 31 días |

---

## 04 Móvil

Mismos flujos de **01** y **00.05** a 390px. El login y el rechazo de acceso son obligatorios. Las tablas pueden apilarse; no ocultar el estado de sesión.

---

## 05 Componentes

Priorizar variantes **seguras**:

- Campo contraseña (nunca texto visible por defecto)
- Alerta de error (sin códigos `INTERNAL`, sin stack)
- Badge de rol (no se muestra a no autenticados)
- Botón exportar: `disabled` / `ready`
- Chip “En vivo” / “Parcial” / “Catálogo limitado”

---

## 06 Handoff

- Enlace al sitio publicado
- Nota: publicar `index.html`, `dashboard.css` y `dashboard.js` juntos; reglas Firestore aparte
- Quién aprueba un claim `dashboardAccess` nuevo (seguridad + producto)

---

## Cómo crearlo en Figma (10 minutos)

1. Nuevo archivo → **Dashboard Pepes**.
2. Menú de páginas: crea las 7 páginas con esos nombres y números.
3. En cada página, **Frame** con el código `00.01`, `01.03`, etc.
4. Prototype: `01.01` → (éxito con claim) → `02.01`; (repartidor / sin claim) → `01.04`; (logout) → `01.07`.
5. Página `00` anclada arriba. En revisiones, se abre **00** primero.

Las carpetas de este repo (`figma/00-seguridad`, …) son el mismo mapa para exportar PNG o pegar capturas.
