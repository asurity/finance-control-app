/**
 * Admin Voice Usage Repository
 * Maneja el rate limiting persistente en Firestore
 */
import {adminDb, FieldValue} from "./admin";

export class AdminVoiceUsageRepository {
  private readonly collectionName = "voiceUsage";

  /**
   * Genera el ID del documento para un usuario y fecha
   */
  private getDocId(userId: string, date: string): string {
    return `${userId}_${date}`;
  }

  /**
   * Incrementa el contador de comandos y retorna el total
   * @param userId - ID del usuario
   * @param date - Fecha en formato YYYY-MM-DD
   * @returns Número total de comandos usados hoy
   */
  async incrementCommandCount(userId: string, date: string): Promise<number> {
    const docId = this.getDocId(userId, date);
    const docRef = adminDb.collection(this.collectionName).doc(docId);

    // Usar transacción para incremento atómico
    const result = await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (!doc.exists) {
        // Crear nuevo documento
        const initialData = {
          userId,
          date,
          commandsUsed: 1,
          totalTokens: 0,
          commands: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        transaction.set(docRef, initialData);
        return 1;
      } else {
        // Incrementar contador existente
        const currentCount = doc.data()?.commandsUsed || 0;
        const newCount = currentCount + 1;
        transaction.update(docRef, {
          commandsUsed: newCount,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return newCount;
      }
    });

    return result;
  }

  /**
   * Obtiene el uso diario de un usuario
   */
  async getDailyUsage(userId: string, date: string): Promise<number> {
    const docId = this.getDocId(userId, date);
    const docRef = adminDb.collection(this.collectionName).doc(docId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return 0;
    }

    return docSnap.data()?.commandsUsed || 0;
  }
}
