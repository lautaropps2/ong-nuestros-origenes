# Biblioteca del Barrio — conectar la planilla de pedidos

La planilla de Google es el Excel de la campaña: cada libro comprado queda en una fila con la fecha y hora, el libro, el color y los datos del comprador. También entrega el código QR de cada libro y las estadísticas que se ven en el sitio.

## Instalar (una sola vez, unos 5 minutos)

1. Con la cuenta de Google de la ONG, crea una planilla nueva en sheets.google.com. Ponle de nombre, por ejemplo, **Biblioteca – Navidad 2026**.
2. En la planilla, entra a **Extensiones → Apps Script**.
3. Borra lo que aparezca y pega todo el contenido de `tools/biblioteca/pedidos.gs`. Guarda con el ícono de disquete.
4. Arriba, elige la función **configurar** y aprieta **Ejecutar**.
   - Google pide permisos: **Revisar permisos**, elige la cuenta de la ONG, luego **Configuración avanzada → Ir a (no seguro)** y **Permitir**.
   - Google muestra esta advertencia porque el script es propio, no de una empresa verificada.
5. Publica el script: **Implementar → Nueva implementación**.
   - En el engranaje, elige **Aplicación web**.
   - **Ejecutar como:** Yo.
   - **Quién tiene acceso:** Cualquier usuario.
   - Aprieta **Implementar** y copia la **URL de la aplicación web**, que termina en `/exec`.
6. Pega esa URL en `data/sistema.json`, en `"pedidos_url"`, y publica el sitio.

## Uso diario

- **Pedidos:** la hoja **Pedidos**, con una fila por libro.
- **Cambiar el estado:** en la columna **Estado** elige *Comprado* (cuando confirmes el pago), *Enviado* o *Entregado*. La fecha se anota sola y el QR del comprador se actualiza.
  - Solo los libros *Comprado*, *Enviado* o *Entregado* suman a la meta.
  - Los *Pendiente de pago* no suman.
- **Resumen 7 días:** cuántos libros se pidieron, se confirmaron y se entregaron cada día de la última semana.
- **Excel semanal:** todos los lunes a las 9:00 llega al correo de la ONG un .xlsx con los pedidos de los últimos 7 días.
  - Para recibirlo antes, en la planilla usa el menú **Biblioteca → Enviarme el Excel de los últimos 7 días**.
  - También puedes descargar toda la planilla con **Archivo → Descargar → Microsoft Excel**.
- **Residencia / hogar (interno)** y **Notas internas:** estas columnas nunca se muestran en el seguimiento público.

## Si cambias el código del script

Usa **Implementar → Administrar implementaciones → editar (lápiz) → Versión: nueva**. Así la URL no cambia.
