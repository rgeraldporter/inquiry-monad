# Inquiry Monad
### v0.16.14

[![Build Status](https://travis-ci.com/rgeraldporter/inquiry-monad.svg?branch=master)](https://travis-ci.com/rgeraldporter/inquiry-monad)

Inquiry chains together functions that test a given value ("subject") and return with a full set of all passes, failures, and the original untouched value.

It follows the practices of functional programming, and is monad that is similar to an Either or a Validation.

If you are familiar with Promises, this will look very similar. The regular `Inquiry` function does not support asyncronous behaviour, however Promises are supported via the `InquiryP` function. (For the more functionally-minded, Futures are supported via `inquiry-monad-futures` package, which uses Fluture.)

## Basic example

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

## Description

Inquiry can take any value (a subject), store it within an immutable container (`Inquiry` or `InquiryP` monad) to be tested against various functions (via `.inquire` method) and resulting in two or three lists: `Pass([])`, `Fail([])`, and sometimes `IOU([])` in the case of `InquiryP`.

The advantage over traditional Promise chains is that the original subject and each result is retained through the resulting chain of functions, giving complete observability over the data passed through. Also, this allows one to restrain Promises to stay with a monadic structure, bolstering immutibility.

For those who wish to compare to a traditional Left/Right in functional programming, there are many advantages over a Left/Right or Validation pattern from functional:

*   Inquiry aggregates all results, not just failures.
*   Inquiry can run functions against both sides (traditional Left/Right as Fail/Pass)
*   Inquiry retains the original subject rather than transforming it into a result
*   Inquiry is designed to be an expressive, easily understood API

## Constructor

`Inquiry.subject(value)` or `InquiryP.subject(value)` (Promise/async-based)

Returns an `Inquiry` monad, which is monad containing an object with properties `subject`, `pass`, `fail`, `iou`, and an `informant` method.

`subject`: contains `value` passed to `Inquiry.subject` within a `Maybe` monad, meaning it will either be `Just(value)` or `Nothing()`.
`pass`: contains a `Pass` monad containing an array of values
`fail`: contains a `Fail` monad containing an array of values
`iou`: contains an `IOU` monad contains an array of Promises (only relevant with `InquiryP`)
`informant`: contains a function to be called upon the return of a `.inquire` call, for observation or logging purposes (set by calling `.informant` method)

Using the above object structure, you may also assemble your own `Inquiry` monad "manually" with `Inquiry.of`, those this is generally unnecessary.

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

## Methods

### Core method

`.inquire(f)` : give inquire a function `f` that returns either a `Pass()`, `Fail()`, Promise (`InquiryP` only), or another `Inquiry`. Anything other than these will be assumed as a `Pass`.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');

Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .join();
// > {subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail([]), iou: IOU([]), informant: _ => _};
```

### Interrogative methods:

`.inspect()` : return a string with the value contained in the Inquiry monad. Used for debugging.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');

Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inspect(); // outputs to string
// > Inquiry({subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail([]), iou: IOU([])});
```

`.informant(f)`: call function `f` upon each `.inquire` result. Useful for logging or observing. The function will be passed an array
containing `['fnName', Pass('passed value')]` or `['fnName', Fail('failed value')]`. Is not run when IOU is added, however does run once the IOU resolves.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1');
const isMoreThanTen = x =>
    x > 10 ? Pass('Is greater than 10') : Fail('Is less than or equal to 10');

Inquiry.subject(5)
    .informant(console.log)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen);
// console.log would output:
// > 'isMoreThanOne', Pass('Is greater than 1')
// > 'isMoreThanTen', Fail('Is less than or equal to 10')
```

### Unwrap methods:

`.conclude(f, g)`: returns the full `Inquiry`'s value, with map functions applied to both fail (`f`) and pass (`g`), but will wait to resolve all outstanding IOUs (Promises)

```js
const isMoreThanOne = x =>
    x > 1 ? Pass({ greaterThanOne: true }) : Fail({ greaterThanOne: false });
const isMoreThanTen = x =>
    x > 10 ? Pass({ greaterThanTen: true }) : Fail({ greaterThanTen: false });

Inquiry.subject(5)
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

// > {subject: Just(5), pass: {passCount: 1, passes: ['Is greater than 1']}, fail: {failCount: 1, fails: ['Is less than or equal to 10']}, iou: IOU([]), informant: _ => _};
```

`.fork(f, g)`: exit and either run a function `f` if there are _any_ fails, or `g` if _no_ fails, returning only result of the function executed.

```js
const isMoreThanOne = x =>
    x > 1 ? Pass({ greaterThanOne: true }) : Fail({ greaterThanOne: false });
const isMoreThanTen = x =>
    x > 10 ? Pass({ greaterThanTen: true }) : Fail({ greaterThanTen: false });

Inquiry.subject(5)
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

// > {failCount: 1, fails: ['Is less than or equal to 10']}

Inquiry.subject(15)
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

// > {passCount: 2, passes: ['Is greater than 1', 'Is greater than 10']}
```

`.zip(f)`: run function `f` against a merged list of `pass` and `fail`

```js
const isMoreThanOne = x =>
    x > 1 ? Pass({ greaterThanOne: true }) : Fail({ greaterThanOne: false });
const isMoreThanTen = x =>
    x > 10 ? Pass({ greaterThanTen: true }) : Fail({ greaterThanTen: false });

Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .zip(console.log);

// console.log:
// >> [{greaterThanOne: true}, {greaterThanTen: false}]
```

### Early results methods:

`.breakpoint(f)`: run a function `f` only if `fail` has contents. **`f` must return an `Inquiry`**.

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

`.milestone(f)`: run a function `f` only if `pass` has contents. **`f` must return an `Inquiry`.**

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

`.await()` (`InquiryP` only): pause and wait for all `iou` Promises to resolve.

### Multi-map method:

`.unison(f)`: run a function `f` against both `pass` and `fail` branches

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

### Flow-control method:

`.swap()`: swap the `pass` and `fail` branches

```js
// example forthcoming
```

### Standard monadic methods:

_Documentation forthcoming for the following._

`ap`
`map`
`chain`
`join`

## Development

Source is written in TypeScript. Run tests via `npm run test`.

## MIT License

Copyright 2018 Robert Gerald Porter <rob@weeverapps.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.