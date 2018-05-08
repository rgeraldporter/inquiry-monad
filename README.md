# Inquiry Monad
### v0.12.0

Experiment with aggregate Left/Right monad running parallel. More details when it is better fleshed out.

```
const {Inquiry, InquiryP, Pass, Fail} = require('inquiry-monad');

const subjectData = {
    a: 1,
    b: false
};

const hasA = x => x.a ? Pass('has a') : Fail('does not have a');
const validateB = x => x.b && typeof x.b === 'boolean' ? Pass('b is valid') : Fail('b is invalid');
const hasNoC = x => x.c ? Fail('has a c value') : Pass('has no c value');

/* With all passes */
Inquiry.subject(subjectData)
    .informant(console.log) // this will output console.logs of all future `inquire` results
    .inquire(hasA)
    .inquire(validateB)
    .inquire(hasNoC)
    .join();

// result: {subject: {a:1, b:false}, pass: Pass(['has a', 'b is valid', 'has no c value']), fail: Fail([]), iou: IOU([])}


/* With failures */
const subjectDataWithFailure = {
    a: 1,
    b: 'string',
    c: true
};

Inquiry.subject(subjectDataWithFailure)
    .informant(console.log)
    .inquire(hasA)
    .inquire(validateB)
    .inquire(hasNoC)
    .join();

// result: {subject: {a:1, b:false}, pass: Pass(['has a']), fail: Fail(['b is invalid', 'has c value']), iou: IOU()}

/* With async Promises */
const checkDb = async (x) => Promise.resolve('pretend I looked something up in a db');

Inquiry.subject(subjectDataWithFailure)
    .informant(console.log)
    .inquire(checkDb)
    .inquire(hasA)
    .inquire(validateB)
    .inquire(hasNoC)
    .conclude(x => x, y => y);
    // for now .conclude or another unwrap fn is necessary to complete "IOUs" to give a clean exit (unresolved Promises)

// result: {subject: {a:1, b:false}, pass: Pass(['has a', 'pretend I looked something up in a db']), fail: Fail(['b is invalid', 'has c value']), iou: IOU()}

```

Inquiry can take any value (a subject), store it within an immutable container (monad) to be tested against various functions (.inquire) and resulting in two or three lists: `Pass([])`, `Fail([])`, and sometimes `IOU([])` in the case of async functions.

The advantage over traditional Promises is that the original subject and each result is retained through the resulting chain of functions,giving complete observability over the data passed through. Also, you may "contain" your Promises with a monadic structure, bolstering immutibility.

For those who wish to compare to a traditional Left/Right in functional programming, there are many advantages over a Left/Right or Validation pattern from functional. Inquiry aggregates all results, not just failures.

Inquiry can handle both syncrounous and asyncronous operations, although the rules change a bit when async is added.

Inquiry is designed to be an expressive, easily understood API, and is "under construction" for as long as it is versioned as 0.x.

Currently Promises are supported via `InquiryP`, but support for Futures is forthcoming.

### Constructor method:

`Inquiry.subject(theSubject)` / `InquiryP.subject(theSubject)`

Returns an `Inquiry` monad, which is monad containing an object with properties `subject`, `pass`, `fail`, `iou`, and an `informant` method.

You may also use `Inquiry.of()` in the same way though this may be deprecated soon as it does not work the same as other functional libraries where `.of` is used.

```
console.log(Inquiry.subject(theSubject).join()); // reveal contained value
// > {subject: theSubject, pass: Pass([]), fail: Fail([]), iou: IOU([]), informant: fn};
```

Note the constructor `Inquiry()` or `InquiryP()` can only be used if the above object type is adhered to. This style should be discouraged.

### Inquire

`.inquire(f)` : give inquire a function `f` that returns either a `Pass()` or `Fail()` value, or in an `InquiryP`, an `IOU()`.

### Interrogative methods:

`.inspect()` : return a string with the value contained in the Inquiry monad.
`.informant(f)`: call function `f` upon each `.inquire` result. Useful for logging or observing. The function will be passed an array
containing `['fnName', Pass('passed value')]` or `['fnName', Fail('failed value')]`.

### Standard monadic methods:

`ap`
`map`
`chain`
`join`

### Unwrap methods:

`conclude(f, g)` - returns the monad's container value, with map functions applied to both fail (`f`) and pass (`g`), but will wait to resolve all outstanding IOUs (Promises)
`fork` - exit and either run a function if there are any failures, or another if all have passes
`zip` - exit and return an merged list of passes and fails

Multi-map method:
`unison`

Flow-control method:
`swap`

More documentation forthcoming!