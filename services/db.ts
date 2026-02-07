import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Location, Machine, Collection } from '../types';

// -- Locations --

export const subscribeToLocations = (callback: (locations: Location[]) => void) => {
  const q = query(collection(db, 'locations'), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Location[];
    callback(data);
  });
};

export const addLocation = async (data: Omit<Location, 'id'>) => {
  return addDoc(collection(db, 'locations'), data);
};

export const updateLocation = async (id: string, data: Partial<Location>) => {
  const ref = doc(db, 'locations', id);
  return updateDoc(ref, data);
};

export const deleteLocation = async (id: string) => {
  const ref = doc(db, 'locations', id);
  return deleteDoc(ref);
};

// -- Machines --

export const subscribeToMachines = (callback: (machines: Machine[]) => void) => {
  const q = query(collection(db, 'machines'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Machine[];
    callback(data);
  });
};

export const addMachine = async (data: Omit<Machine, 'id'>) => {
  return addDoc(collection(db, 'machines'), data);
};

export const deleteMachine = async (id: string) => {
  const ref = doc(db, 'machines', id);
  return deleteDoc(ref);
};

// -- Collections --

export const subscribeToCollections = (callback: (collections: Collection[]) => void) => {
  const q = query(collection(db, 'collections'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Collection[];
    callback(data);
  });
};

export const addCollection = async (data: Omit<Collection, 'id'>) => {
  return addDoc(collection(db, 'collections'), data);
};

export const deleteCollectionDoc = async (id: string) => {
  const ref = doc(db, 'collections', id);
  return deleteDoc(ref);
};
