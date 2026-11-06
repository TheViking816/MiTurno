<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

## Calendarios semanales y varios locales

Producción en Vercel: `miturnoqr`, dominio `https://miturnoqr.vercel.app`, rama `feat/auto-close-shifts` (verificar de nuevo antes de publicar).

Para activar el calendario, ejecutar en el proyecto Supabase `jskngeempmmrtgohijhy` la migración `supabase/migrations/20261106115418_employee_weekly_schedule.sql`. Después ejecutar `supabase/assign_lilly_schedule.sql`, que exige encontrar una única Lilly y asigna martes/miércoles a Brutal Soul, jueves/viernes/sábado a Ke Brutal y lunes/domingo libres. El script devuelve la asignación guardada para verificarla. No modifica su turno de mañana/tarde.

Los calendarios se editan desde Equipo y se muestran al trabajador en Fichar. Los empleados sin calendario fijo conservan sus locales habituales. Se usa la zona horaria Europe/Madrid. El calendario valida nuevas entradas; las salidas de jornadas abiertas siguen disponibles. Los fichajes históricos manuales cerrados no se restringen por el calendario recurrente actual.

La interfaz funciona con la base de datos anterior, pero guardar calendarios requiere aplicar la migración. No considerar configurada a Lilly hasta ejecutar y verificar ambos SQL en producción.

Validación local: `npm test`, `npx tsc --noEmit`, `npm run build`.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1MrHSuq3EDuG6_dN6HFih_Vg2AB3imjSn

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
