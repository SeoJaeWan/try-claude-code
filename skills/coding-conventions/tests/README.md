# Coding Conventions Tests

Unit tests for the coding conventions generator.

## Running Tests

```bash
# Run all tests
node --test tests/*.test.mjs

# Run specific test file
node --test tests/test_component.test.mjs
node --test tests/test_hook.test.mjs
node --test tests/test_structure.test.mjs
node --test tests/test_api_hook.test.mjs
node --test tests/test_test_suite.test.mjs
```

## Test Coverage

### Component Generator (`test_component.test.mjs`)
- Basic component generation
- Component with props
- JSDoc generation
- Test file generation
- Folder structure

### Hook Generator (`test_hook.test.mjs`)
- Basic hook generation
- Form hook with state
- JSDoc generation
- Test file generation with AAA pattern
- Korean test specs

### Folder Structure Generator (`test_structure.test.mjs`)
- Next.js page structure
- Next.js API structure
- NestJS module structure
- .gitkeep file generation

### API Hook Generator (`test_api_hook.test.mjs`)
- Query hook generation
- Mutation hook generation
- Test file generation
- JSDoc generation

### Test Suite Generator (`test_test_suite.test.mjs`)
- Hook test generation
- Component test generation
- Function test generation
- Korean test specs
- AAA pattern

## Fixtures

Sample expected outputs are in `fixtures/`:
- `component_sample.tsx` - Sample component output
- `hook_sample.ts` - Sample hook output
- `hook_test_sample.test.ts` - Sample hook test output
- `api_hook_query_sample.ts` - Sample query hook output
- `api_hook_mutation_sample.ts` - Sample mutation hook output
- `test_suite_sample.test.ts` - Sample test suite output
