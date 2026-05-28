export enum EstadoChofer {
  DISPONIBLE = 'disponible',
  CARGANDO = 'cargando',
  VIAJANDO = 'viajando',
  DESCANSANDO = 'descansando',
  DESCARGANDO = 'descargando',
  ENTREGA_FINALIZADA = 'entrega_finalizada',
  LICENCIA_ANUAL = 'licencia_anual',
  FRANCO = 'franco',
  EQUIPO_EN_REPARACION = 'equipo_en_reparacion',
  INACTIVO = 'inactivo',
}

export interface EstadoConfig {
  label: string;
  emoji: string;
  color: string;
  backgroundColor: string;
  requiresDates?: boolean;
  requiresToneladas?: boolean;
}

export enum EstadoTractor {
  OCUPADO = 'ocupado',
  EN_REPARACION = 'en_reparacion',
  LIBRE = 'libre',
}

export enum EstadoBatea {
  CARGADO = 'cargado',
  VACIO = 'vacio',
  EN_REPARACION = 'en_reparacion',
}

export interface Chofer {
  id_chofer: string;
  nombre_completo: string;
  cuil?: string | number;
  tractor_id?: string;
  batea_id?: string;
  estado_chofer: EstadoChofer;
  razon_estado?: string;
  transportista?: string;
  creado_en?: string;
  ultimo_estado_en: string;
  tractor?: Tractor;
  batea?: Batea;
}

export interface Tractor {
  tractor_id: string;
  marca: string;
  modelo: string;
  patente: string;
  seguro?: string;
  transportista?: string;
  estado_tractor: EstadoTractor;
  carga_max_tractor: number;
  chofer_id?: string;
  batea_id?: string;
  chofer?: Chofer;
  batea?: Batea;
  creado_en?: string;
  actualizado_en?: string;
}

export interface Batea {
  batea_id: string;
  marca: string;
  modelo: string;
  patente: string;
  seguro?: string;
  transportista?: string;
  estado: EstadoBatea;
  carga_max_batea: number;
  chofer_id?: string;
  tractor_id?: string;
  chofer?: Chofer;
  tractor?: Tractor;
  tractores?: Tractor[];
  creado_en?: string;
  actualizado_en?: string;
}

export enum EstadoViaje {
  EN_CURSO = 'en_curso',
  FINALIZADO = 'finalizado',
  EN_RECLAMO = 'en_reclamo',
}

export interface Viaje {
  id_viaje: number; // ← Cambiado de viaje_id a id_viaje (como lo envía el backend)
  chofer_id: string;
  tractor_id: string;
  batea_id: string;
  origen: string;
  destino: string;
  fecha_salida: string;
  fecha_descarga?: string;
  numero_remito: string;
  toneladas_cargadas: number;
  toneladas_descargadas?: number;
  horas_descansadas?: number; // Horas acumuladas de descanso durante el viaje
  estado_viaje: EstadoViaje;
  chofer?: Chofer;
  tractor?: Tractor;
  batea?: Batea;
  creado_en?: string;
  actualizado_en?: string;
}