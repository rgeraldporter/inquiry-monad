import { Maybe } from "simple-maybe";

const IOU = (x: any): IOUMonad => ({
    map: (f: Function) => IOU(f(x)),
    chain: (f: Function) => f(x),
    ap: (y: Monad) => y.map(x),
    inspect: () => <string>`IOU(${x})`,
    join: () => x,
    concat: (o: IOUMonad) => o.chain((r: any) => IOU(x.concat(r))),
    head: () => (x.length ? x[0] : []),
    tail: () => (x.length ? x[x.length - 1] : []),
    isEmpty: () => Boolean(!x.length)
});

const Pass = (x: any): PassMonad => ({
    map: (f: Function) => Pass(f(x)),
    chain: (f: Function) => f(x),
    fold: (f: Function, _: Function) => f(x),
    fork: (_: Function, f: Function) => f(x),
    head: () => (x.length ? x[0] : []),
    tail: () => (x.length ? x[x.length - 1] : []),
    join: () => x,
    inspect: () => <string>`Pass(${x})`,
    concat: (o: PassFailMonad) => o.fold((r: any) => Pass(x.concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? y.concat(Pass(x)) : Pass(x)),
    answer: (i: Inquiry, n: string = "(anonymous)", c: Function = Inquiry) => {
        i.informant([n, Pass(x)]);
        return c({
                subject: i.subject,
                fail: i.fail,
                iou: i.iou,
                pass: i.pass.concat(Pass(x)),
                informant: i.informant
            });
    },
    isEmpty: () => Boolean(!x.length),
    isPass: true,
    isFail: false,
    isInquiry: false
});

const Fail = (x: any): FailMonad => ({
    map: (f: Function) => Fail(f(x)),
    chain: (f: Function) => f(x),
    fold: (_: Function, f: Function) => f(x),
    fork: (f: Function, _: Function) => f(x),
    head: () => (x.length ? x[0] : []),
    tail: () => (x.length ? x[x.length - 1] : []),
    join: () => x,
    inspect: () => <string>`Fail(${x})`,
    concat: (o: PassFailMonad) => o.fork((r: any) => Fail(x.concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? Fail(x) : y.concat(Fail(x))),
    answer: (i: Inquiry, n: string = "(anonymous)", c: Function = Inquiry) => {
        i.informant([n, Fail(x)]);
        return c({
            subject: i.subject,
            fail: i.fail.concat(Fail(x)),
            pass: i.pass,
            iou: i.iou,
            informant: i.informant
        });
    },
    isEmpty: () => Boolean(!x.length),
    isPass: false,
    isFail: true,
    isInquiry: false
});

// 1. break out into: Inquiry() InquiryPromise() (or PromisedInquiry) and FutureInquiry() (or InquiryFuture)
// 2. promise-based version will use IOUs still, can use something like .await() if need to wait for data
// 3. Each Pass or Fail should now be Pass(['fnName', result]); -- e.g. Pass([['fnName', result], ['otherFn', result2]]);
// 4. add fns to handle retrieving data insight within Pass & Fail

const Inquiry = (x: Inquiry) => ({
    // Inquires: core methods

    inquire: (f: Function) => {
        const inquireResponse = f(x.subject.join());
        return inquireResponse.isFail || inquireResponse.isPass || inquireResponse.isInquiry
            ? inquireResponse.answer(x, f.name, Inquiry)
            : Pass(inquireResponse);
    },

    // Informant: for spying/logging/observable

    informant: (f: Function) =>
        Inquiry({
            // @todo accept array of functions instead, or have a plural version
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: f
        }),
    inspect: (): string => `Inquiry(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,

    // Flow control: swamp list/right pass/fail
    swap: (): InquiryMonad =>
        Inquiry({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join()),
            informant: x.informant
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
            informant: x.informant
        }),

    // standard Monad methods
    map: (f: Function): Inquiry => (Inquiry as any).of(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): Inquiry => x,

    // opportunity to exit early, or adjust and continue
    breakpoint: (f: Function) => (x.fail.join().length ? f(x) : Inquiry(x)),
    milestone: (f: Function) => (x.pass.join().length ? f(x) : Inquiry(x)),

    answer: (i: Inquiry, n: string, _: Function) => {
        i.informant([n, Inquiry(x)]);
        return Inquiry({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant
        });
    },

    // Unwrap functions

    // unwraps, mapping for both branches, full value returned
    conclude: (f: Function, g: Function): any => ({
        subject: x.subject,
        iou: x.iou,
        fail: f(x.fail),
        pass: g(x.pass),
        informant: x.informant
    }),

    // @todo clearedMap & faultedMap
    // unwraps right (pass) only if no fails, return either a Promise or an Inquiry depending on IOUs
    cleared: (f: Function): any => x.fail.isEmpty() ? f(x.pass) : Inquiry(x),

    // unwrap left if fails, same as cleared
    faulted: (f: Function): any => x.fail.isEmpty() ? Inquiry(x) : f(x.fail),

    // unwrap left if fails, right if not
    fork: (f: Function, g: Function): any =>
        x.fail.join().length ? f(x.fail) : g(x.pass),

    // return a merged pass/fail
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())), // return a concat of pass/fails

    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});

const InquiryP = (x: Inquiry) => ({

    // Inquires: core methods
    // detect promise
    inquire: (f: Function) => {

        const inquireResponse = f(x.subject.join());
        const syncronousResponse = (response: any) =>
            response.isFail || response.isPass || response.isInquiry
                ? response.answer(x, f.name, InquiryP)
                : Pass(response);

        return inquireResponse.then
            ? InquiryP({
                    subject: x.subject,
                    fail: x.fail,
                    pass: x.pass,
                    iou: x.iou.concat(IOU([inquireResponse])),
                    informant: x.informant
                })
            : syncronousResponse(inquireResponse);
    },

    // Informant: for spying/logging/observable

    informant: (f: Function) =>
        InquiryP({
            // @todo accept array of functions instead, or have a plural version
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: f
        }),
    inspect: (): string => `InquiryP(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,

    // Flow control: swamp list/right pass/fail
    swap: (): InquiryMonad =>
        InquiryP({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join()),
            informant: x.informant
        }),

    // Mapping across both branches
    unison: (
        f: Function
    ): InquiryMonad => // apply a single map to both fail & pass (e.g. sort)
        InquiryP({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(f(x.fail.join())),
            pass: Pass(f(x.pass.join())),
            informant: x.informant
        }),

    // standard Monad methods
    map: (f: Function): Inquiry => (InquiryP as any).of(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): Inquiry => x,

    // opportunity to exit early, or adjust and continue
    // but what do we do if we're still waiting on IOUs?
    breakpoint: (f: Function) => (x.fail.join().length ? f(x) : InquiryP(x)),
    milestone: (f: Function) => (x.pass.join().length ? f(x) : InquiryP(x)),

    answer: (i: Inquiry, n: string, _: Function) => {
        i.informant([n, InquiryP(x)]);
        return InquiryP({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant
        });
    },

    // Unwrap functions

    // unwraps, mapping for both branches, full value returned
    conclude: (f: Function, g: Function): any => {
        // @ todo: resolve Promises, nodebacks, Futures
        // then run unwrapper

        const buildInq = (vals: Array<any>) =>
            vals.reduce((acc, cur) => cur.answer(x, "reduced", InquiryP), x);

        // lets not go async if we can help it
        return Promise.all(x.iou.join())
            .then(buildInq)
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => ({
                subject: y.subject,
                iou: y.iou,
                fail: f(y.fail),
                pass: g(y.pass),
                informant: y.informant
            }));
    },

    // @todo clearedMap & faultedMap
    // unwraps right (pass) only if no fails, return either a Promise or an Inquiry depending on IOUs
    cleared: (f: Function): any => {
        const buildInq = (vals: Array<any>) =>
            vals.reduce((acc, cur) => cur.answer(x, "reduced", InquiryP), x);

        const clearNow = () => (x.fail.isEmpty() ? f(x.pass) : InquiryP(x));

        // can't do .faulted if returning a Promise
        return Promise.all(x.iou.join())
            .then(buildInq)
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? f(y.pass) : InquiryP(x)))
            .catch(err => console.error("err", err));
    },

    // unwrap left if fails, same as cleared
    faulted: (f: Function): any => {
        const buildInq = (vals: Array<any>) =>
            vals.reduce((acc, cur) => cur.answer(x, "reduced"), x);

        return Promise.all(x.iou.join())
            .then(buildInq)
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? InquiryP(x) : f(x.fail)));
    },

    // unwrap left if fails, right if not, no async
    fork: (f: Function, g: Function): any =>
        x.fail.join().length ? f(x.fail) : g(x.pass),

    // return a merged pass/fail
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())), // return a concat of pass/fails
    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});

// really this should be "ofSubject" and "of" would just be our pointed constructor
// ideas: Inquiry.subject()
Inquiry.constructor.prototype["of"] = (x: any) =>
    x.isInquiry
        ? x
        : Inquiry({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: (_: any) => _
          });

// @ts-ignore
Inquiry.constructor.prototype["subject"] = Inquiry.of;

InquiryP.constructor.prototype["of"] = (x: any) =>
    x.isInquiry
        ? x
        : InquiryP({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: (_: any) => _
          });

// @ts-ignore
InquiryP.constructor.prototype["subject"] = InquiryP.of;

export { Inquiry, InquiryP, Fail, Pass };
