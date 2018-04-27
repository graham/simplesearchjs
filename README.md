# simplesearchjs
Easy to use gmail like search for your data.

## What Simple Search Does
The goal of simple search is to provide powerful search features to your users (via a text field) and simple search implementation for developers (via a single javascript function).

## For the user
If you're interacting with simplesearch, this document will help you understand how to use it [User Guide](https://github.com/graham/simplesearchjs/blob/master/user_readme.md)

## For the developer
All you'll need is some text input, you can pass that to the "build_fn" function from simplesearchjs, and you'll receive a callback that can take a single object (or list of objects). Depending on the search criteria it will return a boolean of if the search matched that object.

A simple example might look like this:

```typescript

 const test_data = [{ name: 'Han', age: 35 }, { name: 'Leia', age: 21 }];

 const search_string = 'age:21';
 const filter = build_fn(search_string);
 const result = test_data.filter(filter);

 // result == [{name:'Leia', age:21}];

 expect(result.length).toBe(1);
 expect(result[0].name).toBe('Leia');
```

But users don't have to understand this structure to get started, what we call a "haystack" search is more what a user is used to (which is really just, do any of the words I type show up in the results).

Anything in the "haystack" key (which can be configured) will be used for this "non-specified" search.

```typescript
 const test_data = { haystack: 'this is a test' };
 
 const filter = build_fn('test');
 const filter2 = build_fn('foo');
 
 const result = filter(test_data);
 const result2 = filter2(test_data);

 expect(result).toBe(true);
 expect(result2).toBe(false);
```

Of course, we want to support much more complex searches as well:

```typescript
 const test_data = [{ name: 'Han', age: 35 }, { name: 'Leia', age: 21 }];

 const search_string = 'age:>=35';
 const filter = build_fn(search_string);
 const result = test_data.filter(filter);

 expect(result.length).toBe(1);
 expect(result[0].name).toBe('Han');
```

We should support OR cases:

```typescript
 const test_data = [{ cool: 20 }, { cool: 10 }];

 const search_string = 'cool:or,20,10';
 const results = test_data.filter(build_fn(search_string));
 expect(results.length).toBe(2);
```

and AND cases

```typescript
 const test_data = [{ cool: 50 }, { cool: 50 }];

 const search_string = 'cool:and,20,10';
 const results = test_data.filter(build_fn(search_string));
 expect(results.length).toBe(0);
```

case insensitive searches

```typescript
 const test_data = [{ words: 'WELCOME' }];

 const search_string = 'words:i/welcome';
 const filter = build_fn(search_string);
 const result = test_data.filter(filter);

 expect(result.length).toBe(1);
 expect(result[0].words).toBe('WELCOME');
```

We support "digging" into objects based on child objects:

(% is similar to SQL LIKE)

```typescript
 const test_data = [
     {
       host_id: 54321,
       build_history: {
       timestamp: 1411075727,
       version: {
         number: 'Service-mac-3.1.213',
         },
       },
     },
     {
       host_id: 12345,
       build_history: {
       timestamp: 1411075729,
       version: {
         number: 'Service-linux-3.1.213',
         },
       },
     },
 ];

 const search_string = 'build_history.version.number:%mac';
 const filter = build_fn(search_string);

 const result = test_data.filter(filter);

 expect(result.length).toBe(1);
 expect(result[0].host_id).toBe(54321);
```

what about regex?

```typescript
 const test_data = [{ name: 'han' }, { name: 'luke' }];

 const search_string = 'name:/^..ke$';
 const filter = build_fn(search_string);
 const result = test_data.filter(filter);

 expect(result.length).toBe(1);
 expect(result[0].name).toBe('luke');
```

Fuzzy search:

```typescript
 const test_data = [
     { host_id: 12345, name: 'graham' },
     { host_id: 54321, name: 'vutran' },
 ];

 const search_string = 'name:gra';

 const filter = build_fn(search_string);

 let result: Array<any> = [];
 for (var item of test_data) {
     if (filter([item])) {
         result.push(item);
     }
 }

 expect(result.length).toBe(1);
 expect(result[0].host_id).toBe(12345);
```

exact search:

```typescript
 const test_data = [
     { host_id: 12345, name: 'graham' },
     { host_id: 54321, name: 'vutran' },
 ];

 const search_string = 'name:=gra';

 const filter = build_fn(search_string);

 let result: Array<any> = [];
 for (var item of test_data) {
     if (filter([item])) {
         result.push(item);
     }
 }

 expect(result.length).toBe(0);
```

Negative (or reductive) search:

```typescript
 const test_data = [{ cool: 20 }, { cool: 10 }];

 const search_string = '-cool:20';
 const results = test_data.filter(build_fn(search_string));
 expect(results.length).toBe(1);
```

And macros

```typescript
 const test_data = [{ name: 'Han' }, { name: 'Leia' }];

 const make_case_insensitive_macro_func = (
     key: string,
     arg_list: Array<string>
 ) => {
     if (arg_list) {
          return [key, arg_list.map(item => 'i/' + item)];
     }
 };

 const filter = build_fn('name:han', {
     macros: { name: make_case_insensitive_macro_func },
 });

 const results = test_data.filter(filter);
 expect(results.length).toBe(1);
 expect(results[0].name).toBe('Han');
```

We also support emojis :)

The tests and benchmarks will provide you with most of what you need to get started. If you have any ideas for additional comparisons, or features, just create an issue and I'll write it as fast as I can.

# A note on performance
Performance is really important in situations like this, so in addition to some pretty extensive testing, I keep track of benchmarks as well:

```
list#Equal x 801,447 ops/sec ±0.59% (93 runs sampled)
list#Equal (ignore-case) x 681,686 ops/sec ±0.40% (95 runs sampled)
list#NotEqual x 628,202 ops/sec ±0.43% (94 runs sampled)
list#NotEqual (ignore-case) x 550,369 ops/sec ±0.28% (95 runs sampled)
list#GreaterThan x 630,617 ops/sec ±0.56% (94 runs sampled)
list#LessThan x 667,986 ops/sec ±1.41% (94 runs sampled)
list#Haystack x 658,522 ops/sec ±0.49% (94 runs sampled)
list#FastHaystack x 577,439 ops/sec ±1.14% (96 runs sampled)
list#InsensitiveHaystack x 377,481 ops/sec ±0.91% (95 runs sampled)
list#Exists x 1,050,781 ops/sec ±0.64% (96 runs sampled)
list#ArgValueInItemSeq x 682,241 ops/sec ±0.55% (97 runs sampled)
list#haystack_pure_string_list x 925,137 ops/sec ±0.41% (95 runs sampled)
list#LessThan (no cache) x 216,089 ops/sec ±0.86% (86 runs sampled)
```

Your results may vary :)