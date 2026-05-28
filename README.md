# Trivia Event Live 🏆

Plataforma de dinámica de trivia interactiva en vivo diseñada especialmente para eventos presenciales, con soporte para actualizaciones en tiempo real y compatibilidad con **Vite (Preview) + Next.js 14 (App Router) + TypeScript y Tailwind CSS** integrada con **Supabase** (esquema `temp`).

La interfaz ha sido estilizada meticulosamente siguiendo las pautas solicitadas:
- 🟢 **Color Principal:** `#fed600` (Amarillo vibrante deportivo / alta visibilidad)
- 🔴 **Color Secundario:** `#111211` (Negro/carbón profundo de fondo y elegancia)
- ⚪ **Color Terciario:** `#fcfcfc` (Gris suave y blanco roto para textos principales de alto contraste)

---

## 🚀 Inicio Rápido en AI Studio

Para que puedas evaluar y probar la aplicación inmediatamente en el simulador de AI Studio **sin configurar Supabase inicialmente**:
1. La aplicación detectará si las claves están vacías e iniciará de forma segura en **Modo Demostración (Simulado)**.
2. Puedes abrir la consola flotante en la esquina superior derecha (`Modo Demo Activo`) para alternar al modo de base de datos Supabase en cualquier momento o ingresar credenciales de prueba sobre la marcha.
3. En la pestaña `/admin`, si el banco de preguntas está vacío, encontrarás un botón amarillo brillante que dice **"Poblar Banco con 5 Ejemplos"**. Haz clic para cargar preguntas de prueba y empezar a jugar de inmediato en el emulador.

---

## 🗄️ Configuración de la Base de Datos en Supabase (Esquema `temp`)

Para conectar tu Supabase de producción, ingresa a la consola SQL Editor de tu proyecto Supabase y ejecuta la siguiente consulta para crear el esquema privado `temp`, las tablas especificadas y la vista dinámica de clasificación:

```sql
-- 1. Crear el esquema privado "temp" y habilitar acceso
CREATE SCHEMA IF NOT EXISTS temp;
GRANT ALL ON SCHEMA temp TO anon;
GRANT ALL ON SCHEMA temp TO authenticated;
GRANT ALL ON SCHEMA temp TO service_role;

-- 2. Crear Tabla de Leaderboards (Dinámicas)
CREATE TABLE IF NOT EXISTS temp.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Crear Tabla de Jugadores
CREATE TABLE IF NOT EXISTS temp.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  leaderboard_id UUID REFERENCES temp.leaderboards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Crear Tabla de Preguntas
CREATE TABLE IF NOT EXISTS temp.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  xp_value INTEGER NOT NULL DEFAULT 500,
  time_limit_seconds INTEGER,
  order_index INTEGER NOT NULL DEFAULT 0,
  leaderboard_id UUID REFERENCES temp.leaderboards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Crear Tabla de Respuestas
CREATE TABLE IF NOT EXISTS temp.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES temp.players(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES temp.questions(id) ON DELETE CASCADE,
  leaderboard_id UUID REFERENCES temp.leaderboards(id) ON DELETE CASCADE,
  selected_option CHAR(1) NOT NULL CHECK (selected_option IN ('a','b','c','d')),
  is_correct BOOLEAN NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, question_id)
);

-- 6. Otorgar permisos a anon para que la app cliente funcione
GRANT ALL ON ALL TABLES IN SCHEMA temp TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA temp TO anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA temp TO anon;
```

> ⚠️ **IMPORTANTE:** Para que el Leaderboard se actualice en tiempo real en la pantalla de proyección, debes habilitar la replicación de **Supabase Realtime** para la tabla `temp.answers` en el panel de control de Supabase (Database -> Replication -> habilitar la tabla `answers` en el esquema `temp`).

---

## 🛠️ Estructura del Proyecto

El código fuente ha sido estructurado de forma modular y escalable dentro de la carpeta `/src`, garantizando un rendimiento óptimo y evitando archivos excesivamente redundantes:

- `/src/types.ts`: Declaraciones de tipos TypeScript unificados para `Player`, `Question`, `Answer` y `LeaderboardRow`.
- `/src/supabase.ts`: Conexión de cliente Supabase con el esquema `temp` y salvaguardas para inicialización segura en variables desiertas.
- `/src/dataService.ts`: Gestor unificado de base de datos. Transiciona automáticamente entre consultas Supabase reales o el motor de simulación local en localStorage si la conexión local reside en prueba.
- `/src/components/PlayView.tsx`: Pantalla para teléfonos de Jugadores (`#play`). Incluye registro, cuestionario interactivo con cuenta regresiva, y podio motivador post-partida.
- `/src/components/LeaderboardView.tsx`: Vista optimizada para proyectores de eventos (`#leaderboard`). Destaca suntuosamente el Top 3 y un listado indexado reactivo.
- `/src/components/AdminView.tsx`: Consola total de hosting (`#admin`). Monitoreo de actividad, gestor de cuestionarios crudos, filtro, selector de premios, y exportación CSV inmediata.
- `/src/App.tsx`: Director principal que maneja los renders del panel y vistas mediante `HashRouter`.

---

## 🔧 Despliegue en GitHub & Vercel

Este repositorio está pre-configurado para que puedas subirlo directamente a tu rama remota en GitHub:

```bash
# Inicializar repositorio local Git
git init
git add .
git commit -m "feat: setup live trivia event application"

# Enlazar y subir a tu repositorio
git remote add origin https://github.com/JancNa/trivia-event-temp.git
git branch -M main
git push -u origin main
```

### Configuración en Vercel
Al crear el proyecto en Vercel, agrega las siguientes **Variables de Entorno**:
- `NEXT_PUBLIC_SUPABASE_URL` = `<tu_url_de_supabase_project>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<tu_anon_key_de_supabase>`
- `VITE_SUPABASE_URL` = `<tu_url_de_supabase_project>` (Para compatibilidad Vite)
- `VITE_SUPABASE_ANON_KEY` = `<tu_anon_key_de_supabase>` (Para compatibilidad Vite)
