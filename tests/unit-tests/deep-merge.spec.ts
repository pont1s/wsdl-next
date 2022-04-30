import merge from '../../src/deepMergeObjectHelper';

describe('deep-merge', () => {
  test('Check merge two object', async () => {
    const object1 = {
      array: ['a'],
      date: new Date('2020-01-01'),
      functions: {
        func1: () => 'Object 1',
        func2: () => 'Object 1',
      },
      nest: {
        nest: {
          a: 1,
          b: 2,
        },
      },
      object: {
        a: 1,
        b: 2,
      },
    };

    const object2 = {
      array: ['b', 'c', 'a'],
      date: new Date('2020-01-02'),
      functions: {
        func2: () => 'Object 3',
        func3: () => 'Object 3',
      },
      nest: {
        nest: {
          c: 4,
        },
      },
      object: {
        d: null,
      },
    };

    const result = merge(object1, object2);

    expect(Object.keys(result.functions)).toEqual([
      'func1',
      'func2',
      'func3',
    ]);
  });
});
