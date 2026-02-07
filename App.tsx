import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calculator, 
  LayoutDashboard, 
  History, 
  Coins, 
  TrendingUp, 
  Store, 
  Gamepad2, 
  Plus, 
  Save, 
  Trash2,
  Users,
  MapPin, 
  Joystick,
  DollarSign,
  Pencil,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Map,
  Search,
  ArrowLeft,
  Check,
  Filter,
  Share2,
  X,
  Copy,
  Phone,
  LayoutList,
  MessageCircle,
  Calendar,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { Location, Machine, MachineType, Collection } from './types';
import { TOKEN_PRICE, REVENUE_SHARE } from './constants';
import { StatCard } from './components/StatCard';
import { 
  subscribeToLocations, 
  addLocation, 
  updateLocation, 
  deleteLocation,
  subscribeToMachines,
  addMachine, 
  deleteMachine,
  subscribeToCollections,
  addCollection,
  deleteCollectionDoc
} from './services/db';

// -- Helper for Currency Formatting --
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(value);
};

// -- Main App Component --
const App: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calculator' | 'history' | 'clients' | 'machines'>('dashboard');
  
  // Data State (Managed by Firebase)
  const [locations, setLocations] = useState<Location[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  
  // -- Firebase Subscriptions --
  useEffect(() => {
    const unsubLocations = subscribeToLocations(setLocations);
    const unsubMachines = subscribeToMachines(setMachines);
    const unsubCollections = subscribeToCollections(setCollections);

    return () => {
      unsubLocations();
      unsubMachines();
      unsubCollections();
    };
  }, []);
  
  // Calculator State (Redesigned)
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({}); // machineId -> string (tokens)
  const [bulkCalcResult, setBulkCalcResult] = useState<{
    collections: Omit<Collection, 'id'>[]; // Temporary result doesn't have ID yet
    totalMyShare: number;
    totalTokens: number;
  } | null>(null);
  
  // Voucher Modal State
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // Client State
  const [newClient, setNewClient] = useState<{
    name: string;
    address: string;
    city: string;
    contactName: string;
    phoneNumber: string;
    priceMetegol: string;
    pricePinball: string;
    priceVolante: string;
    isActive: boolean;
  }>({ name: '', address: '', city: '', contactName: '', phoneNumber: '', priceMetegol: '', pricePinball: '', priceVolante: '', isActive: true });
  
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  
  // Client Filters & View Options
  const [showInactiveClients, setShowInactiveClients] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false); // Toggle for extra columns
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterMachineType, setFilterMachineType] = useState<string>('');

  // History Filters
  const [historyFilterClient, setHistoryFilterClient] = useState<string>('');

  // Machine State
  const [newMachine, setNewMachine] = useState({ type: MachineType.METEGOL, locationId: '', tokenPrice: '' });

  // -- Derived Data --
  const stats = useMemo(() => {
    return collections.reduce((acc, curr) => ({
      totalRevenue: acc.totalRevenue + curr.totalAmount,
      myTotalShare: acc.myTotalShare + curr.myShare,
      localTotalShare: acc.localTotalShare + curr.localShare,
      totalTokens: acc.totalTokens + curr.tokenCount
    }), { totalRevenue: 0, myTotalShare: 0, localTotalShare: 0, totalTokens: 0 });
  }, [collections]);

  const activeLocations = useMemo(() => locations.filter(l => l.isActive), [locations]);

  // Dashboard Period Stats Logic
  const dashboardStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of week (Sunday)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const createStatBucket = () => ({
        total: 0,
        byType: {
            [MachineType.METEGOL]: 0,
            [MachineType.PINBALL]: 0,
            [MachineType.VOLANTE]: 0,
        } as Record<MachineType, number>
    });

    const data = {
        day: createStatBucket(),
        week: createStatBucket(),
        month: createStatBucket()
    };

    collections.forEach(c => {
        const cDate = new Date(c.date);
        const machine = machines.find(m => m.id === c.machineId);
        const type = machine?.type || MachineType.METEGOL;

        // Check Month
        if (cDate >= monthStart) {
            data.month.total += c.myShare;
            data.month.byType[type] = (data.month.byType[type] || 0) + c.myShare;
        }

        // Check Week
        if (cDate >= weekStart) {
            data.week.total += c.myShare;
            data.week.byType[type] = (data.week.byType[type] || 0) + c.myShare;
        }

        // Check Day
        if (cDate >= todayStart) {
            data.day.total += c.myShare;
            data.day.byType[type] = (data.day.byType[type] || 0) + c.myShare;
        }
    });

    return data;
  }, [collections, machines]);

  // Moved uniqueCities calculation here to respect React Hook rules (Hooks must be at top level)
  const uniqueCities = useMemo(() => {
      return Array.from(new Set(locations.map(l => l.city).filter(Boolean)));
  }, [locations]);

  // -- Helpers --
  
  const getEffectiveTokenPrice = (machineId: string): { price: number, source: 'Global' | 'Cliente (Tipo)' | 'Máquina' } => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return { price: TOKEN_PRICE, source: 'Global' };

    // 1. Prioridad: Precio específico de la máquina
    if (machine.tokenPrice && machine.tokenPrice > 0) {
        return { price: machine.tokenPrice, source: 'Máquina' };
    }

    const location = locations.find(l => l.id === machine.locationId);
    if (location) {
        // 2. Prioridad: Precio del cliente según el tipo de máquina
        // Use unknown type assertion to ensure type guard works correctly against any inferred 'unknown' types
        const pMetegol: unknown = location.priceMetegol;
        if (machine.type === MachineType.METEGOL && typeof pMetegol === 'number' && pMetegol > 0) {
            return { price: pMetegol, source: 'Cliente (Tipo)' };
        }
        
        const pPinball: unknown = location.pricePinball;
        if (machine.type === MachineType.PINBALL && typeof pPinball === 'number' && pPinball > 0) {
            return { price: pPinball, source: 'Cliente (Tipo)' };
        }
        
        const pVolante: unknown = location.priceVolante;
        if (machine.type === MachineType.VOLANTE && typeof pVolante === 'number' && pVolante > 0) {
            return { price: pVolante, source: 'Cliente (Tipo)' };
        }
    }

    // 3. Fallback: Precio Global
    return { price: TOKEN_PRICE, source: 'Global' };
  };

  const getMachineTypeColor = (type: MachineType) => {
    switch (type) {
      case MachineType.METEGOL: return 'bg-orange-100 text-orange-800';
      case MachineType.PINBALL: return 'bg-pink-100 text-pink-800';
      case MachineType.VOLANTE: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateVoucherText = (locationName: string) => {
    if (!bulkCalcResult) return '';
    
    let text = `🧾 *COMPROBANTE DE RECAUDACIÓN*\n`;
    text += `📍 Cliente: ${locationName}\n`;
    text += `📅 Fecha: ${new Date().toLocaleDateString()}\n\n`;
    text += `*DETALLE POR MÁQUINA:*\n`;
    
    bulkCalcResult.collections.forEach(c => {
        const m = machines.find(mach => mach.id === c.machineId);
        if (m) {
            const split = REVENUE_SHARE[m.type];
            text += `🔸 *${m.type}* (${c.tokenCount} fichas)\n`;
            text += `   Total: ${formatCurrency(c.totalAmount)}\n`;
            text += `   └ Local (${split.local * 100}%): ${formatCurrency(c.localShare)}\n`;
            text += `   └ Mí (${split.me * 100}%): ${formatCurrency(c.myShare)}\n\n`;
        }
    });
    
    const totalLocalShare = bulkCalcResult.collections.reduce((acc, curr) => acc + curr.localShare, 0);

    text += `--------------------------------\n`;
    text += `💰 *TOTAL CAJA: ${formatCurrency(bulkCalcResult.collections.reduce((acc, c) => acc + c.totalAmount, 0))}*\n`;
    text += `🏠 *SU PARTE (Local): ${formatCurrency(totalLocalShare)}*\n`;
    text += `--------------------------------\n`;
    text += `👉 *A ABONAR (ArcadeRent): ${formatCurrency(bulkCalcResult.totalMyShare)}*\n`;
    
    return text;
  };

  const copyVoucherToClipboard = (locationName: string) => {
    const text = generateVoucherText(locationName);
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        alert("¡Comprobante copiado! Pégalo en WhatsApp.");
    });
  };

  const shareToWhatsApp = (loc: Location) => {
    const text = generateVoucherText(loc.name);
    if (!text) return;
    
    if (!loc.phoneNumber) {
        alert("El cliente no tiene número de teléfono registrado.");
        return;
    }

    // Sanitize number (remove spaces, dashes)
    let phone = loc.phoneNumber.replace(/\D/g, '');
    
    // Quick fix for Argentina: if it's a 10 digit number (e.g. 11 1234 5678), prepend 549
    if (phone.length === 10) {
        phone = '549' + phone;
    }

    // Use api.whatsapp.com instead of wa.me to ensure better encoding handling across devices
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // -- Handlers --

  const handleBulkCalculate = () => {
    if (!selectedLocationId) return;
    
    const locationMachines = machines.filter(m => m.locationId === selectedLocationId);
    const newCollections: Omit<Collection, 'id'>[] = [];
    let totalShare = 0;
    let totalToks = 0;

    locationMachines.forEach(machine => {
        const inputVal = tokenInputs[machine.id];
        if (inputVal && parseInt(inputVal) > 0) {
            const tokens = parseInt(inputVal);
            const { price } = getEffectiveTokenPrice(machine.id);
            const total = tokens * price;
            const split = REVENUE_SHARE[machine.type];
            
            const col: Omit<Collection, 'id'> = {
                machineId: machine.id,
                locationId: selectedLocationId,
                date: new Date().toISOString(),
                tokenCount: tokens,
                totalAmount: total,
                myShare: total * split.me,
                localShare: total * split.local,
                appliedTokenPrice: price
            };
            newCollections.push(col);
            totalShare += col.myShare;
            totalToks += tokens;
        }
    });

    if (newCollections.length > 0) {
        setBulkCalcResult({
            collections: newCollections,
            totalMyShare: totalShare,
            totalTokens: totalToks
        });
    } else {
        alert("Ingresa fichas en al menos una máquina.");
    }
  };

  const handleSaveBulkCollection = async () => {
    if (bulkCalcResult) {
      try {
          // Save all collections to Firebase
          await Promise.all(bulkCalcResult.collections.map(col => addCollection(col)));
          
          setBulkCalcResult(null);
          setShowVoucherModal(false);
          setTokenInputs({});
          setSelectedLocationId(null);
          setClientSearchTerm('');
          alert('Recaudación guardada exitosamente.');
          setActiveTab('dashboard');
      } catch (error) {
          console.error("Error saving collection:", error);
          alert("Error al guardar. Verifica tu conexión.");
      }
    }
  };

  const resetCalculator = () => {
      setSelectedLocationId(null);
      setTokenInputs({});
      setBulkCalcResult(null);
      setShowVoucherModal(false);
  };

  const deleteCollection = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!id) {
        alert("Error: ID de registro inválido");
        return;
    }

    if(window.confirm('¿Estás seguro de que quieres eliminar este registro permanentemente?')) {
        try {
            await deleteCollectionDoc(id);
        } catch (error: any) {
            console.error("Error eliminando registro:", error);
            if (error.code === 'permission-denied' || error.message.includes('permission')) {
                alert("⚠️ ERROR DE PERMISOS EN FIREBASE\n\nTu base de datos está bloqueada. Para solucionarlo:\n1. Ve a console.firebase.google.com\n2. Entra a tu proyecto -> Firestore Database -> Reglas\n3. Cambia las reglas para permitir lectura y escritura:\n\nallow read, write: if true;");
            } else {
                alert(`No se pudo eliminar: ${error.message || "Error desconocido"}`);
            }
        }
    }
  };

  // -- Client Handlers --

  const handleSaveClient = async () => {
    if (!newClient.name || !newClient.address || !newClient.city) {
        alert("Por favor complete nombre, dirección y localidad");
        return;
    }

    try {
        // Construct the object conditionally to avoid 'undefined' values which Firestore rejects
        const clientData = {
            name: newClient.name,
            address: newClient.address,
            city: newClient.city,
            contactName: newClient.contactName,
            phoneNumber: newClient.phoneNumber,
            isActive: newClient.isActive,
            // Only add these fields if they have a value (not empty string)
            ...(newClient.priceMetegol ? { priceMetegol: parseFloat(newClient.priceMetegol) } : {}),
            ...(newClient.pricePinball ? { pricePinball: parseFloat(newClient.pricePinball) } : {}),
            ...(newClient.priceVolante ? { priceVolante: parseFloat(newClient.priceVolante) } : {}),
        };

        if (editingClientId) {
          await updateLocation(editingClientId, clientData);
          setEditingClientId(null);
          alert('Cliente actualizado exitosamente.');
        } else {
          await addLocation(clientData);
          alert('Cliente agregado exitosamente.');
        }
        
        setNewClient({ name: '', address: '', city: '', contactName: '', phoneNumber: '', priceMetegol: '', pricePinball: '', priceVolante: '', isActive: true });
    } catch (error) {
        console.error("Error saving client:", error);
        alert("Hubo un error al guardar el cliente.");
    }
  };

  const handleEditClient = (client: Location) => {
    setNewClient({
      name: client.name,
      address: client.address,
      city: client.city || '',
      contactName: client.contactName,
      phoneNumber: client.phoneNumber || '',
      priceMetegol: client.priceMetegol?.toString() || '',
      pricePinball: client.pricePinball?.toString() || '',
      priceVolante: client.priceVolante?.toString() || '',
      isActive: client.isActive
    });
    setEditingClientId(client.id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form
  };

  const handleCancelEdit = () => {
    setEditingClientId(null);
    setNewClient({ name: '', address: '', city: '', contactName: '', phoneNumber: '', priceMetegol: '', pricePinball: '', priceVolante: '', isActive: true });
  };

  const handleDeleteClient = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    if (!id) return;
    
    if (window.confirm('¿Estás seguro de eliminar este cliente? Se mantendrá el historial pero no podrás seleccionarlo para nuevos ingresos.')) {
        try {
            await deleteLocation(id);
        } catch (error: any) {
            console.error("Error eliminando cliente:", error);
            if (error.code === 'permission-denied' || error.message.includes('permission')) {
                alert("⚠️ ERROR DE PERMISOS EN FIREBASE\n\nTu base de datos está bloqueada. Para solucionarlo:\n1. Ve a console.firebase.google.com\n2. Entra a tu proyecto -> Firestore Database -> Reglas\n3. Cambia las reglas para permitir lectura y escritura:\n\nallow read, write: if true;");
            } else {
                alert(`No se pudo eliminar el cliente: ${error.message || "Error desconocido"}`);
            }
        }
    }
  };

  // -- Machine Handlers --

  const handleAddMachine = async () => {
      if (!newMachine.locationId) {
          alert("Por favor selecciona un local.");
          return;
      }
      try {
          const mach = {
              name: newMachine.type, // Name is now the type automatically
              type: newMachine.type as MachineType,
              locationId: newMachine.locationId,
              // Only add tokenPrice if it has a value
              ...(newMachine.tokenPrice ? { tokenPrice: parseFloat(newMachine.tokenPrice) } : {})
          };
          await addMachine(mach);
          setNewMachine({ type: MachineType.METEGOL, locationId: '', tokenPrice: '' });
          alert('Máquina agregada exitosamente.');
      } catch (error) {
          alert("Error al agregar máquina.");
          console.error(error);
      }
  };

  const handleDeleteMachine = async (id: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }

      if (confirm('¿Eliminar esta máquina?')) {
          try {
              await deleteMachine(id);
          } catch(error: any) {
              if (error.code === 'permission-denied' || error.message.includes('permission')) {
                alert("⚠️ ERROR DE PERMISOS\n\nRevisa las reglas de Firestore en tu consola de Firebase.");
              } else {
                alert("Error al eliminar máquina");
              }
          }
      }
  };

  // -- Render Pages --

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Cards - Simplified, removed Local Share */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Mi Ganancia Total (Histórica)" 
          value={formatCurrency(stats.myTotalShare)} 
          icon={TrendingUp} 
          color="emerald" 
        />
        <StatCard 
          title="Fichas Recolectadas" 
          value={stats.totalTokens.toString()} 
          icon={Coins} 
          color="yellow" 
        />
        <StatCard 
          title="Clientes Activos" 
          value={activeLocations.length.toString()} 
          icon={Store} 
          color="blue" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Day Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Calendar size={20} />
                </div>
                <span className="font-semibold text-gray-600">Hoy</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-4">{formatCurrency(dashboardStats.day.total)}</p>
            <div className="space-y-2">
                {Object.entries(dashboardStats.day.byType).map(([type, amount]) => (
                    amount > 0 && (
                        <div key={type} className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">{type}</span>
                            <span className="font-medium text-gray-800">{formatCurrency(amount)}</span>
                        </div>
                    )
                ))}
                {dashboardStats.day.total === 0 && <p className="text-xs text-gray-400 italic">Sin actividad hoy</p>}
            </div>
        </div>

        {/* Week Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <CalendarDays size={20} />
                </div>
                <span className="font-semibold text-gray-600">Esta Semana</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-4">{formatCurrency(dashboardStats.week.total)}</p>
            <div className="space-y-2">
                {Object.entries(dashboardStats.week.byType).map(([type, amount]) => (
                    amount > 0 && (
                        <div key={type} className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">{type}</span>
                            <span className="font-medium text-gray-800">{formatCurrency(amount)}</span>
                        </div>
                    )
                ))}
                 {dashboardStats.week.total === 0 && <p className="text-xs text-gray-400 italic">Sin actividad esta semana</p>}
            </div>
        </div>

        {/* Month Stats */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
             <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <CalendarRange size={20} />
                </div>
                <span className="font-semibold text-gray-600">Este Mes</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-4">{formatCurrency(dashboardStats.month.total)}</p>
            <div className="space-y-2">
                {Object.entries(dashboardStats.month.byType).map(([type, amount]) => (
                    amount > 0 && (
                        <div key={type} className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">{type}</span>
                            <span className="font-medium text-gray-800">{formatCurrency(amount)}</span>
                        </div>
                    )
                ))}
                 {dashboardStats.month.total === 0 && <p className="text-xs text-gray-400 italic">Sin actividad este mes</p>}
            </div>
        </div>
      </div>
    </div>
  );

  const renderCalculator = () => {
    // Step 1: Select Client
    if (!selectedLocationId) {
        const filteredLocations = activeLocations.filter(l => 
            l.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
            l.address.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
            l.city?.toLowerCase().includes(clientSearchTerm.toLowerCase())
        );

        return (
            <div className="max-w-2xl mx-auto space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <Search className="mr-2 text-indigo-600" /> Buscar Cliente
                    </h2>
                    <div className="relative mb-6">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="text-gray-400" size={18} />
                        </div>
                        <input 
                            type="text" 
                            autoFocus
                            value={clientSearchTerm}
                            onChange={(e) => setClientSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre, dirección o localidad..."
                            className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        {filteredLocations.length === 0 ? (
                            <p className="text-center text-gray-400 py-4">No se encontraron clientes.</p>
                        ) : (
                            filteredLocations.map(loc => (
                                <button
                                    key={loc.id}
                                    onClick={() => setSelectedLocationId(loc.id)}
                                    className="w-full flex justify-between items-center p-4 rounded-lg border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition text-left group"
                                >
                                    <div>
                                        <div className="font-bold text-gray-900 group-hover:text-indigo-700">{loc.name}</div>
                                        <div className="text-sm text-gray-500 flex items-center mt-1">
                                            <MapPin size={14} className="mr-1" /> {loc.address} {loc.city && `(${loc.city})`}
                                        </div>
                                    </div>
                                    <div className="bg-gray-100 group-hover:bg-white p-2 rounded-full text-gray-400 group-hover:text-indigo-600">
                                        <ArrowLeft className="rotate-180" size={20} />
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                 </div>
            </div>
        );
    }

    // Step 2: Enter Tokens for Selected Client
    const location = locations.find(l => l.id === selectedLocationId);
    const locationMachines = machines.filter(m => m.locationId === selectedLocationId);

    if (bulkCalcResult) {
        // Step 3: Confirmation Result
        return (
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in-up">
                 <div className="bg-white p-6 rounded-xl shadow-lg border border-emerald-100 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                        <Check size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Resumen de Ingreso</h2>
                    <p className="text-gray-500 mb-6">Para {location?.name}</p>

                    <div className="grid grid-cols-2 gap-4 mb-6 text-left">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase">Fichas Totales</p>
                            <p className="text-2xl font-bold text-gray-900">{bulkCalcResult.totalTokens}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                            <p className="text-xs text-emerald-600 uppercase font-semibold">Mi Ganancia</p>
                            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(bulkCalcResult.totalMyShare)}</p>
                        </div>
                    </div>

                    <div className="space-y-2 mb-6 text-left">
                        <h4 className="text-sm font-semibold text-gray-700">Detalle:</h4>
                        {bulkCalcResult.collections.map((c, idx) => {
                             const m = machines.find(mach => mach.id === c.machineId);
                             return (
                                 <div key={idx} className="flex justify-between items-center text-sm py-3 border-b border-gray-100 last:border-0">
                                     <span className="font-bold text-gray-900 text-base">
                                        {m?.type} 
                                        <span className="font-normal text-gray-500 ml-1 text-sm">
                                            ({c.tokenCount} fichas)
                                        </span>
                                     </span>
                                     <span className="font-bold text-emerald-600">{formatCurrency(c.myShare)}</span>
                                 </div>
                             )
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                         <button 
                            onClick={() => setBulkCalcResult(null)}
                            className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                        >
                            Editar
                        </button>
                        <button 
                             onClick={() => setShowVoucherModal(true)}
                             className="px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                        >
                            <Share2 size={18} className="mr-2" /> Comprobante
                        </button>
                        <button 
                            onClick={handleSaveBulkCollection}
                            className="px-4 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition"
                        >
                            Confirmar
                        </button>
                    </div>
                 </div>

                 {/* VOUCHER MODAL */}
                 {showVoucherModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                            <div className="bg-gray-900 p-4 flex justify-between items-center text-white flex-shrink-0">
                                <h3 className="font-bold text-lg flex items-center">
                                    <Share2 size={18} className="mr-2" /> Comprobante
                                </h3>
                                <button onClick={() => setShowVoucherModal(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto flex-1">
                                <div className="text-center border-b border-gray-100 pb-4 mb-4">
                                    <h2 className="text-2xl font-bold text-gray-800">{location?.name}</h2>
                                    <p className="text-gray-500 text-sm">{new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>

                                <div className="space-y-4 text-sm text-gray-700 mb-6">
                                    <p className="font-bold text-gray-500 uppercase text-xs tracking-wider">Detalle de Máquinas</p>
                                    {bulkCalcResult.collections.map((c, idx) => {
                                        const m = machines.find(mach => mach.id === c.machineId);
                                        const split = m ? REVENUE_SHARE[m.type] : null;
                                        
                                        if (!m || !split) return null;

                                        return (
                                            <div key={idx} className="border-b border-gray-50 pb-3 last:border-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-gray-900 text-base">{m.type} <span className="text-xs font-normal text-gray-500">({c.tokenCount}f)</span></span>
                                                    <span className="font-bold text-gray-900">{formatCurrency(c.totalAmount)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 pl-2 border-l-2 border-gray-100">
                                                    <div>
                                                        Local ({split.local * 100}%): <span className="text-gray-700 font-medium">{formatCurrency(c.localShare)}</span>
                                                    </div>
                                                    <div>
                                                        Mí ({split.me * 100}%): <span className="text-gray-700 font-medium">{formatCurrency(c.myShare)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span>Total Caja:</span>
                                        <span className="font-bold text-lg">{formatCurrency(bulkCalcResult.collections.reduce((acc, c) => acc + c.totalAmount, 0))}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-blue-600 border-t border-gray-200 pt-2">
                                        <span>Tu Parte (Local):</span>
                                        <span className="font-bold text-lg">{formatCurrency(bulkCalcResult.collections.reduce((acc, c) => acc + c.localShare, 0))}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-emerald-600 border-t border-gray-200 pt-2 text-lg">
                                        <span className="font-bold">A Pagar (Mí):</span>
                                        <span className="font-black text-xl">{formatCurrency(bulkCalcResult.totalMyShare)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-3">
                                {location?.phoneNumber && (
                                    <button 
                                        onClick={() => shareToWhatsApp(location)}
                                        className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition flex items-center justify-center shadow-lg shadow-green-200"
                                    >
                                        <MessageCircle size={18} className="mr-2" /> Enviar por WhatsApp
                                    </button>
                                )}
                                <button 
                                    onClick={() => copyVoucherToClipboard(location?.name || '')}
                                    className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center shadow-lg shadow-indigo-200"
                                >
                                    <Copy size={18} className="mr-2" /> Copiar para WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                 )}
            </div>
        );
    }

    // Default return for Step 2 (Input Form)
    return (
        <div className="max-w-2xl mx-auto space-y-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center">
                        <Store className="mr-2 text-indigo-600" /> {location?.name}
                    </h2>
                    <button 
                        onClick={resetCalculator}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 px-3 py-1.5 rounded-lg transition"
                    >
                        <ArrowLeft size={16} className="mr-1" /> Cambiar Cliente
                    </button>
                </div>
                
                <div className="space-y-4">
                    {locationMachines.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                            <p>No hay máquinas asignadas a este local.</p>
                            <button onClick={() => setActiveTab('machines')} className="text-indigo-600 font-medium mt-2 hover:underline">Ir a Máquinas</button>
                        </div>
                    ) : (
                        locationMachines.map(m => {
                             const { price, source } = getEffectiveTokenPrice(m.id);
                             return (
                                <div key={m.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition group">
                                    <div>
                                        <div className="font-bold text-gray-900 flex items-center">
                                            <span className={`mr-2 p-1.5 rounded-lg ${getMachineTypeColor(m.type)} bg-opacity-20`}>
                                                {m.type === MachineType.METEGOL ? <Gamepad2 size={16}/> : m.type === MachineType.PINBALL ? <Joystick size={16}/> : <Coins size={16}/>}
                                            </span>
                                            {m.type}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 ml-9">
                                            Valor ficha: <span className="font-medium text-gray-700">${price}</span> <span className="text-gray-400">({source})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="relative">
                                            <input 
                                                type="number"
                                                min="0"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={tokenInputs[m.id] || ''}
                                                onChange={(e) => setTokenInputs({...tokenInputs, [m.id]: e.target.value})}
                                                className="w-28 p-2 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-lg"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleBulkCalculate();
                                                }}
                                            />
                                        </div>
                                        <span className="ml-3 text-sm text-gray-500 font-medium w-12">fichas</span>
                                    </div>
                                </div>
                             );
                        })
                    )}
                </div>

                {locationMachines.length > 0 && (
                    <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                        <button 
                            onClick={handleBulkCalculate}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition font-bold flex items-center shadow-lg shadow-indigo-200 transform active:scale-95"
                        >
                            <Calculator size={20} className="mr-2" /> Calcular Recaudación
                        </button>
                    </div>
                )}
             </div>
        </div>
    );
  };

  const renderHistory = () => {
        const filteredCollections = collections.filter(c => 
            historyFilterClient ? c.locationId === historyFilterClient : true
        );

        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Historial Completo</h2>
                        <span className="text-sm text-gray-500">{filteredCollections.length} registros</span>
                    </div>
                    
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <Filter size={14} className="text-gray-400" />
                        </div>
                        <select
                            value={historyFilterClient}
                            onChange={(e) => setHistoryFilterClient(e.target.value)}
                            className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white min-w-[200px]"
                        >
                            <option value="">Todos los Clientes</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {filteredCollections.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">
                        No hay registros que coincidan con los filtros.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                            <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Lugar</th>
                            <th className="px-6 py-4">Máquina</th>
                            <th className="px-6 py-4 text-center">Fichas</th>
                            <th className="px-6 py-4 text-right">Precio/F</th>
                            <th className="px-6 py-4 text-right">Recaudado (Caja)</th>
                            <th className="px-6 py-4 text-right">Mi Ganancia</th>
                            <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredCollections.map(c => {
                            const machine = machines.find(m => m.id === c.machineId);
                            const location = locations.find(l => l.id === c.locationId);
                            return (
                                <tr key={c.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {new Date(c.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="font-medium text-gray-900">{location?.name}</div>
                                    <div className="text-gray-500 text-xs">{location?.city}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{machine?.type}</td>
                                <td className="px-6 py-4 text-center text-sm">{c.tokenCount}</td>
                                <td className="px-6 py-4 text-right text-sm text-gray-500">
                                    ${c.appliedTokenPrice || TOKEN_PRICE}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-400">{formatCurrency(c.totalAmount)}</td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">{formatCurrency(c.myShare)}</td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        type="button"
                                        onClick={(e) => deleteCollection(c.id, e)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-red-50"
                                        title="Eliminar registro"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                                </tr>
                            );
                            })}
                        </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
  };

  const renderClients = () => {
    // Filter Logic
    const filteredLocations = locations.filter(l => {
        // 1. Status Filter
        if (!showInactiveClients && !l.isActive) return false;
        
        // 2. City Filter
        if (filterCity && l.city !== filterCity) return false;

        // 3. Machine Type Filter
        if (filterMachineType) {
            const clientMachines = machines.filter(m => m.locationId === l.id);
            const hasType = clientMachines.some(m => m.type === filterMachineType);
            if (!hasType) return false;
        }

        return true;
    });

    return (
    <div className="space-y-6">
        <div className={`bg-white p-6 rounded-xl shadow-sm border ${editingClientId ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-100'}`}>
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-between">
                <div className="flex items-center">
                    {editingClientId ? <Pencil className="mr-2 text-indigo-600" /> : <Users className="mr-2 text-indigo-600" />} 
                    {editingClientId ? 'Editar Cliente' : 'Nuevo Cliente'}
                </div>
                {editingClientId && (
                    <button onClick={handleCancelEdit} className="text-sm text-gray-500 hover:text-gray-700 underline">
                        Cancelar edición
                    </button>
                )}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Local</label>
                    <input 
                        type="text" 
                        value={newClient.name}
                        onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ej. Kiosco Pepe"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="text-gray-400" size={16} />
                        </div>
                        <input 
                            type="text" 
                            value={newClient.address}
                            onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                            className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Calle 123"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Localidad</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Map className="text-gray-400" size={16} />
                        </div>
                        <input 
                            type="text" 
                            value={newClient.city}
                            onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                            className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ej. San Justo"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Contacto</label>
                    <input 
                        type="text" 
                        value={newClient.contactName}
                        onChange={(e) => setNewClient({...newClient, contactName: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Ej. Roberto"
                    />
                </div>

                {/* Phone Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de Teléfono</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="text-gray-400" size={16} />
                        </div>
                        <input 
                            type="text" 
                            value={newClient.phoneNumber}
                            onChange={(e) => setNewClient({...newClient, phoneNumber: e.target.value})}
                            className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Ej. 11-1234-5678"
                        />
                    </div>
                </div>
                
                {/* Precios Diferenciados */}
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <label className="block text-xs font-bold text-orange-800 mb-1 uppercase tracking-wide">Precio Metegol (Opcional)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="text-orange-400" size={14} />
                        </div>
                        <input 
                            type="number" 
                            value={newClient.priceMetegol}
                            onChange={(e) => setNewClient({...newClient, priceMetegol: e.target.value})}
                            className="w-full pl-7 p-2 text-sm border border-orange-200 rounded-md focus:ring-2 focus:ring-orange-500 outline-none"
                            placeholder={`Global ($${TOKEN_PRICE})`}
                        />
                    </div>
                </div>

                <div className="bg-pink-50 p-3 rounded-lg border border-pink-100">
                    <label className="block text-xs font-bold text-pink-800 mb-1 uppercase tracking-wide">Precio Pinball (Opcional)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="text-pink-400" size={14} />
                        </div>
                        <input 
                            type="number" 
                            value={newClient.pricePinball}
                            onChange={(e) => setNewClient({...newClient, pricePinball: e.target.value})}
                            className="w-full pl-7 p-2 text-sm border border-pink-200 rounded-md focus:ring-2 focus:ring-pink-500 outline-none"
                            placeholder={`Global ($${TOKEN_PRICE})`}
                        />
                    </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <label className="block text-xs font-bold text-blue-800 mb-1 uppercase tracking-wide">Precio Volante (Opcional)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="text-blue-400" size={14} />
                        </div>
                        <input 
                            type="number" 
                            value={newClient.priceVolante}
                            onChange={(e) => setNewClient({...newClient, priceVolante: e.target.value})}
                            className="w-full pl-7 p-2 text-sm border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder={`Global ($${TOKEN_PRICE})`}
                        />
                    </div>
                </div>

                <div className="flex items-end">
                    <label className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg w-full cursor-pointer hover:bg-gray-50 transition">
                        <input 
                            type="checkbox"
                            checked={newClient.isActive}
                            onChange={(e) => setNewClient({...newClient, isActive: e.target.checked})}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-gray-700 font-medium">Cliente Activo</span>
                    </label>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={handleSaveClient}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center"
                >
                    {editingClientId ? <Save size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
                    {editingClientId ? 'Guardar Cambios' : 'Agregar Cliente'}
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Clientes Registrados</h2>
                    <p className="text-sm text-gray-500">{filteredLocations.length} mostrados ({locations.length} total)</p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <Filter size={14} className="text-gray-400" />
                        </div>
                        <select
                            value={filterCity}
                            onChange={(e) => setFilterCity(e.target.value)}
                            className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            <option value="">Todas las Localidades</option>
                            {uniqueCities.map(city => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <Joystick size={14} className="text-gray-400" />
                        </div>
                        <select
                            value={filterMachineType}
                            onChange={(e) => setFilterMachineType(e.target.value)}
                            className="pl-8 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                            <option value="">Todos los Productos</option>
                            {Object.values(MachineType).map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-1"></div>

                    <button 
                        onClick={() => setShowClientDetails(!showClientDetails)}
                        className={`flex items-center text-sm transition px-3 py-2 rounded-lg ${showClientDetails ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <LayoutList size={16} className="mr-1" />
                        {showClientDetails ? 'Ocultar Detalles' : 'Ver Detalles'}
                    </button>

                    <button 
                        onClick={() => setShowInactiveClients(!showInactiveClients)}
                        className={`flex items-center text-sm transition px-3 py-2 rounded-lg ${showInactiveClients ? 'bg-gray-100 text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        {showInactiveClients ? <EyeOff size={16} className="mr-1" /> : <Eye size={16} className="mr-1" />}
                        {showInactiveClients ? 'Ocultar Inactivos' : 'Ver Inactivos'}
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                        <tr>
                            {showClientDetails && <th className="px-6 py-4">Estado</th>}
                            <th className="px-6 py-4">Local / Ubicación</th>
                            <th className="px-6 py-4">Máquinas</th>
                            {showClientDetails && <th className="px-6 py-4">Config. Precios</th>}
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredLocations.map(loc => {
                            const clientMachines = machines.filter(m => m.locationId === loc.id);
                            return (
                                <tr key={loc.id} className={`hover:bg-gray-50 transition ${!loc.isActive ? 'bg-gray-50 opacity-70' : ''}`}>
                                    {showClientDetails && (
                                        <td className="px-6 py-4">
                                            {loc.isActive 
                                                ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1" /> Activo</span>
                                                : <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><XCircle size={12} className="mr-1" /> Inactivo</span>
                                            }
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        <div className="text-base">{loc.name}</div>
                                        <div className="text-xs text-gray-500 font-normal mt-1 flex items-center">
                                            <MapPin size={12} className="mr-1"/> {loc.address}
                                        </div>
                                        {loc.city && (
                                            <div className="text-xs text-gray-500 font-normal mt-0.5 flex items-center">
                                                <Map size={12} className="mr-1"/> {loc.city}
                                            </div>
                                        )}
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                             <div className="text-xs text-indigo-600 font-normal flex items-center">
                                                <Users size={12} className="mr-1"/> {loc.contactName}
                                            </div>
                                            {loc.phoneNumber && (
                                                <div className="text-xs text-gray-500 font-normal flex items-center">
                                                    <Phone size={12} className="mr-1"/> {loc.phoneNumber}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {clientMachines.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {clientMachines.map(m => (
                                                    <span key={m.id} className={`text-xs px-2 py-1 rounded border ${m.type === MachineType.METEGOL ? 'bg-orange-50 text-orange-700 border-orange-100' : m.type === MachineType.PINBALL ? 'bg-pink-50 text-pink-700 border-pink-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                                        {m.type === MachineType.METEGOL ? '⚽' : m.type === MachineType.PINBALL ? '🎰' : '🏎️'} {m.type}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Sin máquinas</span>
                                        )}
                                    </td>
                                    {showClientDetails && (
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex flex-col space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500">Metegol:</span>
                                                    {loc.priceMetegol ? (
                                                        <span className="font-bold text-orange-700 bg-orange-100 px-1 rounded">${loc.priceMetegol}</span>
                                                    ) : (
                                                        <span className="text-gray-400">${TOKEN_PRICE} (G)</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500">Pinball:</span>
                                                    {loc.pricePinball ? (
                                                        <span className="font-bold text-pink-700 bg-pink-100 px-1 rounded">${loc.pricePinball}</span>
                                                    ) : (
                                                        <span className="text-gray-400">${TOKEN_PRICE} (G)</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-gray-500">Volante:</span>
                                                    {loc.priceVolante ? (
                                                        <span className="font-bold text-blue-700 bg-blue-100 px-1 rounded">${loc.priceVolante}</span>
                                                    ) : (
                                                        <span className="text-gray-400">${TOKEN_PRICE} (G)</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <button 
                                            onClick={() => handleEditClient(loc)}
                                            className="text-indigo-600 hover:text-indigo-900 transition mr-3"
                                            title="Editar"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={(e) => handleDeleteClient(loc.id, e)}
                                            className="p-2 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-red-50"
                                            title="Eliminar cliente"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    );
  };

  const renderMachines = () => (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Joystick className="mr-2 text-indigo-600" /> Nueva Máquina
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Name input removed per request */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Máquina</label>
                    <select
                         value={newMachine.type}
                         onChange={(e) => setNewMachine({...newMachine, type: e.target.value as MachineType})}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        {Object.values(MachineType).map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                    <select
                         value={newMachine.locationId}
                         onChange={(e) => setNewMachine({...newMachine, locationId: e.target.value})}
                         className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">-- Seleccionar Local (Activos) --</option>
                        {activeLocations.map(l => (
                            <option key={l.id} value={l.id}>{l.name} - {l.city}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Precio Ficha (Opcional)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <DollarSign className="text-gray-400" size={16} />
                        </div>
                        <input 
                            type="number" 
                            value={newMachine.tokenPrice}
                            onChange={(e) => setNewMachine({...newMachine, tokenPrice: e.target.value})}
                            className="w-full pl-8 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Heredar"
                        />
                    </div>
                </div>
            </div>
            <div className="mt-4 flex justify-end">
                <button 
                    onClick={handleAddMachine}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-medium flex items-center"
                >
                    <Plus size={18} className="mr-2" /> Agregar Máquina
                </button>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Inventario de Máquinas</h2>
                <span className="text-sm text-gray-500">{machines.length} unidades</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Ubicación Actual</th>
                            <th className="px-6 py-4">Precio Configurado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {machines.map(mach => {
                            const loc = locations.find(l => l.id === mach.locationId);
                            const isLocActive = loc ? loc.isActive : false;
                            
                            // Determine inherited price for display
                            let inheritedPrice = TOKEN_PRICE;
                            if (loc) {
                                if (mach.type === MachineType.METEGOL && loc.priceMetegol) inheritedPrice = loc.priceMetegol as number;
                                else if (mach.type === MachineType.PINBALL && loc.pricePinball) inheritedPrice = loc.pricePinball as number;
                                else if (mach.type === MachineType.VOLANTE && loc.priceVolante) inheritedPrice = loc.priceVolante as number;
                            }

                            return (
                                <tr key={mach.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-sm">
                                        <div className="font-medium text-gray-900">{mach.type}</div>
                                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${getMachineTypeColor(mach.type)}`}>
                                            {mach.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {loc ? (
                                            <span className={!isLocActive ? "text-gray-400" : ""}>
                                                {loc.name} <span className="text-xs text-gray-400">({loc.city})</span> {!isLocActive && "(Inactivo)"}
                                            </span>
                                        ) : (
                                            <span className="text-red-400">Sin Asignar</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {mach.tokenPrice ? (
                                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-md text-xs font-semibold">
                                                ${mach.tokenPrice} (Forzado)
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">
                                                Heredado (${inheritedPrice})
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={(e) => handleDeleteMachine(mach.id, e)}
                                            className="text-gray-400 hover:text-red-500 transition"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar Navigation */}
      <aside className="bg-white w-full md:w-64 border-r border-gray-200 flex-shrink-0 md:h-screen sticky top-0 z-10">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center md:justify-start">
            <div className="bg-indigo-600 text-white p-2 rounded-lg mr-3">
                <Gamepad2 size={24} />
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">ArcadeRent</h1>
        </div>
        
        <nav className="p-4 space-y-1 flex flex-row md:flex-col overflow-x-auto md:overflow-visible">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <LayoutDashboard size={20} className="mr-3" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'calculator' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Calculator size={20} className="mr-3" /> Calcular / Ingresar
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'history' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <History size={20} className="mr-3" /> Historial
          </button>
           <button 
            onClick={() => setActiveTab('clients')}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'clients' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Users size={20} className="mr-3" /> Clientes
          </button>
          <button 
            onClick={() => setActiveTab('machines')}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-medium transition whitespace-nowrap ${activeTab === 'machines' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Joystick size={20} className="mr-3" /> Máquinas
          </button>
        </nav>
        
        <div className="p-6 mt-auto hidden md:block">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase">Valor Ficha Global</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">${TOKEN_PRICE}</p>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">
                    {activeTab === 'dashboard' && 'Resumen General'}
                    {activeTab === 'calculator' && 'Ingresar Recaudación'}
                    {activeTab === 'history' && 'Historial de Movimientos'}
                    {activeTab === 'clients' && 'Gestión de Clientes'}
                    {activeTab === 'machines' && 'Gestión de Máquinas'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">Gestión de alquileres de metegoles y arcades.</p>
            </div>
            
            {/* Quick Action (Visible only on desktop dashboard) */}
            {activeTab === 'dashboard' && (
                <button 
                    onClick={() => setActiveTab('calculator')}
                    className="hidden md:flex bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition items-center text-sm font-medium shadow-sm"
                >
                    <Plus size={18} className="mr-2" /> Nuevo Ingreso
                </button>
            )}
        </header>

        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'calculator' && renderCalculator()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'clients' && renderClients()}
        {activeTab === 'machines' && renderMachines()}

      </main>
    </div>
  );
};

export default App;