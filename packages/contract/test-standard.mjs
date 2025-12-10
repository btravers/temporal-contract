import { z } from 'zod';

const schema = z.object({ name: z.string(), age: z.number() });

console.log('Has ~standard property:', '~standard' in schema);
console.log('Standard Schema vendor:', schema['~standard']?.vendor);
console.log('Standard Schema version:', schema['~standard']?.version);
console.log('Standard Schema types:', schema['~standard']?.types);

// Test validation
const result = schema['~standard'].validate({ name: 'John', age: 30 });
console.log('Validation success:', result);

// Test with invalid data
const failResult = schema['~standard'].validate({ name: 'John', age: 'not a number' });
console.log('Fail result:', JSON.stringify(failResult, null, 2));
