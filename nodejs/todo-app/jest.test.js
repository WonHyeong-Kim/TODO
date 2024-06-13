const { get } = require('./todo-service');

describe('todo-service get', () => {
    test('null check', async () => {
        const results = await get();
        expect(results).not.toBeNull();
    });

    
    test('define check', async () => {
        const results = await get();
        expect(results).toBeDefined();
    });

    test('value check', async () => {
        const results = await get();
        expect(results).toEqual('do the homework');
        expect(results).toHaveLength(15);
    });
});
