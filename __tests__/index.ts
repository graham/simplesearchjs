import { build_fn } from 'project/text_to_filter_fun';

describe('project', () => {
    it('should filter string results on basic haystack search', () => {
        var test_data = [
            {'haystack': 'this is a test'}
        ];
        
        var search_string:string = 'test';
        var filter:Function = build_fn(search_string);
        var result:any = [];

        test_data.forEach((item) => {
            if (filter(item)) {
                result.push(item);
            }
        });

        expect(result.length).toBe(1);
        expect(result[0].haystack).toBe(test_data[0]['haystack']);
    });

    it('should filter objects based on integer equality', () => {
        var test_data = [
            {'name':'Han', 'age': 35},
            {'name':'Leia', 'age': 21}
        ];
        
        var search_string:string = 'age:<30';
        var filter:Function = build_fn(search_string);
        var result:any = [];

        test_data.forEach((item) => {
            if (filter(item)) {
                result.push(item);
            }
        });

        expect(result.length).toBe(1);
        expect(result[0].name).toBe('Leia');
    });

    it('should support emoji searches.', () => {
        var test_data = [
            {'haystack': 'this is a test 🔮   '}
        ];

        var search_string:string = '🔮';
        var filter:Function = build_fn(search_string);
        var result:any = [];

        test_data.forEach((item) => {
            if (filter(item)) {
                result.push(item);
            }
        });

        expect(result.length).toBe(1);
        expect(result[0].haystack).toBe(test_data[0]['haystack']);
    });

});

describe('feature_macros', () => {
    it('should expand a macro.', () => {
        var test_data = [
            {'is_dir':true, 'path':'myfolder/'},
            {'is_dir':false, 'path':'myfolder/myfile.txt'}
        ];

        var search_string:string = 'type:folder';
        var macro_func:Function = (key:string, arg_list:Array<string>) => {
            if (arg_list && arg_list.indexOf("folder") != -1) {
                return ["is_dir", ["true"]];
            }
        };

        var filter:Function = build_fn(search_string, {
            macros: { 'type': macro_func }
        });

        var result:any = [];

        test_data.forEach((item) => {
            if (filter(item)) {
                result.push(item);
            }
        });

        expect(result.length).toBe(1);
        expect(result[0].is_dir).toBe(true);
    });

    it('should expand a haystack macro that uses a normal macro.', () => {
        var test_data = [
            {'is_dir':true, 'path':'myfolder/'},
            {'is_dir':false, 'path':'myfolder/myfile.txt'}
        ];

        var search_string:string = '/my';

        var macro_func:Function = (key:string, arg_list:Array<string>) => {
            if (arg_list && arg_list.indexOf("folder") != -1) {
                return ["is_dir", ["true"]];
            }
        };

        var haystack_macro_func:Function = (key:string): any => {
            let conditions:Array<any> = [];
            let remaining_haystack:Array<string> = [];

            if (key[0] == '/') {
                conditions.push('is_dir:true');
                conditions.push('path:~' + key.slice(1));
            }

            return [conditions, remaining_haystack];
        };

        var filter:Function = build_fn(search_string, {
            macros: { 'type': macro_func },
            haystack_macros: {'/.*': haystack_macro_func },
        });

        var result:any = [];

        test_data.forEach((item) => {
            if (filter(item)) {
                result.push(item);
            }
        });

        expect(result.length).toBe(1);
        expect(result[0].is_dir).toBe(true);
        expect(result[0].path.indexOf('my')).toBe('myfolder/'.indexOf('my'));
    });
});

describe('feature dig_into_object', () => {
    it('match on child key', () => {
        var data = [
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

        var search_string:string = "build_history.version:%mac";
        var filter:Function = build_fn(search_string);

        var result:any = [];

        data.forEach((item) => {
            if (filter(item)) {
                result.push(item);
            }
        });

        expect(result.length).toBe(1);
        expect(result[0].host_id).toBe(54321);
    });
});
