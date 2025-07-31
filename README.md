# PesaCard Backend - M-Pesa Virtual Card Bridge

A robust Node.js backend API for the M-Pesa to Virtual Card Bridge System, built with Express.js, MongoDB, and Redis.

## 🚀 Features

- **MongoDB Integration**: Full MongoDB support with Mongoose ODM
- **M-Pesa Integration**: Complete Daraja API integration with STK Push
- **Webhook Support**: Real-time M-Pesa callback handling with ngrok tunneling
- **Virtual Card Management**: Generate and manage virtual Visa cards
- **Transaction Processing**: Secure transaction handling and authorization
- **Redis Caching**: High-performance caching for transactions and sessions
- **JWT Authentication**: Secure user authentication and authorization
- **Rate Limiting**: API rate limiting and security measures
- **Comprehensive Logging**: Winston-based logging system
- **Error Handling**: Centralized error handling and validation

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18.2
- **Database**: MongoDB 6.0+ with Mongoose 8.0.3
- **Cache**: Redis 6.0+
- **Authentication**: JWT with bcryptjs
- **Validation**: Joi and express-validator
- **Logging**: Winston 3.11.0
- **HTTP Client**: Axios 1.6.0
- **Security**: Helmet, CORS, Rate Limiting
- **Development**: Nodemon, ESLint, Jest

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- MongoDB 6.0+
- Redis 6.0+
- ngrok (for webhook tunneling)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pesacard-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   NODE_ENV=development
   PORT=3000
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/pesacard_bridge
   
   # Redis Configuration
   REDIS_URL=redis://localhost:6379
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   
   # M-Pesa Daraja API Configuration
   MPESA_CONSUMER_KEY=your_mpesa_consumer_key
   MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
   MPESA_BUSINESS_SHORT_CODE=your_business_shortcode
   MPESA_PASSKEY=your_mpesa_passkey
   MPESA_ENVIRONMENT=sandbox
   ```

4. **Start MongoDB and Redis**
   ```bash
   # MongoDB (if using Docker)
   docker run -d --name mongodb -p 27017:27017 mongo:6.0
   
   # Redis (if using Docker)
   docker run -d --name redis -p 6379:6379 redis:6.0-alpine
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

## 🌐 M-Pesa Webhook Setup

### Development Setup with Tailscale Funnel (Recommended)

1. **Install Tailscale**
   ```bash
   # Visit: https://tailscale.com/download
   # Follow installation instructions for your platform
   ```

2. **Enable Tailscale Funnel**
   ```bash
   # Start Tailscale
   tailscale up
   
   # Enable funnel for port 3000
   tailscale funnel 3000
   ```

3. **Run the Tailscale setup script**
   ```bash
   node scripts/setup-tailscale.js
   ```

4. **Verify configuration**
   ```bash
   # Check your .env file now contains:
   TAILSCALE_FUNNEL_URL=https://your-tailscale-url.ts.net
   MPESA_CALLBACK_URL=https://your-tailscale-url.ts.net/api/webhooks/mpesa
   ```

### Alternative: Development Setup with ngrok

1. **Install ngrok**
   ```bash
   # macOS
   brew install ngrok
   
   # Windows
   choco install ngrok
   
   # Linux
   # Download from https://ngrok.com/download
   ```

2. **Authenticate ngrok**
   ```bash
   ngrok authtoken YOUR_NGROK_TOKEN
   ```

3. **Start ngrok tunnel**
   ```bash
   # Start your server first
   npm run dev
   
   # In another terminal, start ngrok
   ngrok http 3000
   ```

4. **Configure M-Pesa Webhook URL**
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Set the webhook URL in your M-Pesa Daraja API configuration:
     ```
     https://abc123.ngrok.io/api/webhooks/mpesa
     ```

### Production Setup

For production, replace ngrok with a permanent domain:

```env
MPESA_WEBHOOK_URL=https://your-domain.com/api/webhooks/mpesa
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Virtual Cards
- `GET /api/cards` - Get user's virtual cards
- `POST /api/cards` - Create new virtual card
- `GET /api/cards/:id` - Get specific card details
- `PUT /api/cards/:id` - Update card settings
- `DELETE /api/cards/:id` - Delete virtual card

### Transactions
- `GET /api/transactions` - Get transaction history
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:id` - Get transaction details

### M-Pesa Integration
- `POST /api/mpesa/stk-push` - Initiate STK Push
- `POST /api/mpesa/check-status` - Check transaction status
- `GET /api/mpesa/balance` - Get M-Pesa balance

### Webhooks
- `POST /api/webhooks/mpesa` - M-Pesa STK Push callback
- `POST /api/webhooks/mpesa/c2b` - M-Pesa C2B callback
- `POST /api/webhooks/mpesa/b2c` - M-Pesa B2C callback
- `GET /api/webhooks/health` - Webhook health check

### Dashboard
- `GET /api/dashboard/overview` - Dashboard overview
- `GET /api/dashboard/transactions` - Transaction analytics

## 🗄️ Database Schema

### User Model
```javascript
{
  email: String,
  password: String (hashed),
  firstName: String,
  lastName: String,
  phoneNumber: String,
  mpesaPhoneNumber: String,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### VirtualCard Model
```javascript
{
  userId: ObjectId,
  cardNumber: String (encrypted),
  cardholderName: String,
  expiryMonth: Number,
  expiryYear: Number,
  cvv: String (encrypted),
  status: String,
  balance: Number,
  dailyLimit: Number,
  monthlyLimit: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Model
```javascript
{
  userId: ObjectId,
  cardId: ObjectId,
  type: String,
  amount: Number,
  currency: String,
  status: String,
  merchantName: String,
  merchantId: String,
  mpesaRequestId: String,
  mpesaReceiptNumber: String,
  metadata: Object,
  createdAt: Date,
  processedAt: Date
}
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for password security
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Cross-origin resource sharing protection
- **Helmet Security**: Security headers and protection
- **Input Validation**: Comprehensive input validation
- **Encryption**: Sensitive data encryption (card details)
- **Webhook Validation**: M-Pesa webhook signature validation

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Logging

The application uses Winston for logging with different levels:

- **Error**: Application errors and exceptions
- **Warn**: Warning messages and potential issues
- **Info**: General information and API requests
- **Debug**: Detailed debugging information

Logs are written to:
- Console (development)
- File system (production)
- External logging service (optional)

## 🚀 Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment Variables

Make sure to set these environment variables in production:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pesacard_bridge
REDIS_URL=redis://your-redis-url:6379
JWT_SECRET=your-production-jwt-secret
MPESA_CONSUMER_KEY=your-production-mpesa-key
MPESA_CONSUMER_SECRET=your-production-mpesa-secret
MPESA_BUSINESS_SHORT_CODE=your-production-shortcode
MPESA_PASSKEY=your-production-passkey
MPESA_ENVIRONMENT=production
MPESA_WEBHOOK_URL=https://your-domain.com/api/webhooks/mpesa
```

## 🔧 Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run test` - Run tests
- `npm run lint` - Run ESLint

### Code Style

The project uses ESLint for code quality:

```bash
npm run lint
```

### Database Migrations

For database changes, create migration scripts in `src/database/migrations/`.

## 📚 API Documentation

### Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Error Responses

Standard error response format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Success Responses

Standard success response format:

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Success message"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code examples

---

**Built with ❤️ for the PesaCard M-Pesa Virtual Card Bridge System** 