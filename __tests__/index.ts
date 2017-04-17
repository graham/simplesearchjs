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

});

