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
    Fuzzy,              // See implementation.

    ComposeOR,          // Composeable OR
    ComposeAND,         // Composeable AND
    ComposeNOT,         // Composeable NOT (not yet implemented)

    // EvalLambda          // Risky.
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
    '^': Cond.ArgValueInItemSeq,
    //'$': Cond.EvalLambda,
};


// Our cond function lookup.
let fn_lookup = {};

fn_lookup[Cond.Equal] = function (value, arg) {
    if (value.__proto__.constructor.name == "Array") {
        return value.indexOf(arg);
    }
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


// Evaluate the sub parts.
fn_lookup[Cond.ComposeOR] = function (value, arg) {
    for (let [cond, narg] of arg) {
        if (fn_lookup[cond].apply(this, [value, narg])) {
            return true;
        }
    }
    return false;
};


// Evaluate the sub parts.
fn_lookup[Cond.ComposeAND] = function (value, arg) {
    for (let [cond, narg] of arg) {
        if (fn_lookup[cond].apply(this, [value, narg]) == false) {
            return false;
        }
    }
    return true;
};

/*
fn_lookup[Cond.EvalLambda] = function(value, fn) {
    console.log('function(i) { ' + fn + ' }');
    return true;
};
*/

// Tokenize a search in a way that we feel good about.
let safe_split = function safe_split(s): Array<any> {
    var split_char = ' ';
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
                current_word.push(chr);
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
                    current_word.push(chr);
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


// Test to see if our token is a condition or just
// normal text input. `` grave to escape.
let is_cond = function (token: string): boolean {
    if (token[0] == '&') {
        return true;
    } else if (token.search(':') != -1 && token[0] != '\`') {
        return true;
    }
    return false;
};


// Parse a cond into it's parts, coerce the value if it
// makes sense.
let cond_parse = function (arg): Array<any> {
    let cond = Cond.Equal;
    let str_starts_with = function (key: string, st: string) {
        if (key.slice(0, st.length) == st) {
            return true;
        } else {
            return false;
        }
    }
    for (let key in cond_lookup) {
        if (str_starts_with(arg, key)) {
            cond = cond_lookup[key];
            arg = arg.slice(key.length);
        }
    }
    if (!isNaN(+arg)) {
        arg = +arg;
    }
    if (arg == 'true') {
        arg = true;
    } else if (arg == 'false') {
        arg = false;
    }
    return [cond, arg];
}


// Given a set of parsed tokens, build a filter function.
let build_filter_fn_from_tokens = function (s: any): any {
    let conditions = [];
    for (let outer_item of s) {
        var lambda = (function (enclosed) {
            return function (item: any) {
                let addrem = enclosed[0];
                let fn_cond_enum = enclosed[1];
                let key = enclosed[2];
                let arg = enclosed[3];
                let ret = false;
                try {
                    let key_parts = key.split('.');
                    let value = item;
                    if (key_parts.length == 1) {
                        value = value[key];
                    } else {
                        for (let part of key_parts) {
                            if (value[part] == undefined) {
                                return false;
                            }
                            value = value[part];
                        }
                    }
                    if (typeof value == "function") {
                        if (fn_cond_enum == Cond.Exists) {
                            ret = true;
                        } else {
                            ret = value.apply(item, [arg]);
                        }
                    } else if (typeof value == "undefined") {
                        ret = false;
                    } else {
                        ret = fn_lookup[fn_cond_enum](value, arg);
                    }
                } catch (e) {
                    console.log("Exception in cond: ", fn_lookup[fn_cond_enum]);;
                    // in light of an exception of a condition,
                    // we will leave things as they are.
                }
                if (addrem == SearchType.Include) {
                    return ret
                } else if (addrem == SearchType.Exclude) {
                    return !ret;
                } else {
                    console.log("UNKNOWN SEARCH TYPE:", addrem);
                    return ret;
                }
            };
        })(outer_item);
        conditions.push(lambda);
    }
    return function (item: any, _index: number, _accum: any[]): any {
        for (let fn of conditions) {
            if (fn(item) == false) {
                return false;
            }
        }
        return true;
    };
};

let default_macros = {
    'is': function (key, arg) {
        return [`${arg}`, 'true'];
    },
    'has': function (key, arg) {
        return [`${arg}`, '?'];
    }
};

let merge_maps = function(...args:any[]):{} {
    let d = {};
    for (let source of args) {
        for (let property in source) {
            if (source.hasOwnProperty(property)) {
                d[property] = source[property];
            }
        }
    }
    return d;
}

// Compose a list of tokens and then use the build_filter_fn_from_tokens
// to create a function for the user to filter with.
let build_fn = function (q: string, options?: {}): any {
    if (options == undefined) {
        options = {};
    }
    let fuzzy_key = options['fuzzy_key'] || 'fuzzy';
    let macro_map = merge_maps(
        default_macros,
        options['macros'] || {},
    );
    let final_tokens = [];
    let basic_tokens = safe_split(q);
    for (let str_token of basic_tokens) {
        if (is_cond(str_token)) {
            let addrem = SearchType.Include;
            let first_char = str_token[0];
            if (first_char == '-' || first_char == '\\') {
                addrem = SearchType.Exclude;
                str_token = str_token.slice(1);
            } else if (first_char == '/' || first_char == '+') {
                addrem = SearchType.Include;
                str_token = str_token.slice(1);
            }
            let split = str_token.split(':');
            let key = split[0];
            for (let arg of split.slice(1)) {
                if (arg.length > 0) {
                    if (macro_map[key] != undefined) {
                        [key, arg] = macro_map[key](key, arg);
                    }
                    if (arg.search(',') == -1) {
                        let [cond, narg] = cond_parse(arg);
                        final_tokens.push([addrem, cond, key, narg]);
                    } else {
                        let componse_cond = Cond.ComposeOR;
                        if (arg[0] == '&') {
                            componse_cond = Cond.ComposeAND;
                            arg = arg.slice(1);
                        } else if (arg[0] == '|') {
                            componse_cond = Cond.ComposeOR;
                            arg = arg.slice(1);
                        }
                        let sub_conds = [];
                        for (let arg_slice of arg.split(',')) {
                            let [cond, narg] = cond_parse(arg_slice);
                            sub_conds.push([cond, narg]);
                        }
                        final_tokens.push([addrem, componse_cond, key, sub_conds]);
                    }
                }
            }
        } else {
            final_tokens.push(
                [SearchType.Include, Cond.Fuzzy, fuzzy_key, str_token]
            );
        }
    }

    //console.log(JSON.stringify(final_tokens));
    return build_filter_fn_from_tokens(final_tokens);
};

export {
    build_fn
};
