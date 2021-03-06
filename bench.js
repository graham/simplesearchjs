const Benchmark = require('benchmark');
const { build_fn, new_build_fn } = require('./build/src/index');

const suite = new Benchmark.Suite;

const LIST_DATA = [
    { name: 'Han', age: 30, alliance: 'Rebel', tags:['pilot', 'has_force', 'good'] },
    { name: 'Leia', age: 25, alliance: 'Rebel', tags:['diplomat', 'has_force', 'good'] },
    { name: 'Luke', age: 20, alliance: 'Rebel', tags:['jedi', 'has_force', 'good']  },
    { name: 'Chewbacca', age: 9000, alliance: 'Rebel', tags:['pilot', 'good'] },
    { name: 'Darth Vader', age: 60, alliance: 'Empire', tags:['fallen_jedi', 'evil'] },
    { name: 'Palpatine', age: 10000, alliance: 'Empire', tags:['evil'] },
];

const STR_DATA = [ 'one', 'two', 'three', 'four' ];

suite
    .add('list#additive_search', () => {
        const filter = build_fn('+age:<9000 +age:<20');
        LIST_DATA.filter(filter);
    })
    .add('list#Equal', () => {
        const filter = build_fn('name:Han');
        LIST_DATA.filter(filter);
    })
    .add('list#Equal (ignore-case)', () => {
        const filter = build_fn('name:han', { ignore_case: true });
        LIST_DATA.filter(filter);
    })
    .add('list#NotEqual', () => {
        const filter = build_fn('name:!Han');
        LIST_DATA.filter(filter);
    })
    .add('list#NotEqual (ignore-case)', () => {
        const filter = build_fn('name:!han', { ignore_case: true });
        LIST_DATA.filter(filter);
    })
    .add('list#GreaterThan', () => {
        const filter = build_fn('age:>24');
        LIST_DATA.filter(filter);
    })
    .add('list#LessThan', () => {
        const filter = build_fn('age:<9000');
        LIST_DATA.filter(filter);
    })
    .add('list#Haystack', () => {
        const filter = build_fn('alliance:/Empire');
        LIST_DATA.filter(filter);
    })
    .add('list#FastHaystack', () => {
        const filter = build_fn('alliance:%Reb');
        LIST_DATA.filter(filter);
    })
    .add('list#InsensitiveHaystack', () => {
        const filter = build_fn('alliance:i/rebel');
        LIST_DATA.filter(filter);
    })
    .add('list#Exists', () => {
        const filter = build_fn('age:?');
        LIST_DATA.filter(filter);
    })
    .add('list#ArgValueInItemSeq', () => {
        const filter = build_fn('tags:has:evil');
        LIST_DATA.filter(filter);
    })
    .add('list#ValueInArgList', () => {
        const filter = build_fn('age:in:25,30');
        LIST_DATA.filter(filter);
    })
    .add('list#haystack_pure_string_list', () => {
        const filter = build_fn('o');
        STR_DATA.filter(filter);
    })
    .add('list#LessThan (no cache)', () => {
        const filter = new_build_fn('age:<9000');
        LIST_DATA.filter(filter);
    })
    .on('cycle', (evt) => {
        console.log(String(evt.target));
    })
    .run({ async: false });
