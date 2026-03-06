---
name: coding-conventions
description: Generate convention-compliant boilerplate code (components, hooks, structure, API hooks, tests) using reusable scripts before manual implementation.
model: haiku
---

<Skill_Guide>
<Purpose>
Generate convention-compliant boilerplate code (components, hooks, structure, API hooks, tests) using reusable scripts before manual implementation.
</Purpose>

<Instructions>
# coding-conventions

Generate code boilerplate following project coding conventions.

---

## When to Use

Use this skill as an optional scaffolding utility before manual coding.

- Creating new components, hooks, or utilities
- Need to ensure coding conventions compliance
- Want to reduce repetitive boilerplate writing
- Setting up folder structure for new features

## Why Use This Skill

- **Token Efficiency**: Avoid reading 8 coding-rules files (~3000 lines)
- **Baseline Consistency**: Covered templates apply shared conventions consistently
- **Consistency**: All agents use same templates
- **Speed**: Generate boilerplate → Add logic only

---

`{hooksRoot}` path follows `.claude/try-claude/references/coding-rules/folder-structure.md`:
`src/hooks` -> `app/hooks` -> `hooks` (first existing path).

---

## Available Generators

### 1. Component Generator

Generate React component with conventions:
- Arrow function syntax
- Props destructuring inside component
- Default export
- JSDoc comments
- Props interface pattern

```bash
node <plugin-root>/skills/coding-conventions/scripts/generate.mjs component "LoginForm" --type page --props "email:string,password:string,onSubmit:() => void"

# Options:
# --type page|layout|ui (default: ui)
# --output <path> (output directory)
# --props "prop:type,prop2:type2"
# --no-jsdoc (skip JSDoc)
# --no-test (skip test file)
```

**Output:**
- `{componentName}/index.tsx` - Component file
- `{componentName}/__tests__/index.test.tsx` - Test file

### 2. Hook Generator

Generate custom hook with conventions:
- `use` prefix + camelCase
- Arrow function
- Default export
- Unit test with AAA pattern + spec-oriented descriptions

```bash
node <plugin-root>/skills/coding-conventions/scripts/generate.mjs hook "useLoginForm" --type form --state "email:string,password:string"

# Options:
# --type form|api|util|page (default: util)
# --output <path> (output directory, default: {hooksRoot}/utils/)
# --state "name:type,name2:type2"
# --no-jsdoc (skip JSDoc)
# --no-test (skip test file)
```

**Output:**
- `{hookName}/index.ts` - Hook file
- `{hookName}/__tests__/index.test.ts` - Test file (AAA pattern, spec-oriented descriptions)

### 3. Folder Structure Generator

Generate folder structure for Next.js or NestJS:
- Auto-detects framework from package.json
- Creates folders + boilerplate files
- Supports Next.js App Router + NestJS modules

```bash
node <plugin-root>/skills/coding-conventions/scripts/generate.mjs structure "problems/[id]" --type page --framework nextjs --create

# Options:
# --type page|api|module (default: page)
# --framework nextjs|nestjs (auto-detected if not specified)
# --no-gitkeep (skip .gitkeep files)
# --create (actually create files on disk)
# --output <path> (output directory for created files)
```

**Output:**
- Next.js page: `app/(main)/{path}/page.tsx` + `components/` + `hooks/`
- Next.js API: `app/api/{path}/route.ts`
- NestJS module: `src/{path}/{path}.controller.ts` + `.service.ts` + `.module.ts` + `dto/`

### 4. API Hook Generator

Generate TanStack Query API hooks (useQuery/useMutation):
- Query: GET requests with caching
- Mutation: POST/PUT/DELETE requests
- Test boilerplate included

```bash
node <plugin-root>/skills/coding-conventions/scripts/generate.mjs api-hook "useGetUser" --method query --endpoint "/api/users/:id"

node <plugin-root>/skills/coding-conventions/scripts/generate.mjs api-hook "useLogin" --method mutation --endpoint "/api/auth/login"

# Options:
# --method query|mutation (default: query)
# --endpoint <path> (API endpoint)
# --output <path> (output directory, default: {hooksRoot}/apis/)
# --no-jsdoc (skip JSDoc)
# --no-test (skip test file)
```

**Output:**
- Query: `{hooksRoot}/apis/queries/{hookName}/index.ts`
- Mutation: `{hooksRoot}/apis/mutations/{hookName}/index.ts`
- Test file included

### 5. Test Suite Generator

Generate unit test suite with AAA pattern + spec-oriented descriptions:
- Hook tests: renderHook + act
- Component tests: render
- Function tests: direct call

```bash
node <plugin-root>/skills/coding-conventions/scripts/generate.mjs test-suite "useLogin" --type hook

node <plugin-root>/skills/coding-conventions/scripts/generate.mjs test-suite "Button" --type component

# Options:
# --type hook|component|function (default: function)
# --path <target-path> (target file path)
# --no-arrange (skip Arrange section)
```

**Output:**
- `__tests__/index.test.ts` - Test suite with spec-oriented descriptions

Use `test-suite` only as a manual fallback.
Default workflow uses `plan-tests` artifacts from `.claude/try-claude/plans/{task-name}/tests/`.

---

## Workflow Integration

### For frontend-developer

```typescript
// 1. Read SKILL.md (this file) - ~500 lines
// 2. Generate hook
Bash({
  command: `node <plugin-root>/skills/coding-conventions/scripts/generate.mjs hook "useLogin" --type form --state "email:string,password:string"`
});

// 3. Read generated template
Read({ file_path: "..." });

// 4. Add business logic to template
Write({
  file_path: "...",
  content: `
    // Generated template + your logic
  `
});
```

### For publisher

```typescript
// Generate folder structure + component template
Bash({
  command: `node <plugin-root>/skills/coding-conventions/scripts/generate.mjs structure "login" --type page --create`
});

Bash({
  command: `node <plugin-root>/skills/coding-conventions/scripts/generate.mjs component "LoginFormUI" --type page --props "email:string,password:string"`
});
```

## Applied Conventions

### Component
- ✅ Arrow function (code-style.md)
- ✅ Props destructuring inside (code-style.md)
- ✅ Default export (code-style.md)
- ✅ JSDoc comments (comments.md)
- ✅ Props interface (typescript.md)
- ✅ PascalCase naming (naming.md)
- ✅ Folder structure: `{componentName}/index.tsx` (folder-structure.md)

### Hook
- ✅ use prefix + camelCase (naming.md)
- ✅ Arrow function (code-style.md)
- ✅ Default export (code-style.md)
- ✅ JSDoc comments (comments.md)
- ✅ AAA pattern tests (testing.md)
- ✅ Korean test specs (testing.md)
- ✅ Folder structure: `{hookName}/index.ts` (folder-structure.md)

### Folder Structure
- ✅ camelCase folders (naming.md)
- ✅ Next.js App Router structure (folder-structure.md)
- ✅ NestJS module structure (folder-structure.md)
- ✅ .gitkeep for empty folders (git best practice)

### API Hook
- ✅ TanStack Query patterns (useQuery, useMutation)
- ✅ queries/ vs mutations/ separation (folder-structure.md)
- ✅ Error handling boilerplate

### Test Suite
- ✅ AAA pattern (Arrange-Act-Assert) (testing.md)
- ✅ Korean test specs (testing.md)
- ✅ describe/it structure (testing.md)
- ✅ renderHook for hooks (testing.md)
- ✅ render for components (testing.md)

---

## Error Handling

If generator fails:
```
Error: {error message}

Fallback: See .claude/try-claude/references/coding-rules/
- code-style.md: Component structure
- typescript.md: Props interface
- naming.md: Naming conventions
- folder-structure.md: Folder structure
- testing.md: Test patterns
```

Agents can fallback to reading coding-rules manually if needed.

---

## Hybrid Strategy

### Scripted (coding-conventions)
- Arrow function syntax
- Props destructuring
- Import order
- File/folder naming
- JSDoc boilerplate
- AAA pattern test structure

### Agent Decision (coding-rules)
- Conditional rendering pattern (Early Return vs ternary)
- Type guard logic
- Enforcement of no-any and minimal use of as
- Commit messages
- E2E vs Unit test selection

Agents read coding-rules only when:
- Complex patterns not generated by script
- Conditional logic needed
- Type guards needed
- Code review

---

## Dependencies

- Node.js (ESM, standard library only)
- No external packages required (pip install unnecessary)

---

## Notes

- **Output to stdout**: Generators print code to stdout, not write to disk (except structure --create)
- **Copy & paste**: Agent copies generated code to target files
- **Windows compatible**: UTF-8 encoding handled automatically
- **Framework detection**: Auto-detects Next.js/NestJS from package.json


</Instructions>
</Skill_Guide>


