import { Maybe } from "simple-maybe";
import { Future } from "fluture";

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
    // @todo isIOU ? isInquiry ?
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

// 1. ✅ break out into: Inquiry() InquiryPromise() (or PromisedInquiry) and FutureInquiry() (or InquiryFuture)
// 2. ✅ promise-based version will use IOUs still, can use something like .await() if need to wait for data
// 3. Each Pass or Fail should now be Pass(['fnName', result]); -- e.g. Pass([['fnName', result], ['otherFn', result2]]);
// 4. add fns to handle retrieving data insight within Pass & Fail

const Inquiry = (x: Inquiry): InquiryMonad => ({
    // Inquire: core method
    inquire: (f: Function) => {
        console.log("inquire");

        const inquireResponse = f(x.subject.join());
        return inquireResponse.isFail ||
            inquireResponse.isPass ||
            inquireResponse.isInquiry
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

    inspect: (): string =>
        `Inquiry(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,

    // Flow control: swap pass/fail
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
    map: (f: Function): Inquiry => (Inquiry as any).subject(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): Inquiry => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function) => (x.fail.join().length ? f(x) : Inquiry(x)),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function) => (x.pass.join().length ? f(x) : Inquiry(x)),

    // internal method: execute informant, return new InquiryP() based on updated results
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

    // Unwrap methods

    // unwraps, mapping for both branches, full value returned
    conclude: (f: Function, g: Function): any => ({
        subject: x.subject,
        iou: x.iou,
        fail: f(x.fail),
        pass: g(x.pass),
        informant: x.informant
    }),

    // If no fails, handoff aggregated passes to supplied function; if fails, return existing Inquiry
    cleared: (f: Function): any => (x.fail.isEmpty() ? f(x.pass) : Inquiry(x)),

    // If fails, handoff aggregated fails to supplied function; if no fails, return existing Inquiry
    faulted: (f: Function): any => (x.fail.isEmpty() ? Inquiry(x) : f(x.fail)),

    // unwrap left if fails, right if not
    fork: (f: Function, g: Function): any =>
        x.fail.join().length ? f(x.fail) : g(x.pass),

    // return a merged pass/fail
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())), // return a concat of pass/fails

    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});

const exportInquiry = {
    subject: (x: any) =>
    x.isInquiry
        ? x
        : Inquiry({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: (_: any) => _
          })
};

const buildInqF = (x: any) => (vals: Array<any>) =>
    vals.reduce((acc, cur) => cur.answer(x, "reduced", InquiryF), x);

const InquiryF = (x: Inquiry): InquiryMonad => ({
    // Inquire: core method
    inquire: (f: Function) => {
        console.log("inquireF");
        const inquireResponse = f(x.subject.join());
        const syncronousResult = (response: any) =>
            response.isFail || response.isPass || response.isInquiry
                ? response.answer(x, f.name, InquiryF)
                : Pass(response);

        return inquireResponse instanceof Future
            ? InquiryF({
                  subject: x.subject,
                  fail: x.fail,
                  pass: x.pass,
                  iou: x.iou.concat(IOU([inquireResponse])),
                  informant: x.informant
              })
            : syncronousResult(inquireResponse);
    },

    // Informant: for spying/logging/observable
    informant: (f: Function) =>
        InquiryF({
            // @todo accept array of functions instead, or have a plural version
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: f
        }),

    inspect: (): string =>
        `InquiryF(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,

    // Flow control: swap left/right pass/fail (iou is untouched)
    swap: (): InquiryMonad =>
        InquiryF({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join()),
            informant: x.informant
        }),

    // Mapping across both branches
    unison: (
        f: Function
    ): InquiryMonad => // apply a single map to both fail & pass (e.g. sort), iou untouched
        InquiryF({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(f(x.fail.join())),
            pass: Pass(f(x.pass.join())),
            informant: x.informant
        }),

    // Standard monad methods - note that while these work, remember that `x` is a typed Object
    map: (f: Function): Inquiry => (InquiryF as any).subject(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): Inquiry => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function) => (x.fail.join().length ? f(x) : InquiryF(x)),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function) => (x.pass.join().length ? f(x) : InquiryF(x)),

    // internal method: execute informant, return new InquiryF() based on updated results
    answer: (i: Inquiry, n: string, _: Function): InquiryMonad => {
        i.informant([n, InquiryF(x)]);
        return InquiryF({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant
        });
    },

    // Unwrapping methods: all return Promises, all complete outstanding IOUs

    // Unwraps the Inquiry after ensuring all IOUs are completed
    conclude: (f: Function, g: Function): Future<any, any> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map((i: any) => (i.isInquiry ? i.join() : i))
            .fork(console.error, (y: any) => ({
                subject: y.subject,
                iou: y.iou,
                fail: f(y.fail),
                pass: g(y.pass),
                informant: y.informant
            })),

    // If no fails, handoff aggregated passes to supplied function; if fails, return existing InquiryF
    cleared: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? f(y.pass) : InquiryF(y)))
            .catch(err => console.error("err", err)),

    // If fails, handoff aggregated fails to supplied function; if no fails, return existing InquiryF
    faulted: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Future.parallel(Infinity, x.iou.join())
            .map(buildInqF(x))
            .map((i: any) => (i.isInquiry ? i.join() : i))
            .fork(
                console.error,
                (y: any) => (y.fail.isEmpty() ? InquiryF(y) : f(y.fail))
            ),

    // Take left function and hands off fails if any, otherwise takes left function and hands off passes to that function
    fork: async (f: Function, g: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.join().length ? f(y.fail) : g(y.pass))),

    // return a Promise containing a merged fail/pass resultset array
    zip: async (f: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => f(y.fail.join().concat(y.pass.join()))),

    // await all IOUs to resolve, then return a new Inquiry
    // @todo: awaitP, awaitF that return an InquiryP or InquiryF
    await: async (): Promise<InquiryMonad> =>
        Promise.all(x.iou.join())
            .then(buildInqF(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => Inquiry(y)),

    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});

const exportInquiryF = {
    subject: (x: any) =>
        x.isInquiry
            ? x
            : InquiryF({
                  subject: Maybe.of(x),
                  fail: Fail([]),
                  pass: Pass([]),
                  iou: IOU([]),
                  informant: (_: any) => _
              })
};

const buildInq = (x: any) => (vals: Array<any>) =>
    vals.reduce((acc, cur) => cur.answer(x, "reduced", InquiryP), x);

const InquiryP = (x: Inquiry): InquiryMonad => ({
    // Inquire: core method
    inquire: (f: Function) => {
        console.log("inquireP");

        const inquireResponse = f(x.subject.join());
        const syncronousResult = (response: any) =>
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
            : syncronousResult(inquireResponse);
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

    inspect: (): string =>
        `InquiryP(${x.fail.inspect()} ${x.pass.inspect()} ${x.iou.inspect()}`,

    // Flow control: swap left/right pass/fail (iou is untouched)
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
    ): InquiryMonad => // apply a single map to both fail & pass (e.g. sort), iou untouched
        InquiryP({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(f(x.fail.join())),
            pass: Pass(f(x.pass.join())),
            informant: x.informant
        }),

    // Standard monad methods - note that while these work, remember that `x` is a typed Object
    map: (f: Function): Inquiry => (InquiryP as any).subject(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): Inquiry => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function) => (x.fail.join().length ? f(x) : InquiryP(x)),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function) => (x.pass.join().length ? f(x) : InquiryP(x)),

    // internal method: execute informant, return new InquiryP() based on updated results
    answer: (i: Inquiry, n: string, _: Function): InquiryMonad => {
        i.informant([n, InquiryP(x)]);
        return InquiryP({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant
        });
    },

    // Unwrapping methods: all return Promises, all complete outstanding IOUs

    // Unwraps the Inquiry after ensuring all IOUs are completed
    conclude: async (f: Function, g: Function): Promise<Inquiry> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => ({
                subject: y.subject,
                iou: y.iou,
                fail: f(y.fail),
                pass: g(y.pass),
                informant: y.informant
            })),

    // If no fails, handoff aggregated passes to supplied function; if fails, return existing InquiryP
    cleared: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? f(y.pass) : InquiryP(y)))
            .catch(err => console.error("err", err)),

    // If fails, handoff aggregated fails to supplied function; if no fails, return existing InquiryP
    faulted: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? InquiryP(y) : f(y.fail))),

    // Take left function and hands off fails if any, otherwise takes left function and hands off passes to that function
    fork: async (f: Function, g: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.join().length ? f(y.fail) : g(y.pass))),

    // return a Promise containing a merged fail/pass resultset array
    zip: async (f: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => f(y.fail.join().concat(y.pass.join()))),

    // await all IOUs to resolve, then return a new Inquiry
    // @todo: awaitP, awaitF that return an InquiryP or InquiryF
    await: async (): Promise<InquiryMonad> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => Inquiry(y)),

    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});

const exportInquiryP = {
    subject: (x: any) =>
        x.isInquiry
            ? x
            : InquiryP({
                  subject: Maybe.of(x),
                  fail: Fail([]),
                  pass: Pass([]),
                  iou: IOU([]),
                  informant: (_: any) => _
              })
};

export {
    exportInquiry as Inquiry,
    exportInquiryF as InquiryF,
    exportInquiryP as InquiryP,
    Fail,
    Pass,
    IOU
};
