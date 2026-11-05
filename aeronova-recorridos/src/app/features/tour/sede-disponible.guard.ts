import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TourService } from '../../core/services/tour.service';

/** Solo deja entrar a sedes que existen, están disponibles y tienen escenas. */
export const sedeDisponibleGuard: CanActivateFn = async (ruta) => {
  const tourService = inject(TourService);
  const router = inject(Router);

  await tourService.cargar();
  const sede = tourService.sedePorId(ruta.paramMap.get('sedeId') ?? '');

  return sede?.disponible && sede.escenas.length > 0 ? true : router.createUrlTree(['/']);
};
