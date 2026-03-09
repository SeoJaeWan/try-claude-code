# Test Plan: CRUD Todo App with Form Validation and Empty State

## App Under Test
- **Framework**: Next.js 16.1.6 with React 19, TypeScript, Tailwind CSS
- **Location**: features/next-app/app/page.tsx
- **Description**: A todo management app with full CRUD functionality, form validation, and empty state handling

---

## Test Scenarios

### 1. Empty State (Initial Load)

#### Scenario 1.1: Display empty state on first visit
- **Given**: The user opens the app with no todos saved
- **Then**: An empty state message is displayed (e.g., "No todos yet" or similar placeholder)
- **And**: The todo input form is visible and ready to accept input
- **And**: No todo list items are rendered

#### Scenario 1.2: Return to empty state after deleting all todos
- **Given**: The user has one or more todos
- **When**: The user deletes all todos one by one
- **Then**: The empty state message reappears
- **And**: The list area shows no items

---

### 2. Create (Add Todo)

#### Scenario 2.1: Add a new todo with valid input
- **Given**: The user is on the todo app page
- **When**: The user types "Buy groceries" into the input field
- **And**: The user submits the form (click button or press Enter)
- **Then**: A new todo item "Buy groceries" appears in the list
- **And**: The input field is cleared
- **And**: The empty state message is no longer visible

#### Scenario 2.2: Add multiple todos
- **Given**: The user is on the todo app page
- **When**: The user adds "Task 1", "Task 2", and "Task 3" sequentially
- **Then**: All three todos are displayed in the list
- **And**: The list shows the correct count (3 items)

#### Scenario 2.3: Submit via Enter key
- **Given**: The user has typed text in the input field
- **When**: The user presses the Enter key
- **Then**: The todo is added to the list

---

### 3. Read (Display Todos)

#### Scenario 3.1: Display todo items in a list
- **Given**: There are existing todos in the app
- **Then**: Each todo displays its text content
- **And**: Each todo has a visible completion status (checkbox or similar)
- **And**: Each todo has edit and delete controls

#### Scenario 3.2: Display todo count or summary
- **Given**: There are multiple todos
- **Then**: The app shows the total number of todos or a summary (e.g., "3 items left")

---

### 4. Update (Edit Todo)

#### Scenario 4.1: Toggle todo completion status
- **Given**: There is an incomplete todo "Buy groceries"
- **When**: The user clicks the checkbox or toggle for that todo
- **Then**: The todo is marked as complete (visual indication such as strikethrough or checkmark)

#### Scenario 4.2: Untoggle a completed todo
- **Given**: There is a completed todo
- **When**: The user clicks the checkbox or toggle again
- **Then**: The todo returns to incomplete status

#### Scenario 4.3: Edit todo text inline
- **Given**: There is a todo "Buy groceries"
- **When**: The user double-clicks or clicks an edit button on the todo
- **And**: The todo text becomes editable
- **And**: The user changes it to "Buy organic groceries"
- **And**: The user confirms the edit (Enter or save button)
- **Then**: The todo text is updated to "Buy organic groceries"

#### Scenario 4.4: Cancel edit
- **Given**: The user is editing a todo
- **When**: The user presses Escape or clicks cancel
- **Then**: The todo text reverts to its original value
- **And**: The edit mode is closed

---

### 5. Delete (Remove Todo)

#### Scenario 5.1: Delete a single todo
- **Given**: There is a todo "Buy groceries" in the list
- **When**: The user clicks the delete button for that todo
- **Then**: The todo is removed from the list
- **And**: The remaining todos are still displayed correctly

#### Scenario 5.2: Delete the last remaining todo
- **Given**: There is exactly one todo in the list
- **When**: The user deletes it
- **Then**: The empty state is shown again

---

### 6. Form Validation

#### Scenario 6.1: Reject empty submission
- **Given**: The input field is empty
- **When**: The user clicks the submit button or presses Enter
- **Then**: No todo is added to the list
- **And**: A validation error message is displayed (e.g., "Todo text is required")

#### Scenario 6.2: Reject whitespace-only input
- **Given**: The user types only spaces into the input field
- **When**: The user submits the form
- **Then**: No todo is added to the list
- **And**: A validation error message is shown

#### Scenario 6.3: Trim whitespace from valid input
- **Given**: The user types "  Buy groceries  " with leading/trailing spaces
- **When**: The user submits the form
- **Then**: The todo is added with trimmed text "Buy groceries"

#### Scenario 6.4: Validate maximum character length (if applicable)
- **Given**: The input field has a max length constraint
- **When**: The user types a very long string exceeding the limit
- **Then**: The input is either truncated or a validation error is shown

#### Scenario 6.5: Clear validation error on valid input
- **Given**: A validation error is currently displayed
- **When**: The user types valid text and submits
- **Then**: The validation error disappears
- **And**: The todo is added successfully

#### Scenario 6.6: Reject empty text during edit
- **Given**: The user is editing an existing todo
- **When**: The user clears the text field and tries to save
- **Then**: The edit is rejected with a validation error
- **And**: The original todo text is preserved

---

### 7. Edge Cases and Interaction

#### Scenario 7.1: Rapid successive additions
- **Given**: The user is on the todo app page
- **When**: The user quickly adds several todos in succession
- **Then**: All todos are correctly added without duplicates or missing entries

#### Scenario 7.2: Special characters in todo text
- **Given**: The user types todo text with special characters (e.g., `<script>alert('xss')</script>`)
- **When**: The user submits the form
- **Then**: The todo is added with the text displayed safely (no XSS)

#### Scenario 7.3: Page refresh persistence (if applicable)
- **Given**: The user has added several todos
- **When**: The page is refreshed
- **Then**: Todos are either persisted (if using storage) or the empty state is shown (if in-memory only)

---

## Test Priority

| Priority | Scenarios | Rationale |
|----------|-----------|-----------|
| P0 (Critical) | 1.1, 2.1, 4.1, 5.1, 6.1 | Core CRUD + basic validation |
| P1 (High) | 1.2, 2.2, 2.3, 4.3, 5.2, 6.2, 6.5 | Important user flows |
| P2 (Medium) | 3.1, 3.2, 4.2, 4.4, 6.3, 6.6 | Secondary features |
| P3 (Low) | 6.4, 7.1, 7.2, 7.3 | Edge cases |

## Test Environment
- **Browser**: Chromium (via Playwright)
- **Base URL**: http://localhost:3000
- **Framework**: Playwright Test
