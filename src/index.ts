/*
   text_to_filter takes a simple (gmail like) search string and returns
   a javascript function that accepts one argument, a javascript object,
   and returns a true or false depending on if that object matches the
   search string.

   The primary goals are expressiveness and speed, with a secondary goals
   on readability. This second goal is easy to overcome with macros which
   allow search criteria rewriting per use (examples below).

   Generated Function -> The function returned by calling build_fn with
                         some search criteria.

   Item -> Generally refers to the javascript object passed to the
           generated function.

   Search Type determines if a positive match will include or exclude the
   item in the search result. Prepending a '\' or '-' before a condition
   sets that criteria to exclude, '+' or '/' for include (if neither are
   present include is assumed).
*/

const BLOCK_CHARS: { [id: string]: string } = {
    '"': '"',
    "'": "'",
    '`': '`',
};

const SearchType = {
    Include: 0,
    Exclude: 1,
    Additive: 2,
};

/*
   Cond is the basic building block of all our comparisons, more detail
   inline.

   Where:
     item  => passed in item.
     key   => queried key.
     value => value of argument
*/

const Cond = {
    Unspecified: 0,
    Exists: 1, // item[key] != undefined
    Equal: 2, // item[key] == value OR item[key](value)
    NotEqual: 3, // item[key] != value OR item[key](value)
    LessThan: 4, // item[key] < value OR item[key](value)
    LessThanOrEqual: 5,
    GreaterThan: 6, // item[key] > value OR item[key](value)
    GreaterThanOrEqual: 7,
    ArgValueInItemSeq: 8, // value in item[key]
    ItemValueInArgSeq: 9, // item[key] in value
    ArgValueNotInItemSeq: 10,
    ItemValueNotInArgSeq: 11,
    Haystack: 12, // See implementation, allows RegEx
    InsensitiveHaystack: 13, // case insensitive regex.
    FastHaystack: 14, // See implementation, uses indexOf
};

/*
   Composition types are part of every query,
   determines how the set of conditions will be evaluated.
*/

const ComposeType = {
    OR: 0, // Composeable OR
    AND: 1, // Composeable AND
    NAND: 2, // Composeable NAND
    XOR: 3, // Composeable XOR
};

// Start characters can only be one charater long, may add more here in
// the future if needed.
let cond_lookup: { [type: string]: number } = {
    '=': Cond.Equal,
    '!': Cond.NotEqual,
    '>': Cond.GreaterThan,
    '<': Cond.LessThan,
    '/': Cond.Haystack,
    '%': Cond.FastHaystack,
    '?': Cond.Exists,

    'has:': Cond.ArgValueInItemSeq,
    'in:': Cond.ItemValueInArgSeq,

    '!has:': Cond.ArgValueNotInItemSeq,
    '!in:': Cond.ItemValueNotInArgSeq,

    // Two character matches.
    '!=': Cond.NotEqual,
    'i/': Cond.InsensitiveHaystack,
    '>=': Cond.GreaterThanOrEqual,
    '<=': Cond.LessThanOrEqual,
};

let cond_special_characters: Array<string> = Object.keys(cond_lookup);

let cond_english_lookup: { [id: number]: string } = {};
for (let key in cond_lookup) {
    cond_english_lookup[cond_lookup[key]] = key;
}

let regex_condition_cache: { [id: string]: any } = {};

// Our cond function lookup.
let fn_lookup: any = {};

fn_lookup[Cond.Equal] = function(value: any, arg: any) {
    return value == arg;
};

fn_lookup[Cond.NotEqual] = function(value: any, arg: any) {
    return value != arg;
};

fn_lookup[Cond.LessThan] = function(value: any, arg: any) {
    return value < arg;
};

fn_lookup[Cond.GreaterThan] = function(value: any, arg: any) {
    return value > arg;
};

fn_lookup[Cond.GreaterThanOrEqual] = function(value: any, arg: any) {
    return value >= arg;
};

fn_lookup[Cond.LessThanOrEqual] = function(value: any, arg: any) {
    return value <= arg;
};

fn_lookup[Cond.Exists] = function(value: any, arg: any) {
    return value !== undefined;
};

fn_lookup[Cond.ArgValueInItemSeq] = function(value: any, arg: any) {
    return value.indexOf(arg) != -1;
};

fn_lookup[Cond.ItemValueInArgSeq] = function(value: any, arg: any) {
    if (value == arg) {
        return true;
    }
    return false;
};

fn_lookup[Cond.ArgValueNotInItemSeq] = function(value: any, arg: any) {
    return value.indexOf(arg) == -1;
};

fn_lookup[Cond.FastHaystack] = function(value: any, arg: any) {
    let target_type = typeof value;
    if (arg.length == 0) {
        return false;
    }

    // Coerce the type if both sides don't match.
    if (target_type == undefined) {
        return false;
    } else if (target_type == 'string') {
        return value.indexOf(arg) != -1;
    } else if (target_type == 'number') {
        return ('' + value).indexOf(arg) != -1;
    }
    return false;
};

fn_lookup[Cond.Haystack] = function(value: any, arg: any) {
    let target_type = typeof value;
    if (arg.length == 0) {
        return false;
    }

    let regex_test: RegExp = regex_condition_cache[arg];
    if (regex_test == undefined) {
        try {
            regex_test = new RegExp(arg);
            regex_condition_cache[arg] = regex_test;
        } catch (e) {
            // the regex failed to compile
            return false;
        }
    }

    // Coerce the type if both sides don't match.
    if (target_type == undefined) {
        return false;
    } else if (target_type == 'string') {
        return regex_test.test(value);
    } else {
        return regex_test.test('' + value);
    }
};

fn_lookup[Cond.InsensitiveHaystack] = function(value: any, arg: any) {
    let target_type = typeof value;
    if (arg.length == 0) {
        return false;
    }

    let key = 'i' + arg;
    let regex_test: RegExp = regex_condition_cache[key];
    if (regex_test == undefined) {
        regex_test = new RegExp(arg, 'i');
        regex_condition_cache[key] = regex_test;
    }

    // Coerce the type if both sides don't match.
    if (target_type == undefined) {
        return false;
    } else if (target_type == 'string') {
        return regex_test.test(value);
    } else {
        return regex_test.test('' + value);
    }
};

// Tokenize a search in a way that we feel good about.
let safe_split = function safe_split(
    s: string,
    split_char: string,
    strip_block_chars?: boolean
): Array<any> {
    if (strip_block_chars == undefined) {
        strip_block_chars = false;
    }

    let block_chars: { [id: string]: string } = BLOCK_CHARS;

    let partitions = [];
    let current_word = [];
    let in_block = false;
    let block_start_char = null;

    for (let i = 0; i < s.length; i++) {
        let chr = s[i];
        if (in_block) {
            if (
                block_start_char !== null &&
                chr == block_chars[block_start_char]
            ) {
                if (!strip_block_chars) {
                    current_word.push(chr);
                }
                in_block = false;
                block_start_char = null;
            } else {
                current_word.push(chr);
            }
        } else {
            if (split_char.indexOf(chr) != -1) {
                partitions.push(current_word.join(''));
                current_word = [];
            } else {
                if (block_chars[chr] != undefined) {
                    // we should start a block
                    in_block = true;
                    block_start_char = chr;
                    if (!strip_block_chars) {
                        current_word.push(chr);
                    }
                } else {
                    current_word.push(chr);
                }
            }
        }
    }

    if (current_word.length) {
        partitions.push(current_word.join(''));
    }
    return partitions;
};

// Create a set of search tokens given a search query.
let string_to_search_tokens = function(
    s: string,
    macro_map: { [id: string]: Function },
    haystack_macro_map: { [id: string]: Function },
    haystack_as_one_token: boolean,
    haystack_key: string,
): Array<any> {
    let haystack_tokens: Array<any> = [];
    let final_tokens: Array<any> = [];
    let init_tokens: Array<string> = safe_split(s, ' ');
    let condition_tokens: Array<any> = [];

    // first we split up the haystack from the pure conditions.
    for (let tok of init_tokens) {
        let index = tok.search(':');
        if (index == -1) {
            if (BLOCK_CHARS[tok[0]] == tok[tok.length - 1]) {
                haystack_tokens.push(tok.slice(1, tok.length - 1));
            } else {
                haystack_tokens.push(tok);
            }
        } else {
            condition_tokens.push(tok);
        }
    }

    if (haystack_as_one_token == true && haystack_tokens.length > 0) {
        haystack_tokens = [haystack_tokens.join(' ')];
    }

    // Next we macro expand haystack conditions, which are regexes, and can only
    // be one level deep. (need docs)
    // See the haystack macro to normal macro test for an example.
    let final_haystack: Array<any> = [];
    for (let tok of haystack_tokens) {
        let found: boolean = false;
        for (let macro_match of Object.keys(haystack_macro_map)) {
            let extra_conditions: Array<any> = [];
            let more_haystack: Array<string> = [];
            if (tok.search(macro_match) != -1) {
                [extra_conditions, more_haystack] = haystack_macro_map[
                    macro_match
                ](tok);
                extra_conditions.forEach(item => {
                    condition_tokens.push(item);
                });
                more_haystack.forEach(item => {
                    final_haystack.push([Cond.FastHaystack, item]);
                });
                found = true;
            }
        }

        if (!found) {
            final_haystack.push([Cond.InsensitiveHaystack, tok]);
        }
    }

    // We now have a final haystack and only conditions.
    // Here, there are still condition level macros, but macros can only
    // modify the item, not create more conditions.
    for (let tok of condition_tokens) {
        let index = tok.search(':');
        let key: string = tok.slice(0, index);
        let arg_list = safe_split(tok.slice(index + 1), ',', true);

        if (key == '' || key == '_' || key == '+_') {
            key = haystack_key;
        } else if (key == '-' || key == '-_') {
            key = '-' + haystack_key;
        }

        let macro: Function = macro_map[key];
        let more_haystack: Array<string> = [];

        if (macro != undefined) {
            let result = macro(key, arg_list);
            if (result != undefined) {
                [key, arg_list, more_haystack] = result;
                if (more_haystack) {
                    more_haystack.forEach(item => {
                        final_haystack.push([Cond.FastHaystack, item]);
                    });
                }
            }
        }

        let new_token = gen_token_from_key_args(key, arg_list);

        if (new_token) {
            final_tokens.push(new_token);
        }
    }

    final_tokens.push([
        SearchType.Include,
        haystack_key,
        ComposeType.OR,
        final_haystack,
    ]);

    return final_tokens;
};

// Generate a token for a given key and it's arguments.
let gen_token_from_key_args = function(
    key: string,
    arg_list: Array<string>
): Array<any> {
    // Determine if this search is inclusive or exclusive.
    let addrem = SearchType.Include;
    let compose_type = ComposeType.OR;

    if (key[0] == '-') {
        addrem = SearchType.Exclude;
        key = key.slice(1);
    } else if (key[0] == '+') {
        addrem = SearchType.Additive;
        key = key.slice(1);
    }

    if (arg_list.length == 0) {
        return [];
    }

    if (arg_list[0] == 'and') {
        compose_type = ComposeType.AND;
        arg_list = arg_list.slice(1);
    } else if (arg_list[0] == 'or') {
        compose_type = ComposeType.OR;
        arg_list = arg_list.slice(1);
    }

    let new_arg_list = [];

    for (let arg of arg_list) {
        let cond: number = Cond.Unspecified;
        let narg: any = arg;

        for (let i = 1; i < arg.length; i++) {
            let start = arg.slice(0, i);
            if (cond_special_characters.indexOf(start) != -1) {
                cond = cond_lookup[start];
                narg = arg.slice(i);
            }
        }

        // make sure we get the integer value
        if (!isNaN(+narg)) {
            narg = +narg;
        }

        if (cond != Cond.Haystack && cond != Cond.InsensitiveHaystack) {
            // If the user used true or t, coerce to boolean.
            if (narg == 't' || narg == 'true') {
                narg = true;
            } else if (narg == 'f' || narg == 'false') {
                narg = false;
            }
        }

        new_arg_list.push([cond, narg]);
    }

    let new_token = [addrem, key, compose_type, new_arg_list];

    return new_token;
};

// If a key is referencing nested data, retrieve it.
let dig_key_value = function(value: any, key: string): any {
    if (key == undefined) {
        return undefined;
    }

    let key_parts = key.split('.');

    if (key_parts.length == 1) {
        return value[key];
    } else {
        for (let part of key_parts) {
            if (value[part] == undefined) {
                return undefined;
            }
            value = value[part];
        }
    }

    return value;
};

let dig_sort = function(arrayVar: Array<any>, key?: string, reverse?: boolean) {
    let DEFAULT_MISSING_VALUE = Number.MAX_VALUE;

    if (reverse == true) {
        DEFAULT_MISSING_VALUE = Number.MIN_VALUE;
    }

    if (key) {
        arrayVar.sort(function(a: any, b: any): number {
            let aValue = dig_key_value(a, key) || DEFAULT_MISSING_VALUE;
            let bValue = dig_key_value(b, key) || DEFAULT_MISSING_VALUE;
            return aValue - bValue;
        });
    } else {
        arrayVar.sort(function(a: any, b: any): number {
            let aValue = a || DEFAULT_MISSING_VALUE;
            let bValue = b || DEFAULT_MISSING_VALUE;
            return aValue - bValue;
        });
    }

    if (reverse) {
        arrayVar.reverse();
    }
}


// Compose a list of tokens and then use the build_filter_fn_from_tokens
// to create a function for the user to filter with.
let new_build_fn = function(q: string, options?: { [key: string]: any }): any {
    if (options == undefined) {
        options = {};
    }

    q = q.trim();
    let haystack_key: string = options['haystack_key'] || 'haystack';
    let macro_map = options['macros'] || {};
    let haystack_macro_map = options['haystack_macros'] || {};
    let ignore_case = options['ignore_case'] || false;
    let haystack_as_one_token = options['haystack_as_one_token'] || false;

    let final_tokens = string_to_search_tokens(
        q,
        macro_map,
        haystack_macro_map,
        haystack_as_one_token,
        haystack_key,
    );
    let condition_fns: Array<any> = [];
    let use_additive = false;

    for (let outer_token of final_tokens) {
        if (outer_token[0] == SearchType.Additive) {
            use_additive = true;
        }

        let lambda = function(item: any): boolean {
            let ret = true;
            let [addrem, key, compose_type, args] = outer_token;
            let value = dig_key_value(item, key);

            // This occurs when we have an empty arg often,
            // search = 'tag:' (likley we need more input)
            // we fail open/true here because it shouldn't
            // modify the valid parts of the search.
            if (key == undefined && value == undefined) {
                return true;
            }

            for (let arg of args) {
                let fn_cond_enum = arg[0];

                if (fn_cond_enum == Cond.Unspecified) {
                    if (typeof value == 'string') {
                        fn_cond_enum = Cond.FastHaystack;
                    } else {
                        fn_cond_enum = Cond.Equal;
                    }
                }

                try {
                    if (typeof value == 'undefined') {
                        ret = false;
                    } else {
                        let haystack = value;
                        let needle = arg[1];
                        if (ignore_case) {
                            if (typeof needle === 'string') {
                                needle = needle.toLowerCase();
                            }
                            if (typeof haystack === 'string') {
                                haystack = haystack.toLowerCase();
                            }
                        }
                        ret = fn_lookup[fn_cond_enum](haystack, needle);
                    }
                } catch (e) {
                    console.log(
                        'Exception in cond: ',
                        e,
                        fn_lookup[fn_cond_enum]
                    );
                    ret = true;
                }

                if (addrem == SearchType.Exclude) {
                    ret = !ret;
                }

                if (compose_type == ComposeType.OR && ret == true) {
                    return true;
                } else if (compose_type == ComposeType.AND && ret == false) {
                    return false;
                }
            }

            return ret;
        };
        condition_fns.push([outer_token[0], lambda]);
    }

    return function(item: any, _index: number, _accum: any[]): any {
        let new_item: { [id: string]: any } = {};

        if (Array.isArray(item)) {
            new_item = Object.assign({}, ...item);
        } else if (typeof item === "string") {
            new_item = {};
            new_item[haystack_key] = item;
            new_item['_'] = item;
        } else {
            new_item = item;
        }

        if (use_additive) {
            let normal_fns = condition_fns.filter(([ar, fn]) => ar != SearchType.Additive);
            let additive_fns = condition_fns.filter(([ar, fn]) => ar == SearchType.Additive);

            let current_ret = true;
            if (additive_fns.length > 0) {
                current_ret = false;
                additive_fns.forEach(([_, fn]) => {
                    current_ret = current_ret || fn(new_item);
                });
                if (!current_ret) {
                    return false;
                }
            }

            if (normal_fns.length > 0) {
                normal_fns.forEach(([_, fn]) => {
                    current_ret = current_ret && fn(new_item);
                });
                if (!current_ret) {
                    return false;
                }
            }
            return true;
        } else {
            for (let [addrem, fn] of condition_fns) {
                if (fn(new_item) == false) {
                    return false;
                }
            }
            return true;
        }
    };
};


let fn_cache: { [id: string]: any } = {};
let build_fn = function(q: string, options?: { [key: string]: any }): any {
    let command_split_char = '|'
    if (q.indexOf(command_split_char) != -1) {
        let chunks = q.split(command_split_char);
        let fns = [];
        chunks.forEach((chunk) => {
            let chunk_fn = new_build_fn(chunk, options);
            fns.push(chunk_fn);
        });

        fns.reverse();

        return function(item: any, _index: number, _accum: any[]): any {
            for (let i = 0; i < fns.length; i++) {
                let fn = fns[i];
                if (fn(item, _index, _accum) == false) {
                    return false;
                }
            }
            return true;
        };
    }

    if (fn_cache[q] == undefined) {
        fn_cache[q] = new_build_fn(q, options);
    }

    return fn_cache[q];
}

let cached_build_fn = build_fn;

let search_and_sort = (list: Array<any>, query: string, options: any): Array<any> => {
    let sort_desc_char = '\\>';
    let sort_asc_char = '\\<';

    let sort_key = null;
    let sort_reverse = false;

    let search_query = query;

    if (query.indexOf(sort_desc_char) != -1) {
        let sp = search_query.split(sort_desc_char);
        search_query = sp[0].trim();
        sort_key = sp[1].trim();
        sort_reverse = true;
    } else if (query.indexOf(sort_asc_char) != -1) {
        let sp = search_query.split(sort_asc_char);
        search_query = sp[0].trim();
        sort_key = sp[1].trim();
        sort_reverse = false;
    }

    let fn = build_fn(search_query, options);

    let filtered_rows = list.filter(fn);

    if (sort_key != null) {
        dig_sort(filtered_rows, sort_key, sort_reverse);
    }

    return filtered_rows;
}

export {
    build_fn,
    cached_build_fn,
    new_build_fn,
    string_to_search_tokens,
    dig_key_value,
    dig_sort,
    search_and_sort,
};
