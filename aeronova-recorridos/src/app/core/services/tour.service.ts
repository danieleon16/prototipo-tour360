import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Escena, Sede, Tour } from '../models/tour.model';

@Injectable({ providedIn: 'root' })
export class TourService {
  private readonly http = inject(HttpClient);
  private readonly tourActual = signal<Tour | null>(null);
  private readonly fallo = signal(false);
  private carga?: Promise<Tour | null>;

  readonly tour = this.tourActual.asReadonly();
  readonly error = this.fallo.asReadonly();
  readonly sedes = computed(() => this.tourActual()?.sedes ?? []);

  /** Carga tour.json una sola vez. Si falla, expone `error` y permite reintentar. */
  cargar(): Promise<Tour | null> {
    this.carga ??= firstValueFrom(this.http.get<Tour>('tour/tour.json')).then(
      (tour) => {
        this.tourActual.set(tour);
        this.fallo.set(false);
        return tour;
      },
      (error: unknown) => {
        console.error('No se pudo cargar tour.json', error);
        this.fallo.set(true);
        this.carga = undefined;
        return null;
      }
    );
    return this.carga;
  }

  sedePorId(id: string): Sede | undefined {
    return this.sedes().find((sede) => sede.id === id);
  }

  escenaPorId(sedeId: string, escenaId: string): Escena | undefined {
    return this.sedePorId(sedeId)?.escenas.find((escena) => escena.id === escenaId);
  }
}
