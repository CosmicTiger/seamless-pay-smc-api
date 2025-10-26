# Sistema de Escrow con QR Único

Este documento describe la implementación del sistema de pagos comerciales con escrow para Seamless Pay.

## Descripción General

El sistema permite a vendedores generar códigos QR únicos para recibir pagos en PYUSD. El flujo incluye:

1. **Vendedor** crea una orden y genera un QR
2. **Cliente** escanea el QR y paga con MetaMask
3. **Backend** detecta el pago automáticamente vía blockchain indexer
4. **Vendedor** libera los fondos una vez confirmada la transacción

## Arquitectura

### Componentes Principales

1. **OrderService**: Gestiona el ciclo de vida de las órdenes
2. **OrderController**: Expone los endpoints REST
3. **BlockchainIndexerService**: Monitorea la blockchain para detectar pagos

### Estados de Orden

- `CREATED`: Orden creada, esperando pago
- `FUNDED`: Pago detectado en la blockchain
- `RELEASE_PENDING`: Liberación de fondos en proceso
- `RELEASED`: Fondos liberados al vendedor
- `REFUNDED`: Fondos devueltos al comprador

## Endpoints API

### 1. Crear Orden

**POST** `/api/v1/orders`

Crea una nueva orden y retorna la información necesaria para generar el QR.

**Request Body:**
```json
{
  "vendor_wallet_address": "0xVendorWalletAddress...",
  "amount": 10.5,
  "description": "Venta en tienda física",
  "client_id": "CLIENT-XYZ123"
}
```

**Response:**
```json
{
  "order_id": "ODR-0a7b9c4d3e2f1g0h",
  "vendor_address": "0xVendorWalletAddress...",
  "escrow_address": "0x742d131f452C7F724D9c819890f590F8e91B33eD",
  "amount_pyusd": "10500000",
  "status": "CREATED"
}
```

### 2. Consultar Estado de Orden

**GET** `/api/v1/orders/:orderId`

Verifica el estado actual de una orden.

**Response:**
```json
{
  "order_id": "ODR-0a7b9c4d3e2f1g0h",
  "status": "FUNDED",
  "tx_hash": "0xTxHashDelCliente...",
  "buyer_address": "0xBuyerWalletAddress...",
  "timestamp": "2025-10-25T15:00:00Z"
}
```

### 3. Liberar Fondos

**POST** `/api/v1/orders/:orderId/release`

Libera los fondos de una orden al vendedor.

**Response:**
```json
{
  "order_id": "ODR-0a7b9c4d3e2f1g0h",
  "status": "RELEASE_PENDING",
  "release_tx_hash": "0xBackendTxHash..."
}
```

## Flujo de Identificación del Cliente

El sistema utiliza el **Enfoque A (Identificación Simple)** mencionado en los requisitos:

1. El vendedor puede opcionalmente registrar un `client_id` al crear la orden
2. El **Blockchain Indexer** monitorea transferencias PYUSD al contrato de escrow
3. Cuando detecta una transferencia:
   - Extrae el monto y la dirección del comprador
   - Busca órdenes en estado `CREATED` con el mismo monto
   - Vincula la orden con el comprador automáticamente

### Ventana de Tiempo

El indexer busca órdenes creadas en los últimos **30 minutos** por defecto. Esto evita colisiones con órdenes antiguas.

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
# Escrow Configuration
ESCROW_CONTRACT_ADDRESS=0x742d131f452C7F724D9c819890f590F8e91B33eD
PYUSD_CONTRACT_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Blockchain RPC (Sepolia o Base)
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
CHAIN_ID=11155111

# Indexer settings
INDEXER_POLLING_INTERVAL_MS=5000
INDEXER_ENABLED=true
```

### Iniciar el Servidor

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## Blockchain Indexer

El indexer se ejecuta automáticamente al iniciar el servidor si `INDEXER_ENABLED=true`.

### Funcionamiento

1. Consulta la blockchain cada `INDEXER_POLLING_INTERVAL_MS` milisegundos
2. Busca eventos `Transfer` del contrato PYUSD donde `to` es el contrato de escrow
3. Extrae:
   - Dirección del comprador (`from`)
   - Monto transferido (`value`)
   - Hash de la transacción
4. Vincula la transferencia con una orden pendiente
5. Actualiza el estado de la orden a `FUNDED`

### Logs

El indexer genera logs detallados:

```
Starting blockchain indexer...
Starting from block: 12345678
Blockchain indexer started (polling every 5000ms)
Checking blocks 12345679 to 12345680
Detected transfer: 10500000 PYUSD from 0xBuyer... to 0xEscrow...
Transaction hash: 0xabc123...
Matched order: ODR-0a7b9c4d3e2f1g0h
Order ODR-0a7b9c4d3e2f1g0h marked as FUNDED
```

## Almacenamiento

**Actualmente**: Las órdenes se almacenan en memoria (Map).

**Producción**: Debes migrar a una base de datos (PostgreSQL, MongoDB, etc.) con la siguiente estructura:

### Tabla: orders

| Columna | Tipo | Descripción |
|---------|------|-------------|
| order_id | VARCHAR | Clave principal |
| vendor_address | VARCHAR | Dirección del vendedor |
| amount | FLOAT | Monto en USD |
| amount_pyusd | BIGINT | Monto en Wei (10^6) |
| description | VARCHAR | Descripción opcional |
| client_id | VARCHAR | ID del cliente (opcional) |
| status | ENUM | CREATED/FUNDED/RELEASED/REFUNDED |
| buyer_address | VARCHAR | Dirección del comprador (llenada por indexer) |
| tx_hash | VARCHAR | Hash de la TX (llenada por indexer) |
| release_tx_hash | VARCHAR | Hash de la TX de liberación |
| escrow_address | VARCHAR | Dirección del contrato de escrow |
| created_at | DATETIME | Fecha de creación |
| updated_at | DATETIME | Última actualización |

## Próximos Pasos

1. **Integrar Smart Contract**: Implementar la llamada real a `releaseFunds()` en el endpoint de liberación
2. **Base de Datos**: Migrar de almacenamiento en memoria a PostgreSQL/MongoDB
3. **Autenticación**: Agregar autenticación para vendedores
4. **Webhooks**: Notificar a la app del vendedor cuando una orden cambia de estado
5. **Manejo de Errores**: Implementar reintentos y recuperación de errores del indexer
6. **Pruebas**: Agregar tests unitarios e integración

## Seguridad

- ✅ Validación de direcciones Ethereum
- ✅ Validación de montos positivos
- ✅ Verificación de estados antes de liberar fondos
- ⚠️ TODO: Autenticación de vendedores
- ⚠️ TODO: Rate limiting
- ⚠️ TODO: Firma de transacciones con private key segura

## Notas

- El sistema actual es funcional pero requiere migración a base de datos para. Se usará neondb para pruebas: https://neon.com/
- El indexer puede perder eventos si se reinicia el servidor (implementar persistencia del último bloque procesado)
- La vinculación por monto puede fallar si dos clientes pagan exactamente lo mismo al mismo tiempo (considerar agregar un parámetro adicional en el futuro)
