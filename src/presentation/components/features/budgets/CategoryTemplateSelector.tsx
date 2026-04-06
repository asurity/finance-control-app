'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCategoryTemplates } from '@/application/hooks';
import { useOrganization } from '@/hooks/useOrganization';
import { Sparkles, Info, CheckCircle2 } from 'lucide-react';

export function CategoryTemplateSelector() {
  const { currentOrgId } = useOrganization();
  
  if (!currentOrgId) {
    return null;
  }
  
  return <CategoryTemplateSelectorContent orgId={currentOrgId} />;
}

function CategoryTemplateSelectorContent({ orgId }: { orgId: string }) {
  const { templates, applyTemplate, getTemplatePreview, isApplying } = useCategoryTemplates(orgId);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelectTemplate = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    const preview = getTemplatePreview(templateKey);
    
    // Si ya existen categorías, mostrar diálogo de confirmación
    if (preview && preview.existingCategoriesCount > 0) {
      setShowConfirmDialog(true);
    } else {
      // Si no hay categorías, aplicar directamente
      handleConfirmApply();
    }
  };

  const handleConfirmApply = async () => {
    if (!selectedTemplate) return;

    const result = await applyTemplate(selectedTemplate);
    
    if (result.success) {
      setDialogOpen(false);
      setShowConfirmDialog(false);
      setSelectedTemplate(null);
    }
  };

  const preview = selectedTemplate ? getTemplatePreview(selectedTemplate) : null;

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2"
            data-tour="template-btn"
          >
            <Sparkles className="h-4 w-4" />
            Usar Template
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Templates de Categorías Predefinidos
            </DialogTitle>
            <DialogDescription>
              Crea múltiples categorías de una vez usando templates profesionales.
              Los templates solo agregan categorías nuevas sin modificar las existentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {Object.entries(templates).map(([key, template]) => {
              const templatePreview = getTemplatePreview(key);
              const hasNewCategories = templatePreview && templatePreview.newCategories > 0;
              const allDuplicates = templatePreview && templatePreview.duplicates === templatePreview.totalInTemplate;

              return (
                <div
                  key={key}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
                    selectedTemplate === key ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => !allDuplicates && setSelectedTemplate(key)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <span className="text-2xl">{template.icon}</span>
                        {template.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description}
                      </p>
                    </div>
                    {selectedTemplate === key && (
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </div>

                  {/* Vista previa de categorías */}
                  <div className="space-y-2 mt-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Incluye {template.categories.length} categorías:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {template.categories.map((cat, idx) => {
                        const isDuplicate = templatePreview?.duplicateNames.includes(cat.name);
                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between text-sm p-2 rounded ${
                              isDuplicate ? 'bg-muted/50 opacity-60' : 'bg-muted/30'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span className={isDuplicate ? 'line-through' : ''}>
                                {cat.name}
                              </span>
                              {isDuplicate && (
                                <span className="text-xs text-muted-foreground">(ya existe)</span>
                              )}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {cat.percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alertas informativas */}
                  {templatePreview && templatePreview.existingCategoriesCount > 0 && (
                    <Alert className="mt-3">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {allDuplicates ? (
                          <span className="text-destructive">
                            Todas las categorías de este template ya existen en tu organización
                          </span>
                        ) : hasNewCategories ? (
                          <>
                            Se agregarán <strong>{templatePreview.newCategories} categorías nuevas</strong>.
                            {templatePreview.duplicates > 0 && (
                              <> {templatePreview.duplicates} ya existen y se omitirán.</>
                            )}
                            <br />
                            Tus {templatePreview.existingCategoriesCount} categorías actuales NO se modificarán.
                          </>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isApplying}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => selectedTemplate && handleSelectTemplate(selectedTemplate)}
              disabled={!selectedTemplate || isApplying}
            >
              {isApplying ? 'Aplicando...' : 'Aplicar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para usuarios con categorías existentes */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Aplicar template {preview?.template.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                Se agregarán <strong>{preview?.newCategories} categorías nuevas</strong> a tu organización.
              </div>
              
              {preview && preview.duplicates > 0 && (
                <div className="text-muted-foreground text-sm">
                  {preview.duplicates} categorías del template ya existen y se omitirán:
                  <ul className="list-disc list-inside mt-1">
                    {preview.duplicateNames.slice(0, 3).map(name => (
                      <li key={name}>{name}</li>
                    ))}
                    {preview.duplicateNames.length > 3 && (
                      <li>y {preview.duplicateNames.length - 3} más...</li>
                    )}
                  </ul>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Garantía de seguridad:</strong> Tus {preview?.existingCategoriesCount} categorías 
                  actuales NO se modificarán ni eliminarán. Solo se agregarán las nuevas.
                </AlertDescription>
              </Alert>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmApply}
              disabled={isApplying}
            >
              {isApplying ? 'Aplicando...' : 'Agregar Categorías'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
