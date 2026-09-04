# Entrega para publicar el dashboard de reparto

La página **ya está en producción** en:

https://dmeza1664-eng.github.io/dashboard-pepes/

Este paquete sirve para republicarla o moverla a otro hosting. No usa SQL ni una API propia: lee Firestore en tiempo real después del login de Firebase.

## Qué hay que publicar

| Archivo | ¿Se sube al hosting? | Para qué |
|---|---|---|
| `index.html` | Sí | Estructura y login |
| `dashboard.css` | Sí. Junto al HTML | Estilos |
| `dashboard.js` | Sí. Junto al HTML | Auth, Firestore y reportes |
| `SECURITY.md` | No es obligatorio | Aviso de seguridad para el equipo |
| `tests/dashboard-finance.test.js` | No | Verificar antes de subir |
| `referencia/firestore.rules` | No subir a GitHub Pages | Copia de las reglas **ya desplegadas** en Firebase. No las vuelvan a publicar salvo que se pida |

Los tres archivos (`index.html`, `dashboard.css`, `dashboard.js`) tienen que quedar en la **misma carpeta**. Si falta el CSS o el JS, la página se ve rota o no entra.

No hace falta `package.json`, servidor Node, Azure SQL ni una API intermedia.

## Quién puede entrar

El HTML ya no lista correos. Firebase Auth lleva el claim `dashboardAccess`. Hoy lo deben tener:

- `angelogistica@pasteleriapepe.mx` (Admin General, `admin1`)
- `carloszerme1@pasteleriapepe.mx` (Carlos, `carloszerme1`)
- `goreti@pasteleriapepe.mx` (Goreti, `goreti`)

Los repartidores pueden seguir usando la app Android. El dashboard los rechaza.

## Cómo publicarla

### Opción A — GitHub Pages (la que ya usa el equipo)

1. Reemplazar `index.html`, `dashboard.css` y `dashboard.js` en el repo `https://github.com/dmeza1664-eng/dashboard-pepes`
2. Subir a la rama `main`
3. Esperar 1–2 minutos y abrir la URL de Pages
4. Si el navegador muestra la versión vieja, recargar sin caché (Ctrl+F5)

### Opción B — Cualquier hosting estático

Subir **los tres archivos** a la raíz del sitio:

- Firebase Hosting
- Netlify / Vercel (arrastrar la carpeta)
- IIS / Apache / carpeta de red

Ejemplo local de prueba:

```bash
npx --yes http-server . -p 4173 -c-1
```

Abrir `http://127.0.0.1:4173`

### Opción C — No usen SQL

Azure SQL es para la app Android y el puente de sincronización. El dashboard no lee SQL. Publicar scripts SQL no cambia esta página.

## Prueba antes de avisar

```bash
node tests/dashboard-finance.test.js
```

Debe imprimir: `Dashboard finance and hardening tests: OK`

Luego entrar con Carlos o Admin General y confirmar que el encabezado llegue a **En vivo** y que se vean nombres de repartidores.

## Qué no tocar

- No reenviar `apiKey` de Firebase como si fuera un secreto. Es pública; el acceso lo dan Auth, claims y reglas.
- No desplegar `firestore.rules` “por si acaso”. Ya están en el proyecto `cookie-1d48c`.
- No agregar más cuentas sin ponerles el claim `dashboardAccess: true` en Firebase Auth. El HTML ya no lleva lista de usuarios.
