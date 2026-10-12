import { useState, useEffect } from 'react';
import { fleetStore } from '../services/store';

export function useFleetData() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = fleetStore.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  return {
    buses: fleetStore.buses,
    drivers: fleetStore.drivers,
    mechanics: fleetStore.mechanics,
    serviceRecords: fleetStore.serviceRecords,
    inventory: fleetStore.inventory,
    inventoryMovements: fleetStore.inventoryMovements,
    routes: fleetStore.routes,
    trips: fleetStore.trips,
    fuelRecords: fleetStore.fuelRecords,
    expenses: fleetStore.expenses,
    loans: fleetStore.loans,
    gpsVehicles: fleetStore.gpsVehicles,
    notifications: fleetStore.notifications,
    auditLogs: fleetStore.auditLogs,
    profile: fleetStore.profile,
    settings: fleetStore.settings,

    // Actions
    addBus: fleetStore.addBus.bind(fleetStore),
    updateBus: fleetStore.updateBus.bind(fleetStore),
    deleteBus: fleetStore.deleteBus.bind(fleetStore),

    addDriver: fleetStore.addDriver.bind(fleetStore),
    updateDriver: fleetStore.updateDriver.bind(fleetStore),
    deleteDriver: fleetStore.deleteDriver.bind(fleetStore),

    addServiceRecord: fleetStore.addServiceRecord.bind(fleetStore),
    updateServiceRecord: fleetStore.updateServiceRecord.bind(fleetStore),
    deleteServiceRecord: fleetStore.deleteServiceRecord.bind(fleetStore),

    addInventoryItem: fleetStore.addInventoryItem.bind(fleetStore),
    updateInventoryItem: fleetStore.updateInventoryItem.bind(fleetStore),
    deleteInventoryItem: fleetStore.deleteInventoryItem.bind(fleetStore),
    recordInventoryMovement: fleetStore.recordInventoryMovement.bind(fleetStore),

    addRoute: fleetStore.addRoute.bind(fleetStore),
    updateRoute: fleetStore.updateRoute.bind(fleetStore),
    deleteRoute: fleetStore.deleteRoute.bind(fleetStore),

    addTrip: fleetStore.addTrip.bind(fleetStore),
    updateTrip: fleetStore.updateTrip.bind(fleetStore),
    deleteTrip: fleetStore.deleteTrip.bind(fleetStore),

    addFuelRecord: fleetStore.addFuelRecord.bind(fleetStore),
    updateFuelRecord: fleetStore.updateFuelRecord.bind(fleetStore),
    deleteFuelRecord: fleetStore.deleteFuelRecord.bind(fleetStore),

    addExpense: fleetStore.addExpense.bind(fleetStore),
    updateExpense: fleetStore.updateExpense.bind(fleetStore),
    deleteExpense: fleetStore.deleteExpense.bind(fleetStore),

    addLoan: fleetStore.addLoan.bind(fleetStore),
    updateLoan: fleetStore.updateLoan.bind(fleetStore),
    recordEmiPayment: fleetStore.recordEmiPayment.bind(fleetStore),

    markNotificationAsRead: fleetStore.markNotificationAsRead.bind(fleetStore),
    markAllNotificationsAsRead: fleetStore.markAllNotificationsAsRead.bind(fleetStore),
    deleteNotification: fleetStore.deleteNotification.bind(fleetStore),

    updateProfile: fleetStore.updateProfile.bind(fleetStore),
    updateSettings: fleetStore.updateSettings.bind(fleetStore),
    resetToDemo: fleetStore.resetToDemo.bind(fleetStore),
  };
}
