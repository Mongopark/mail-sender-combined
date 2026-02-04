# Repo-Manager: Bulk Email Management System

A full-stack web application for managing bulk email campaigns. It allows users to create and manage recipient lists, define custom variables for personalization, and send templated emails using Handlebars.

## Features

- **Recipient Management**: Add recipients manually or bulk upload via Excel/CSV files.
- **Dynamic Variables**: Define custom fields for recipients (e.g., job title, department) to personalize emails.
- **Email Templating**: Use Handlebars templates to customize subject and body with recipient data.
- **Bulk Sending**: Send emails to all recipients or selected groups.
- **Responsive UI**: Built with React and Tailwind CSS for a modern, mobile-friendly interface.
- **Database Integration**: Uses PostgreSQL with Drizzle ORM for data persistence.
- **Email Delivery**: Supports SMTP configuration or uses Ethereal for testing.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** for accessible components
- **React Query** for data fetching
- **Wouter** for routing
- **Framer Motion** for animations

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** for database operations
- **PostgreSQL** as the database
- **Nodemailer** for email sending
- **Handlebars** for templating
- **Zod** for validation
- **Multer** for file uploads

### Development Tools
- **tsx** for running TypeScript
- **Drizzle Kit** for database migrations
- **ESLint** and **TypeScript** for code quality

## Prerequisites

- **Node.js** (version 18 or higher)
- **PostgreSQL** database
- **npm** or **yarn** package manager

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd repo-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:

   ```env
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/dbname

   # SMTP Configuration (optional, uses Ethereal for testing if not provided)
   SMTP_HOST=your-smtp-host.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@example.com
   SMTP_PASS=your-password

   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

4. Push database schema:
   ```bash
   npm run db:push
   ```

## Running the Application

### Development Mode
```bash
npm run dev
```
##### OR
```bash
npm run dev 2>&1 | head -80
```


This starts the development server with hot reloading. The app will be available at `http://localhost:5000`.

### Production Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run check
```

## Usage

1. **Home Page**: Overview of the application.
2. **Recipients**: Manage your recipient list.
   - Add recipients manually.
   - Upload Excel/CSV files to bulk import.
3. **Variables**: Define custom fields for personalization.
4. **Send Email**: Compose and send bulk emails with templates.

### Email Templates
Use Handlebars syntax in subject and body:
- `{{firstName}}` - Recipient's first name
- `{{lastName}}` - Recipient's last name
- `{{email}}` - Recipient's email
- Custom variables: `{{job}}`, `{{department}}`, etc.

## API Endpoints

### Recipients
- `GET /api/recipients` - List all recipients
- `POST /api/recipients/manual` - Create a recipient manually
- `POST /api/recipients/upload` - Upload Excel/CSV file
- `DELETE /api/recipients/:id` - Delete a recipient

### Variables
- `GET /api/variables` - List all variables
- `POST /api/variables` - Create a variable
- `DELETE /api/variables/:id` - Delete a variable

### Email
- `POST /api/email/send` - Send bulk emails

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and configurations
│   │   ├── pages/          # Page components
│   │   └── ...
├── server/                 # Express backend
│   ├── db.ts               # Database connection
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Data access layer
│   └── ...
├── shared/                 # Shared types and schemas
├── script/                 # Build scripts
└── ...
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and commit: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

## License

This project is licensed under the MIT License.