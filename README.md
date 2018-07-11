# Inquiry

[![Build Status](https://travis-ci.com/rgeraldporter/inquiry-monad.svg?branch=master)](https://travis-ci.com/rgeraldporter/inquiry-monad)

Inquiry is an expressive API that allows one ask multiple questions about a subject value, and observe all results. This process returns a collection of all passes, fails, and the original subject value.

## Basic examples

```js
const {
    Inquiry,
    InquiryP,
    Pass,
    Fail,
    Questionset,
    Question
} = require('inquiry-monad');

const subjectData = {
    a: 1,
    b: false
};

const myQuestionset = Questionset.of([
    ['does it have a?', x => (x.a ? Pass('has a') : Fail('does not have a'))],
    [
        'is b valid?',
        x =>
            x.b && typeof x.b === 'boolean'
                ? Pass('b is valid')
                : Fail('b is invalid')
    ],
    [
        'is it missing the c value?',
        x => (x.c ? Fail('has a c value') : Pass('has no c value'))
    ]
]);

/* With all passes */
Inquiry.subject(subjectData)
    .using(myQuestionset)
    .inquire('does it have a?')
    .inquire('is b valid?')
    .inquire('is it missing the c value?')
    .inquire(
        // you can also make an inquiry as a one-off question
        Question.of([
            'is it missing the d value?',
            x => (x.d ? Pass('is no d value') : Fail('has a d value'))
        ])
    )
    .join();

// questionset & receipt have been abbreviated
// result: {subject: {a:1, b:false}, pass: Pass(['has a', 'b is valid', 'has no c value', 'has no d value']), fail: Fail([]), iou: IOU([]), questionset: Questionset(...), receipt: Receipt(...)}

/* subject with failures */
const subjectDataWithFailure = {
    a: 1,
    b: 'string',
    c: true
};

Inquiry.subject(subjectDataWithFailure)
    .using(myQuestionset)
    .inquireAll()
    .join();

// result: {subject: {a:1, b:'string', c:true}, pass: Pass(['has a']), fail: Fail(['b is invalid', 'has c value']), iou: IOU(), questionset: Questionset(...), receipt: Receipt(...)}

/* With async (Promises) */
const checkDb = async x =>
    Promise.resolve(Pass('pretend I looked something up in a db'));

// we can use .concat to merge two Questionsets
const myAsyncQuestionset = myQuestionset.concat(
    Questionset.of([
        [
            'look something up in a db',
            async x =>
                Promise.resolve(Pass('pretend I looked something up in a db'))
        ]
    ])
);

InquiryP.subject(subjectDataWithFailure)
    .using(myQuestionset)
    .inquireAll()
    .conclude(x => x, y => y);
// .conclude or another "unwrap" function is necessary to complete "IOUs" to give a clean exit (i.e., resolve all unresolved Promises)

// result: Promise.resolve(result: {subject: {a:1, b:'string', c:true}, pass: Pass(['has a', 'pretend I looked something up in a db']), fail: Fail(['b is invalid', 'has c value']), iou: IOU()}, questionset: Questionset(...), receipt: Receipt(...))
```

## Get started

```bash
npm install inquiry-monad -S
```

Optionally, if you are using [`fluture`](https://www.npmjs.com/package/fluture) or a compatible Futures library:

```bash
npm install inquiry-monad-futures -S
```

## Demos

Some mini-projects will be included soon in this document to give practical examples of use. Where possible I will include links directly to a [Glitch](https://glitch.com) project so you may remix the code and play with the API.

-   [Birds Around Me](https://glitch.com/edit/#!/local-birds?path=server.js:70:1) - reads a user's GPS position, and retrieves birds reported to [eBird](https://ebird.org/) via eBird API. Inquiry is used to then answer a series of questions about the data.
-   [Inquiry Weather Example](https://glitch.com/edit/#!/weather-checker?path=server.js:91:6) - reads the current weather forecast from Environment Canada for various places and answers some questions about results.

## Inquiry types

There are three types of Inquiry:

-   `Inquiry` (syncronous-only)
-   `InquiryP` (supports Promises)
-   `InquiryF` (supports Futures -- requires `inquiry-monad-futures` to be included)

## Inquiry result types

There are three result types used in Inquiry:

-   `Pass`: a positive result
-   `Fail`: a negative result
-   `IOU`: a result to be determined later (relevant to `InquiryP` and `InquiryF` types only)

Each of these result types is a monad, and come with built-in methods for handling and exposing their data without mutating the values. See "Monad methods" below for details on how to handle results within these types.

## Inquiry subject type

The subject uses `Maybe` to contain the value, which can result in one of two types of values:

-   `Just`: a non-null, non-undefined value
-   `Nothing`: an undefined or null value

These are also monads, see "Monad methods" below for details on how to handle these types.

## Use

_Note that unless otherwise stated in this document, `Inquiry`, `InquiryP`, and `InquiryF` are interchangeable, and mostly share the same API._

Inquiry can take any _subject_ and test it against various question functions via the `.inquire` method. The question functions should return `Pass` or `Fail` values.

The result is a collection containing a list of result types for `Fail`, `Pass`, and `IOU`, in addition to the original `subject`.

The advantage over a Promise chain is that the original subject and each individual function return is retained through the chain of `.inquire` calls, giving observability over the chain.

Additionally, this gives the ability to contain Promises better, in a more functional-friendly style.

## Comparing to `Either` or `Validation`

For those who might wish to compare to a conventional `Either` (`Left`/`Right`) monad or `Validation` (`Failure`/`Success`) applicative functor in functional programming, here are some advantages brought by using Inquiry:

-   Inquiry aggregates **all** results, and does not eliminate positive results when a negative one is acquired
-   Inquiry can run functions against both `Pass` and `Fail` lists
-   Inquiry always retains the original subject rather than transforming it
-   Inquiry is designed to be an expressive, easily understood API, to be learned with little or no previous functional programming experience requirement
-   While Inquiry is opinionated and has many "`Fail`-first" methods, additional methods are provided that allow for a less opinionated usage

# Question, Questionset & Receipt

### Questionset

`Questionset` is an API for providing `inquire` functions that are not unlike the API used in testing suites like Mocha or Chai, except that this implementation is designed to be used in non-software-testing contexts.

This allows you to write Inquiry calls with descriptive and expressive language that can be very clear about what questions are being asked about the subject data.

```js
const myQuestionset = Questionset.of([
    [
        'does it start with a capital letter?',
        a =>
            /^[A-Z]/.test(a)
                ? Pass('starts with a capital')
                : Fail('does not start with a capital')
    ],
    [
        'are there more than ten words?',
        a =>
            a.split(' ').length > 10
                ? Pass('more than ten words')
                : Fail('ten words or less')
    ],
    [
        /^are there any line breaks\?$/,
        a =>
            /\r|\n/.exec(a)
                ? Pass('there were line breaks')
                : Fail('no line breaks')
    ]
]);

const results = Inquiry.subject('A short sentence.')
    .using(myQuestionset)
    .inquire('does it start with a capital letter?')
    .inquire('are there more than ten words?')
    // the below call will be skipped since no function has this identifier, and will throw a console.warning()
    .inquire('does it start with an indefinite article?')
    .inquire('are there any line breaks?');
```

You may also use `.inquireAll()` to use all questions in the questionset.

### Question

Another API you can use is `Question`. This works much like `Questionset`, but with one question at a time.

```js
const subject = {
    flagged: true,
    score: 15,
    started: 1530293458
};

const notFlagged = Question.of([
    'is it not flagged?',
    x => (!x.flagged ? Pass('was not flagged') : Fail('was flagged'))
]);

const passingScore = Question.of([
    'is the score higher than 10?',
    x =>
        x.score > 10
            ? Pass('Score higher than 10')
            : Fail('Score not higher than 10')
]);

const results = InquiryP.subject(subject)
    .inquire(notFlagged)
    .inquire(passingScore);
```

Note that the descriptive string (e.g., `'is the score higher than 10?'`) in this case is used for `.informant` and `.receipt` output, as well as documentation purposes.

### Receipt

_Added in 0.28_

This property of Inquiry keeps track of all questions and results in a similar format to Questions:

```js
// take the above example...

const results = InquiryP.subject(subject)
    .inquire(notFlagged)
    .inquire(passingScore);

console.log(results.join().receipt.inspect());
// > Receipt(['is it not flagged?', Fail(was flagged)], ['is the score higher than 10?', Pass(score higher than 10)])
```

More functionality and options will be built off of this new API in future releases.

# `Inquiry` Constructors

## `Inquiry.subject(value)`

Returns a new `Inquiry` monad, which contains an object with properties `subject`, `pass`, `fail`, `iou`, and a single method, `informant`.

-   `subject`: the `value` that was passed to `Inquiry.subject`. This value is contained within a `Maybe` monad, meaning it will either be `Just(value)` or `Nothing()`.
-   `pass`: a `Pass` monad, containing an array of values
-   `fail`: a `Fail` monad, containing an array of values
-   `ious`: an `IOU` monad, containing an array of Promises or Futures (only relevant with `InquiryP` and `InquiryF`)
-   `informant`: a function to be called upon the return of a `.inquire` call, for observation/logging purposes (is set by calling `.informant` method)

## `InquiryP.subject(value)`

Same as the above, however it returns a monad called `InquiryP` which enables function `f` in `.inquire(f)` to return a Promise. This also means that all unwrap methods will be returning a Promise.

## `InquiryF.subject(value)`

Also same, however it returns a monad called `InquiryF` which enables function `f` in `.inquire(f)` to return a Future. Requires `inquiry-monad-futures` to be included.

As a basic example:

```js
const checkDb = Question.of(
    'look up something in a db?',
    x => Future.of(Pass('pretend I looked something up in a db')
);

const value = { something: true };
InquiryF.subject(value)
    .inquire(checkDb)
    .fork(console.error, console.log);

// console.log >> {subject: Just({something: true}), pass: Pass(['pretend I looked something up in a db']), fail: Fail([]), iou: IOU([]), informant: null, questionset: Questionset(...), receipt: Receipt(...)};
```

## `Inquiry.of(inquiry)`

Using the Inquiry object structure, you may also assemble your own `Inquiry` monad "manually" with `Inquiry.of` though this is usually only necessary if using more standard functional programming methods such as `.chain` and `.ap`.

If you do not match the object strucutre, this constructor will fall back on converting the parameter into the `subject` and will emit a console warning.

# `Inquiry` methods

## Core methods

### `.inquire(f)`

Pass `inquire` a function `f` that returns either a `Pass`, `Fail`, `Promise` (`InquiryP` only), `Future` (`InquiryF` only), or another `Inquiry`. Anything other than these will not be aggregated, and a warning will be output to the console.

When another `Inquiry` is returned back, the `Pass` and `Fail` lists are concatenated into the parent Inquiry `Pass` and `Fail` lists. `Inquiry` can not have child Inquiries that are async-based, but `InquiryP` and `InquiryF` can have syncronous child Inquiries.

```js
const isMoreThanOne = Question.of([
    'is it greater than 1?',
    x =>
        x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1')
]);

const result = Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .join();

console.log(result);
// > {subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail([]), iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)};
```

### `.inquireMap(f, i)`

Map version of `.inquire`. Pass function `f` that can curry both `i` and `subject`, and collect `Pass`, `Fail`, `IOU` from the results.

This can be useful to prevent sprawling `.inquire` chains.

Function `f` _must_ be curried. See example:

```js
const planets = [
    'Mercury',
    'Venus',
    'Earth',
    'Mars',
    'Jupiter',
    'Saturn',
    'Uranus',
    'Neptune'
];

// needs to be a function returning a Question
const startsWith = word =>
    Question.of([
        'does the word start with the provided letter?',
        checks => (word.startsWith(checks.letter) ? Pass(word) : Fail(word))
    ]);

Inquiry.subject({ letter: 'M' })
    .inquireMap(startsWith, planets)
    .suffice(pass => {
        console.log(pass.join());
    });

// > ["Mercury", "Mars"]
```

### `.inquireAll()`

Run all questions in the questionset already provided via `.using()`.

### `.informant(f)`

Call function `f` upon each `inquire` result. Useful for logging or observing. The function will be passed an array
containing `['fnName', Pass('passed value')]` or `['fnName', Fail('failed value')]`.

For `InquiryP` and `InquiryF`, it is not run when the IOU is added, however does run upon resolution of the IOU.

```js
const isMoreThanOne = Question.of([
    'is it greater than 1?',
    x =>
        x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1')
]);

const isMoreThanTen = Question.of([
    'is it greater than 10?',
    x =>
        x > 10
            ? Pass('Is greater than 10')
            : Fail('Is less than or equal to 10')
]);

Inquiry.subject(5)
    .informant(console.log)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen);

// console.log would output as each function resolves:
// > 'isMoreThanOne', Pass('Is greater than 1')
// > 'isMoreThanTen', Fail('Is less than or equal to 10')
```

### `.inspect()`

Return a string with the values contained in the Inquiry. This is a common functional programming concept mainly intended for use in debugging.

```js
const isMoreThanOne = Question.of([
    'is it greater than 1?',
    x =>
        x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1')
]);

const result = Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inspect(); // outputs to string

console.log(result);
// > Inquiry({subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail([]), iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)});
```

### `.using(Questionset)`

Experimental.

Given a `Questionset`, use these questions in `inquire` and `inquireMap` if using the string-based inquire method.

## Unwrap methods:

The following methods are to be used as a means of "exiting" the Inquiry process chain.

`InquiryP` unwrap methods exit into a Promise.

`InquiryF` unwrap methods do not exit into a Future, but you can convert to a promise by unwrapping with `.promise()`.

### `.join()` (only useful for `Inquiry`)

Returns the contained `Inquiry` object value, without any additional handling.

This is most basic way of returning the values collected by `Inquiry`.

Warning: this can be, but should not be, used with `InquiryP`as it will not ensure Promises have resolved before returning the value. These unresolved Promises will be contained in the `IOU` list.

```js
const isMoreThanOne = Question.of([
    'is it greater than 1?',
    x =>
        x > 1 ? Pass('Is greater than 1') : Fail('Is less than or equal to 1')
]);

const isMoreThanTen = Question.of([
    'is it greater than 10?',
    x =>
        x > 10
            ? Pass('Is greater than 10')
            : Fail('Is less than or equal to 10')
]);

const results = Inquiry.subject(5)
    .inquire(isMoreThanOne)
    .inquire(isMoreThanTen)
    .join();

console.log(results);
// > {subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail(['Is less than or equal to 10']), iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)};
```

### `.chain(f)`

Passes the contained `Inquiry` object value into a function `f`. (You may optionally continue the Inquiry chain by having function `f` return `Inquiry.of(value)` as long as it adheres to the object structure.)

This is useful when you want to convert an Inquiry process chain into a Promise or a Future.

Warning: In the case of `InquiryP`, you will want to use `await` first before using chain (see below), though that requires you to convert into a Promise (or Future).

```js
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass('Is greater than 1')
                : Fail('Is less than or equal to 1')
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass('Is greater than 10')
                : Fail('Is less than or equal to 10')
    ]
]);

Inquiry.subject(5)
    .using(myQuestionset)
    .inquireAll()
    .chain(Promise.resolve)
    .then(console.log); // now we're a Promise

// > {subject: Just(5), pass: Pass(['Is greater than 1']), fail: Fail(['Is less than or equal to 10']), iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)};
```

### `.conclude(f, g)`

Returns the contained `Inquiry` object value, with map functions `f` and `g` applied to both fail (`f`) and pass (`g`).

For `InquiryP`, this method will wait for resolution of all outstanding IOUs (Promises) before applying `f` and `g`.

i.e. "Run one function for the list of failures, another for the list of passes, and return back everything."

This is useful for returning a full accounting of all results and the original subject, in addition to making adjustments based on resulting `Fail` and `Pass` lists.

```js
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass({ greaterThanOne: true })
                : Fail({ greaterThanOne: false })
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass({ greaterThanTen: true })
                : Fail({ greaterThanTen: false })
    ]
]);

const results = Inquiry.subject(5)
    .using(myQuestionset)
    .inquireAll()
    .conclude(
        a => ({
            failCount: a.join().length,
            fails: a.join()
        }),
        b => ({
            passCount: b.join().length,
            passes: b.join()
        })
    );

console.log(results);
// > {subject: Just(5), pass: {passCount: 1, passes: ['Is greater than 1']}, fail: {failCount: 1, fails: ['Is less than or equal to 10']}, iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)};
```

### `.faulted(f)`

Runs function `f` against the `Fail` list -- but only if there are items in that list. Otherwise, runs a no-op function.

i.e., "Run the function if something fails."

Functionally equivalent to `.conclude(f, x => {})`.

### `.cleared(f)`

Runs function `f` against the `Pass` list -- but only if there are no items in the `Fail` list. Otherwise, runs a no-op function.

i.e., "Run the function if everything passes."

Functionally opposite of `.faulted(f)`. These two can be in the same chain.

### `.suffice(f)`

Runs function `f` against the `Pass` list -- but only if there are items in the `Pass` list. Otherwise, runs a no-op function.

i.e., "Run the function if something passes."

Functionally equivalent to `.conclude(x => {}, f)`.

### `.scratch(f)`

Runs function `f` against the `Fail` list -- but only if there are no items in the `Pass` list. Otherwise, runs a no-op function.

i.e., "Run the function if everything fails"

Functionally opposite of `.suffice(f)`. These two can be in the same chain.

### `.fork(f, g)`

Either run a function `f` if there are _any_ values in the `Fail` list, or `g` if there are _no_ values in the `Fail` list, returning only the result of the function executed.

i.e. "Run one function if something failed, another if nothing failed."

This is useful for conventional error-handling, where you wish to favour handling of `Fail` results regardless of any `Pass` results.

```js
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass({ greaterThanOne: true })
                : Fail({ greaterThanOne: false })
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass({ greaterThanTen: true })
                : Fail({ greaterThanTen: false })
    ]
]);

const results1 = Inquiry.subject(5)
    .using(myQuestionset)
    .inquireAll()
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
    .using(myQuestionset)
    .inquireAll()
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

## `.fold(f, g)`

Either run a function `f` if there are _any_ values in the `Pass` list, or `g` if there are _no_ values in the `Pass` list, returning only the result of the function executed.

i.e. "Run one function if something passed, another if nothing passed."

This is similar to `.fork` but with weighting towards `Pass` rather than `Fail`.

### `.zip(f)`

Run function `f` against an `Array` resulting from a merge of `Pass` and `Fail` lists.

i.e., "Run the function against a merge of fails and passes."

This may be useful if you'd like to use the `Inquiry` API but do not necessarily care about `Pass` or `Fail` lists, or you may have already handled their positive/negative aspects via other means.

```js
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass({ greaterThanOne: true })
                : Fail({ greaterThanOne: false })
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass({ greaterThanTen: true })
                : Fail({ greaterThanTen: false })
    ]
]);

const logResults = someFn; // notify another system about the passes/failures

const results = Inquiry.subject(5)
    .informant(logResults)
    .using(myQuestionset)
    .inquireAll()
    .zip(x => x);

console.log(results);
// >> [{greaterThanOne: true}, {greaterThanTen: false}]
```

### `.await(t)` (`InquiryP` and `InquiryF` only)

`t` is optional.

After resolving all outstanding IOUs or waiting for time `t`, returns a Promise or Future containing the Inquiry with either all IOUs resolved or a timeout under the `Fail` list.

i.e., "Wait for everything to finish, then continue."

```js
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass('Is greater than 1')
                : Fail('Is less than or equal to 1')
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass('Is greater than 10')
                : Fail('Is less than or equal to 10')
    ],
    ['get me some data', async () => Promise.resolve(Pass('here is some data'))]
]);

InquiryP.subject(5)
    .using(myQuestionset)
    .inquireAll()
    .await(20000)
    .then(inq => console.log(inq.join())); // if checkDb() took more than 20 seconds, its result would be a Fail

// > {subject: Just(5), pass: Pass(['Is greater than 1', 'here is some data']), fail: Fail(['Is less than or equal to 10']), iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)};
```

## Early results methods:

### `.breakpoint(f)`

Run a function `f` only if the `Fail` list has contents.

i.e., "Run the function if there are any fails thus far."

**You must return the parameter passed to the function.**

e.g.

```js
    .breakpoint(x => {
        // do something
        return x;
    });
```

The `InquiryP` and `InquiryF` versions of this will wait for outstanding IOUs to resolve.

Useful if you'd like to handle `Fail` results early for some reason, such as throwing a fatal error or notifying an external stakeholder.

```js
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass({ greaterThanOne: true })
                : Fail({ greaterThanOne: false })
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass({ greaterThanTen: true })
                : Fail({ greaterThanTen: false })
    ],
    [
        'is it more than 20?',
        x =>
            x > 20
                ? Pass({ greaterThanTwenty: true })
                : Fail({ greaterThanTwenty: false })
    ]
]);

Inquiry.subject(5)
    .using(myQuestionset)
    .inquire('is it greater than 1?')
    .breakpoint(x => {
        console.warn('after one', x.fail.join()); // will not happen
        return x;
    })
    .inquire('is it greater than 10?')
    .breakpoint(x => {
        console.warn('after ten', x.fail.join()); // this will run
        return x;
    })
    .inquire('is it more than 20?');
```

### `.milestone(f)`

Run a function `f` only if `Pass` list has contents. Unlike `fork` or `cleared` this triggers if there are any results in the `Pass` list, regardless of how many results exist within the `Fail` list.

i.e., "Run the function if there are any passes thus far."

**You must return the parameter passed to the function.**

e.g.

```js
    .milestone(x => {
        // do something
        return x;
    });
```

The `InquiryP` and `InquiryF` versions of this will wait for outstanding IOUs to resolve.

Useful if you'd like to handle `Pass` results early for some reason.

```js
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass({ greaterThanOne: true })
                : Fail({ greaterThanOne: false })
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass({ greaterThanTen: true })
                : Fail({ greaterThanTen: false })
    ],
    [
        'is it more than 20?',
        x =>
            x > 20
                ? Pass({ greaterThanTwenty: true })
                : Fail({ greaterThanTwenty: false })
    ]
]);

Inquiry.subject(5)
    .using(myQuestionset)
    .inquire('is it greater than 1?')
    .milestone(x => {
        console.warn('after one', x.pass.join()); // this will run
        return Inquiry.of(x);
    })
    .inquire('is it greater than 10?')
    .milestone(x => {
        console.warn('after ten', x.pass.join()); // this will run (still has passes)
        return Inquiry.of(x);
    })
    .inquire('is it more than 20?');
```

## Multi-map method:

### `.unison(f)`

Run a function `f` against both `Pass` and `Fail` lists.

Note that in the case of `InquiryP` and `InquiryF` items in the IOU list will be missed, unless resolved via `.await` easlier. This does currently bury the Inquiry in a Promise layer, however.

```js
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass('Is greater than 1')
                : Fail('Is less than or equal to 1')
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass('Is greater than 10')
                : Fail('Is less than or equal to 10')
    ]
]);

const allCaps = items => items.map(x => x.toUpperCase());

Inquiry.subject(5)
    .using(myQuestionset)
    .inquireAll()
    .unison(allCaps)
    .join();

// > {subject: Just(5), pass: Pass(['IS GREATER THAN 1']), fail: Fail(['IS LESS THANK OR EQUAL TO 10']), iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)};
```

## Flow-control method:

### `.swap()`

Swap the `Pass` and `Fail` lists.

This would be useful if you are using `Pass`/`Fail` as a proxy for a less opinionated concept that does not give weight to one side over another.

```js
// @todo more practical example...
const myQuestionset = Questionset.of([
    [
        'is it greater than 1?',
        x =>
            x > 1
                ? Pass('Is greater than 1')
                : Fail('Is less than or equal to 1')
    ],
    [
        'is it greater than 10?',
        x =>
            x > 10
                ? Pass('Is greater than 10')
                : Fail('Is less than or equal to 10')
    ]
]);

const result = Inquiry.subject(5)
    .using(myQuestionset)
    .inquireAll()
    .swap();

console.log(result);
// > {subject: Just(5), pass: Pass(['Is less than or equal to 10']), fail: Fail(['Is greater than 1']), iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)};
```

## Monad methods

### `.map(f)`

Taking a function `f`, apply the contained value and return the result in the same type of monad.

```js
const R = require('ramda');
const passes = Pass([1, 2]);
const fails = Fail([5, 10, 30]);
const doublePasses = passes.map(R.multiply(2));
const tripleFails = fails.map(R.multiply(3));

console.log(doublePasses.inspect());
// > Pass([2, 4])

console.log(tripleFails.inspect());
// > Fail([15, 30, 90])

// since `Inquiry` is a monad containing a strictly structured Object type, simple maps will not work
const isEven = n => n % 2 === 0;
const filterPass = inq => {
    inq.passes.map(R.filter(isEven)); // passes is inside a Pass monad, need to map it as well
    return inq; // must return with all properties intact (passes, fails, ious, etc)
};

const qset = Questionset.of([
    ['pass one', x => Pass(1)],
    ['pass two', x => Pass(2)]
])

const result = Inquiry.subject('something')
    .using(qset)
    .inquireAll()
    .map(filterPass)
    .join();

console.log(result);
// > { subject: Just('something), pass: Pass([2]), fail: Fail([]), iou: IOU([]), informant: _ => _, questionset: Questionset(...), receipt: Receipt(...)}
```

### `.ap(f)`

Applicative functor method. This is arguably one of the more complex functional programming concepts included in this module.

With this you can take a monad that contains a function (instead of a straight up value) and combine it with a monad containing a value.

In this example, we use [Ramda](https://ramdajs.com) and [Maybe](https://www.npmjs.com/package/simple-maybe) to handle a `Pass` list.

```js
// using Ramda for this example for the R.sum function, which adds all array values together
const R = require('ramda');
const Maybe = require('simple-maybe');
const passes = Pass([1, 2]);
const addAllPasses = Maybe.of(R.sum).ap(passes);

console.log(addAllPasses.inspect());
// > Just(3)
```

### `.join(f)`

See above in Unwrap methods section.

### `.chain(f)`

See above in Unwrap methods section.

### `.inspect(f)`

See above in Core methods section.

## Development

Source is written in TypeScript. Run tests via `npm run test`.

## MIT License

Copyright 2018 Robert Gerald Porter <mailto:rob@weeverapps.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
