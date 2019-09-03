import { dig_sort, dig_sort_many } from 'src/index';

function randInt(left, right) {
    return Math.floor((Math.random() * (right * right) % right)) + left;
}

describe('dig sort', () => {
    it('should sort dates, integers and complex object digs.', () => {
	let objList = [];
	for( let i = 0; i < 10; i++ ) {
	    let month = randInt(0, 12) + 1;
	    let day = randInt(0, 27) + 1;
	    let d = new Date('2019-'+month+'-'+day);
	    objList.push({
		'start': new Date('2017-'+month+'-'+day),
		'age': randInt(1,100),
		'inner': {
		    'obj': {
			'value': randInt(500, 5000),
		    },
		},
	    });
	}

	dig_sort(objList, 'start');

	let lastDate = new Date('2000-01-01');
	objList.forEach((item) => {
	    expect(item.start.getTime()).toBeGreaterThanOrEqual(lastDate.getTime())
	    lastDate = item.start;
	});

	let lastAge = 0;
	dig_sort(objList, 'age');
	objList.forEach((item) => {
	    expect(item.age).toBeGreaterThanOrEqual(lastAge);
	    lastAge = item.age;
	});

	let lastValue = 0;
	dig_sort(objList, 'inner.obj.value');
	objList.forEach((item) => {
	    expect(item.inner.obj.value).toBeGreaterThanOrEqual(lastValue);
	    lastValue = item.inner.obj.value;
	})
    });

    it('should sort in reverse.', () => {
	let nums = [];
	for(let i = 0; i < 1000; i++) {
	    nums.push({'rank':randInt(1, 10000)});
	}

	let lastRank = 0;
	dig_sort(nums, 'rank');

	let first = nums[0];
	let last = nums[nums.length-1];

	expect(first.rank).toBeLessThan(last.rank);

	dig_sort(nums, 'rank', true);
	first = nums[0];
	last = nums[nums.length-1];

	expect(first.rank).toBeGreaterThan(last.rank);
    });

    it('should handle undefined dug values as max value', () => {
	let objs = [
	    {'id': 1, 'value':1},
	    {'id': 2, 'value':2},
	    {'id': 3},
	    {'id': 4, 'value':4},	     
	];

	dig_sort(objs, 'value');

	expect(objs).toEqual([
	    {'id': 1, 'value':1},
	    {'id': 2, 'value':2},
	    {'id': 4, 'value':4},	     
	    {'id': 3},
	]);
    });

    it('should handle undefined values as min value on reverse.', () => {
	let objs = [
	    {'id': 1, 'value':1},
	    {'id': 2, 'value':2},
	    {'id': 3},
	    {'id': 4, 'value':4},	     
	];

	dig_sort(objs, 'value', true);

	expect(objs).toEqual([
	    {'id': 4, 'value':4},	     
	    {'id': 2, 'value':2},
	    {'id': 1, 'value':1},
	    {'id': 3},
	]);
    });

    it('should support sorting by multiple fields', () => {
	let people = [
	    {'group': 1, 'rank': 5},
	    {'group': 2, 'rank': 5},
	    {'group': 1, 'rank': 4},
	    {'group': 2, 'rank': 4},
	    {'group': 1, 'rank': 1},
	    {'group': 2, 'rank': 1},
	    {'group': 1, 'rank': 3},
	    {'group': 2, 'rank': 3},
	    {'group': 1, 'rank': 50},
	    {'group': 2, 'rank': 50},
	    {'group': 1, 'rank': 6},
	    {'group': 2, 'rank': 6},
	];

	dig_sort_many(people, ['group', 'rank']);

	let expected =     [
	    { group: 1, rank: 1 },                                
	    { group: 1, rank: 3 },                                
	    { group: 1, rank: 4 },                                    
	    { group: 1, rank: 5 },                                        
	    { group: 1, rank: 6 },                                        
	    { group: 1, rank: 50 },                                       
	    { group: 2, rank: 1},
	    { group: 2, rank: 3 },                                            
	    { group: 2, rank: 4 },                                               
	    { group: 2, rank: 5 },                                               
	    { group: 2, rank: 6 },                                               
	    { group: 2, rank: 50 } ];

	expect(people).toEqual(expected);
    });
})
