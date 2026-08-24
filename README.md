# IslandCity Driver Ledger

Aplicación móvil estática para registrar turnos y viajes desde el teléfono.

## Páginas activas

- **Dashboard:** reloj y fecha automáticos, clock-in, break/resume, clock-out, estado GPS, bruto/neto, $/hora, objetivo diario y resumen semanal.
- **Daily Entry:** captura rápida de plataforma, ingresos, millas, comisión, ubicaciones, notas y peajes.
- **Register:** bitácora diaria, desglose de peajes por viaje y referencia de tarifas.

## GPS y peajes

- El GPS se inicia al hacer clock-in y se detiene al hacer clock-out.
- La detección usa geocercas de 350 m y evita duplicar una plaza mientras el vehículo permanece en su área.
- Varios peajes detectados en un viaje se suman automáticamente y se almacenan con hora, importe, coordenadas y fuente.
- Las notas se completan con el desglose y la fuente: `GPS geofence / tarifas E-ZPass 2026`.
- Incluye tarifas E-ZPass de pasajeros MTA y Port Authority 2026; Port Authority cambia entre hora pico/fuera de pico.

Todos los datos se guardan localmente en el navegador y pueden exportarse como respaldo JSON.

GitHub Pages puede publicar el sitio desde `main` y la carpeta raíz.
