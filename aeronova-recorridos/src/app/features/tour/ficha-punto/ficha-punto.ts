import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';

import { PuntoInfo } from '../../../core/models/tour.model';

/** Veces que la imagen de la escena es más ancha que la cabecera; define cuánto se acerca el recorte. */
const AMPLIACION_RECORTE = 6;
const PROPORCION_CABECERA = 16 / 9;

@Component({
  selector: 'app-ficha-punto',
  templateUrl: './ficha-punto.html',
  styleUrl: './ficha-punto.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'cerrar.emit()' }
})
export class FichaPunto {
  readonly punto = input.required<PuntoInfo>();
  /** Panorama de la escena actual: da la cabecera cuando el punto no tiene foto o esta no carga. */
  readonly imagenEscena = input<string>();

  readonly cerrar = output<void>();

  private readonly botonCerrar = viewChild.required<ElementRef<HTMLButtonElement>>('botonCerrar');
  private readonly imagenFallida = signal<string | null>(null);

  protected readonly imagen = computed(() => {
    const imagen = this.punto().imagen;
    return imagen && imagen !== this.imagenFallida() ? imagen : null;
  });

  /** Recorte del panorama centrado en el punto. */
  protected readonly cabecera = computed(() => {
    const imagenEscena = this.imagenEscena();
    if (!imagenEscena) {
      return null;
    }
    const { yaw, pitch } = this.punto();
    // Posición del punto dentro de una imagen equirectangular, de 0 a 1.
    const x = yaw / (2 * Math.PI) + 0.5;
    const y = 0.5 - pitch / Math.PI;
    // Ancho y alto de la imagen, tomando como unidad el ancho de la cabecera.
    const altoCabecera = 1 / PROPORCION_CABECERA;
    const altoImagen = AMPLIACION_RECORTE / 2;

    return {
      imagen: `url(${imagenEscena})`,
      tamano: `${AMPLIACION_RECORTE * 100}% auto`,
      posicion: `${this.posicionCentrada(x, AMPLIACION_RECORTE, 1)}% ${this.posicionCentrada(y, altoImagen, altoCabecera)}%`
    };
  });

  constructor() {
    // preventScroll: el panel entra animado desde fuera de la pantalla.
    afterNextRender(() => this.botonCerrar().nativeElement.focus({ preventScroll: true }));
  }

  protected marcarImagenFallida(imagen: string): void {
    this.imagenFallida.set(imagen);
  }

  /** Porcentaje de `background-position` que deja `fraccion` de la imagen en el centro del recuadro. */
  private posicionCentrada(fraccion: number, imagen: number, recuadro: number): number {
    return ((fraccion * imagen - recuadro / 2) / (imagen - recuadro)) * 100;
  }
}
