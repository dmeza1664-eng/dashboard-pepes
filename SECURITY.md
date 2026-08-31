# Seguridad del dashboard

- La `apiKey` de Firebase incluida en `index.html` es un identificador público del cliente web, no un secreto. La protección efectiva depende de Firebase Authentication, los custom claims y las reglas de Firestore.
- El dashboard acepta únicamente cuentas de la lista `DASHBOARD_ALLOWED_USER_IDS` que además estén activas y tengan rol de oficina. Hoy solo entra `admin1` (Admin General). Supervisor y Contadora ya no entran, aunque puedan usar la app Android.
- Las consultas operativas están acotadas al rango visible (máximo 31 días) más los siete días necesarios para el comparativo. `visitDetails` se consulta por lotes de IDs de visita.
- GitHub Pages no permite configurar cabeceras HTTP personalizadas. La página aplica CSP y `Referrer-Policy` mediante metaetiquetas; `X-Content-Type-Options` y `frame-ancestors` requieren migrar a un hosting que permita cabeceras (por ejemplo Firebase Hosting).
- No publiques cambios ni reglas directamente desde esta copia. Primero ejecuta las pruebas, valida contra emuladores y prueba una cuenta de cada rol.

Las reglas restrictivas por repartidor se mantienen como una segunda fase: la aplicación Android todavía descarga colecciones completas y debe migrar antes a consultas por usuario.
