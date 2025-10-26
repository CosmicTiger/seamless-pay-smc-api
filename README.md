# Seamless Pay SMC API

Sistema completo de pagos comerciales con escrow para transacciones PYUSD en blockchain.

## Arquitectura del Proyecto

```
seamless-pay-smc-api/
├── api/                    # Backend Node.js con Express
│   ├── src/
│   │   ├── controllers/    # Endpoints REST
│   │   ├── services/       # Lógica de negocio + Blockchain Indexer
│   │   ├── db/            # Drizzle ORM + Esquemas PostgreSQL
│   │   ├── interfaces/    # TypeScript types
│   │   └── schemas/       # Validación Zod
│   └── drizzle.config.ts  # Configuración Drizzle
│
├── contracts/             # Smart Contracts Solidity
│   ├── contracts/
│   │   ├── PaymentEscrow.sol  # Contrato principal de escrow
│   │   └── MockPYUSD.sol      # Token mock para testing
│   └── test/
│       └── PaymentEscrow.ts   # Tests con Hardhat
│
└── package.json           # Monorepo workspace
```

## 🚀 Inicio Rápido

### Prerequisitos

- **Node.js 22.10.0+** (para contracts con Hardhat)
- **Node.js 20+** (suficiente para api)
- **PostgreSQL 14+**
- **npm** o **pnpm**

### 1. Instalación

```bash
# Clonar e instalar dependencias
git clone <repo-url>
cd seamless-pay-smc-api
npm install
```

### 2. Configurar Base de Datos PostgreSQL

#### Opción A: PostgreSQL Local

```bash
# Crear base de datos
createdb seamless_pay

# O con psql
psql -U postgres
CREATE DATABASE seamless_pay;
\q
```

#### Opción B: PostgreSQL con Docker

```bash
docker run --name seamless-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=seamless_pay \
  -p 5432:5432 \
  -d postgres:16
```

### 3. Configurar Variables de Entorno

```bash
cd api
cp .env.example .env
```

Edita `.env` con tus valores:

```bash
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=TU_PASSWORD_AQUI
DB_NAME=seamless_pay

# Escrow Configuration
ESCROW_CONTRACT_ADDRESS=0x742d131f452C7F724D9c819890f590F8e91B33eD
PYUSD_CONTRACT_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Blockchain RPC (Sepolia o Base)
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/TU_INFURA_KEY
CHAIN_ID=11155111

# Indexer
INDEXER_ENABLED=true
INDEXER_POLLING_INTERVAL_MS=5000
```

### 4. Migrar Base de Datos

```bash
cd api
npm run db:push
```

Este comando crea las tablas necesarias en PostgreSQL.

### 5. Iniciar el Servidor

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

El servidor estará en `http://localhost:3000`

## 📊 Esquema de Base de Datos

```sql
CREATE TABLE orders (
  order_id VARCHAR(255) PRIMARY KEY,
  vendor_address VARCHAR(42) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  amount_pyusd VARCHAR(78) NOT NULL,
  description TEXT,
  client_id VARCHAR(255),
  status order_status NOT NULL DEFAULT 'CREATED',
  buyer_address VARCHAR(42),
  tx_hash VARCHAR(66),
  release_tx_hash VARCHAR(66),
  escrow_address VARCHAR(42) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE order_status AS ENUM (
  'CREATED',
  'FUNDED',
  'RELEASED',
  'REFUNDED',
  'RELEASE_PENDING'
);
```

## 🔌 Endpoints API

### POST /api/v1/orders
Crear nueva orden

**Request:**
```json
{
  "vendor_wallet_address": "0xVendor...",
  "amount": 10.5,
  "description": "Café y croissant",
  "client_id": "CLI-123"
}
```

**Response:**
```json
{
  "order_id": "ODR-abc123...",
  "vendor_address": "0xVendor...",
  "escrow_address": "0xEscrow...",
  "amount_pyusd": "10500000",
  "status": "CREATED"
}
```

### GET /api/v1/orders/:orderId
Consultar estado de orden

**Response:**
```json
{
  "order_id": "ODR-abc123...",
  "status": "FUNDED",
  "tx_hash": "0xabc...",
  "buyer_address": "0xBuyer...",
  "timestamp": "2025-10-25T15:00:00Z"
}
```

### POST /api/v1/orders/:orderId/release
Liberar fondos al vendedor

**Response:**
```json
{
  "order_id": "ODR-abc123...",
  "status": "RELEASE_PENDING",
  "release_tx_hash": "0xdef..."
}
```

## 🔗 Smart Contract

### PaymentEscrow.sol

Contrato principal de escrow con las siguientes funciones:

- **`createEscrow(orderId, vendor, amount)`**: Crear orden (solo owner)
- **`fundEscrow(orderId)`**: Cliente fondea la orden
- **`releaseFunds(orderId)`**: Liberar fondos al vendedor (solo owner)
- **`refundFunds(orderId)`**: Devolver fondos al comprador (solo owner)
- **`markAsDisputed(orderId)`**: Marcar orden como disputada

### Testing Contracts

⚠️ **Requiere Node.js 22.10.0+**

```bash
cd contracts
npm install
npx hardhat test
```

### Compilar Contracts

```bash
cd contracts
npx hardhat compile
```

## Blockchain Indexer

El indexer monitorea automáticamente la blockchain:

1. Detecta transferencias PYUSD al contrato de escrow
2. Extrae dirección del comprador y monto
3. Vincula con órdenes pendientes por monto y timestamp
4. Actualiza estado a `FUNDED` automáticamente

**Logs típicos:**
```
Starting blockchain indexer...
Starting from block: 12345678
Checking blocks 12345679 to 12345680
Detected transfer: 10500000 PYUSD from 0xBuyer... to 0xEscrow...
Matched order: ODR-abc123...
Order ODR-abc123... marked as FUNDED
```

## Scripts Útiles

### API
```bash
# Desarrollo con hot reload
npm run dev

# Compilar TypeScript
npm run build

# Linting
npm run lint

# Tests
npm run test

# Drizzle Studio (UI para ver la DB)
npm run db:studio
```

### Database
```bash
# Generar migraciones
npm run db:generate

# Aplicar cambios a DB
npm run db:push

# Abrir Drizzle Studio
npm run db:studio
```

### Contracts
```bash
# Compilar
npx hardhat compile

# Tests
npx hardhat test

# Deploy local
npx hardhat run scripts/deploy.ts
```

## Drizzle Studio

Para explorar la base de datos visualmente:

```bash
cd api
npm run db:studio
```

Abre `https://local.drizzle.studio` en tu navegador.

## Seguridad

### En Producción

1. **Base de Datos**
   - Usa conexiones SSL: `DB_SSL=true`
   - Passwords fuertes
   - Limita acceso por IP

2. **API**
   - Implementa rate limiting
   - Agrega autenticación JWT
   - Usa HTTPS
   - Valida todos los inputs

3. **Blockchain**
   - Guarda `PRIVATE_KEY` en secretos (AWS Secrets Manager, etc.)
   - Nunca commitees `.env` al repositorio
   - Usa diferentes wallets para dev/prod

## Troubleshooting

### Error: "Cannot connect to database"
```bash
# Verifica que PostgreSQL esté corriendo
pg_isready

# Verifica credenciales en .env
psql -U postgres -d seamless_pay
```

### Error: "Hardhat compilation failed"
```bash
# Actualiza a Node.js 22+
nvm install 22
nvm use 22

# O usa tsx para compilar
npm install -g tsx
```

### Indexer no detecta pagos
- Verifica `BLOCKCHAIN_RPC_URL` en `.env`
- Confirma que `INDEXER_ENABLED=true`
- Revisa logs del servidor
- Verifica que el contrato PYUSD sea correcto

## Documentación Adicional

- [README_ESCROW.md](api/README_ESCROW.md) - Documentación detallada del sistema de escrow
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Hardhat Docs](https://hardhat.org/docs)
- [PYUSD Contract](https://sepolia.etherscan.io/token/0xcac524bca292aaade2df8a05cc58f0a65b1b3bb9)

## Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC

## ✨ Próximos Pasos

- [ ] Implementar autenticación de vendedores
- [ ] Agregar webhooks para notificaciones
- [ ] Crear UI admin con Drizzle Studio
- [ ] Deploy a Sepolia/Base mainnet
- [ ] Agregar soporte para múltiples tokens
- [ ] Implementar sistema de disputas
- [ ] Métricas y monitoring (Grafana/Prometheus)

---

**¿Preguntas?** Abre un issue en GitHub.
