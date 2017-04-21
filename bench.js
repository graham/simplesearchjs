const Benchmark = require('benchmark');
const { build_fn } = require('./lib/src/index');

const suite = new Benchmark.Suite;

const LIST_DATA = [
    { name: 'Han', age: 30, alliance: 'Rebel' },
    { name: 'Leia', age: 25, alliance: 'Rebel', },
    { name: 'Luke', age: 20, alliance: 'Rebel' },
    { name: 'Chewbacca', age: 9000, alliance: 'Rebel' },
    { name: 'Darth Vader', age: 60, alliance: 'Empire' },
    { name: 'Palatine', age: 10000, alliance: 'Empire' },
];

suite
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
        const filter = build_fn('name:/Empire');
        LIST_DATA.filter(filter);
    })
    .add('list#FastHaystack', () => {
        const filter = build_fn('age:%Alliance');
        LIST_DATA.filter(filter);
    })
    .add('list#Exists', () => {
        const filter = build_fn('age:?Han');
        LIST_DATA.filter(filter);
    })
    /* TODO: produces undefined method value.indexOf()
    .add('list#ArgValueInItemSeq', () => {
        const filter = build_fn('age:$Han');
        LIST_DATA.filter(filter);
    })*/
    .on('cycle', (evt) => {
        console.log(String(evt.target));
    })
    .run({ async: false });
