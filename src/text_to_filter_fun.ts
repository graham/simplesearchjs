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

enum SearchType {
    Include,
    Exclude
};

/* 
   Cond is the basic building block of all our comparisons, more detail
   inline.

   Where: 
     item  => passed in item.
     key   => queried key.
     value => value of argument
*/

enum Cond {
    Exists,             // item[key] != undefined
    Equal,              // item[key] == value OR item[key](value)
    NotEqual,           // item[key] != value OR item[key](value)
    LessThan,           // item[key] < value OR item[key](value)
    GreaterThan,        // item[key] > value OR item[key](value)
    ArgValueInItemSeq,  // value in item[key]
    ItemValueInArgSeq,  // item[key] in value
    Fuzzy               // See implementation.
};

/* 
   Composition types are part of every query,
   determines how the set of conditions will be evaluated.
*/

enum ComposeType {
    OR,          // Composeable OR
    AND,         // Composeable AND
    NAND,        // Composeable NAND
    XOR          // Composeable XOR
};

// Start characters can only be one charater long, may add more here in
// the future if needed.
let cond_lookup = {
    '=': Cond.Equal,
    '!': Cond.NotEqual,
    '>': Cond.GreaterThan,
    '<': Cond.LessThan,
    '~': Cond.Fuzzy,
    '?': Cond.Exists,
    '$': Cond.ArgValueInItemSeq
};

let cond_english_lookup = {};
for (let key in cond_lookup) {
    cond_english_lookup[cond_lookup[key]] = key;
}

// Our cond function lookup.
let fn_lookup: any = {};

fn_lookup[Cond.Equal] = function (value, arg) {
    return value == arg;
};

fn_lookup[Cond.NotEqual] = function (value, arg) {
    return value != arg;
};

fn_lookup[Cond.LessThan] = function (value, arg) {
    return value < arg;
};

fn_lookup[Cond.GreaterThan] = function (value, arg) {
    return value > arg;
};

fn_lookup[Cond.Exists] = function (value, arg) {
    return value !== undefined;
};

fn_lookup[Cond.ArgValueInItemSeq] = function (value, arg) {
    return value.indexOf(arg) != -1;
};

fn_lookup[Cond.ItemValueInArgSeq] = function (value, arg) {
    return arg.indexOf(value) == -1;
};

fn_lookup[Cond.Fuzzy] = function (value, arg) {
    let target_type = typeof (value);
    if (arg.length == 0) { return false; }

    // Coerce the type if both sides don't match.
    if (target_type == undefined) {
        return false;
    } else if (target_type == "string") {
        return value.search(arg) != -1;
    } else if (target_type == "number") {
        return ("" + value).search(arg) != -1;
    }
    return false;
};

// Tokenize a search in a way that we feel good about.
let safe_split = function safe_split(s: string, split_char: string, strip_block_chars?: boolean): Array<any> {
    if (strip_block_chars == undefined) {
        strip_block_chars = false;
    }

    let block_chars = {
        '"': '"',
        "'": "'",
        '(': ')',
        '[': ']',
        '`': '`'
    };

    var partitions = [];
    var current_word = [];
    var in_block = false;
    var block_start_char = null;

    for (var i = 0; i < s.length; i++) {
        var chr = s[i];
        if (in_block) {
            if (chr == block_chars[block_start_char]) {
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
let string_to_search_tokens = function (s: string): Array<any> {
    let fuzzy_token = [];
    let final_tokens = [];
    let init_tokens = safe_split(s, ' ');

    for (let tok of init_tokens) {
        let index = tok.search(':')
        if (index == -1) {
            fuzzy_token.push([Cond.Fuzzy, tok]);
        } else {
            let key = tok.slice(0, index);
            let arg_list = safe_split(tok.slice(index + 1), ',', true);
            let new_token = gen_token_from_key_args(key, arg_list);
            if (new_token) {
                final_tokens.push(new_token);
            }
        }
    }

    final_tokens.push([SearchType.Include, 'fuzzy', ComposeType.OR, fuzzy_token]);

    return final_tokens;
};

// Convert a token to something readable by a human.
let token_to_english = function (token: Array<any>): string {
    let [addrem, key, compose_type, args] = token;
    let s = [];

    // Search Type
    s.push(SearchType[addrem]);
    s.push(`results where ${key} matches`);

    s.push(args.map(function (arg) {
        return ' ' + Cond[arg[0]] + ' |' + arg[1] + '| ';
    }).join(ComposeType[compose_type]));

    return s.join(' ');
};

// Convert a token back to a safe query value.
let token_to_query = function (token: Array<any>): string {
    let [addrem, key, compose_type, args] = token;
    let s = [];

    if (addrem == SearchType.Include) {
        //pass
    } else if (addrem == SearchType.Exclude) {
        s.push('-');
    }

    s.push(key);
    s.push(':');

    if (compose_type == ComposeType.AND) {
        s.push('&,');
    }

    s.push(args.map(function (arg) {
        return "`" + cond_english_lookup[arg[0]] + arg[1] + "`";
    }).join(','));

    return s.join('');
};

// Generate a token for a given key and it's arguments.
let gen_token_from_key_args = function (key: string, arg_list: Array<string>): Array<any> {
    // Determine if this search is inclusive or exclusive.
    let addrem = SearchType.Include;
    let cond = Cond.Equal;
    let compose_type = ComposeType.OR;

    if (key[0] == '-') {
        addrem = SearchType.Exclude;
        key = key.slice(1);
    } else if (key[0] == '+') {
        addrem = SearchType.Include;
        key = key.slice(1);
    }

    if (arg_list.length == 0) {
        return null;
    }

    if (arg_list[0] == '&') {
        compose_type = ComposeType.AND;
        arg_list = arg_list.slice(1);
    }

    let new_arg_list = [];

    for (let arg of arg_list) {
        let cond = Cond.Equal;
        let narg: any = arg;

        if (cond_lookup.hasOwnProperty(arg[0])) {
            cond = cond_lookup[arg[0]];
            narg = arg.slice(1);
        }

        if (!isNaN(+narg)) {
            narg = +narg;
        }
        if (narg == 't' || narg == 'true') {
            narg = true;
        } else if (narg == 'f' || narg == 'false') {
            narg = false;
        }

        new_arg_list.push([cond, narg]);
    }

    let new_token = [
        addrem,
        key,
        compose_type,
        new_arg_list
    ];

    return new_token;
};

// If a key is referencing nested data, retrieve it.
let dig_key_value = function (key, value): any {
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
}

// Compose a list of tokens and then use the build_filter_fn_from_tokens
// to create a function for the user to filter with.
let build_fn = function (q: string, options?: {}): any {
    if (options == undefined) {
        options = {};
    }

    let fuzzy_key = options['fuzzy_key'] || 'fuzzy';
    let macro_map = options['macros'] || {};

    let final_tokens = string_to_search_tokens(q);
    let condition_fns = [];

    for (let outer_token of final_tokens) {
        var lambda = function (item: any): boolean {
            let ret = true;
            let [addrem, key, compose_type, args] = outer_token;
            let value = dig_key_value(key, item);

            for (let arg of args) {
                let fn_cond_enum = arg[0];

                try {
                    if (typeof value == "function") {
                        if (fn_cond_enum == Cond.Exists) {
                            ret = true;
                        } else {
                            ret = value.apply(item, [arg[1]]);
                        }
                    } else if (typeof value == "undefined") {
                        ret = false;
                    } else {
                        ret = fn_lookup[fn_cond_enum](value, arg[1]);
                    }
                } catch (e) {
                    console.log("Exception in cond: ", fn_lookup[fn_cond_enum]);;
                    ret = true;
                }

                if (addrem == SearchType.Include) {
                    //ret;
                } else if (addrem == SearchType.Exclude) {
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
        condition_fns.push(lambda);
    }

    //console.log(JSON.stringify(final_tokens));
    return function (item: any, _index: number, _accum: any[]): any {
        for (let fn of condition_fns) {
            if (fn(item) == false) {
                return false;
            }
        }
        return true;
    };
};

export {
    build_fn,
    string_to_search_tokens,
    token_to_english
};
