/**
 * Tests para VoiceToolRegistry
 * Fase 2: Tool Declarations
 */

import { VoiceToolRegistry } from '../VoiceToolRegistry';
import { VoiceTool } from '../types';

describe('VoiceToolRegistry', () => {
  let registry: VoiceToolRegistry;

  // Mock tool para tests
  const mockTool: VoiceTool = {
    declaration: {
      type: 'function',
      name: 'test_tool',
      description: 'Test tool',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async execute() {
      return { success: true, message: 'Test' };
    },
  };

  beforeEach(() => {
    registry = VoiceToolRegistry.getInstance();
    registry.clear();
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = VoiceToolRegistry.getInstance();
      const instance2 = VoiceToolRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('should register a tool', () => {
      registry.register('test_tool', mockTool);
      expect(registry.count()).toBe(1);
    });

    it('should replace tool if already registered', () => {
      const mockTool2: VoiceTool = {
        ...mockTool,
        declaration: { ...mockTool.declaration, description: 'Updated' },
      };

      registry.register('test_tool', mockTool);
      registry.register('test_tool', mockTool2);

      const tool = registry.getByName('test_tool');
      expect(tool?.declaration.description).toBe('Updated');
      expect(registry.count()).toBe(1);
    });
  });

  describe('getByName', () => {
    beforeEach(() => {
      registry.register('test_tool', mockTool);
    });

    it('should return a registered tool', () => {
      const tool = registry.getByName('test_tool');
      expect(tool).toBe(mockTool);
    });

    it('should return undefined for unregistered tool', () => {
      const tool = registry.getByName('non_existent');
      expect(tool).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered tools', () => {
      registry.register('tool1', mockTool);
      registry.register('tool2', mockTool);

      const tools = registry.getAll();
      expect(tools.length).toBe(2);
      expect(tools).toContainEqual(mockTool);
    });

    it('should return empty array when no tools registered', () => {
      const tools = registry.getAll();
      expect(tools.length).toBe(0);
    });
  });

  describe('getDeclarations', () => {
    beforeEach(() => {
      registry.register('test_tool', mockTool);
    });

    it('should return OpenAI tool declarations', () => {
      const declarations = registry.getDeclarations();
      expect(declarations).toHaveLength(1);
      expect(declarations[0]).toEqual(mockTool.declaration);
    });

    it('should return empty array when no tools registered', () => {
      registry.clear();
      const declarations = registry.getDeclarations();
      expect(declarations).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('should remove all tools', () => {
      registry.register('tool1', mockTool);
      registry.register('tool2', mockTool);
      expect(registry.count()).toBe(2);

      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });

  describe('count', () => {
    it('should return correct count', () => {
      expect(registry.count()).toBe(0);
      
      registry.register('tool1', mockTool);
      expect(registry.count()).toBe(1);
      
      registry.register('tool2', mockTool);
      expect(registry.count()).toBe(2);
      
      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });
});
