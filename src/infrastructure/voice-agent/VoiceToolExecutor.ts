/**
 * VoiceToolExecutor — Ejecutor de tools del sistema de voz
 * 
 * Principios:
 * - Encapsula toda la lógica de ejecución de tools
 * - Desacopla VoiceProvider de los detalles de implementación
 * - Fácil de testear en aislamiento
 * - Responsabilidad única: ejecutar tools y formatear resultados
 */

import { VoiceToolRegistry } from './VoiceToolRegistry';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import type { FunctionCall } from '@/domain/ports/IVoiceProvider';
import type { VoiceToolResult } from './types';

/**
 * Contexto de ejecución de un tool
 */
export interface ToolExecutionContext {
  userId: string;
  orgId: string;
}

/**
 * Resultado de la ejecución con metadata adicional
 */
export interface ToolExecutionResult {
  /** Resultado del tool */
  result: VoiceToolResult;
  /** Es un tool de acción (create, update, delete) */
  isActionTool: boolean;
  /** Metadata del tool para invalidation u otras operaciones */
  metadata?: {
    invalidates?: string[];
  };
}

/**
 * Ejecutor centralizado de tools del sistema de voz
 */
export class VoiceToolExecutor {
  private registry = VoiceToolRegistry.getInstance();

  /**
   * Ejecuta un function call del modelo
   * 
   * @param functionCall - Function call del modelo de IA
   * @param context - Contexto de ejecución (userId, orgId)
   * @returns Resultado de la ejecución con metadata
   * @throws Error si el tool no existe o falla la ejecución
   */
  async execute(
    functionCall: FunctionCall,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    // 1. Obtener tool del registry
    const tool = this.registry.getByName(functionCall.name);

    if (!tool) {
      throw new Error(`Tool no encontrado: ${functionCall.name}`);
    }

    // 2. Configurar DI container con orgId
    const container = DIContainer.getInstance();
    container.setOrgId(context.orgId);

    // 3. Ejecutar tool
    const result = await tool.execute(functionCall.arguments, {
      userId: context.userId,
      orgId: context.orgId,
      container,
    });

    // 4. Determinar tipo de tool
    const isActionTool = this.isActionTool(functionCall.name);

    // 5. Retornar resultado con metadata
    return {
      result,
      isActionTool,
      metadata: tool.metadata,
    };
  }

  /**
   * Formatea el resultado para enviarlo de vuelta al modelo
   * 
   * - Tools de ACCIÓN: Solo el mensaje (para respuesta de voz)
   * - Tools de CONTEXTO: JSON completo con datos
   */
  formatResult(executionResult: ToolExecutionResult): unknown {
    const { result, isActionTool } = executionResult;

    if (isActionTool) {
      // Tools de acción: solo mensaje para TTS
      return {
        success: result.success,
        message: result.message,
      };
    } else {
      // Tools de contexto: datos completos para que IA tome decisiones
      return result;
    }
  }

  /**
   * Determina si un tool es de acción (crea/modifica datos)
   * vs contexto (obtiene información)
   */
  private isActionTool(toolName: string): boolean {
    return (
      toolName.startsWith('create_') ||
      toolName.startsWith('update_') ||
      toolName.startsWith('delete_')
    );
  }

  /**
   * Obtiene las query keys a invalidar según el tool ejecutado
   * 
   * Útil para invalidación automática de cache de React Query
   */
  getQueriesToInvalidate(
    executionResult: ToolExecutionResult,
    orgId: string
  ): string[][] {
    const queries: string[][] = [];

    // Si el tool tiene metadata con invalidates, usarla
    if (executionResult.metadata?.invalidates) {
      executionResult.metadata.invalidates.forEach((queryKey) => {
        queries.push([queryKey, orgId]);
      });
      return queries;
    }

    // Fallback: invalidación por convención de nombres
    if (executionResult.isActionTool) {
      // Invalidar queries relacionadas
      queries.push(['transactions', orgId]);
      queries.push(['accounts', orgId]);
      queries.push(['dashboard', orgId]);
    }

    return queries;
  }
}
