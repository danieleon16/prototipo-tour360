import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Escena } from '../../../core/models/tour.model';

@Component({
  selector: 'app-miniaturas-escenas',
  templateUrl: './miniaturas-escenas.html',
  styleUrl: './miniaturas-escenas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MiniaturasEscenas {
  readonly escenas = input.required<Escena[]>();
  readonly escenaActualId = input.required<string>();

  readonly seleccion = output<string>();
}
