import { build_fn } from 'project/text_to_filter_fun';

describe('project', () => {
    it('should filter string results on basic haystack search', () => {
        var test_data = [
            { 'haystack': 'this is a test' }
        ];

        var search_string: string = 'test';
        var filter = build_fn(search_string);
        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].haystack).toBe(test_data[0]['haystack']);
    });

    it('should filter objects based on integer equality', () => {
        var test_data = [
            { 'name': 'Han', 'age': 35 },
            { 'name': 'Leia', 'age': 21 }
        ];

        var search_string: string = 'age:<30';
        var filter = build_fn(search_string);
        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Leia');
    });

    it('should support emoji searches.', () => {
        var test_data = [
            { 'haystack': 'this is a test 🔮   '} 
        ];

        var search_string: string = '🔮';
        var filter = build_fn(search_string);
        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].haystack).toBe(test_data[0]['haystack']);
    });

});

describe('feature macros', () => {
    it('should expand a macro.', () => {
        var test_data = [
            { 'is_dir': true, 'path': 'myfolder/' },
            { 'is_dir': false, 'path': 'myfolder/myfile.txt' }
        ];

        var search_string: string = 'type:folder';
        var macro_func = (key: string, arg_list: Array<string>) => {
            if (arg_list && arg_list.indexOf("folder") != -1) {
                return ["is_dir", ["true"]];
            }
        };

        var filter = build_fn(search_string, {
            macros: { 'type': macro_func }
        });

        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].is_dir).toBe(true);
    });

    it('should expand a haystack macro that uses a normal macro.', () => {
        var test_data = [
            { 'is_dir': true, 'path': 'myfolder/' },
            { 'is_dir': false, 'path': 'myfolder/myfile.txt' }
        ];

        var search_string: string = '/my';

        var macro_func = (key: string, arg_list: Array<string>) => {
            if (arg_list && arg_list.indexOf("folder") != -1) {
                return ["is_dir", ["true"]];
            }
        };

        var haystack_macro_func = (key: string): any => {
            let conditions: Array<any> = [];
            let remaining_haystack: Array<string> = [];

            if (key[0] == '/') {
                conditions.push('is_dir:true');
                conditions.push('path:~' + key.slice(1));
            }

            return [conditions, remaining_haystack];
        };

        var filter = build_fn(search_string, {
            macros: { 'type': macro_func },
            haystack_macros: { '/.*': haystack_macro_func },
        });

        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].is_dir).toBe(true);
        expect(result[0].path.indexOf('my')).toBe('myfolder/'.indexOf('my'));
    });
});

describe('feature dig_into_object', () => {
    it('match on child key', () => {
        var test_data = [
            {
                "host_id": 54321,
                "build_history": {
                    "timestamp": 1411075727,
                    "version": "Dropbox-mac-3.1.213"
                }
            },
            {
                "host_id": 12345,
                "build_history": {
                    "timestamp": 1411075729,
                    "version": "Dropbox-linux-3.1.213"
                }
            }
        ];

        var search_string: string = "build_history.version:%mac";
        var filter = build_fn(search_string);

        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].host_id).toBe(54321);
    });
});

describe('compose types and conditions', () => {
    it('allow and conditions', () => {
        var test_data = [
            {
                name: "Han Solo",
                points: 200
            },
            {
                name: "Leia Organa",
                points: 500
            }
        ];

        var search_string: string = "points:&,<400,>100";
        var filter = build_fn(search_string);

        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Han Solo");
    });

    it('allow or conditions', () => {
        var test_data = [
            {
                name: "Han Solo",
                points: 200
            },
            {
                name: "Leia Organa",
                points: 500
            }
        ];

        var search_string: string = "points:|,>400,<100";
        var filter = build_fn(search_string);

        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe("Leia Organa");
    });

    it('allow item in list conditions', () => {
        var test_data = [
            {
                'name': 'even',
                'numbers': [2, 4, 6, 8, 10]
            },
            {
                'name': 'odd',
                'numbers': [1, 3, 5, 7, 9]
            }
        ];

        var search_string: string = "numbers:$2";
        var filter = build_fn(search_string);

        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('even');
    });

    it('allow not conditions', () => {
        var test_data = [
            { 'name': 'han' },
            { 'name': 'luke' }
        ];

        var search_string: string = 'name:!luke';
        var filter = build_fn(search_string);
        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('han');
    });

    it('allow equal conditions', () => {
        var test_data = [
            { 'name': 'han' },
            { 'name': 'luke' }
        ];

        var search_string: string = 'name:=luke';
        var filter = build_fn(search_string);
        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('luke');
    });

    it('allow regex conditions', () => {
        var test_data = [
            { 'name': 'han' },
            { 'name': 'luke' }
        ];

        var search_string: string = 'name:~^..ke$';
        var filter = build_fn(search_string);
        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('luke');
    });

    it('allow indexOf conditions', () => {
        var test_data = [
            { 'name': 'han' },
            { 'name': 'luke' }
        ];

        var search_string: string = 'name:%lu';
        var filter = build_fn(search_string);
        var result = test_data.filter(filter);

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('luke');
    });

});
