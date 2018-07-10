import { Maybe } from 'simple-maybe';

import {
    Monad,
    InquiryMonad,
    IOUMonad,
    PassFailMonad,
    PassMonad,
    FailMonad,
    InquiryValue,
    ReceiptMonad,
    ReceiptValue,
    QuestionsetMonad,
    QuestionMonad,
    QuestionValue
} from './inquiry-monad';

import {
    $$inquirySymbol,
    $$questionsetSymbol,
    $$questionSymbol,
    $$passSymbol,
    $$failSymbol,
    $$iouSymbol,
    $$receiptSymbol
} from './symbols';

const noop = (): void => {};

const $$notFoundSymbol: unique symbol = Symbol('Not found');

const IOU = (x: QuestionMonad | Array<QuestionMonad>): IOUMonad => ({
    map: (f: Function): IOUMonad => IOU(f(x)),
    chain: (f: Function): any => f(x),
    ap: (y: Monad): Monad => y.map(x),
    inspect: (): string => `IOU(${x})`,
    join: (): QuestionMonad | Array<QuestionMonad> => x,
    concat: (o: IOUMonad): IOUMonad =>
        o.chain(
            (r: any): IOUMonad => IOU((x as Array<QuestionMonad>).concat(r))
        ),
    head: (): QuestionMonad | Array<QuestionMonad> =>
        Array.isArray(x) && x.length ? x[0] : [],
    tail: (): QuestionMonad | Array<QuestionMonad> =>
        Array.isArray(x) && x.length ? x[x.length - 1] : [],
    isEmpty: (): Boolean => Boolean(!Array.isArray(x) || x.length === 0),
    [$$inquirySymbol]: false,
    [$$passSymbol]: false,
    [$$failSymbol]: false,
    [$$iouSymbol]: true
});

const Pass = <T>(x: Array<T> | T): PassMonad => ({
    map: (f: Function): PassMonad => Pass(f(x)),
    chain: (f: Function): any => f(x),
    fold: (f: Function, _: Function): any => f(x),
    fork: (_: Function, f: Function): any => f(x),
    head: (): Array<T> | T => (Array.isArray(x) && x.length ? x[0] : []),
    tail: (): Array<T> | T =>
        Array.isArray(x) && x.length ? x[x.length - 1] : [],
    join: (): Array<T> | T => x,
    inspect: (): string => `Pass(${x})`,
    concat: (o: PassFailMonad): PassFailMonad =>
        o.fold((r: any): PassMonad => Pass((x as Array<T>).concat(r)), noop),
    ap: (y: PassFailMonad): PassMonad =>
        (y as any)[$$passSymbol] ? y.concat(Pass(x)) : Pass(x),
    answer: (
        i: InquiryValue,
        n: string = '(anonymous)',
        c: Function = Inquiry
    ): InquiryMonad => {
        i.informant([n, Pass(x)]);
        return c({
            subject: i.subject,
            fail: i.fail,
            iou: i.iou,
            pass: i.pass.concat(Pass(x)),
            informant: i.informant,
            questionset: i.questionset,
            receipt: i.receipt.concat(Receipt([ [n, Pass(x)] ]))
        });
    },
    isEmpty: (): Boolean => Boolean(!Array.isArray(x) || x.length === 0),
    [$$passSymbol]: true,
    [$$failSymbol]: false,
    [$$iouSymbol]: false,
    [$$inquirySymbol]: false
});

const Fail = <T>(x: Array<T> | T): FailMonad => ({
    map: (f: Function): FailMonad => Fail(f(x)),
    chain: (f: Function): any => f(x),
    fold: (_: Function, f: Function): any => f(x),
    fork: (f: Function, _: Function): any => f(x),
    head: (): Array<T> | T => (Array.isArray(x) && x.length ? x[0] : []),
    tail: (): Array<T> | T =>
        Array.isArray(x) && x.length ? x[x.length - 1] : [],
    join: (): Array<T> | T => x,
    inspect: (): string => `Fail(${x})`,
    concat: (o: PassFailMonad): PassFailMonad =>
        o.fork((r: any): FailMonad => Fail((x as Array<T>).concat(r)), noop),
    ap: (y: PassFailMonad): FailMonad =>
        y[$$passSymbol] ? Fail(x) : y.concat(Fail(x)),
    answer: (
        i: InquiryValue,
        n: string = '(anonymous)',
        c: Function = Inquiry
    ): InquiryMonad => {
        i.informant([n, Fail(x)]);
        return c({
            subject: i.subject,
            fail: i.fail.concat(Fail(x)),
            pass: i.pass,
            iou: i.iou,
            informant: i.informant,
            questionset: i.questionset,
            receipt: i.receipt.concat(Receipt([[n, Fail(x)]]))
        });
    },
    isEmpty: (): Boolean => Boolean(!Array.isArray(x) || x.length === 0),
    [$$passSymbol]: false,
    [$$failSymbol]: true,
    [$$iouSymbol]: false,
    [$$inquirySymbol]: false
});

const Receipt = (x: Array<ReceiptValue>): ReceiptMonad => ({
    map: (f: Function): ReceiptMonad => Receipt(f(x)),
    chain: (f: Function): any => f(x),
    fold: (_: Function, f: Function): any => f(x),
    fork: (f: Function, _: Function): any => f(x),
    head: (): ReceiptValue => x[0],
    tail: (): ReceiptValue => x[x.length - 1],
    join: (): Array<ReceiptValue> => x,
    inspect: (): string => `Receipt(${x})`,
    isEmpty: (): Boolean => Boolean(!Array.isArray(x) || x.length === 0),
    concat: (o: ReceiptMonad): ReceiptMonad =>
        o.chain(
            (r: any): ReceiptMonad =>
                Receipt((x as Array<ReceiptValue>).concat(r))
        ),
    ap: (y: Monad): Monad => y.map(x),
    [$$inquirySymbol]: false,
    [$$receiptSymbol]: true
});

const questionTypeError = (x: any): void =>
    console.error(
        'Question must be passed parameters that adhere to the documented type. Value that was passed:',
        x
    );

const Question = (x: QuestionValue): QuestionMonad => ({
    map: (f: Function): QuestionMonad => Question(f(x)),
    chain: (f: Function): any => f(x),
    ap: (y: Monad): Monad => y.map(x),
    inspect: (): string => `Question(${x})`,
    join: (): any => x,
    call: (i: InquiryMonad): PassFailMonad => x[1](i.join().subject.join()),
    extract: (): Function => x[1],
    name: (): string | RegExp => x[0],
    [$$questionSymbol]: true
});

const QuestionOf = (x: QuestionValue): QuestionMonad | void =>
    Array.isArray(x) ? Question(x) : questionTypeError(x);

const exportQuestion = {
    of: QuestionOf
};

const Questionset = (x: Array<QuestionValue>): QuestionsetMonad => ({
    map: (f: Function): QuestionsetMonad => Questionset(f(x)),
    chain: (f: Function): any => f(x),
    ap: (y: Monad): Monad => y.map(x),
    inspect: (): string => `Questionset(${x})`,
    join: (): any => x,
    find: (a: string): Monad =>
        Maybe.of(x.find(i => RegExp(i[0]).test(a)))
            .map((b: QuestionValue): Function => b[1])
            .fork((): symbol => {
                console.warn('Question was not found: ', a);
                return $$notFoundSymbol;
            }, (c: Function): Function => c),
    [$$questionsetSymbol]: true
});

const questionsetTypeError = (x: any): void =>
    console.error(
        'Questionset must be passed parameters that adhere to the documented type. Value that was passed:',
        x
    );

const QuestionsetOf = (x: Array<QuestionValue>): QuestionsetMonad | void =>
    Array.isArray(x) ? Questionset(x) : questionsetTypeError(x);

const exportQuestionset = {
    of: QuestionsetOf
};

const InquirySubject = (x: any | InquiryMonad): InquiryMonad =>
    (x as any)[$$inquirySymbol]
        ? x
        : Inquiry({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: <T>(_: T) => _,
              questionset: Questionset([['', noop]]),
              receipt: Receipt([])
          });

const warnTypeError = <T>(x: T): InquiryMonad => {
    console.warn(
        'Inquiry.of requires properties: subject, fail, pass, iou, informant, questionset, receipt. Converting to Inquiry.subject().'
    );
    return InquirySubject(x);
};

// @todo validate constructor via Symbol
// @todo add receipts property
const InquiryOf = (x: InquiryValue): InquiryMonad =>
    'subject' in x &&
    'fail' in x &&
    'pass' in x &&
    'iou' in x &&
    'informant' in x &&
    'questionset' in x &&
    'receipt' in x
        ? Inquiry(x)
        : warnTypeError(x);

const Inquiry = (x: InquiryValue): InquiryMonad => ({
    // Inquire: core method
    // You may pass a Function, a QuestionMonad (with a function), or a string which will look up
    //  in the current Inquiry's questionset.
    inquire: (f: Function | string | QuestionMonad): InquiryMonad => {
        const extractName = (f: string | QuestionMonad) =>
            (f as QuestionMonad)[$$questionSymbol]
                ? (f as QuestionMonad).name()
                : f;
        const fnName =
            typeof f === 'function' ? f.name || 'anon' : extractName(f);
        const fExtractFn = (f as any)[$$questionSymbol]
            ? (f as QuestionMonad).extract()
            : f;
        const fIsFn = typeof fExtractFn === 'function';
        const inquire = fIsFn
            ? fExtractFn
            : (x.questionset as QuestionsetMonad).find(fExtractFn);

        const warnNotPassFail = (resp: any): InquiryMonad => {
            console.warn(
                'inquire was passed a function that does not return Pass or Fail:',
                fnName
            );
            console.warn('response was:', resp);
            return Inquiry(x);
        };
        const inquireResponse =
            typeof inquire === 'function' ? inquire(x.subject.join()) : {};

        return inquireResponse[$$failSymbol] ||
            inquireResponse[$$passSymbol] ||
            inquireResponse[$$inquirySymbol]
            ? inquireResponse.answer(x, fnName, Inquiry)
            : warnNotPassFail([inquireResponse, fnName]);
    },

    inquireMap: (
        f: Function | string | QuestionMonad,
        i: Array<any>
    ): InquiryMonad =>
        i.reduce(
            (inq, ii) => {
                const fExtractFn = (f as any)[$$questionSymbol]
                    ? (f as QuestionMonad).extract()
                    : f;
                const fIsFn = typeof fExtractFn === 'function';
                const inquire = fIsFn
                    ? fExtractFn
                    : (x.questionset as QuestionsetMonad).find(fExtractFn);
                const fnName = fIsFn
                    ? (fExtractFn as Function).name
                    : fExtractFn;

                const warnNotPassFail = (resp: any): InquiryMonad => {
                    console.warn(
                        'inquire was passed a function that does not return Pass or Fail:',
                        fnName
                    );
                    console.warn('response was:', resp);
                    return inq;
                };
                const inquireResponse =
                    typeof inquire === 'function'
                        ? inquire(ii)(inq.join().subject.join())
                        : {};

                // each return aggregates new contained value through exit
                return inquireResponse[$$failSymbol] ||
                    inquireResponse[$$passSymbol] ||
                    inquireResponse[$$inquirySymbol]
                    ? inquireResponse.answer(inq.join(), fnName, Inquiry)
                    : warnNotPassFail([inquireResponse, fnName]);
            },

            // initial Inquiry will be what is in `x` now
            Inquiry({
                subject: x.subject,
                iou: x.iou,
                fail: x.fail,
                pass: x.pass,
                informant: x.informant,
                questionset: x.questionset,
                receipt: x.receipt
            })
        ),

    inquireAll: (): InquiryMonad =>
        (x.questionset as QuestionsetMonad).chain(
            (questions: Array<QuestionValue>): InquiryMonad =>
                questions.reduce(
                    (inq: InquiryMonad, q: QuestionValue): InquiryMonad =>
                        inq.inquire(QuestionOf(q)),
                    Inquiry(x)
                )
        ),

    using: (a: QuestionsetMonad): InquiryMonad =>
        Inquiry({
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: x.informant,
            questionset: a,
            receipt: x.receipt
        }),

    // Informant: for spying/logging/observable
    informant: (f: Function): InquiryMonad =>
        Inquiry({
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: f,
            questionset: x.questionset,
            receipt: x.receipt
        }),

    inspect: (): string =>
        `Inquiry(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,

    // Flow control: swap pass/fail
    swap: (): InquiryMonad =>
        Inquiry({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join()),
            informant: x.informant,
            questionset: x.questionset,
            receipt: x.receipt
        }),

    // Mapping across both branches
    unison: (
        f: Function
    ): InquiryMonad => // apply a single map to both fail & pass (e.g. sort)
        Inquiry({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(f(x.fail.join())),
            pass: Pass(f(x.pass.join())),
            informant: x.informant,
            questionset: x.questionset,
            receipt: x.receipt
        }),

    // standard Monad methods
    map: (f: Function): InquiryMonad => InquirySubject(f(x)),
    ap: (y: Monad): Monad => y.map(x),
    chain: (f: Function): any => f(x),
    join: (): InquiryValue => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function): InquiryMonad =>
        x.fail.join().length ? Inquiry(f(x)) : Inquiry(x),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function): InquiryMonad =>
        x.pass.join().length ? Inquiry(f(x)) : Inquiry(x),

    // internal method: execute informant, return new InquiryP() based on updated results
    answer: (i: InquiryValue, n: string, _: Function): InquiryMonad => {
        i.informant([n, Inquiry(x)]);
        return Inquiry({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant,
            questionset: i.questionset,
            receipt: i.receipt
        });
    },

    // Unwrap methods

    // unwraps, mapping for both branches, full value returned
    conclude: (f: Function, g: Function): InquiryValue => ({
        subject: x.subject,
        iou: x.iou,
        fail: f(x.fail),
        pass: g(x.pass),
        informant: x.informant,
        questionset: x.questionset,
        receipt: x.receipt
    }),

    // If there are no fails, handoff aggregated passes to supplied function; if any fails, return noop
    cleared: (f: Function): any | void =>
        x.fail.isEmpty() ? f(x.pass) : noop(),

    // If there are fails, handoff aggregated fails to supplied function; if no fails, return noop
    faulted: (f: Function): void | any =>
        x.fail.isEmpty() ? noop() : f(x.fail),

    // If there are passes, handoff aggregated passes to supplied function; if no passes, return noop
    suffice: (f: Function): void | any =>
        x.pass.isEmpty() ? noop() : f(x.pass),

    // If there are no passes, handoff aggregated fails to supplied function; if any passes, return noop
    scratch: (f: Function): any | void =>
        x.pass.isEmpty() ? f(x.fail) : noop(),

    // unwrap left if any fails, right if not
    fork: (f: Function, g: Function): any =>
        x.fail.join().length ? f(x.fail) : g(x.pass),

    // unwrap left if any passes, right if not
    fold: (f: Function, g: Function): any =>
        x.pass.join().length ? f(x.pass) : g(x.fail),

    // return a merged pass/fail
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())), // return a concat of pass/fails

    [$$inquirySymbol]: true
});

const exportInquiry = {
    subject: InquirySubject,
    of: InquiryOf
};

const InquiryPSubject = (x: any | InquiryMonad): InquiryMonad =>
    (x as any)[$$inquirySymbol]
        ? x
        : InquiryP({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: <T>(_: T) => _,
              questionset: Questionset([['', noop]]),
              receipt: Receipt([])
          });

const warnTypeErrorP = <T>(x: T): InquiryMonad => {
    console.warn(
        'InquiryP.of requires properties: subject, fail, pass, iou, informant, questionset, receipt. Converting to InquiryP.subject().'
    );
    return InquiryPSubject(x);
};

const InquiryPOf = (x: InquiryValue): InquiryMonad =>
    'subject' in x &&
    'fail' in x &&
    'pass' in x &&
    'iou' in x &&
    'informant' in x &&
    'questionset' in x &&
    'receipt' in x
        ? InquiryP(x)
        : warnTypeErrorP(x);

const buildInq = <T>(x: T) => (vals: Array<any>): InquiryMonad =>
    vals.reduce((acc, cur) => cur[1].answer(acc, cur[0], InquiryP).join(), x);

// this is a bit complex, so here it goes:
// Take all our IOUs (Questions), extract and resolve their Promises
// then take those results apply to a tuple with the question name/description
const resolveQs = (x: InquiryValue) =>
    x.iou.join().map(
        (q: QuestionMonad): Promise<PassFailMonad> =>
            q
                .extract()()
                .then(
                    (result: PassFailMonad): Promise<Array<any>> =>
                        Promise.resolve([q.name(), result])
                )
    );

const InquiryP = (x: InquiryValue): InquiryMonad => ({
    inquire: (f: Function | string | QuestionMonad) => {
        const extractName = (f: string | QuestionMonad) =>
            (f as QuestionMonad)[$$questionSymbol]
                ? (f as QuestionMonad).name()
                : f;
        const fnName =
            typeof f === 'function' ? f.name || 'anon' : extractName(f);
        const fExtractFn = (f as any)[$$questionSymbol]
            ? (f as QuestionMonad).extract()
            : f;
        const fIsFn = typeof fExtractFn === 'function';
        const inquire = fIsFn
            ? fExtractFn
            : (x.questionset as QuestionsetMonad).find(fExtractFn);

        const warnNotPassFail = (resp: any): InquiryMonad => {
            console.warn(
                'inquire was passed a function that does not return Pass or Fail:',
                fnName
            );
            console.warn('response was:', resp);
            return Inquiry(x);
        };

        const inquireResponse =
            typeof inquire === 'function' ? inquire(x.subject.join()) : {};

        const syncronousResult = (response: any): InquiryMonad =>
            response[$$failSymbol] ||
            response[$$passSymbol] ||
            response[$$inquirySymbol]
                ? response.answer(x, fnName, InquiryP)
                : warnNotPassFail([inquireResponse, fnName]);

        const inquireIOU = inquireResponse.then
            ? QuestionOf([fnName as string, () => inquireResponse])
            : false;

        return inquireIOU
            ? InquiryP({
                  subject: x.subject,
                  fail: x.fail,
                  pass: x.pass,
                  iou: x.iou.concat(IOU([inquireIOU])),
                  informant: x.informant,
                  questionset: x.questionset,
                  receipt: x.receipt
              })
            : syncronousResult(inquireResponse);
    },

    inquireMap: (
        f: Function | string | QuestionMonad,
        i: Array<any>
    ): InquiryMonad =>
        i.reduce(
            (inq, ii) => {
                const fExtractFn = (f as any)[$$questionSymbol]
                    ? (f as QuestionMonad).extract()
                    : f;
                const fIsFn = typeof fExtractFn === 'function';
                const inquire = fIsFn
                    ? fExtractFn
                    : (x.questionset as QuestionsetMonad).find(fExtractFn);
                const fnName = fIsFn
                    ? (fExtractFn as Function).name
                    : fExtractFn;

                const warnNotPassFail = (resp: any) => {
                    console.warn(
                        'inquire was passed a function that does not return Pass or Fail:',
                        fnName
                    );
                    console.warn('response was:', resp);
                    return inq;
                };
                const inquireResponse =
                    typeof inquire === 'function'
                        ? inquire(ii)(inq.join().subject.join())
                        : {};

                const syncronousResult = (response: any): InquiryMonad =>
                    response[$$failSymbol] ||
                    response[$$passSymbol] ||
                    response[$$inquirySymbol]
                        ? response.answer(inq.join(), fnName, InquiryP)
                        : Pass(response).answer(x, fnName, InquiryP); // @todo this should be warNotPassFail

                return inquireResponse.then
                    ? InquiryP({
                          subject: inq.join().subject,
                          fail: inq.join().fail,
                          pass: inq.join().pass,
                          iou: inq.join().iou.concat(IOU([inquireResponse])),
                          informant: inq.join().informant,
                          questionset: inq.join().questionset,
                          receipt: inq.join().receipt
                      })
                    : syncronousResult(inquireResponse);
            },

            // initial Inquiry will be what is in `x` now
            InquiryP({
                subject: x.subject,
                iou: x.iou,
                fail: x.fail,
                pass: x.pass,
                informant: x.informant,
                questionset: x.questionset,
                receipt: x.receipt
            })
        ),

    inquireAll: (): InquiryMonad =>
        (x.questionset as QuestionsetMonad).chain(
            (questions: Array<QuestionValue>): InquiryMonad =>
                questions.reduce(
                    (inq: InquiryMonad, q: QuestionValue): InquiryMonad =>
                        inq.inquire(QuestionOf(q)),
                    InquiryP(x)
                )
        ),

    using: (a: QuestionsetMonad): InquiryMonad =>
        InquiryP({
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: x.informant,
            questionset: a,
            receipt: x.receipt
        }),

    // Informant: for spying/logging/observable
    informant: (f: Function): InquiryMonad =>
        InquiryP({
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: f,
            questionset: x.questionset,
            receipt: x.receipt
        }),

    inspect: (): string =>
        `InquiryP(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,

    // Flow control: swap left/right pass/fail (iou is untouched)
    swap: (): InquiryMonad =>
        InquiryP({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join()),
            informant: x.informant,
            questionset: x.questionset,
            receipt: x.receipt
        }),

    // Mapping across both branches
    unison: (
        f: Function
    ): InquiryMonad => // apply a single map to both fail & pass (e.g. sort), iou untouched
        InquiryP({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(f(x.fail.join())),
            pass: Pass(f(x.pass.join())),
            informant: x.informant,
            questionset: x.questionset,
            receipt: x.receipt
        }),

    // Standard monad methods - note that while these work, remember that `x` is a typed Object
    map: (f: Function): InquiryMonad => InquiryPSubject(f(x)), // cast required for now
    ap: (y: Monad): Monad => y.map(x),
    chain: (f: Function): any => f(x),
    join: (): InquiryValue => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function): InquiryMonad =>
        x.fail.join().length ? InquiryP(f(x)) : InquiryP(x),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function): InquiryMonad =>
        x.pass.join().length ? InquiryP(f(x)) : InquiryP(x),

    // internal method: execute informant, return new InquiryP() based on updated results
    answer: (i: InquiryValue, n: string, _: Function): InquiryMonad => {
        i.informant([n, InquiryP(x)]);
        return InquiryP({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant,
            questionset: i.questionset,
            receipt: i.receipt
        });
    },

    // Unwrapping methods: all return Promises, all complete outstanding IOUs

    // @todo handle Promise.reject? Is it a failure or what?
    // Unwraps the Inquiry after ensuring all IOUs are completed
    conclude: async (f: Function, g: Function): Promise<InquiryValue> =>
        Promise.all(resolveQs(x))
            .then(buildInq(x))
            .then(i => (i[$$inquirySymbol] ? i.join() : i))
            .then(y => ({
                subject: y.subject,
                iou: y.iou,
                fail: f(y.fail),
                pass: g(y.pass),
                informant: y.informant,
                questionset: y.questionset,
                receipt: y.receipt
            })),

    // If no fails, handoff aggregated passes to supplied function; if fails, return noop
    cleared: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(resolveQs(x))
            .then(buildInq(x))
            .then(i => (i[$$inquirySymbol] ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? f(y.pass) : noop()))
            .catch(err => console.error('err', err)),

    // If fails, handoff aggregated fails to supplied function; if no fails, return noop
    faulted: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(resolveQs(x))
            .then(buildInq(x))
            .then(i => (i[$$inquirySymbol] ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? noop() : f(y.fail))),

    // If any passes, handoff aggregated passes to supplied function; if no passes, return noop
    suffice: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(resolveQs(x))
            .then(buildInq(x))
            .then(i => (i[$$inquirySymbol] ? i.join() : i))
            .then(y => (y.pass.isEmpty() ? noop() : f(y.pass)))
            .catch(err => console.error('err', err)),

    // If no passes, handoff aggregated fails to supplied function; if any passes, return noop
    scratch: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(resolveQs(x))
            .then(buildInq(x))
            .then(i => (i[$$inquirySymbol] ? i.join() : i))
            .then(y => (y.pass.isEmpty() ? f(y.fail) : noop())),

    // Take left function and hands off fails if any, otherwise takes right function and hands off passes to that function
    fork: async (f: Function, g: Function): Promise<Array<any>> =>
        Promise.all(resolveQs(x))
            .then(buildInq(x))
            .then(i => (i[$$inquirySymbol] ? i.join() : i))
            .then(y => (y.fail.join().length ? f(y.fail) : g(y.pass))),

    // Take left function and hands off fails if any, otherwise takes right function and hands off passes to that function
    fold: async (f: Function, g: Function): Promise<Array<any>> =>
        Promise.all(resolveQs(x))
            .then(buildInq(x))
            .then(i => (i[$$inquirySymbol] ? i.join() : i))
            .then(y => (y.pass.join().length ? f(y.pass) : g(y.fail))),

    // return a Promise containing a merged fail/pass resultset array
    zip: async (f: Function): Promise<Array<any>> =>
        Promise.all(resolveQs(x))
            .then(buildInq(x))
            .then(i => (i[$$inquirySymbol] ? i.join() : i))
            .then(y => f(y.fail.join().concat(y.pass.join()))),

    // await all IOUs to resolve, then return a new Inquiry CONVERTS TO PROMISE!
    await: async (t: number = Infinity): Promise<InquiryMonad> => {
        // try: generator function. Each IOU = array in for loop as per https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield
        const timeLimit = new Promise((resolve, reject) =>
            setTimeout(resolve, t, [
                'timeout',
                Fail('Promise(s) have timed out')
            ])
        );
        const awaitPromises = Promise.all(resolveQs(x));

        return (
            Promise.race([timeLimit, awaitPromises])
                // @ts-ignore
                .then(buildInq(x))
                .then((i: any) => (i[$$inquirySymbol] ? i.join() : i))
                .then((y: any) => InquiryPOf(y))
        );
    },
    [$$inquirySymbol]: true
});

const exportInquiryP = {
    subject: InquiryPSubject,
    of: InquiryPOf
};

export {
    exportInquiry as Inquiry,
    exportInquiryP as InquiryP,
    exportQuestionset as Questionset,
    exportQuestion as Question,
    Receipt,
    Fail,
    Pass,
    IOU,
    $$inquirySymbol
};
