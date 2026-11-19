# Biblioteca del Barrio: pedidos, QR y seguimiento

Cada libro que alguien compra en **nuestrosorigenes.cl/biblioteca** recibe un código (por ejemplo `NAV-7K3M-Q9PX`) y un **código QR**. Al escanearlo con el celular se abre la página de seguimiento: **Comprado → Enviado → Entregado en el hogar**.

El estado de cada libro se cambia en el panel: **nuestrosorigenes.cl/admin** → botón amarillo **Pedidos de libros** (abajo a la derecha), o directo en **nuestrosorigenes.cl/admin/pedidos**.

Los pedidos se guardan en un repositorio **privado** de GitHub (`ong-pedidos`), no en el sitio público. Ahí quedan el nombre, el correo y el teléfono de cada comprador.

## Conectar (una sola vez, unos 5 minutos)

Mientras esto no esté hecho, el botón "Comprar" envía el pedido por WhatsApp, sin código QR.

### 1. Crear el repositorio privado

1. Entra a <https://github.com/new> con la cuenta **lautaropps2**.
2. **Repository name:** `ong-pedidos`.
3. Marca **Private**.
4. Marca **Add a README file**.
5. Aprieta **Create repository**.

### 2. Crear el token para el sitio

1. Entra a <https://github.com/settings/personal-access-tokens/new>. Es un token *fine-grained*, no uno *classic*.
2. **Token name:** `pedidos-web`.
3. **Expiration:** elige una fecha después de que termine la campaña, por ejemplo 31-03-2027.
4. **Repository access:** elige **Only select repositories** y luego `ong-pedidos`.
5. **Permissions → Repository permissions → Contents:** elige **Read and write**.
6. Aprieta **Generate token** y copia el token.
   - Empieza con `github_pat_`.
   - Solo se muestra una vez.
   - No lo compartas con nadie, ni por chat.

### 3. Pegar el token en Vercel

1. Entra a <https://vercel.com> → proyecto **ong-nuestros-origenes** → **Settings → Environment Variables**.
2. **Key:** `PEDIDOS_TOKEN`.
3. **Value:** el token que copiaste.
4. Deja marcados *Production*, *Preview* y *Development*, y aprieta **Save**.
5. Publica de nuevo el sitio: **Deployments** → los tres puntos del último → **Redeploy**.

Para probar, compra un libro en /biblioteca. Debe aparecer el QR y el pedido debe verse en /admin/pedidos.

## Uso diario (panel → Pedidos de libros)

- **Entrar:** usa la misma cuenta de GitHub del panel. Solo pueden entrar quienes pueden publicar en el sitio.
- **Cambiar el estado:** en la columna **Estado** elige el estado del libro. Se guarda solo.
  - *Comprado:* cuando confirmes el pago.
  - *Enviado:* cuando el libro salga a la residencia.
  - *Entregado:* cuando llegue a la residencia.
  - Las fechas se anotan solas.
  - El QR del comprador muestra el cambio en menos de un minuto.
- **Varios libros a la vez:** marca las casillas de la izquierda y abajo elige **Marcar: …** → **Aplicar**.
- **Meta:** solo cuentan los libros *Comprado*, *Enviado* o *Entregado*. Los *Pendiente de pago* no suman, así que nadie puede inflar la meta con compras falsas.
- **Excel:** el botón **Excel últimos 7 días** descarga un .xlsx con dos hojas.
  - *Pedidos:* fecha y hora, código, libro, color y datos del comprador.
  - *Resumen por día.*
  - **Excel completo** descarga toda la campaña.
- **QR de un pedido:** el botón **QR** de cada fila sirve para:
  - descargar la imagen del QR,
  - copiar el enlace de seguimiento,
  - enviárselo al comprador por WhatsApp.
- **Residencia y notas:** son internas y nunca se muestran en el seguimiento público. El público solo ve el nombre corto ("Lucía M."), el libro, el color y las fechas.

## Probar en el computador (sin GitHub ni Vercel)

```bash
python tools/build.py
node tools/biblioteca/dev_server.js
```

Abre <http://127.0.0.1:8765/biblioteca>. Los pedidos quedan en memoria y se borran al cerrar el programa.

Para entrar al panel de prueba, abre <http://127.0.0.1:8765/admin/pedidos>. En la consola del navegador ejecuta `sessionStorage.setItem("pedidos-token","admin-test")` y recarga la página.
