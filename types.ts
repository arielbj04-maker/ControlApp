export enum MachineType {
  METEGOL = 'Metegol',
  PINBALL = 'Pinball',
  VOLANTE = 'Juego de Volante'
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string; // Localidad
  contactName: string;
  phoneNumber?: string; // Nuevo campo
  // Precios diferenciados por tipo en el cliente
  priceMetegol?: number; 
  pricePinball?: number;
  priceVolante?: number;
  isActive: boolean; // Estado del cliente
}

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  locationId: string;
  tokenPrice?: number; // Precio personalizado para esta máquina específica (sobrescribe todo)
}

export interface Collection {
  id: string;
  machineId: string;
  locationId: string;
  date: string; // ISO string
  tokenCount: number;
  totalAmount: number;
  myShare: number;
  localShare: number;
  appliedTokenPrice: number; // Guardamos a qué precio se cobró
}

export interface RevenueStats {
  totalRevenue: number;
  myTotalShare: number;
  localTotalShare: number;
  totalTokens: number;
}