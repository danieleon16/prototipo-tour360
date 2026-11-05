# Aeronova Recorridos

Prototipo de tour virtual 360° para **Aeronova Academy**, escuela de pilotos con base en el Aeropuerto Santiago Vila (Flandes, Tolima) y sede en Guaymaral. Flota Cirrus SR20 y SR22T. Desarrollado por PockSite. Se mostrará a la dirección de Aeronova para explicar cómo se vería y se navegaría el recorrido.

**Alcance:** solo un Portal de Recorridos (`/`) y el Tour Virtual (`/tour/:sedeId`). Sin login, sin backend, sin pagos. Interfaz limpia y neutra (fondo oscuro, Inter, un acento azul); la marca se aplica después.

## Stack

- Angular 22: standalone components, signals, control flow (`@if`, `@for`), zoneless (no agregar zone.js), SCSS.
- Photo Sphere Viewer 5: `three`, `@photo-sphere-viewer/core`, `markers-plugin`, `virtual-tour-plugin`, `autorotate-plugin`, `gyroscope-plugin`. Antes de usar su API, revisa los `.d.ts` en `node_modules/@photo-sphere-viewer/`.
- No instalar dependencias nuevas sin acordarlo.

## Reglas

- El recorrido se define en `public/tour/tour.json`; agregar escenas o puntos es editar datos, nunca código.
- El visor se crea en `afterNextRender` y se destruye en `ngOnDestroy`; nunca dos visores vivos a la vez.
- Textos en español latinoamericano, tuteo. No inventar cifras ni datos de Aeronova.
- Mobile first: debe funcionar desde 360 px de ancho.
- `yaw` y `pitch` van en radianes. Se calibran con `/tour/flandes?calibrar=1`.

## Estructura

```
public/tour/
  tour.json               Datos del recorrido
  escenas/                Imágenes 360° equirectangulares (4096x2048)
  fichas/                 Fotos opcionales de las fichas
src/app/
  core/
    config.ts             WhatsApp y otros valores globales
    models/               Tipos del recorrido
    services/             TourService (carga tour.json una vez)
  features/
    portal/               Portal de Recorridos (ruta /)
    tour/                 Página del tour (ruta /tour/:sedeId)
      tour-viewer/        Visor 360° sin interfaz propia
```

## Comandos

- `npm start`: servidor de desarrollo en `http://localhost:4200`.
- `npm run build`: build de producción; debe pasar sin errores antes de dar una fase por terminada.
