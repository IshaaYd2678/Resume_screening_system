# Frontend Development Guide

## Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview build
npm run preview
```

## Project Structure

```
src/
├── components/      # Reusable React components
│   └── Layout.tsx   # Main layout with sidebar
├── pages/           # Page components (one per route)
│   ├── LoginPage.tsx
│   ├── JobsPage.tsx
│   └── CandidatesPage.tsx
├── lib/             # Utilities
│   ├── api.ts       # Axios instance with interceptors
│   └── store.ts     # Zustand global state
├── App.tsx          # Main app component with routing
├── main.tsx         # React entry point
└── index.css        # Tailwind CSS imports
```

## Key Libraries

- **React 18**: UI framework
- **React Router v6**: Client-side routing
- **Zustand**: State management
- **TanStack Query**: Data fetching & caching
- **TanStack Table**: Advanced data tables
- **Recharts**: Charts & visualization
- **Tailwind CSS**: Utility-first CSS
- **Lucide React**: Icon library

## Environment Variables

Create `.env.local`:

```
VITE_API_URL=http://localhost:8000
```

## Component Examples

### Using TanStack Query
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['jobs'],
  queryFn: () => api.get('/api/v1/jobs')
})
```

### Using Zustand
```tsx
const { user, setUser } = useStore()
```

### Using React Hook Form
```tsx
const { register, handleSubmit, errors } = useForm()
```

## Code Style

- ESLint for linting
- TypeScript for type safety
- Prettier for formatting

```bash
npm run lint
npm run type-check
```

## Building for Production

```bash
npm run build

# Output in dist/
# Serve with: npm run preview
```

## API Integration

All API calls go through `lib/api.ts`. It automatically:
- Adds JWT token to requests
- Handles authentication errors
- Retries on failures

## Styling

Uses Tailwind CSS with custom components in `index.css`:

```tsx
<button className="btn-primary">
  Primary Button
</button>
```

## Performance

- Virtual scrolling for large lists (TanStack Virtual)
- Server-side pagination
- Request caching with TanStack Query
- Code splitting via React Router
