import { build_fn } from 'src/index';

describe('project', () => {
    it('should run the filter function', () => {

        const test_data = { haystack: 'this is a test' };
        const search_string = 'test';

        const filter = build_fn(search_string);
        const filter2 = build_fn('foo');

        const result = filter(test_data);
        const result2 = filter2(test_data);

        expect(result).toBe(true);
        expect(result2).toBe(false);
    });

    it('should filter string results on basic haystack search', () => {
        const test_data = [
            { haystack: 'this is a test' },
        ];

        const search_string = 'test';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].haystack).toBe('this is a test');
    });

    it('should filter objects based on integer equality', () => {
        const test_data = [
            { name: 'Han', age: 35 },
            { name: 'Leia', age: 21 },
        ];

        const search_string = 'age:<30';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Leia');
    });

    it('should support emoji searches.', () => {
        const test_data = [
            { haystack: 'this is a test 🔮' },
        ];

        const search_string = '🔮';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].haystack).toBe('this is a test 🔮');
    });

});

describe('feature_macros', () => {
    it('should expand a macro.', () => {
        const test_data = [
            { is_dir: true, path: 'myfolder/' },
            { is_dir: false, path: 'myfolder/myfile.txt' },
        ];

        const search_string = 'type:folder';
        const macro_func = (key: string, arg_list: Array<string>) => {
            if (arg_list && arg_list.indexOf('folder') !== -1) {
                return ['is_dir', ['true']];
            }
        };

        const filter = build_fn(search_string, {
            macros: { type: macro_func },
        });

        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].is_dir).toBe(true);
    });

    it('should expand a haystack macro that uses a normal macro.', () => {
        const test_data = [
            { is_dir: true, path: 'myfolder/' },
            { is_dir: false, path: 'myfolder/myfile.txt' },
        ];

        const search_string = '/my';

        const macro_func = (key: string, arg_list: Array<string>) => {
            if (arg_list && arg_list.indexOf('folder') !== -1) {
                return ['is_dir', ['true']];
            }
        };

        const haystack_macro_func = (key: string): any => {
            const conditions: Array<any> = [];
            const remaining_haystack: Array<string> = [];

            if (key[0] === '/') {
                conditions.push('is_dir:true');
                conditions.push('path:/' + key.slice(1));
            }

            return [conditions, remaining_haystack];
        };

        const filter = build_fn(search_string, {
            macros: { type: macro_func },
            haystack_macros: { '/.*': haystack_macro_func },
        });

        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].is_dir).toBe(true);
        expect(result[0].path.indexOf('my')).toBe('myfolder/'.indexOf('my'));
    });
});

describe('feature dig_into_object', () => {
    it('match on child key', () => {
        const test_data = [
            {
                host_id: 54321,
                build_history: {
                    timestamp: 1411075727,
                    version: 'Dropbox-mac-3.1.213',
                },
            },
            {
                host_id: 12345,
                build_history: {
                    timestamp: 1411075729,
                    version: 'Dropbox-linux-3.1.213',
                },
            },
        ];

        const search_string = 'build_history.version:%mac';
        const filter = build_fn(search_string);

        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].host_id).toBe(54321);
    });
});

describe('compose types and conditions', () => {
    it('allow and conditions', () => {
        const test_data = [
            {
                name: 'Han Solo',
                points: 200,
            },
            {
                name: 'Leia Organa',
                points: 500,
            },
        ];

        const search_string = 'points:&,<400,>100';
        const filter = build_fn(search_string);

        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Han Solo');
    });

    it('allow or conditions', () => {
        const test_data = [
            {
                name: 'Han Solo',
                points: 200,
            },
            {
                name: 'Leia Organa',
                points: 500,
            },
        ];

        const search_string = 'points:|,>400,<100';
        const filter = build_fn(search_string);

        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Leia Organa');
    });

    it('allow item in list conditions', () => {
        const test_data = [
            {
                name: 'even',
                numbers: [2, 4, 6, 8, 10],
            },
            {
                name: 'odd',
                numbers: [1, 3, 5, 7, 9],
            },
        ];

        const search_string = 'numbers:$2';
        const filter = build_fn(search_string);

        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('even');
    });

    it('allow not conditions', () => {
        const test_data = [
            { name: 'han' },
            { name: 'luke' },
        ];

        const search_string = 'name:!luke';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('han');
    });

    it('allow equal conditions', () => {
        const test_data = [
            { name: 'han' },
            { name: 'luke' },
        ];

        const search_string = 'name:=luke';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('luke');
    });

    it('allow regex conditions', () => {
        const test_data = [
            { name: 'han' },
            { name: 'luke' },
        ];

        const search_string = 'name:/^..ke$';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('luke');
    });

    it('allow indexOf conditions', () => {
        const test_data = [
            { name: 'han' },
            { name: 'luke' },
        ];

        const search_string = 'name:%lu';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('luke');
    });
});

describe('extra data', () => {
    it('handles extra data.', () => {
        const hostname_lookup: { [id: string]: string } = {
            '12345': 'whatever-host',
            '54321': 'host-of-hosts'
        };

        const test_data = [
            { host_id: 12345 },
            { host_id: 54321 }
        ];

        const search_string = 'host_id:12345 whatever';

        const filter = build_fn(search_string);

        let result: Array<any> = [];
        for (var item of test_data) {
            let extra = { 'haystack': hostname_lookup["" + item.host_id] };

            if (filter([item, extra])) {
                result.push(item);
            }
        }

        expect(result.length).toBe(1);
        expect(result[0].host_id).toBe(12345);
    });
});

describe('string matching', () => {
    it('fuzzy should be default.', () => {
        const test_data = [
            { host_id: 12345, name: 'graham' },
            { host_id: 54321, name: 'vutran' }
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
    });

    it('fuzzy should be default.', () => {
        const test_data = [
            { host_id: 12345, name: 'graham' },
            { host_id: 54321, name: 'vutran' }
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
    });
});
