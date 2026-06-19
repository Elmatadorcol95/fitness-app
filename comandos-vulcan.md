# 🔨 Comandos útiles — Proyecto Vulcan

Guía de referencia rápida. **Todos los comandos se escriben en la terminal, dentro de la carpeta del proyecto** (`fitness-app`).
Si no estás en la carpeta, primero: `cd fitness-app`

---

## ⭐ Rutina diaria (lo más importante)

**Al EMPEZAR a trabajar** — trae lo último del otro PC:
```
git pull
```
Y si en la sesión anterior se instalaron paquetes nuevos, además:
```
npm install
```
Luego arrancas la app:
```
npx expo start
```

**Al TERMINAR de trabajar** — sube todo a GitHub:
```
git add .
git commit -m "describe lo que hiciste hoy"
git push
```

> 🟢 **Regla de oro:** `pull` al empezar, `push` al terminar. Nunca trabajes sin hacer `git pull` primero.
> ⚠️ El archivo `.env` NO se sincroniza (no viaja en GitHub). Mantenlo a mano en cada PC.

---

## 🚀 Arrancar la app (Expo)

- `npx expo start` — arrancar el servidor de desarrollo
- `npx expo start -c` — arrancar **limpiando caché** (úsalo tras cambiar el `.env`, instalar paquetes, o ante bugs raros)
- `npx expo start --tunnel` — arrancar con túnel (si el QR no conecta por la red/Wi-Fi)

**Con el servidor corriendo**, teclas útiles:
- `r` — recargar la app
- `m` — abrir el menú de desarrollo
- `?` — ver todas las teclas disponibles
- `Ctrl + C` — detener el servidor

---

## 📦 Dependencias (paquetes)

- `npm install` — instalar todas las dependencias (tras clonar, o tras un `pull` con paquetes nuevos)
- `npx expo install nombre-del-paquete` — instalar un paquete **compatible con tu versión de Expo** (usa esto, no `npm install`, para paquetes de Expo)
- `npx expo install --check` — revisar/alinear las versiones de los paquetes con las que Expo espera

> ⚠️ Si ves el aviso de "vulnerabilities", **ignóralo**. Nunca uses `npm audit fix --force` (rompe Expo).

---

## 🛠️ Compilar la app (EAS Build) — solo para módulos nativos

Necesario cuando se añaden módulos nativos (cámara, vibración, sonido, etc.).

- `npm install -g eas-cli` — instalar la herramienta de EAS (una sola vez por PC)
- `eas login` — iniciar sesión en tu cuenta Expo
- `eas build --profile development --platform android` — compilar el **development build** de Android (el que instalas en tu teléfono)
- `eas build --profile development --platform ios` — lo mismo para iOS
- `eas build:list` — ver tus builds anteriores

> El build tarda ~10-20 min en la nube. Al terminar te da un enlace para instalar el APK nuevo en el teléfono.

---

## 🗄️ Base de datos (Drizzle) — para errores "no such table / no such column"

- `npx drizzle-kit generate` — generar una migración tras cambiar el esquema de la base de datos
- Las migraciones se aplican solas al iniciar la app (si el runner está configurado)
- **Último recurso** si la BD se queda mal en pruebas: en el teléfono, Ajustes → Apps → Vulcan → Almacenamiento → **Borrar datos** (recrea la base desde cero, pero pierdes el registro)

---

## 🆕 Configurar el proyecto en un PC nuevo (primera vez)

```
git clone URL_DEL_REPO
cd fitness-app
npm install
```
Luego crea el archivo `.env` en la raíz con tus claves de Supabase:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...tu_clave
```
Y arranca:
```
npx expo start -c
```

> Las claves de Supabase están en: supabase.com → tu proyecto → Project Settings → API.

---

## 🧭 Git — comandos de apoyo

- `git status` — ver qué archivos cambiaron y el estado actual
- `git log --oneline -10` — ver los últimos 10 commits (resumido)
- `git stash` — guardar cambios temporalmente sin hacer commit (útil si necesitas hacer `pull` y tienes cambios a medias)
- `git stash pop` — recuperar esos cambios guardados temporalmente

> Si `git pull` avisa de un **conflicto**, no toques nada y pídeme ayuda: lo resolvemos juntos.

---

## 📂 Navegación básica de la terminal (Windows / PowerShell)

- `cd fitness-app` — entrar a una carpeta
- `cd ..` — subir un nivel
- `ls` (o `dir`) — listar los archivos de la carpeta
- `pwd` — ver en qué carpeta estás
- `cls` — limpiar la pantalla de la terminal

---

## 🩹 Problemas comunes (soluciones rápidas)

- **PowerShell dice "scripts disabled"** → ejecuta una vez:
  `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
- **El QR no conecta** → `npx expo start --tunnel` (teléfono y PC con internet)
- **Cambié el `.env` y no surte efecto** → detén el servidor (`Ctrl + C`) y reinicia con `npx expo start -c`
- **Bugs raros tras cambios** → `npx expo start -c` (limpia caché)
- **Error "Invalid supabaseUrl"** → falta o está mal el `.env` (ver sección de PC nuevo)

---

*Vulcan — forjando tu plan. 🔨*
