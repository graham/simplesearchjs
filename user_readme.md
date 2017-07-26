If you're reading this document, it's likely that a developer is using the SimpleSearchJS library a web application you are using. (very likely a web application). This document should help you understand how to use the Simple Search query language to build simple and complex searches.

You won't need to know any programming to read this, but you also don't need to read everything in order to get started. I'll try to make headlines that are easy to search, but take a look at the index below if you're looking for something specific.

The goal of SimpleSearchJS is to allow you (the user) to build a query and for your developer to use that query on a data set, it doesn't control the visualization of the data, but it works a little like this.

1. A User enters a search "happy"
2. The application uses the string "happy" to create a search filter.
3. The application uses that filter, to determine which "rows" in a "dataset" match the search.
4. The application does something with those results.

For example, if we had a list of words:

 - "first"
 - "second"
 - "happy"
 - "unhappy"
 - "stoked"

If we created a "filter" with the search "happy" the filter would return True or False depending on if the search matched.

| Word | Match Result | Yeah but why? |
|---|---|---|
| "first"   | False        | |
| "second"  | False        | | 
| "happy"   | True | It matches exactly |
| "unhappy" | True | Un**happy** contains the word happy |
| "stoked"  | False | |

Obviously, we'll want to do more complex (and more specific) searches, and this document will help you learn how.

Index:

 - Searching for anything
 - Searching for something EXACTLY
 - Searching for something ROUGHLY
 - Searching for numbers
 - Searching for strings
 - Searching for strings and ignore case (uppercase lowercase)
 - Searching for multiple strings
 - Understanding AND vs OR
 - Searching for NOT something

First some vocabulary:

 You've already been introduced to a couple, so lets recap:

 `query string` or `query`: The string a user typed in, which explains what they want.
 `filter`: The function that is built by SimpleSearch and used by your application.
 `dataset` or `rows`: The data that the `filter` ... filters.

and some new ones:

 `item` or `row`: A single item in the dataset to be evalulated by the filter. (does this item match the search?)
 `field`: An attribute of an `item` that you want to search by, for example, an `item` might have the field `name` or `age`

 `haystack`: a collection of data from the `fields` on the `item` that allows a search to be less specific. (we'll go into this more later on).

## A real world, simple example

Lets run through a more realistic example, albeit a rather simple one.

First, our data:

|name |age|job title|team           | alive    |
|-----|---|---------|---------------|----------|
|Leia |21 |Senator  |Rebel Alliance | true     |
|Han  |30 |Pirate   |Rebel Alliance | false    |
|Vader|50 |Bodyguard|Empire         | false    |
|Jyn  |21 |Soldier  |Alliance       | true     |
|Poe  |25 |Pilot    |Alliance       | true     |
|Kylo |28 |Moody    |First Order    | true     |
|Rey  |18 |Hero     |Resistance     | true     |

 > Thank you to [Wookieepedia](http://starwars.wikia.com/wiki/Main_Page) for the info.

Now lets do some searches (we are going to ignore `haystack` for now, but we'll get to it in our next example.

Our first search: `name:a` will return True whenever the letter 'a' occurs in field `name`.


|name |age|job title|team           | alive    |
|-----|---|---------|---------------|----------|
|Leia |21 |Senator  |Rebel Alliance | true     |
|Han  |30 |Pirate   |Rebel Alliance | false    |
|Vader|50 |Bodyguard|Empire         | false    |


It's important to note: __strings are not exact matches unless you prefix them with an '=' sign__ This means that searching a string field (not a number) will match if the query matches anywhere in the string, so if we searched with `team:Alliance` our result set would look like:

|name |age|job title|team           | alive    |
|-----|---|---------|---------------|----------|
|Leia |21 |Senator  |Rebel Alliance | true     |
|Han  |30 |Pirate   |Rebel Alliance | false    |
|Jyn  |21 |Soldier  |Alliance       | true     |
|Poe  |25 |Pilot    |Alliance       | true     |

If you wanted only exact matches, you can prepend your value with an `=` sign, a search of `team:=Alliance` would result in:

|name |age|job title|team           | alive    |
|-----|---|---------|---------------|----------|
|Jyn  |21 |Soldier  |Alliance       | true     |
|Poe  |25 |Pilot    |Alliance       | true     |

