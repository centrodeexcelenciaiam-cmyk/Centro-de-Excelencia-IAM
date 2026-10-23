# Centro de Excelencia IAM

Tablero local de seguimiento de los tiempos de atención del Infarto Agudo de Miocardio, integrado en Cerebro FCV.

## Funciones

- Base incluida de 7.000 pacientes **completamente ficticios**, sin conexión a historia clínica.
- Filtros por ID, servicio, fechas y cumplimiento.
- Indicadores por etapa y distinción entre cumplimiento de la ruta total y de todas las etapas.
- Gráfica de tiempos consolidados de Urgencias y Hemodinamia, con desglose por etapa, mediana y percentil 90.
- Detalle de eventos por paciente y exportación CSV de todos los registros o de la selección.
- Imagen del Centro de Excelencia IAM en la tarjeta y en la cabecera del tablero.

La activación del código IAM se mide desde la toma del EKG y ocurre en paralelo; no se suma nuevamente a la ruta. La ruta admisión → inflado del balón y su meta de hasta 40 minutos son supuestos de simulación del archivo de origen, pendientes de validación institucional. Los demás centros y las funciones de mensajería son demostraciones.

## Ejecutar localmente

Requisitos: una versión de Node.js compatible con Vite 8 y npm.

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Abrir [http://127.0.0.1:3000](http://127.0.0.1:3000) y seleccionar **Centro de Excelencia IAM**.
El tablero incluido no requiere claves de API. `.env.example` conserva las variables de ejemplo de la plantilla original para integraciones futuras; no contiene credenciales reales.

## Verificar y compilar

```sh
npm run lint
npx tsx --test src/data/iam.test.ts
npm run build
```

La compilación se genera en `dist/`. Se puede revisar con `npm run preview`.

## Datos

`src/data/iamPatients.json` contiene los registros ficticios importados de `Base_IAM_7000_pacientes_ficticios.xlsx`. Las duraciones se calculan desde sus fechas y horas originales, sin depender de valores de fórmulas almacenados en Excel.

Para regenerar el JSON desde una copia del Excel original (opcional; requiere Python y `openpyxl`):

```sh
python -m pip install openpyxl
python scripts/import_iam.py "ruta/Base_IAM_7000_pacientes_ficticios.xlsx"
```

Los archivos de Excel y PDF originales no están incluidos. Las dependencias, las credenciales, los archivos temporales y las capturas locales tampoco se versionan.
