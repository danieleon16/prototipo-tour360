import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { whatsappUrl } from '../../core/config';
import { PuntoInfo } from '../../core/models/tour.model';
import { TourService } from '../../core/services/tour.service';
import { FichaPunto } from './ficha-punto/ficha-punto';
import { MiniaturasEscenas } from './miniaturas-escenas/miniaturas-escenas';
import { TourViewer } from './tour-viewer/tour-viewer';

const DURACION_INDICACION_MS = 3000;

@Component({
  selector: 'app-tour-page',
  imports: [RouterLink, TourViewer, MiniaturasEscenas, FichaPunto],
  templateUrl: './tour-page.html',
  styleUrl: './tour-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TourPage implements OnDestroy {
  private readonly tourService = inject(TourService);
  private readonly visor = viewChild(TourViewer);
  private readonly temporizadorIndicacion = setTimeout(
    () => this.ocultarIndicacion(),
    DURACION_INDICACION_MS
  );

  /** Parámetro de la ruta. El guard garantiza que la sede existe y está disponible. */
  readonly sedeId = input.required<string>();

  protected readonly whatsappUrl = whatsappUrl;
  protected readonly sede = computed(() => this.tourService.sedePorId(this.sedeId()));
  protected readonly escenaActualId = linkedSignal(() => this.sede()?.escenaInicial ?? '');
  protected readonly escenaActual = computed(() =>
    this.tourService.escenaPorId(this.sedeId(), this.escenaActualId())
  );
  protected readonly punto = signal<PuntoInfo | null>(null);
  protected readonly indicacionVisible = signal(true);

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorIndicacion);
  }

  protected irAEscena(id: string): void {
    this.visor()?.irAEscena(id);
  }

  protected ocultarIndicacion(): void {
    this.indicacionVisible.set(false);
  }
}
