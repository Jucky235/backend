English Learning Website - Backend

This is the backend repository for the English Learning Platform, providing a robust RESTful API built with Node.js, Express.js, and TypeScript to power authentication, data management, and business logic.

🚀 Links & Resources

Backend Repository: https://github.com/Jucky235/backend

Frontend Repository: https://github.com/Jucky235/frontend

Live Frontend App: https://frontend-b6gp.onrender.com/

🛠️ Tech Stack & Architecture

Runtime Environment: Node.js (v22.x)

Framework: Express.js

Language: TypeScript (compiled with tsx)

Database & ORM: PostgreSQL, Prisma ORM

Authentication & Security: JSON Web Tokens (JWT), bcrypt, cors

Utilities & Tools: date-fns, groq-sdk, nodemon

Testing & Seeding: @faker-js/faker

✨ Features & Architecture

Authentication System: Secure user registration and login using hashed passwords (bcrypt) and token-based authentication (jsonwebtoken).

RESTful API Endpoints: Structured endpoints supporting flashcards, exams, news, chat, community forums, and administration modules.

Database Management: Efficient querying, schema migration, and relational data management handled via Prisma ORM and PostgreSQL.

Development & Seeding: Hot-reloading development setup with nodemon and tsx, plus mock data generation using @faker-js/faker.

⚙️ Getting Started

Follow these instructions to set up and run the backend server locally on your machine.

Prerequisites

Node.js (v22.x or compatible version) installed on your system.

PostgreSQL database instance running locally or hosted.

npm, yarn, or pnpm package manager.

Installation & Setup

Clone the repository:

git clone https://github.com/Jucky235/backend.git
cd backend


Install dependencies:

npm install


Configure environment variables:
Create a .env file in the root directory and configure your environment variables:

DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="your_jwt_secret_key"
PORT=5000


Run database migrations:

npx prisma migrate dev


Run the development server:

npm run dev


Server Status:
The server will start and monitor for changes using nodemon and tsx.

👨‍💻 Author

Truong Quoc Vuong

GitHub: @Jucky235
