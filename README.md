# English Learning Platform — Backend

A robust RESTful backend API for the English Learning Platform, providing authentication, data management, business logic, and API services for the web application.

The backend is built with **Node.js, Express.js, TypeScript, PostgreSQL, and Prisma ORM** and serves as the main data and business-logic layer for the platform.

---

## 🌐 Links & Resources

- ⚙️ **Backend Repository:** https://github.com/Jucky235/backend
- 💻 **Frontend Repository:** https://github.com/Jucky235/frontend
- 🚀 **Live Application:** https://frontend-b6gp.onrender.com/

---

## ✨ Features

### 🔐 Authentication & Authorization

Secure authentication and user management.

- User registration
- User login
- Password hashing with bcrypt
- JWT-based authentication
- Protected API routes
- User authorization
- Role-based access control

### 📚 Flashcards

Backend services for vocabulary learning and flashcard management.

- Flashcard decks
- Flashcard creation and management
- Vocabulary organization
- Learning progress
- Flashcard review history

### 📝 Exams

API services for English exams and assessments.

- Exam management
- Exam categories
- Exam parts
- Questions and answers
- Exam attempts
- Score calculation
- Accuracy tracking
- Learning performance data

### 📰 News

API endpoints for managing educational and English-learning content.

- News articles
- Article management
- Content retrieval
- Administrative content management

### 💬 Community Chat

Backend services supporting community communication.

- Chat rooms
- Messages
- Message history
- User interactions
- Community activity

### 💭 Forum

A community discussion system for English learners.

- Forum categories
- Posts
- Comments
- Voting
- Saved posts
- Community interactions

### 👤 User Management

User and account management functionality.

- User profiles
- Account information
- Authentication providers
- User roles
- Permissions
- User activity

### 🛠️ Administration

Administrative APIs for managing the platform.

- User management
- Content management
- Exam management
- Flashcard management
- News management
- Forum management
- System resources

---

## 🧰 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | REST API framework |
| TypeScript | Primary programming language |
| PostgreSQL | Relational database |
| Prisma | ORM and database access |
| JSON Web Token | Authentication |
| bcrypt | Password hashing |
| CORS | Cross-origin request handling |
| date-fns | Date and time utilities |
| Groq SDK | AI-related services |
| Nodemon | Development hot reloading |
| tsx | TypeScript execution |
| Faker.js | Mock data generation and seeding |

---

## 🏗️ Architecture

The backend follows a RESTful client-server architecture:

```text
┌─────────────────────────────────┐
│          React Frontend         │
│                                 │
│  TypeScript                     │
│  Redux Toolkit / RTK Query      │
│  React Hook Form                │
└───────────────┬─────────────────┘
                │
                │ HTTP / REST API
                ▼
┌─────────────────────────────────┐
│         Express.js API          │
│                                 │
│  Routes                         │
│  Controllers                    │
│  Services                       │
│  Authentication                 │
│  Business Logic                 │
└───────────────┬─────────────────┘
                │
                │ Prisma ORM
                ▼
┌─────────────────────────────────┐
│           PostgreSQL            │
│                                 │
│  Users                          │
│  Exams                          │
│  Questions                      │
│  Flashcards                     │
│  Forums                         │
│  Chat                           │
│  News                           │
│  ...                            │
└─────────────────────────────────┘
