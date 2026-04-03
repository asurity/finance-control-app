/**
 * Admin Firestore Voice Usage Repository Implementation
 * Implementa el repositorio de uso de voz usando Firebase Admin SDK
 * Usado en API Routes de Next.js
 */

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { IVoiceUsageRepository } from '@/domain/repositories/IVoiceUsageRepository';
import type { VoiceUsageDaily, VoiceCommandLog, VoiceUsageStats } from '@/domain/entities/VoiceUsage';

export class AdminVoiceUsageRepository implements IVoiceUsageRepository {
  private readonly collectionName = 'voiceUsage';

  /**
   * Convierte una fecha Date a formato YYYY-MM-DD
   */
  private dateToString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Genera el ID del documento para un usuario y fecha
   */
  private getDocId(userId: string, date: string): string {
    return `${userId}_${date}`;
  }

  /**
   * Convierte un documento de Firestore a VoiceUsageDaily
   */
  private toVoiceUsageDaily(data: any): VoiceUsageDaily {
    return {
      userId: data.userId,
      date: data.date,
      commandsUsed: data.commandsUsed || 0,
      totalTokens: data.totalTokens || 0,
      commands: (data.commands || []).map((cmd: any) => ({
        timestamp: cmd.timestamp?.toDate ? cmd.timestamp.toDate() : new Date(cmd.timestamp),
        transcription: cmd.transcription || '',
        toolsExecuted: cmd.toolsExecuted || [],
        tokensUsed: cmd.tokensUsed || 0,
        success: cmd.success || false,
        errorMessage: cmd.errorMessage,
      })),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
    };
  }

  async getDailyUsage(userId: string, date: string): Promise<VoiceUsageDaily | null> {
    const docId = this.getDocId(userId, date);
    const docRef = adminDb.collection(this.collectionName).doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    return this.toVoiceUsageDaily(docSnap.data());
  }

  async incrementCommandCount(userId: string, date: string): Promise<number> {
    const docId = this.getDocId(userId, date);
    const docRef = adminDb.collection(this.collectionName).doc(docId);

    // Usar transacción para garantizar atomicidad
    const result = await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);

      if (!docSnap.exists) {
        // Crear nuevo documento si no existe
        const now = new Date();
        const newData = {
          userId,
          date,
          commandsUsed: 1,
          totalTokens: 0,
          commands: [],
          createdAt: now,
          updatedAt: now,
        };
        transaction.set(docRef, newData);
        return 1;
      } else {
        // Incrementar contador existente
        const currentCount = docSnap.data()?.commandsUsed || 0;
        const newCount = currentCount + 1;
        transaction.update(docRef, {
          commandsUsed: newCount,
          updatedAt: new Date(),
        });
        return newCount;
      }
    });

    return result;
  }

  async logCommand(userId: string, date: string, commandLog: VoiceCommandLog): Promise<void> {
    const docId = this.getDocId(userId, date);
    const docRef = adminDb.collection(this.collectionName).doc(docId);

    // Usar FieldValue.arrayUnion para agregar al array
    await docRef.update({
      commands: FieldValue.arrayUnion(commandLog),
      totalTokens: FieldValue.increment(commandLog.tokensUsed),
      updatedAt: new Date(),
    });
  }

  async getUsageStats(userId: string, maxCommandsPerDay: number): Promise<VoiceUsageStats> {
    const today = this.dateToString(new Date());
    const dailyUsage = await this.getDailyUsage(userId, today);

    const commandsToday = dailyUsage?.commandsUsed || 0;
    const tokensToday = dailyUsage?.totalTokens || 0;
    const commandsRemaining = Math.max(0, maxCommandsPerDay - commandsToday);

    // Calcular medianoche del día siguiente
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      commandsToday,
      tokensToday,
      commandsRemaining,
      resetAt: tomorrow,
    };
  }

  async getUsageHistory(userId: string, startDate: string, endDate: string): Promise<VoiceUsageDaily[]> {
    const querySnapshot = await adminDb
      .collection(this.collectionName)
      .where('userId', '==', userId)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    return querySnapshot.docs.map((doc) => this.toVoiceUsageDaily(doc.data()));
  }
}
