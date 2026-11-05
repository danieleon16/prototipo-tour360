import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { whatsappUrl } from '../../core/config';
import { TourService } from '../../core/services/tour.service';

@Component({
  selector: 'app-portal',
  imports: [RouterLink],
  templateUrl: './portal.html',
  styleUrl: './portal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Portal {
  private readonly tourService = inject(TourService);

  protected readonly whatsappUrl = whatsappUrl;
  protected readonly sedes = this.tourService.sedes;
  protected readonly errorDeCarga = this.tourService.error;
  protected readonly sedeDestacada = computed(() => this.sedes().find((sede) => sede.disponible));
  protected readonly pasos = [
    'Conoce la academia',
    'Agenda tu cita',
    'Pruebas médicas y psicotécnicas',
    'Matrícula'
  ];

  constructor() {
    void this.tourService.cargar();
  }

  protected fondo(imagen: string | undefined): string | null {
    return imagen ? `url(${imagen})` : null;
  }
}
