# Inquiry
### v0.16.16

[![Build Status](https://travis-ci.com/rgeraldporter/inquiry-monad.svg?branch=master)](https://travis-ci.com/rgeraldporter/inquiry-monad)

Inquiry chains together functions that test a given value ("subject") and return with a full set of all passes, failures, and the original untouched value. It follows the practices of functional programming -- for those more deeply familiar with functional programming, it is a monad that can be compared with an `Either` or a `Validation`.

The methods for inquiry look much like Promises, and you may even use Promises within Inquiry.

## Basic examples

```js
const { Inquiry, InquiryP, Pass, Fail } = require('inquiry-monad');

const subjectData = {
    a: 1,
    b: false
};

const hasA = x => (x.a ? Pass('has a') : Fail('does not have a'));
const validateB = x =>
    x.b && typeof x.b === 'boolean' ? Pass('b is valid') : Fail('b is invalid');
const hasNoC = x => (x.c ? Fail('has a c value') : Pass('has no c value'));

/* With all passes */
Inquiry.subject(subjectData)
    .inquire(hasA)
    .inquire(validateB)
    .inquire(hasNoC)
    .join();

// >> result: {subject: {a:1, b:false}, pass: Pass(['has a', 'b is valid', 'has no c value']), fail: Fail([]), iou: IOU([])}

/* With failures */
const subjectDataWithFailure = {
    a: 1,
    b: 'string',
    c: true
};

Inquiry.subject(subjectDataWithFailure)
    .inquire(hasA)
    .inquire(validateB)
    .inquire(hasNoC)
    .join();

// >> result: {subject: {a:1, b:'string', c:true}, pass: Pass(['has a']), fail: Fail(['b is invalid', 'has c value']), iou: IOU()}

/* With async Promises */
const checkDb = async x =>
    Promise.resolve(Pass('pretend I looked something up in a db'));

InquiryP.subject(subjectDataWithFailure)
    .informant(console.log)
    .inquire(checkDb)
    .inquire(hasA)
    .inquire(validateB)
    .inquire(hasNoC)
    .conclude(x => x, y => y);
// .conclude or another "unwrap" fn is necessary to complete "IOUs" to give a clean exit (resolve all unresolved Promises)

// >> Promise.resolve(result: {subject: {a:1, b:'string', c:true}, pass: Pass(['has a', 'pretend I looked something up in a db']), fail: Fail(['b is invalid', 'has c value']), iou: IOU()})
```

While `Inquiry` does not support asyncronous behaviour, Promises are supported via `InquiryP`. This means you will need to declare in advance by using `InquiryP` if you expect any _inquire_ functions to be returning Promises, however it will work fine if none do.

For the more functionally-pure-minded, Futures are supported via `inquiry-monad-futures` package, which uses Fluture. (You will need to install that seperately to use it.)

## Description

Inquiry can take any value (known as a _subject_) and test it against various functions via `inquire`s. This results in a return value containing two or three lists: `Pass([])`, `Fail([])` (and, `IOU([])` in the case of `InquiryP`).

The advantage over traditional Promise chains is that the original subject and each result is retained through the chain of `inquire` functions, giving complete observability over the data lifecycle.

Additionally, this allows one to restrain Promises to stay with a monadic structure, bolstering immutibility, and discouraging side-effects.

For those who might wish to compare to a conventional `Either` (`Left`/`Right`) in functional programming, there are many advantages over an `Either` or `Validation` pattern from functional:

*   Inquiry aggregates *all* results, not just failures.
*   Inquiry can run functions against both sides (conventional `Left`/`Right` or `Failure`/`Success` as `Fail`/`Pass`)
*   Inquiry retains the original subject rather than transforming it into the final result
*   Inquiry is designed to be an expressive, easily understood API, to be understood with little or no functional programming experience

# Constructors

## `Inquiry.subject(value)`

Returns a new `Inquiry` monad, which contains an object with properties `subject`, `pass`, `fail`, `iou`, and a single method,  `informant`.

`subject`: contains `value` passed to `Inquiry.subject` within a `Maybe` monad, meaning it will either be `Just(value)` or `Nothing()`.
`pass`: contains a `Pass` monad containing an array of values
`fail`: contains a `Fail` monad containing an array of values
`iou`: contains an `IOU` monad contains an array of Promises (only relevant with `InquiryP`)
`informant`: contains a function to be called upon the return of a `.inquire` call, for observation or logging purposes (set by calling `.informant` method)

## `InquiryP.subject(value)`

Same as the above, however it returns a monad called `InquiryP` which enables Promise/async-based `inquire` usage.

#### Note

Using the above object structure, you may also assemble your own `Inquiry`/`InquiryP` monad "manually" with `Inquiry.of`/`InquiryP.of`, those this is generally unnecessary.

As a basic example:

```js
const value = { something: true };
console.log(
    Inquiry.subject(value)
        .informant(console.log)
        .join()
); // .join will reveal contained value

// > {subject: Just({something: true}), pass: Pass([]), fail: Fail([]), iou: IOU([]), informant: console.log};
```

# `Inquiry` and `InquiryP` Methods

## Core methods

### `.inquire(f)`

Pass `inquire` a function `f` that returns either a `Pass`, `Fail`, `Promise` (`InquiryP` only), or another `Inquiry`. Anything other than these will be converted to a `Pass`.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');

const result = Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .join();

console.log(result);
// > {subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail([]), iou: IOU([]), informant: _ => _};
```

### `.inspect()`

Return a string with the value contained in the Inquiry monad. This is a common pattern mainly intended for use in debugging.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');

const result = Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inspect(); // outputs to string

console.log(result);
// > Inquiry({subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail([]), iou: IOU([])});
```

### `.informant(f)`

Call function `f` upon each `inquire` result. Useful for logging or observing. The function will be passed an array
containing `['fnName', Pass('passed value')]` or `['fnName', Fail('failed value')]`.

For `InquiryP`, it is not run when the IOU is added, however does run upon resolution of the IOU.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');
const isMoreThanTen = x =>
    x > 10 ? Pass('Is greater than 10') : Fail('Is less than or equal to 10');

Inquiry.subject(5)
    .informant(console.log)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen);

// console.log would output as each function resolves:
// > 'isMoreThanOne', Pass('Is greater than 1')
// > 'isMoreThanTen', Fail('Is less than or equal to 10')
```

## Unwrap methods:

The following methods are to be used as a means of "exiting" the chain.

### `.join()` (only useful for `Inquiry`)

Returns the contained `Inquiry`/`InquiryP` object value, without any additional handling.

This is most basic way of returning the values collected by `Inquiry`.

Warning: this can be, but should not be, used with `InquiryP`as it will not ensure Promises have resolved before returning the value, and will contain these Promises in the `IOU` list.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');
const isMoreThanTen = x =>
    x > 10 ? Pass('Is greater than 10') : Fail('Is less than or equal to 10');

const results = Inquiry.subject(5)
    .informant(console.log)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen);

console.log(results)
// > {subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail(['Is less than or equal to 10']), iou: IOU([]), informant: _ => _};
```

### `.chain(f)`

Passes the contained `Inquiry`/`InquiryP` object value into a function `f`. (You may optionally continue the Inquiry chain by having function `f` return `Inquiry.of(value)` as long as it adheres to the object structure.)

This is useful when you want to convert `Inquiry`/`InquiryP` into a Promise.

Warning: In the case of `InquiryP`, you will want to use `await` first before using chain (see below).
```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');
const isMoreThanTen = x =>
    x > 10 ? Pass('Is greater than 10') : Fail('Is less than or equal to 10');

Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .chain(Promise.resolve)
    .then(console.log); // now we're a Promise

// > {subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail(['Is less than or equal to 10']), iou: IOU([]), informant: _ => _};
```

### `.conclude(f, g)`

Returns the contained `Inquiry`/`InquiryP` object value, with map functions applied to both fail (`f`) and pass (`g`).

For `InquiryP`, this method wwill await resolution of all outstanding IOUs (Promises) before applying `f` and `g`.

This is useful for returning a full accounting of all results and the original subject, in addition to making adjustments based on resulting `Fail` and `Pass` lists.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass({ greaterThanOne: true }) : Fail({ greaterThanOne: false });
const isMoreThanTen = x =>
    x > 10 ? Pass({ greaterThanTen: true }) : Fail({ greaterThanTen: false });

const results = Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .conclude(
        x => ({
            failCount: x.join().length,
            fails: x.join()
        }),
        y => ({
            passCount: y.join().length,
            passes: y.join()
        })
    );

console.log(results);
// > {subject: Just(5), pass: {passCount: 1, passes: ['Is greater than 1']}, fail: {failCount: 1, fails: ['Is less than or equal to 10']}, iou: IOU([]), informant: _ => _};
```

### `.fork(f, g)`

Either run a function `f` if there are _any_ values in the `Fail` list, or `g` if there are _no_ values in the `Fail` list, returning only the result of the function executed.

This is useful for conventional error-handling, where you wish to favour handling of `Fail` results regardless of any `Pass` results.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass({ greaterThanOne: true }) : Fail({ greaterThanOne: false });
const isMoreThanTen = x =>
    x > 10 ? Pass({ greaterThanTen: true }) : Fail({ greaterThanTen: false });

const results1 = Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .fork(
        x => ({
            failCount: x.join().length,
            fails: x.join()
        }),
        y => ({
            passCount: y.join().length,
            passes: y.join()
        })
    );

console.log(results1);
// > {failCount: 1, fails: ['Is less than or equal to 10']}

const results2 = Inquiry.subject(15)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .fork(
        x => ({
            failCount: x.join().length,
            fails: x.join()
        }),
        y => ({
            passCount: y.join().length,
            passes: y.join()
        })
    );

console.log(results2);
// > {passCount: 2, passes: ['Is greater than 1', 'Is greater than 10']}
```

### `.zip(f)`

Run function `f` against a merged list of `pass` and `fail`, returning the merged list as a resulting `Array`.

This may be useful if you'd like to use the `Inquiry` API but do not necessarily care about `Pass` or `Fail` lists, or you may have already handled them via other means.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass({ greaterThanOne: true }) : Fail({ greaterThanOne: false });
const isMoreThanTen = x =>
    x > 10 ? Pass({ greaterThanTen: true }) : Fail({ greaterThanTen: false });

const logResults = someFn; // notify another system about the passes/failures

const results =Inquiry.subject(5)
    .informant(logResults)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .zip(x => x);

console.log(results);
// >> [{greaterThanOne: true}, {greaterThanTen: false}]
```

## Early results methods:

### `.await()` (`InquiryP` only)

Pause and wait for all `iou` Promises to resolve before continuing.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');
const isMoreThanTen = x =>
    x > 10 ? Pass('Is greater than 10') : Fail('Is less than or equal to 10');
const checkDb = async () => Promise.resolve(Pass('here is some data'));

InquiryP.subject(5)
    .inquire(isMoreThanOne)
    .inquire(checkDb)
    .inquire(isMoreThanTen)
    .await()
    .chain(console.log);

// > {subject: Just(5), pass: Pass(['Is greater than 1', 'here is some data']), fail: Fail(['Is less than or equal to 10']), iou: IOU([]), informant: _ => _};
```

### `.breakpoint(f)`

Run a function `f` only if `fail` has contents.

**NOTE: Function `f` must return an `Inquiry`/`InquiryP`, via the constructor `of`**.

The `InquiryP` version of this will wait for outstanding Promises to resolve.

Useful if you'd like to handle `Fail` results early for some reason.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass({ greaterThanOne: true }) : Fail({ greaterThanOne: false });
const isMoreThanTen = x =>
    x > 10 ? Pass({ greaterThanTen: true }) : Fail({ greaterThanTen: false });
const isMoreThanTwenty = x =>
    x > 20
        ? Pass({ greaterThanTwenty: true })
        : Fail({ greaterThanTwenty: false });

Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .breakpoint(x => {
        console.warn('after one', x.fail.join()); // will not happen
        return Inquiry.of(x);
    })
    .inquire(isMoreThanTen)
    .breakpoint(x => {
        console.warn('after ten', x.fail.join()); // this will run
        return Inquiry.of(x);
    })
    .inquire(isMoreThanTwenty);
```

### `.milestone(f)`

Run a function `f` only if `pass` has contents. Unlike `fork` or `cleared` this triggers if there are any results in the `Pass` list, regardless of how many results exist within the `Fail` list.

**NOTE: Function `f` must return an `Inquiry`/`InquiryP`, via the constructor `of`**.

The `InquiryP` version of this will wait for outstanding Promises to resolve.

Useful if you'd like to handle `Pass` results early for some reason.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass({ greaterThanOne: true }) : Fail({ greaterThanOne: false });
const isMoreThanTen = x =>
    x > 10 ? Pass({ greaterThanTen: true }) : Fail({ greaterThanTen: false });
const isMoreThanTwenty = x =>
    x > 20
        ? Pass({ greaterThanTwenty: true })
        : Fail({ greaterThanTwenty: false });

Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .milestone(x => {
        console.warn('after one', x.pass.join()); // this will run
        return Inquiry.of(x);
    })
    .inquire(isMoreThanTen)
    .milestone(x => {
        console.warn('after ten', x.pass.join()); // this will run (still has passes)
        return Inquiry.of(x);
    })
    .inquire(isMoreThanTwenty);
```

## Multi-map method:

### `.unison(f)`

Run a function `f` against both `Pass` and `Fail` lists.

Note that in the case of `InquiryP` you may have items in the `IOU` list (unresolved Promises) that are not yet `Fail` or `Pass`, which will be skipped. (To avoid skipping past unresolved Promises, use `await` first.)

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');
const isMoreThanTen = x =>
    x > 10 ? Pass('Is greater than 10') : Fail('Is less than or equal to 10');
const allCaps = items => items.map(x => x.toUpperCase());

Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .unison(allCaps)
    .join();

// > {subject: Just(5), pass: Pass(['IS GREATER THAN 1']), fail: Fail(['IS LESS THANK OR EQUAL TO 10']), iou: IOU([]), informant: _ => _};
```

## Flow-control method:

### `.swap()`

Swap the `pass` and `fail` lists.

This would be useful if you are using `Pass`/`Fail` as a proxy for a less opinionated concept such as functional's `Left`/`Right`.
```js
// @todo more practical example...
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');
const isMoreThanTen = x =>
    x > 10 ? Pass('Is greater than 10') : Fail('Is less than or equal to 10');

const result = Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .swap();

console.log(result);
// > {subject: Just(5), pass: Pass(['Is less than or equal to 10']), fail: Fail(['Is greater than 1']), iou: IOU([]), informant: _ => _};
```

### Standard monadic methods:

_Documentation forthcoming for the following._

`ap`
`map`

## Development

Source is written in TypeScript. Run tests via `npm run test`.

## MIT License

Copyright 2018 Robert Gerald Porter <rob@weeverapps.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.