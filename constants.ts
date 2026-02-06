import { MachineType } from './types';

export const TOKEN_PRICE = 300; // Pesos Argentinos (Precio Base Global Actualizado)

export const REVENUE_SHARE = {
  [MachineType.METEGOL]: {
    me: 0.50,
    local: 0.50
  },
  [MachineType.PINBALL]: {
    me: 0.60, // Asumimos 60/40 para juegos electrónicos, ajustable si es necesario
    local: 0.40
  },
  [MachineType.VOLANTE]: {
    me: 0.60,
    local: 0.40
  }
};

export const MOCK_LOCATIONS = [
  { 
    id: '1', 
    name: 'Kiosco El Pepe', 
    address: 'Av. Siempre Viva 123', 
    city: 'San Justo',
    contactName: 'Pepe', 
    phoneNumber: '11-1234-5678',
    isActive: true 
  }, 
  { 
    id: '2', 
    name: 'Canchas La 10', 
    address: 'Calle Falsa 123', 
    city: 'Ramos Mejía',
    contactName: 'Juan', 
    phoneNumber: '11-8765-4321',
    priceMetegol: 500, 
    priceVolante: 400,
    isActive: true 
  }, 
  { 
    id: '3', 
    name: 'Club Social', 
    address: 'Mitre 400', 
    city: 'Haedo',
    contactName: 'Maria', 
    isActive: true 
  },
];

export const MOCK_MACHINES = [
  { id: 'm1', name: MachineType.METEGOL, type: MachineType.METEGOL, locationId: '1' },
  { id: 'm2', name: MachineType.PINBALL, type: MachineType.PINBALL, locationId: '1' },
  { id: 'm3', name: MachineType.METEGOL, type: MachineType.METEGOL, locationId: '2' },
  { id: 'm4', name: MachineType.VOLANTE, type: MachineType.VOLANTE, locationId: '3', tokenPrice: 600 }, 
];