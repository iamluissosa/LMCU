import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentFormatsService {
  constructor(private prisma: PrismaService) {}

  getDefaults(documentType: string) {
    if (documentType === 'RET_IVA') {
      return {
        documentType,
        headerText: '',
        footerText: 'Este comprobante se emite en función a lo establecido en el articulo 16 de la Providencia Administrativa Nº SNAT/2025/0054 de fecha 01/08/2025',
        legalText: 'Ley de IVA Art. 11. "La administración Tributaria podrá designar como responsables del pago del impuesto, en calidad de agentes de retención a quienes por sus funciones públicas o por razón de sus actividades privadas intervengan en operaciones gravadas con el impuesto establecido en este Decreto con Rango, Valor y Fuerza de Ley"',
        agentSignatureLabel: 'Firma del agente de retención',
        subjectSignatureLabel: 'Firma del Beneficiario del Pago Fecha de entrega',
        stampUrl: null
      };
    }
    if (documentType === 'RET_ISLR') {
      return {
        documentType,
        headerText: '',
        footerText: '',
        legalText: 'Para dar cumplimiento con la normativa establecida en el Artículo 24, Decreto 1.808 en materia de Retenciones de ISLR publicado en Gaceta Oficial No. 36.203 de fecha 12 de mayo de 1.997',
        agentSignatureLabel: 'Firma del agente de retención',
        subjectSignatureLabel: 'Firma del Beneficiario del Pago',
        stampUrl: null
      };
    }
    return { 
        documentType,
        headerText: '',
        footerText: '',
        legalText: '',
        agentSignatureLabel: 'Firma del Emisor',
        subjectSignatureLabel: 'Firma del Receptor',
        stampUrl: null
    };
  }

  async getFormat(companyId: string, documentType: string) {
    const format = await this.prisma.documentFormat.findUnique({
      where: { companyId_documentType: { companyId, documentType } }
    });
    
    if (!format) {
      return this.getDefaults(documentType);
    }
    return format;
  }

  async upsertFormat(companyId: string, documentType: string, data: any) {
    return this.prisma.documentFormat.upsert({
      where: { companyId_documentType: { companyId, documentType } },
      create: {
        companyId,
        documentType,
        headerText: data.headerText,
        footerText: data.footerText,
        legalText: data.legalText,
        agentSignatureLabel: data.agentSignatureLabel,
        subjectSignatureLabel: data.subjectSignatureLabel,
        stampUrl: data.stampUrl
      },
      update: {
        headerText: data.headerText,
        footerText: data.footerText,
        legalText: data.legalText,
        agentSignatureLabel: data.agentSignatureLabel,
        subjectSignatureLabel: data.subjectSignatureLabel,
        stampUrl: data.stampUrl
      }
    });
  }
}
