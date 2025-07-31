# PesaCard Frontend

A modern, responsive React-based user interface for the M-Pesa Virtual Card Bridge System, built with Vite, React 18, and Tailwind CSS v3.

## 🚀 Features

- **Modern Tech Stack**: Vite + React 18 + Tailwind CSS v3
- **Fast Development**: Hot module replacement and instant builds
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Live data refresh and real-time notifications
- **Interactive Charts**: Beautiful data visualizations with Recharts
- **Form Validation**: Comprehensive form handling with React Hook Form
- **Authentication**: Secure login/logout with JWT tokens
- **Smooth Animations**: Framer Motion for delightful user interactions
- **Type Safety**: Full TypeScript support (optional)
- **Modern UI**: Clean, professional interface with consistent design system

## 🛠️ Tech Stack

- **Build Tool**: Vite 5.0
- **Framework**: React 18.2
- **Styling**: Tailwind CSS 3.3.5
- **State Management**: React Query 3.39.3
- **Forms**: React Hook Form 7.48.2
- **Routing**: React Router DOM 6.20.1
- **Animations**: Framer Motion 10.16.4
- **Charts**: Recharts 2.8.0
- **Icons**: Lucide React 0.294.0
- **HTTP Client**: Axios 1.6.2
- **Notifications**: React Hot Toast 2.4.1

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pesacard-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` with your configuration:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_APP_NAME=PesaCard
   VITE_APP_VERSION=1.0.0
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   └── dashboard/       # Dashboard-specific components
├── contexts/           # React contexts (Auth, Theme, etc.)
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── styles/             # Global styles and CSS
├── App.jsx             # Main app component
├── main.jsx            # App entry point
└── index.css           # Global styles with Tailwind
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#3b82f6) - Main brand color
- **Secondary**: Purple (#d946ef) - Accent color
- **Success**: Green (#22c55e) - Success states
- **Warning**: Yellow (#f59e0b) - Warning states
- **Error**: Red (#ef4444) - Error states
- **M-Pesa**: Green (#22c55e) - M-Pesa brand color

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Monospace**: JetBrains Mono (for code/numbers)

### Components
- **Buttons**: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`
- **Cards**: `.card`, `.card-hover`
- **Forms**: `.form-input`, `.form-label`, `.form-error`
- **Badges**: `.badge`, `.badge-success`, `.badge-warning`, `.badge-error`
- **Status**: `.status-indicator`, `.status-approved`, `.status-pending`, `.status-declined`

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Vite Configuration
The Vite config includes:
- React plugin for JSX support
- Development server with API proxy
- Build optimization
- Source maps for debugging

### Tailwind Configuration
Custom Tailwind config with:
- Extended color palette
- Custom animations and keyframes
- Responsive breakpoints
- Custom shadows and border radius

### ESLint Configuration
ESLint setup with:
- React hooks rules
- React refresh plugin
- TypeScript support
- Modern JavaScript features

## 🌐 API Integration

The frontend communicates with the backend API through:
- **Base URL**: Configurable via `VITE_API_URL`
- **Authentication**: JWT tokens stored in localStorage
- **HTTP Client**: Axios with interceptors for auth headers
- **Error Handling**: Centralized error handling with toast notifications

## 📱 Responsive Design

The app is fully responsive with:
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly interactions
- Optimized layouts for all screen sizes

## 🎭 Animations

Smooth animations powered by Framer Motion:
- Page transitions
- Component mounting/unmounting
- Hover effects
- Loading states
- Micro-interactions

## 🔐 Authentication

Authentication flow:
1. User enters credentials
2. JWT token received and stored
3. Token automatically included in API requests
4. Protected routes redirect to login if unauthorized
5. Automatic token refresh handling

## 📊 Data Visualization

Charts and analytics using Recharts:
- Line charts for transaction trends
- Bar charts for spending categories
- Real-time data updates
- Interactive tooltips
- Responsive chart containers

## 🧪 Development

### Code Style
- ESLint for code quality
- Prettier for formatting (recommended)
- Consistent component structure
- TypeScript for type safety (optional)

### Performance
- Code splitting with React.lazy()
- Optimized bundle size
- Efficient re-renders with React.memo()
- Debounced API calls
- Cached data with React Query

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy Options
- **Vercel**: Zero-config deployment
- **Netlify**: Drag and drop deployment
- **AWS S3**: Static hosting
- **Docker**: Containerized deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the code examples

---

Built with ❤️ using modern web technologies 