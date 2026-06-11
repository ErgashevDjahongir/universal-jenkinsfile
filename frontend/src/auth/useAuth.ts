import { useContext } from 'react';
import { AuthContext } from './context';

/** Auth holatiga kirish; AuthProvider ichida chaqirilishi shart. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  }
  return ctx;
}
