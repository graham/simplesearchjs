import { build_fn } from 'src/index';

describe('project', () => {
    it('should run the filter function', () => {
        const test_data = { haystack: 'this is a test' };

        const filter = build_fn('test');
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

    it('should filter objects based on integer >=', () => {
        const test_data = [
            { name: 'Han', age: 35 },
            { name: 'Leia', age: 21 },
        ];

        const search_string = 'age:>=35';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Han');
    });

    it('should filter objects based on integer >=', () => {
        const test_data = [
            { name: 'Han', age: 35 },
            { name: 'Leia', age: 21 },
        ];

        const search_string = 'age:<=21';
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

    it('true', () => {
        const test_data = [
            {'cool':true},
            {'cool':false}
        ];

        const search_string = "+cool:true";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(1);
    });

    it('false', () => {
        const test_data = [
            {'cool':true},
            {'cool':false}
        ];

        const search_string = "+cool:f";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(1);
    });


    it('string int comp', () => {
        const test_data = [
            {'cool':10},
            {'cool':1}
        ];

        const search_string = "+cool:=1"
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(1);
    });


    it('dont do bad comp', () => {
        const test_data = [
            {'cool':true},
            {'cool':false}
        ];

        const search_string = "+cool:"
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(2);
    });

    it('should test block delimiters.', () => {
        const test_data = [
            {'cool':true},
            {'cool':false}
        ];

        const search_string = "+cool:(f)";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(1);
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

    it('should expand a macro that adds things to the haystack.', () => {
        const test_data = [
            { is_dir: true, path: 'myfolder/', haystack:'folder'},
            { is_dir: false, path: 'myfolder/myfile.txt' },
        ];

        const search_string = 'type:folder';
        const macro_func = (key: string, arg_list: Array<string>) => {
            if (arg_list && arg_list.indexOf('folder') !== -1) {
                return ['is_dir', ['true'], ['folder']];
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

describe('and and or', () => {
    it('supports short circuit or', () => {
        const test_data = [
            {'cool':20},
            {'cool':10}
        ];

        const search_string = "cool:or,20,10";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(2);
    });

    it('supports short circuit and', () => {
        const test_data = [
            {'cool':50},
            {'cool':50}
        ];

        const search_string = "cool:and,20,10";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(0);
    });

    it('supports short circuit and', () => {
        const test_data = [
            {'cool':50},
            {'cool':50}
        ];

        const search_string = "cool:and,20,10";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(0);
    });
});

describe('feature dig_into_object', () => {
    it('match on child key', () => {
        const test_data = [
            {
                host_id: 54321,
                build_history: {
                    timestamp: 1411075727,
                    version: {
                        'number': 'Dropbox-mac-3.1.213'
                    }
                },
            },
            {
                host_id: 12345,
                build_history: {
                    timestamp: 1411075729,
                    version: {
                        'number': 'Dropbox-linux-3.1.213'
                    }
                },
            },
        ];

        const search_string = 'build_history.version.number:%mac';
        const filter = build_fn(search_string);

        const result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].host_id).toBe(54321);
    });
    it('not match on child key that doesnt exist.', () => {
        const test_data = [
            {
                host_id: 54321,
                build_history: {
                    timestamp: 1411075727,
                    version: {
                        'number': 'Dropbox-mac-3.1.213'
                    }
                },
            },
            {
                host_id: 12345,
                build_history: {
                    timestamp: 1411075729,
                    version: {
                        'number': 'Dropbox-linux-3.1.213'
                    }
                },
            },
        ];

        const search_string = 'build_history.version.name:%mac';
        const filter = build_fn(search_string);

        const result = test_data.filter(filter);

        expect(result.length).toBe(0);
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

    it('dont allow regex conditions on fields that dont exist.', () => {
        const test_data = [
            { name: 'han' },
            { name: 'luke' },
        ];

        const search_string = 'last_name:/^..ke$';
        const filter = build_fn(search_string);
        const result = test_data.filter(filter);

        expect(result.length).toBe(0);
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

describe('negative search, exclude', () => {
    it('exclude items', () => {
        const test_data = [
            {'cool':20},
            {'cool':10}
        ];

        const search_string = "-cool:20";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(1);
    });

    it('include items', () => {
        const test_data = [
            {'cool':20},
            {'cool':10}
        ];

        const search_string = "+cool:20";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(1);
    });

    it('missing items', () => {
        const test_data = [
            {'cool':20, fun:'10'},
            {'cool':10}
        ];

        const search_string = "+nope:10";
        const results = test_data.filter(build_fn(search_string));
        expect(results.length).toBe(0);
    });

});

describe('case', () => {
    it('haystack', () => {
        const test_data = {
            haystack: 'Han Leia',
        };

        const filter = build_fn('han', { ignore_case: true });
        const result = filter(test_data);
        expect(result).toBe(true);
    });

    it('object lists', () => {
        const test_data = [
            { name: 'Han' },
            { name: 'Leia' },
        ];
        const filter = build_fn('name:han', { ignore_case: true });
        const results = test_data.filter(filter);
        expect(results.length).toBe(1);
    });

    it('insensitive haystack', () => {
        const test_data = [
            { name: 'Han' },
            { name: 'Leia' },
        ];
        const filter = build_fn('name:i/han');
        const results = test_data.filter(filter);
        expect(results.length).toBe(1);
        expect(results[0].name).toBe('Han');
    });

    it('insensitive haystack (macro)', () => {
        const test_data = [
            { name: 'Han' },
            { name: 'Leia' },
        ];

        const make_case_insensitive_macro_func = (key: string, arg_list: Array<string>) => {
            if (arg_list) {
                return [key, arg_list.map((item) => 'i/'+item)];
            }
        };

        const filter = build_fn('name:han', {
            macros: { 'name': make_case_insensitive_macro_func }
        });

        const results = test_data.filter(filter);
        expect(results.length).toBe(1);
        expect(results[0].name).toBe('Han');
    });
});
