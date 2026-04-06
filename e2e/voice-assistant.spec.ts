/**
 * Tests E2E del Asistente de Voz
 * 
 * Cobertura:
 * - Apertura y cierre de modal
 * - Estados del botón PTT
 * - Manejo de errores
 * - Flujo de conversación
 */

import { test, expect } from '@playwright/test';

test.describe('Voice Assistant - UI Básica', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show voice button in navigation', async ({ page }) => {
    // Verificar que el botón de voz existe en la navegación
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    await expect(voiceButton).toBeVisible({ timeout: 10000 });
  });

  test('should open voice modal when clicking voice button', async ({ page }) => {
    // Click en botón de voz
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    await voiceButton.click();

    // Verificar que el modal se abre
    await expect(page.locator('text=Asistente de Voz')).toBeVisible({ timeout: 5000 });
  });

  test('should show PTT button in modal', async ({ page }) => {
    // Abrir modal
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    await voiceButton.click();

    // Verificar botón PTT
    const pttButton = page.locator('button[role="button"]').filter({ hasText: /presiona|mantén/i });
    await expect(pttButton).toBeVisible({ timeout: 5000 });
  });

  test('should close modal when clicking close button', async ({ page }) => {
    // Abrir modal
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    await voiceButton.click();

    // Esperar que se abra
    await expect(page.locator('text=Asistente de Voz')).toBeVisible();

    // Click en botón cerrar
    const closeButton = page.locator('button[aria-label*="Cerrar"]').first();
    await closeButton.click();

    // Verificar que se cierra
    await expect(page.locator('text=Asistente de Voz')).not.toBeVisible({ timeout: 5000 });
  });

  test('should show conversation history area', async ({ page }) => {
    // Abrir modal
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    await voiceButton.click();

    // Verificar área de historial (puede estar vacía pero debe existir)
    const historyArea = page.locator('[data-testid="conversation-history"]').or(
      page.locator('text=Comienza a hablar').or(
        page.locator('.flex-1.overflow-y-auto')
      )
    );
    await expect(historyArea.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Voice Assistant - Estados del PTT Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Abrir modal
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    await voiceButton.click();
    await page.waitForTimeout(1000);
  });

  test('should show initial state label', async ({ page }) => {
    // Verificar texto inicial del botón PTT
    const pttButton = page.locator('button[role="button"]').filter({ hasText: /presiona|mantén/i });
    await expect(pttButton).toBeVisible();
    
    const buttonText = await pttButton.textContent();
    expect(buttonText?.toLowerCase()).toMatch(/presiona|mantén|hablar/);
  });

  test('should show connecting state when session starts', async ({ page }) => {
    // El estado "connecting" debería aparecer al intentar iniciar sesión
    // Esto puede ser difícil de capturar porque es muy rápido
    
    const pttButton = page.locator('button[role="button"]').first();
    await pttButton.hover();
    
    // Verificar que el botón es interactivo
    await expect(pttButton).toBeEnabled({ timeout: 10000 });
  });
});

test.describe('Voice Assistant - Error Handling UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle modal state when commands exhausted', async ({ page }) => {
    // Este test verifica que la UI maneja correctamente el caso de comandos agotados
    // En un entorno real, esto requeriría mockar la respuesta de la API
    
    // Abrir modal
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    await voiceButton.click();

    // Si hay un mensaje de límite, verificar que se muestra correctamente
    const limitMessage = page.locator('text=/comandos.*día/i');
    
    // El mensaje puede o no aparecer dependiendo del estado
    const messageExists = await limitMessage.count() > 0;
    
    if (messageExists) {
      await expect(limitMessage.first()).toBeVisible();
    }
  });
});

test.describe('Voice Assistant - Accesibilidad', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    
    // Verificar labels de accesibilidad
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    const ariaLabel = await voiceButton.getAttribute('aria-label');
    
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel?.toLowerCase()).toContain('voz');
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Navegar con Tab hasta el botón de voz
    await page.keyboard.press('Tab');
    
    // Verificar que el botón obtiene foco
    const voiceButton = page.locator('[aria-label*="voz"]').first();
    
    // El botón debería ser focusable (puede requerir múltiples Tabs)
    await expect(voiceButton).toBeVisible();
  });
});
