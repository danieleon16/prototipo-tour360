/** Todos los valores de yaw y pitch están en radianes. */

export interface Tour {
  sedes: Sede[];
}

export interface Sede {
  id: string;
  nombre: string;
  ubicacion: string;
  descripcion: string;
  portada: string;
  disponible: boolean;
  escenaInicial: string;
  escenas: Escena[];
}

export interface Escena {
  id: string;
  nombre: string;
  panorama: string;
  miniatura: string;
  vistaInicial: VistaInicial;
  enlaces: Enlace[];
  puntos: PuntoInfo[];
}

export interface VistaInicial {
  yaw: number;
  pitch: number;
}

export interface Enlace {
  escenaId: string;
  yaw: number;
  pitch: number;
  /** Texto de la flecha. Si falta, se arma con el nombre de la escena: "Ir al Taller". */
  etiqueta?: string;
}

export interface PuntoInfo {
  id: string;
  titulo: string;
  yaw: number;
  pitch: number;
  texto: string;
  imagen?: string;
}
