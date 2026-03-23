import DocumentFormatEditor from '@/components/settings/DocumentFormatEditor';

export default function RetentionIvaPage() {
  return (
    <DocumentFormatEditor
      documentType="RET_IVA"
      title="Comprobante de Retención I.V.A."
      subtitle="Parámetros obligatorios (Providencia Administrativa SNAT/2025/0054)"
    />
  );
}
