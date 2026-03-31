/**
 * useWeeklyPattern Hook
 * Analiza patrones de gasto por día de la semana
 */

import { useMemo } from 'react';
import { useTransactions } from '@/application/hooks/useTransactions';
import { getDay } from 'date-fns';

interface WeeklyPatternData {
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, etc.
  dayName: string;
  totalExpenses: number;
  transactionCount: number;
  averagePerDay: number;
  isToday: boolean;
}

interface WeeklyPatternReturn {
  data: WeeklyPatternData[];
  peakDay: {
    dayName: string;
    amount: number;
  } | null;
  totalWeek: number;
  isLoading: boolean;
}

export function useWeeklyPattern(
  orgId: string,
  startDate: Date,
  endDate: Date
): WeeklyPatternReturn {
  const { useTransactionsByDateRange } = useTransactions(orgId);

  const { data: transactions = [], isLoading } = useTransactionsByDateRange(startDate, endDate);

  const weeklyData = useMemo<WeeklyPatternReturn>(() => {
    // Inicializar datos para cada día de la semana
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayData = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      dayName: dayNames[i],
      totalExpenses: 0,
      transactionCount: 0,
      averagePerDay: 0,
      isToday: getDay(new Date()) === i,
    }));

    // Contar ocurrencias de cada día en el rango de fechas
    const daysCount = new Map<number, number>();
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = getDay(currentDate);
      daysCount.set(dayOfWeek, (daysCount.get(dayOfWeek) || 0) + 1);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Agrupar transacciones por día de la semana
    transactions
      .filter((t) => t.type === 'EXPENSE')
      .forEach((transaction) => {
        const dayOfWeek = getDay(transaction.date);
        dayData[dayOfWeek].totalExpenses += transaction.amount;
        dayData[dayOfWeek].transactionCount += 1;
      });

    // Calcular promedio por día (total / cantidad de veces que apareció ese día)
    dayData.forEach((day) => {
      const occurrences = daysCount.get(day.dayOfWeek) || 1;
      day.averagePerDay = day.totalExpenses / occurrences;
    });

    // Ordenar: Lunes primero (índice 1), luego resto circular
    const orderedData = [
      dayData[1], // Lun
      dayData[2], // Mar
      dayData[3], // Mié
      dayData[4], // Jue
      dayData[5], // Vie
      dayData[6], // Sáb
      dayData[0], // Dom
    ];

    // Encontrar día pico (mayor gasto promedio)
    const peakDay = orderedData.reduce(
      (max, current) => (current.averagePerDay > max.averagePerDay ? current : max),
      orderedData[0]
    );

    const totalWeek = dayData.reduce((sum, day) => sum + day.totalExpenses, 0);

    return {
      data: orderedData,
      peakDay: {
        dayName: peakDay.dayName,
        amount: peakDay.averagePerDay,
      },
      totalWeek,
      isLoading,
    };
  }, [transactions, startDate, endDate, isLoading]);

  return weeklyData;
}
