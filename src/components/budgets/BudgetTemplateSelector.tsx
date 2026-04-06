/**
 * BudgetTemplateSelector Component
 * 
 * Allows users to select and apply predefined budget templates.
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check } from 'lucide-react';
import { ALL_BUDGET_TEMPLATES, BudgetTemplate, CategoryTemplate } from '@/lib/constants/budgetTemplates';
import { cn } from '@/lib/utils';

interface BudgetTemplateSelectorProps {
  onSelectTemplate: (template: BudgetTemplate) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}

export function BudgetTemplateSelector({
  onSelectTemplate,
  trigger,
  disabled = false,
}: BudgetTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const handleSelectTemplate = (template: BudgetTemplate) => {
    setSelectedTemplateId(template.id);
  };

  const handleApplyTemplate = () => {
 const selectedTemplate = ALL_BUDGET_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      setOpen(false);
      setSelectedTemplateId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" disabled={disabled}>
            <Sparkles className="h-4 w-4 mr-2" />
            Usar Plantilla
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Plantillas de Presupuesto</DialogTitle>
          <DialogDescription>
            Selecciona una plantilla predefinida para crear tu presupuesto rápidamente.
            Podrás ajustar los porcentajes después de aplicarla.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[600px] overflow-y-auto pr-4">
          <div className="grid gap-4 md:grid-cols-2">
            {ALL_BUDGET_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedTemplateId === template.id && 'ring-2 ring-primary'
                )}
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                    {selectedTemplateId === template.id && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Categorías ({template.categories.length}):
                    </div>
                    <div className="space-y-1">
                      {template.categories.slice(0, 5).map((category) => (
                        <div
                          key={category.name}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-xs">{category.name}</span>
                          </div>
                          <Badge variant="secondary" className="h-5 text-xs">
                            {category.percentage}%
                          </Badge>
                        </div>
                      ))}
                      {template.categories.length > 5 && (
                        <div className="text-xs text-muted-foreground pl-5">
                          +{template.categories.length - 5} más...
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedTemplateId ? (
              <span>
                ✓ Plantilla seleccionada. Los porcentajes se aplicarán a las categorías existentes.
              </span>
            ) : (
              <span>Selecciona una plantilla para continuar</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApplyTemplate} disabled={!selectedTemplateId}>
              Aplicar Plantilla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
