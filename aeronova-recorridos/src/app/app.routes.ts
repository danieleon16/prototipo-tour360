import { Routes } from '@angular/router';

import { sedeDisponibleGuard } from './features/tour/sede-disponible.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/portal/portal').then((m) => m.Portal)
  },
  {
    path: 'tour/:sedeId',
    canActivate: [sedeDisponibleGuard],
    loadComponent: () => import('./features/tour/tour-page').then((m) => m.TourPage)
  },
  { path: '**', redirectTo: '' }
];
