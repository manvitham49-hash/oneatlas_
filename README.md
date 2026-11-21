<<<<<<< HEAD
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
=======
# OneAtlas – AI Model Discovery & Comparison Platform

**Discover the intelligence behind AI.**

OneAtlas is an AI model discovery and comparison platform that helps users explore AI models from different research laboratories and providers. Users can search, filter, explore model specifications, compare pricing and capabilities, and view benchmark performance.

The platform also includes an administrator dashboard for managing AI model benchmark records.

## Features

### 1. AI Model Discovery
- Explore a collection of AI models.
- Search models by name, slug, and description.
- Filter models by AI laboratory, provider, and capability.
- Sort models by price, context window, release date, and name.
- Browse models using pagination.

### 2. Model Details
View detailed information about individual AI models, including:
- Model description and type.
- Research laboratory.
- Context window.
- Input and output pricing.
- Supported input and output modalities.
- Model capabilities.
- Available providers.
- Benchmark records.

### 3. AI Model Comparison
- Select two AI models for comparison.
- Compare model specifications side by side.
- Compare context windows and pricing.
- Compare capabilities, providers, and descriptions.
- View benchmark score comparisons.
- Filter benchmark results by category.

### 4. Benchmark Management
An administrator dashboard provides:
- Add new benchmark records.
- Edit existing benchmark records.
- Delete benchmark records.
- Search and filter benchmark records.
- View benchmark statistics.
- Manage model benchmark information.

### 5. Security
- Admin authentication using environment-based credentials.
- Session-based administrator access.
- Protected benchmark creation, editing, and deletion APIs.
- Public access to benchmark reading.

### 6. Responsive Design
- Responsive interface for desktop, tablet, and mobile.
- Dark-themed user interface.
- Modern cards, comparison tables, and dashboard components.

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Full-stack React framework |
| React | User interface |
| TypeScript | Type-safe development |
| Prisma ORM | Database access and management |
| PostgreSQL | Database |
| Neon | Cloud PostgreSQL hosting |
| Tailwind CSS | UI styling |
| REST API | Backend communication |
| Git & GitHub | Version control |
| Vercel | Deployment |

## Project Structure

```text
oneatlas_/
│
├── prisma/
│   └── schema.prisma
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   ├── benchmarks/
│   │   │   ├── labs/
│   │   │   ├── models/
│   │   │   └── providers/
│   │   │
│   │   ├── admin/
│   │   │   └── benchmarks/
│   │   ├── models/
│   │   │   ├── [...slug]/
│   │   │   └── compare/
│   │   └── page.tsx
│   │
│   ├── lib/
│   │   ├── admin-auth.ts
│   │   └── prisma.ts
│   │
│   └── scripts/
│       └── seed-benchmarks.ts
│
├── public/
├── package.json
├── prisma.config.ts
├── .gitignore
└── README.md
```

*Note: `.env` is a local configuration file and should not be committed to GitHub.*

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/models` | Retrieve AI models |
| GET | `/api/models/[...slug]` | Retrieve model details |
| GET | `/api/labs` | Retrieve AI laboratories |
| GET | `/api/providers` | Retrieve model providers |
| GET | `/api/benchmarks` | Retrieve benchmark records |
| POST | `/api/benchmarks` | Add a benchmark |
| PATCH | `/api/benchmarks` | Update a benchmark |
| DELETE | `/api/benchmarks` | Delete a benchmark |
| GET | `/api/admin/session` | Check admin authentication |
| POST | `/api/admin/session` | Create an admin session |
| DELETE | `/api/admin/session` | End an admin session |

**Note:** Benchmark creation, updating, and deletion require administrator authentication.

## Getting Started

### Prerequisites

Install the following:
- Node.js
- npm
- Git
- PostgreSQL database (Neon can be used)

### 1. Clone the repository

```bash
git clone https://github.com/manvitham49-hash/oneatlas_.git
```

### 2. Navigate to the project

```bash
cd oneatlas_
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root.

```env
DATABASE_URL="your_neon_database_url"
DIRECT_URL="your_direct_database_url"
BENCHMARK_ADMIN_KEY="your_admin_key"
ADMIN_SESSION_SECRET="your_session_secret"
```

Use the environment variables required by your Prisma configuration. `DIRECT_URL` is needed only if your project configuration uses it.

**Security:** Never commit your actual `.env` file or expose database credentials and administrator secrets.

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Run database migrations

If your database schema has not yet been migrated:

```bash
npx prisma migrate deploy
```

### 7. Start the development server

```bash
npm run dev
```

Open your browser:

```text
http://localhost:3000
```

## Admin Dashboard

The administrator dashboard is available at:

```text
http://localhost:3000/admin/benchmarks
```

Log in using the administrator key configured through your environment variables.

Administrators can manage benchmark records and monitor saved benchmark data.

## Benchmark Data Disclaimer

OneAtlas supports benchmark records from different AI models.

Some records included in the project are demonstration data created for testing and displaying the comparison functionality. These scores are fictional and should not be considered verified real-world model evaluation results.

Always check the benchmark source, methodology, and scoring scale before drawing conclusions about model performance.

## Future Enhancements

- Integration with additional AI model providers.
- Live model pricing updates.
- Verified benchmark datasets and sources.
- Advanced filtering and sorting.
- More detailed performance analytics.
- User accounts and personalized model collections.
- AI-powered model recommendations.

## Author

**Developed as an MCA project.**

GitHub: [manvitham49-hash](https://github.com/manvitham49-hash)

Project Repository: [OneAtlas](https://github.com/manvitham49-hash/oneatlas_)

---

**OneAtlas – Discover. Explore. Compare.**
>>>>>>> origin/main
