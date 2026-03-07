# Result: REST API for Product CRUD Operations

## Task
Implement a REST API endpoint for CRUD operations on products.

## Approach
Built a Node.js/Express REST API with an in-memory data store (Map) for product management. No external database dependency -- the API is self-contained and runnable immediately.

## Delivered Artifacts

| File | Purpose |
|------|---------|
| `server.js` | Express application with all CRUD routes, validation, filtering, pagination |
| `package.json` | Project manifest with dependencies (express, uuid) |
| `test.js` | Integration test suite (10 test cases) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List all products (supports filtering, sorting, pagination) |
| GET | `/api/products/:id` | Retrieve a single product by ID |
| POST | `/api/products` | Create a new product |
| PUT | `/api/products/:id` | Full replacement update of a product |
| PATCH | `/api/products/:id` | Partial update of a product |
| DELETE | `/api/products/:id` | Delete a product |
| GET | `/api/health` | Health check |

## Product Schema

```json
{
  "id": "uuid-string",
  "name": "string (required)",
  "description": "string",
  "price": "number >= 0 (required)",
  "category": "string",
  "stock": "integer >= 0",
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp"
}
```

## Features Implemented

- **Full CRUD**: Create, Read (single + list), Update (full + partial), Delete
- **Input validation**: Required fields, type checking, range constraints; returns 400 with descriptive error messages
- **Filtering**: Query parameters for category, minPrice, maxPrice
- **Sorting**: sortBy and order query parameters
- **Pagination**: page and limit query parameters with metadata (total, totalPages)
- **Consistent response format**: `{ data: ... }` for success, `{ error: ..., message: ... }` for errors
- **Proper HTTP status codes**: 200, 201, 204, 400, 404, 500
- **Error handling**: Global 404 and 500 error handlers
- **Seed data**: 3 sample products pre-loaded for immediate testing

## How to Run

```bash
npm install
npm start        # Starts on port 3000
npm run dev      # Starts with --watch for development
npm test         # Runs integration tests (server must be running)
```

## Design Decisions

1. **In-memory store**: Chose a Map for simplicity and zero setup. For production, swap to a database (PostgreSQL, MongoDB, etc.).
2. **UUID for IDs**: Avoids sequential ID guessing and collision issues.
3. **PUT vs PATCH**: PUT requires all fields (full replacement), PATCH allows partial updates -- follows REST conventions.
4. **Validation on both create and update**: Ensures data integrity at every write operation.
