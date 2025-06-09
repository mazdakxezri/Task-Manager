# ToDoList Backend

A robust backend API for a Todo List application built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- CRUD operations for todo items
- File upload capabilities
- Input validation
- Secure password hashing
- JWT-based authentication

## Tech Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- multer for file uploads
- express-validator for input validation
- cors for cross-origin resource sharing

## Prerequisites

- Node.js (v14 or higher)
- MongoDB installed and running
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ToDoList-Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your environment variables:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Project Structure

```
ToDoList-Backend/
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/         # Database models
├── routes/         # API routes
├── uploads/        # File upload directory
├── public/         # Static files
├── index.js        # Application entry point
└── package.json    # Project dependencies
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register a new user
- POST /api/auth/login - Login user

### Todo Items
- GET /api/todos - Get all todos
- POST /api/todos - Create a new todo
- GET /api/todos/:id - Get a specific todo
- PUT /api/todos/:id - Update a todo
- DELETE /api/todos/:id - Delete a todo

## Error Handling

The API uses standard HTTP status codes and returns JSON responses with appropriate error messages.

## Security

- Passwords are hashed using bcryptjs
- JWT tokens for authentication
- Input validation using express-validator
- CORS enabled for cross-origin requests

## License

ISC

## Author

Mazdak 