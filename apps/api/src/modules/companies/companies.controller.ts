import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { createWorker } from 'tesseract.js';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('companies')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Permissions('companies.create')
  create(@Body() data: any) {
    return this.companiesService.create(data);
  }

  @Get()
  @Permissions('companies.view')
  findAll(@Request() req) {
    return this.companiesService.findAll(req.user.companyId);
  }

  @Post('extract-rif')
  @Permissions('companies.create')
  @UseInterceptors(FileInterceptor('file'))
  async extractRifData(@UploadedFile() file: any) {
    console.log('--- Nueva solicitud de extracción RIF ---');
    if (!file) {
      console.error('No se recibió archivo');
      throw new HttpException(
        'No se subió ningún archivo',
        HttpStatus.BAD_REQUEST,
      );
    }
    console.log('Archivo recibido:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    try {
      let text = '';

      // A) Procesar PDF
      if (file.mimetype === 'application/pdf') {
        console.log('Procesando como PDF...');
        try {
          const pdf = require('pdf-parse');
          const data = await pdf(file.buffer);
          text = data.text;
          console.log('PDF procesado. Longitud texto:', text?.length);
        } catch (pdfError) {
          console.error('Error parseando PDF:', pdfError);
          throw new Error(
            `Error lectura PDF: ${pdfError.message || 'Archivo corrupto o encriptado'}`,
          );
        }
      }
      // B) Procesar Imagen (OCR)
      else if (file.mimetype.startsWith('image/')) {
        console.log('Procesando como Imagen (OCR)...');
        try {
          let worker;
          try {
            // Intentar cargar español primero
            console.log('Intentando cargar idioma Español (spa)...');
            worker = await createWorker('spa');
          } catch (langError) {
            console.warn(
              'Fallo carga Español, usando Inglés (eng)...',
              langError,
            );
            worker = await createWorker('eng');
          }

          console.log('Worker Tesseract creado.');

          const { data } = await worker.recognize(file.buffer);
          console.log('Reconocimiento completado.');

          text = data.text;
          await worker.terminate();
        } catch (ocrError) {
          console.error('Error interno Tesseract:', ocrError);
          throw new Error(
            `Fallo OCR: ${ocrError && typeof ocrError === 'object' && 'message' in ocrError ? ocrError.message : ocrError}`,
          );
        }
      } else {
        throw new HttpException(
          'Formato no soportado. Usa PDF o Imagen (JPG, PNG)',
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log(
        'Texto extraído (Inicio):',
        text.substring(0, 500).replace(/\n/g, ' '),
      );

      const extractedData: any = {};
      const upperText = text.toUpperCase();

      // 1. RIF
      const rifMatch = text.match(/([VJEGPvjegp])[- ]?(\d{8,9})[- ]?(\d)/);
      if (rifMatch) {
        extractedData.rif = `${rifMatch[1].toUpperCase()}-${rifMatch[2]}-${rifMatch[3]}`;
      }

      // 2. Tipo de Contribuyente
      if (upperText.includes('CONTRIBUYENTE ESPECIAL')) {
        extractedData.taxpayerType = 'Especial (Retiene IVA)';
      } else if (upperText.includes('ORDINARIO')) {
        extractedData.taxpayerType = 'Ordinario';
      }

      // 3. Nombre / Razón Social
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const rifLineIndex = lines.findIndex((l) =>
        l.match(/([VJEGPvjegp])[- ]?(\d{8,9})[- ]?(\d)/),
      );

      if (rifLineIndex !== -1) {
        // Buscar nombre en la línea del RIF o siguientes
        let rawName = lines[rifLineIndex]
          .replace(/([VJEGPvjegp])[- ]?(\d{8,9})[- ]?(\d)/, '')
          .trim();

        // Si la línea del RIF quedó vacía, probamos la siguiente y la subsiguiente si es necesario
        if (rawName.length < 3 && lines[rifLineIndex + 1]) {
          rawName = lines[rifLineIndex + 1];
          // A veces el nombre ocupa 2 líneas
          if (
            lines[rifLineIndex + 2] &&
            !lines[rifLineIndex + 2].includes('DOMICILIO')
          ) {
            rawName += ' ' + lines[rifLineIndex + 2];
          }
        }

        // Limpieza agresiva del nombre
        extractedData.name = rawName
          .replace(/DE FECHA.*$/, '') // Cortar desde "DE FECHA..."
          .replace(/FECHA.*$/, '')
          .replace(/INSCRITO.*$/, '')
          .replace(/DOMICILIO.*$/, '')
          .replace(/\d{2}\/\d{2}\/\d{4}.*$/, '') // Cortar si aparece una fecha 15/12/2011
          .replace(/^[:.\- ]+/, '') // Caracteres basura al inicio
          .replace(/SENIAT|REPÚBLICA|BOLIVARIANA|VENEZUELA/gi, '')
          .trim();
      }

      // 4. Dirección, Ciudad y Estado
      const addressStartIndex = lines.findIndex((l) =>
        l.toUpperCase().includes('DOMICILIO FISCAL'),
      );
      if (addressStartIndex !== -1) {
        // Tomar líneas desde Domicilio hasta encontrar palabras clave de fin o límite de líneas
        const addressLines: string[] = [];
        let city = '';
        let state = '';

        // Analizamos las siguientes 6 líneas máximo buscando la dirección
        for (
          let i = addressStartIndex;
          i < Math.min(addressStartIndex + 6, lines.length);
          i++
        ) {
          const line = lines[i].replace(/DOMICILIO FISCAL/i, '').trim();
          if (!line) continue;

          // Detectar Ciudad/Estado si están explícitos o inferirlos
          // Lista simple de estados para detección
          const states = [
            'CARABOBO',
            'DISTRITO CAPITAL',
            'MIRANDA',
            'ARAGUA',
            'LARA',
            'ZULIA',
            'BOLIVAR',
            'FALCON',
            'MERIDA',
            'TACHIRA',
            'TRUJILLO',
            'YARACUY',
            'PORTUGUESA',
            'SUCRE',
            'NUEVA ESPARTA',
            'ANZOATEGUI',
            'MONAGAS',
            'DELTA AMACURO',
            'AMAZONAS',
            'APURE',
            'BARINAS',
            'COJEDES',
            'GUARICO',
            'VARGAS',
            'LA GUAIRA',
          ];

          let foundState = false;
          for (const s of states) {
            if (line.toUpperCase().includes(s)) {
              state = s;
              // A veces la ciudad está antes del estado en la misma línea: "MONTALBAN ESTADO CARABOBO"
              // Intentamos limpiar el estado de la línea para ver si queda la ciudad
              const potentialCity = line
                .toUpperCase()
                .replace(s, '')
                .replace('ESTADO', '')
                .replace('EDO.', '')
                .replace(',', '')
                .trim();
              if (potentialCity.length > 3) {
                city = potentialCity;
              }
              foundState = true;
              break;
            }
          }

          // Si encontramos estado, esa línea probablemente no es parte de la dirección "calle/edificio", sino la ubicación
          if (foundState) {
            // No la agregamos a addressLines, ya extrajimos state/city
            continue;
          }

          // Si llegamos a correo o zona postal, paramos
          if (line.match(/CORREO|EMAIL|ZONA POSTAL|TLF|TELEFONO/i)) break;

          addressLines.push(line);
        }

        extractedData.address = addressLines.join(' ');
        if (state) extractedData.state = state;
        if (city) {
          // Limpieza extra de ciudad (Capitalize simple)
          extractedData.city =
            city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        }
      }

      console.log('Datos Extraídos:', extractedData);
      return extractedData;
    } catch (error) {
      console.error('Error Extracción General:', error);
      // Lanzar error HTTP para que el frontend lo reciba
      throw new HttpException(
        error.message || 'Error procesando el documento',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.companiesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
