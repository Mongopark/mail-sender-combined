# Email Sender Monorepo

A full-stack email sender application with bulk email capabilities, templating, and recipient management.

## Features

- User authentication with JWT
- Bulk email sending via SMTP with Handlebars templating
- Upload and parse Excel/CSV files for recipients
- Manual recipient entry
- Dynamic email templating with customizable variables
- Attachment support
- Email draft management
- File storage for attachments
- Clean layered backend architecture
- Responsive React frontend with Tailwind CSS

## Tech Stack

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL with Drizzle ORM
- Nodemailer for SMTP
- Handlebars for templating
- Multer for file uploads
- Passport.js for authentication
- Zod for validation

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Axios for API calls
- Wouter for routing
- TanStack Query for data fetching
- React Hook Form for forms
- Radix UI components

## Setup

1. Clone the repository.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up PostgreSQL database and update `backend/.env` with your DATABASE_URL.

4. Configure SMTP settings in `backend/.env`:
   ```
   SMTP_HOST=your_smtp_host
   SMTP_PORT=587
   SMTP_USER=your_email@example.com
   SMTP_PASS=your_password
   ```

5. Generate database schema:
   ```bash
   cd backend
   npm run db:generate
   npm run db:push
   ```

6. Start the backend:
   ```bash
   npm run dev
   ```

7. In another terminal, start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

8. Open http://localhost:5173 in your browser.

## Environment Variables

Create a `.env` file in the `backend` directory with:

```
DATABASE_URL=postgresql://username:password@localhost:5432/email_sender
JWT_SECRET=your_jwt_secret
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
PORT=3001
```

## Usage

1. Register/Login as a user.
2. Upload recipients via CSV/XLSX or add manually.
3. Manage dynamic variables.
4. Build emails with templating.
5. Send bulk emails or save as drafts.

## API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/logout

### Recipients
- GET /api/recipients
- POST /api/recipients/manual
- POST /api/recipients/upload
- PUT /api/recipients/:id
- DELETE /api/recipients/:id
- DELETE /api/recipients/delete-all

### Variables
- GET /api/variables
- POST /api/variables
- DELETE /api/variables/:id

### Email
- POST /api/email/send
- GET /api/email/drafts
- POST /api/email/drafts
- PUT /api/email/drafts/:id
- DELETE /api/email/drafts/:id

### Attachments
- POST /api/attachments/upload

## Database Schema

See `backend/src/models/schema.ts` for the Drizzle ORM schema definitions.