import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AutorotatePlugin } from '@photo-sphere-viewer/autorotate-plugin';
import { Viewer } from '@photo-sphere-viewer/core';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { VirtualTourNode, VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';

import { Escena, PuntoInfo } from '../../../core/models/tour.model';

const RETRASO_AUTOROTACION_MS = 4000;
const RETRASO_AUTOROTACION_PAUSADA_MS = Number.MAX_SAFE_INTEGER;
const ESPERA_SENSOR_MS = 3000;
const DURACION_TRANSICION_MS = 1200;
const ZOOM_HORIZONTAL = 50;
// En vertical, el zoom estándar deja una franja muy estrecha; se abre el campo de visión al máximo.
const ZOOM_VERTICAL = 0;
const ICONO_FLECHA =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * "Ir al Taller", "Ir a la Llegada". Los nombres en -a son femeninos,
 * salvo los que empiezan por a, como "Aula", que lleva "al" por la a tónica.
 */
function etiquetaDestino(nombre: string): string {
  const femenino = /a$/i.test(nombre) && !/^[aá]/i.test(nombre);
  return `Ir ${femenino ? 'a la' : 'al'} ${nombre}`;
}

@Component({
  selector: 'app-tour-viewer',
  templateUrl: './tour-viewer.html',
  styleUrl: './tour-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // El visor crea su propio DOM (marcadores), fuera del alcance de los estilos encapsulados.
  encapsulation: ViewEncapsulation.None
})
export class TourViewer implements OnDestroy {
  readonly escenas = input.required<Escena[]>();
  readonly escenaInicial = input.required<string>();
  /** Detiene la autorrotación, por ejemplo mientras se lee una ficha. */
  readonly pausado = input(false);

  readonly escenaCambio = output<string>();
  readonly puntoSeleccionado = output<PuntoInfo>();

  protected readonly calibrando =
    inject(ActivatedRoute).snapshot.queryParamMap.get('calibrar') === '1';
  protected readonly coordenadas = signal<string | null>(null);

  private readonly lienzo = viewChild.required<ElementRef<HTMLElement>>('lienzo');
  private viewer?: Viewer;
  private autorotacion?: AutorotatePlugin;
  private giroscopio?: GyroscopePlugin;
  private arrancandoGiroscopio = false;
  private sensorConfirmado = false;
  private readonly escuchasGlobales = new AbortController();

  private readonly giroscopioSoportado = signal(false);
  /** Lo que eligió la persona; el plugin se apaga por momentos al arrastrar o cambiar de escena. */
  private readonly giroscopioElegido = signal(false);

  readonly giroscopioDisponible = this.giroscopioSoportado.asReadonly();
  readonly giroscopioActivo = this.giroscopioElegido.asReadonly();

  constructor() {
    afterNextRender(() => this.crearVisor());

    // Si la autorrotación arrancara con el giroscopio activo, lo apagaría.
    effect(() => this.aplicarPausa(this.pausado() || this.giroscopioElegido()));
    effect(() => this.sincronizarGiroscopio());
  }

  ngOnDestroy(): void {
    this.escuchasGlobales.abort();
    this.viewer?.destroy();
    this.viewer = undefined;
    this.autorotacion = undefined;
    this.giroscopio = undefined;
  }

  /** Devuelve `false` si el dispositivo no permitió activar el giroscopio. */
  async alternarGiroscopio(): Promise<boolean> {
    if (!this.giroscopio || this.arrancandoGiroscopio) {
      return true;
    }
    if (this.giroscopioElegido()) {
      this.giroscopioElegido.set(false);
      this.giroscopio.stop();
      return true;
    }
    // iOS solo pide permiso dentro del gesto de la persona: debe arrancar aquí, no desde un effect.
    const giroscopio = this.giroscopio;
    this.arrancandoGiroscopio = true;
    try {
      await giroscopio.start();
      // Algunos navegadores anuncian soporte y conceden permiso aunque no haya un sensor real.
      const hayDatos = await this.sensorEnviaDatos();
      if (!hayDatos) {
        giroscopio.stop();
      }
      this.giroscopioElegido.set(hayDatos);
      return hayDatos;
    } catch {
      return false;
    } finally {
      this.arrancandoGiroscopio = false;
    }
  }

  irAEscena(id: string): void {
    this.viewer
      ?.getPlugin<VirtualTourPlugin>(VirtualTourPlugin)
      .setCurrentNode(id)
      .catch((error: unknown) => console.error(`No se pudo abrir la escena "${id}"`, error));
  }

  private crearVisor(): void {
    // En calibración la imagen debe quedarse quieta; en pantallas sin tacto no hay giroscopio que ofrecer.
    const conGiroscopio = !this.calibrando && matchMedia('(pointer: coarse)').matches;
    const viewer = new Viewer({
      container: this.lienzo().nativeElement,
      navbar: false,
      defaultZoomLvl: matchMedia('(orientation: portrait)').matches
        ? ZOOM_VERTICAL
        : ZOOM_HORIZONTAL,
      loadingTxt: 'Cargando…',
      lang: {
        loading: 'Cargando…',
        loadError: 'No se pudo cargar esta escena',
        webglError: 'Tu navegador no parece ser compatible con WebGL'
      },
      plugins: [
        MarkersPlugin,
        VirtualTourPlugin.withConfig({
          dataMode: 'client',
          positionMode: 'manual',
          renderMode: '2d',
          showLinkTooltip: false,
          arrowStyle: {
            element: (enlace) => this.crearFlecha(enlace.data.etiqueta),
            size: { width: 52, height: 52 }
          },
          preload: true,
          nodes: this.escenas().map((escena) => this.escenaANodo(escena)),
          startNodeId: this.escenaInicial(),
          transitionOptions: (nodo) => ({
            showLoader: true,
            effect: 'fade',
            speed: DURACION_TRANSICION_MS,
            rotation: false,
            rotateTo: nodo.data.vistaInicial
          })
        }),
        // En calibración la imagen debe quedarse quieta para poder apuntar con precisión.
        ...(this.calibrando
          ? []
          : [
              AutorotatePlugin.withConfig({
                autostartDelay: this.retrasoAutorotacion(this.pausado()),
                autostartOnIdle: true,
                autorotateSpeed: '0.5rpm'
              })
            ]),
        // El arrastre lo resuelven reanudarGiroscopio y sus escuchas, no el plugin.
        ...(conGiroscopio ? [GyroscopePlugin.withConfig({ touchmove: false })] : [])
      ]
    });
    this.viewer = viewer;

    if (!this.calibrando) {
      this.autorotacion = viewer.getPlugin<AutorotatePlugin>(AutorotatePlugin);
    }

    if (conGiroscopio) {
      this.prepararGiroscopio(viewer);
    }

    viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin).addEventListener('node-changed', ({ node }) => {
      this.escenaCambio.emit(node.id);
      this.reanudarGiroscopio();
    });

    viewer
      .getPlugin<MarkersPlugin>(MarkersPlugin)
      .addEventListener('select-marker', ({ marker }) =>
        this.puntoSeleccionado.emit(marker.data as PuntoInfo)
      );

    if (this.calibrando) {
      viewer.addEventListener('click', ({ data }) => {
        const texto = `"yaw": ${data.yaw.toFixed(3)}, "pitch": ${data.pitch.toFixed(3)}`;
        this.coordenadas.set(texto);
        console.log(texto);
      });
    }
  }

  private prepararGiroscopio(viewer: Viewer): void {
    const giroscopio = viewer.getPlugin<GyroscopePlugin>(GyroscopePlugin);
    this.giroscopio = giroscopio;

    giroscopio
      .isSupported()
      .then((soportado) => this.giroscopioSoportado.set(soportado))
      .catch(() => this.giroscopioSoportado.set(false));

    // El visor apaga el plugin al arrastrar; se reanuda al soltar, desde donde quedó la vista.
    const { signal: senal } = this.escuchasGlobales;
    for (const evento of ['pointerup', 'pointercancel', 'touchend', 'touchcancel']) {
      window.addEventListener(evento, () => this.reanudarGiroscopio(), {
        capture: true,
        signal: senal
      });
    }
  }

  private sensorEnviaDatos(): Promise<boolean> {
    // El navegador solo avisa cuando la lectura cambia: con el celular quieto, reactivar no traería datos.
    if (this.sensorConfirmado) {
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const escucha = new AbortController();
      const terminar = (hayDatos: boolean) => {
        escucha.abort();
        clearTimeout(limite);
        this.sensorConfirmado = hayDatos;
        resolve(hayDatos);
      };
      const limite = setTimeout(() => terminar(false), ESPERA_SENSOR_MS);
      window.addEventListener(
        'deviceorientation',
        (evento) => {
          if (evento.alpha !== null) {
            terminar(true);
          }
        },
        { signal: escucha.signal }
      );
    });
  }

  private sincronizarGiroscopio(): void {
    if (this.giroscopioElegido() && !this.pausado()) {
      this.reanudarGiroscopio();
    } else {
      this.giroscopio?.stop();
    }
  }

  /** Vuelve a encender el plugin si la persona lo eligió y nada lo impide en este momento. */
  private reanudarGiroscopio(): void {
    const { giroscopio, viewer } = this;
    if (
      !giroscopio ||
      !viewer ||
      this.arrancandoGiroscopio ||
      giroscopio.isEnabled() ||
      !this.giroscopioElegido() ||
      this.pausado() ||
      // Durante una transición de escena el visor debe poder llevar la vista a su posición inicial.
      // Los tipos del visor no lo indican, pero esta promesa es null cuando no hay ninguna en curso.
      viewer.state.loadingPromise !== null
    ) {
      return;
    }

    this.arrancandoGiroscopio = true;
    giroscopio
      .start()
      .catch(() => this.giroscopioElegido.set(false))
      .finally(() => {
        this.arrancandoGiroscopio = false;
      });
  }

  private escenaANodo(escena: Escena): VirtualTourNode {
    return {
      id: escena.id,
      name: escena.nombre,
      panorama: escena.panorama,
      data: { vistaInicial: escena.vistaInicial },
      links: escena.enlaces.map(({ escenaId, yaw, pitch, etiqueta }) => ({
        nodeId: escenaId,
        position: { yaw, pitch },
        data: { etiqueta: etiqueta ?? etiquetaDestino(this.nombreDeEscena(escenaId)) }
      })),
      markers: escena.puntos.map((punto) => ({
        id: punto.id,
        position: { yaw: punto.yaw, pitch: punto.pitch },
        html: '<span class="tv-punto" aria-hidden="true">i</span>',
        size: { width: 44, height: 44 },
        anchor: 'center center',
        tooltip: punto.titulo,
        data: punto
      }))
    };
  }

  private nombreDeEscena(id: string): string {
    return this.escenas().find((escena) => escena.id === id)?.nombre ?? id;
  }

  private crearFlecha(etiqueta: string): HTMLElement {
    const flecha = document.createElement('button');
    flecha.type = 'button';
    flecha.className = 'tv-enlace';
    flecha.innerHTML = ICONO_FLECHA;

    const nombre = document.createElement('span');
    nombre.className = 'tv-enlace-nombre';
    nombre.textContent = etiqueta;
    flecha.append(nombre);

    return flecha;
  }

  private aplicarPausa(pausado: boolean): void {
    if (!this.autorotacion) {
      return;
    }
    this.autorotacion.setOption('autostartDelay', this.retrasoAutorotacion(pausado));
    if (pausado) {
      this.autorotacion.stop();
    } else if (this.viewer) {
      // Reinicia la espera para que la rotación no arranque en cuanto se cierra la ficha.
      this.viewer.state.idleTime = performance.now();
    }
  }

  private retrasoAutorotacion(pausado: boolean): number {
    return pausado ? RETRASO_AUTOROTACION_PAUSADA_MS : RETRASO_AUTOROTACION_MS;
  }
}
