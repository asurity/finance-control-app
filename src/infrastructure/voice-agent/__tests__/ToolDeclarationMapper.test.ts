/**
 * Tests para ToolDeclarationMapper
 * FASE 7: Tests del sistema de voz conversacional
 */

import { ToolDeclarationMapper } from '../ToolDeclarationMapper';
import type { ToolDeclaration } from '@/domain/ports/IVoiceProvider';

const sampleTool: ToolDeclaration = {
  name: 'create_expense',
  description: 'Crear un gasto',
  parameters: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Monto del gasto' },
      description: { type: 'string', description: 'Descripción' },
    },
    required: ['amount'],
  },
};

describe('ToolDeclarationMapper', () => {
  describe('toOpenAI', () => {
    it('debe envolver en formato OpenAI function calling', () => {
      const result = ToolDeclarationMapper.toOpenAI(sampleTool);

      expect(result).toEqual({
        type: 'function',
        name: 'create_expense',
        description: 'Crear un gasto',
        parameters: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Monto del gasto' },
            description: { type: 'string', description: 'Descripción' },
          },
          required: ['amount'],
        },
      });
    });

    it('debe incluir type: "function"', () => {
      const result = ToolDeclarationMapper.toOpenAI(sampleTool);
      expect(result.type).toBe('function');
    });
  });

  describe('fromOpenAI', () => {
    it('debe convertir formato OpenAI a formato agnóstico', () => {
      const openaiTool = {
        type: 'function' as const,
        name: 'create_expense',
        description: 'Crear un gasto',
        parameters: {
          type: 'object' as const,
          properties: {
            amount: { type: 'number' as const, description: 'Monto del gasto' },
          },
          required: ['amount'] as string[],
        },
      };

      const result = ToolDeclarationMapper.fromOpenAI(openaiTool);

      expect(result.name).toBe('create_expense');
      expect(result.description).toBe('Crear un gasto');
      expect(result.parameters.type).toBe('object');
      expect(result.parameters.properties).toEqual({
        amount: { type: 'number', description: 'Monto del gasto' },
      });
    });
  });

  describe('roundtrip', () => {
    it('toOpenAI → fromOpenAI debe preservar los datos', () => {
      const openai = ToolDeclarationMapper.toOpenAI(sampleTool);
      const back = ToolDeclarationMapper.fromOpenAI(openai);

      expect(back.name).toBe(sampleTool.name);
      expect(back.description).toBe(sampleTool.description);
      expect(back.parameters.properties).toEqual(sampleTool.parameters.properties);
      expect(back.parameters.required).toEqual(sampleTool.parameters.required);
    });
  });

  describe('allToOpenAI', () => {
    it('debe mapear múltiples tools', () => {
      const tools: ToolDeclaration[] = [
        sampleTool,
        { name: 'list_accounts', description: 'Listar cuentas', parameters: { type: 'object', properties: {} } },
      ];

      const result = ToolDeclarationMapper.allToOpenAI(tools);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('function');
      expect(result[1].type).toBe('function');
      expect(result[0].name).toBe('create_expense');
      expect(result[1].name).toBe('list_accounts');
    });

    it('debe retornar array vacío para input vacío', () => {
      const result = ToolDeclarationMapper.allToOpenAI([]);
      expect(result).toEqual([]);
    });
  });

  describe('allFromOpenAI', () => {
    it('debe mapear múltiples tools de vuelta', () => {
      const openaiTools = ToolDeclarationMapper.allToOpenAI([sampleTool]);
      const result = ToolDeclarationMapper.allFromOpenAI(openaiTools);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('create_expense');
    });
  });

  describe('toGemini', () => {
    it('debe usar type "OBJECT" en mayúscula', () => {
      const result = ToolDeclarationMapper.toGemini(sampleTool);

      expect(result.name).toBe('create_expense');
      expect(result.description).toBe('Crear un gasto');
      expect((result.parameters as any).type).toBe('OBJECT');
    });
  });

  describe('toClaude', () => {
    it('debe usar input_schema en vez de parameters', () => {
      const result = ToolDeclarationMapper.toClaude(sampleTool);

      expect(result.name).toBe('create_expense');
      expect(result.description).toBe('Crear un gasto');
      expect(result).toHaveProperty('input_schema');
      expect(result).not.toHaveProperty('parameters');
      expect((result.input_schema as any).type).toBe('object');
    });
  });
});
