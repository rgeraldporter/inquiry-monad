import { Maybe } from 'simple-maybe';
import {
    Monad,
    InquiryMonad,
    IOUMonad,
    PassFailMonad,
    PassMonad,
    FailMonad,
    InquiryValue
} from './inquiry-monad';

const noop = () => {};

const IOU = <T>(x: T | Array<T>): IOUMonad => ({
    map: (f: Function) => IOU(f(x)),
    chain: (f: Function) => f(x),
    ap: (y: Monad) => y.map(x),
    inspect: () => <string>`IOU(${x})`,
    join: () => x,
    concat: (o: IOUMonad) =>
        o.chain((r: any) => IOU((x as Array<T>).concat(r))),
    head: () => (Array.isArray(x) && x.length ? x[0] : []),
    tail: () => (Array.isArray(x) && x.length ? x[x.length - 1] : []),
    isEmpty: () => Boolean(!Array.isArray(x) || x.length === 0),
    isInquiry: false,
    isPass: false,
    isFail: false,
    isIOU: true
});

const Pass = <T>(x: Array<T> | T): PassMonad => ({
    map: (f: Function) => Pass(f(x)),
    chain: (f: Function) => f(x),
    fold: (f: Function, _: Function) => f(x),
    fork: (_: Function, f: Function) => f(x),
    head: () => (Array.isArray(x) && x.length ? x[0] : []),
    tail: () => (Array.isArray(x) && x.length ? x[x.length - 1] : []),
    join: () => x,
    inspect: () => <string>`Pass(${x})`,
    concat: (o: PassFailMonad) =>
        o.fold((r: any) => Pass((x as Array<T>).concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? y.concat(Pass(x)) : Pass(x)),
    answer: (i: InquiryValue, n: string = '(anonymous)', c: Function = Inquiry) => {
        i.informant([n, Pass(x)]);
        return c({
            subject: i.subject,
            fail: i.fail,
            iou: i.iou,
            pass: i.pass.concat(Pass(x)),
            informant: i.informant
        });
    },
    isEmpty: () => Boolean(!Array.isArray(x) || x.length === 0),
    isPass: true,
    isFail: false,
    isIOU: false,
    isInquiry: false
});

const Fail = <T>(x: Array<T> | T): FailMonad => ({
    map: (f: Function) => Fail(f(x)),
    chain: (f: Function) => f(x),
    fold: (_: Function, f: Function) => f(x),
    fork: (f: Function, _: Function) => f(x),
    head: () => (Array.isArray(x) && x.length ? x[0] : []),
    tail: () => (Array.isArray(x) && x.length ? x[x.length - 1] : []),
    join: () => x,
    inspect: () => <string>`Fail(${x})`,
    concat: (o: PassFailMonad) =>
        o.fork((r: any) => Fail((x as Array<T>).concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? Fail(x) : y.concat(Fail(x))),
    answer: (i: InquiryValue, n: string = '(anonymous)', c: Function = Inquiry) => {
        i.informant([n, Fail(x)]);
        return c({
            subject: i.subject,
            fail: i.fail.concat(Fail(x)),
            pass: i.pass,
            iou: i.iou,
            informant: i.informant
        });
    },
    isEmpty: () => Boolean(!Array.isArray(x) || x.length === 0),
    isPass: false,
    isFail: true,
    isIOU: false,
    isInquiry: false
});

const InquirySubject = (x: any | InquiryMonad): InquiryMonad =>
    (x as any).isInquiry
        ? x
        : Inquiry({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: <T>(_: T) => _
          });

const warnTypeError = <T>(x: T) => {
    console.warn(
        'Inquiry.of requires properties: subject, fail, pass, iou, informant. Converting to Inquiry.subject().'
    );
    return InquirySubject(x);
};

const InquiryOf = (x: InquiryValue) =>
    'subject' in x &&
    'fail' in x &&
    'pass' in x &&
    'iou' in x &&
    'informant' in x
        ? Inquiry(x)
        : warnTypeError(x);

const Inquiry = (x: InquiryValue): InquiryMonad => ({
    // Inquire: core method
    inquire: (f: Function) => {
        const inquireResponse = f(x.subject.join());
        return inquireResponse.isFail ||
            inquireResponse.isPass ||
            inquireResponse.isInquiry
            ? inquireResponse.answer(x, f.name, Inquiry)
            : Pass(inquireResponse).answer(x, f.name, Inquiry);
    },

    inquireMap: (f: Function, i: Array<any>): InquiryMonad =>
        i.reduce(
            (inq, ii) => {
                const inquireResponse = f(ii)(inq.join().subject.join());

                // each return aggregates new contained value through exit
                return inquireResponse.isFail ||
                    inquireResponse.isPass ||
                    inquireResponse.isInquiry
                    ? inquireResponse.answer(inq.join(), f.name, Inquiry)
                    : Pass(inquireResponse).answer(x, f.name, Inquiry);
            },

            // initial Inquiry will be what is in `x` now
            Inquiry({
                subject: x.subject,
                iou: x.iou,
                fail: x.fail,
                pass: x.pass,
                informant: x.informant
            })
        ),

    // Informant: for spying/logging/observable
    informant: (f: Function) =>
        Inquiry({
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
    map: (f: Function): InquiryMonad => InquirySubject(f(x)),
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): InquiryValue => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function) =>
        x.fail.join().length ? Inquiry(f(x)) : Inquiry(x),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function) =>
        x.pass.join().length ? Inquiry(f(x)) : Inquiry(x),

    // internal method: execute informant, return new InquiryP() based on updated results
    answer: (i: InquiryValue, n: string, _: Function) => {
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
    conclude: (f: Function, g: Function): InquiryValue => ({
        subject: x.subject,
        iou: x.iou,
        fail: f(x.fail),
        pass: g(x.pass),
        informant: x.informant
    }),

    // If there are no fails, handoff aggregated passes to supplied function; if any fails, return noop
    cleared: (f: Function) => (x.fail.isEmpty() ? f(x.pass) : noop()),

    // If there are fails, handoff aggregated fails to supplied function; if no fails, return noop
    faulted: (f: Function) => (x.fail.isEmpty() ? noop() : f(x.fail)),

    // If there are passes, handoff aggregated passes to supplied function; if no passes, return noop
    suffice: (f: Function) => (x.pass.isEmpty() ? noop() : f(x.pass)),

    // If there are no passes, handoff aggregated fails to supplied function; if any passes, return noop
    scratch: (f: Function) => (x.pass.isEmpty() ? f(x.fail) : noop()),

    // unwrap left if any fails, right if not
    fork: (f: Function, g: Function) =>
        x.fail.join().length ? f(x.fail) : g(x.pass),

    // unwrap left if any passes, right if not
    fold: (f: Function, g: Function) =>
        x.pass.join().length ? f(x.pass) : g(x.fail),

    // return a merged pass/fail
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())), // return a concat of pass/fails

    isInquiry: true
});

const exportInquiry = {
    subject: InquirySubject,
    of: InquiryOf
};

const InquiryPSubject = (x: any | InquiryMonad): InquiryMonad =>
    (x as any).isInquiry
        ? x
        : InquiryP({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: <T>(_: T) => _
          });

const warnTypeErrorP = <T>(x: T) => {
    console.warn(
        'InquiryP.of requires properties: subject, fail, pass, iou, informant. Converting to InquiryP.subject().'
    );
    return InquiryPSubject(x);
};

const InquiryPOf = (x: InquiryValue) =>
    'subject' in x &&
    'fail' in x &&
    'pass' in x &&
    'iou' in x &&
    'informant' in x
        ? InquiryP(x)
        : warnTypeErrorP(x);

const buildInq = <T>(x: T) => (
    vals: Array<any> // @todo find a way to produce fn name
) =>
    vals.reduce(
        (acc, cur) => cur.answer(acc, '(async fn)', InquiryP).join(),
        x
    );

const InquiryP = (x: InquiryValue): InquiryMonad => ({
    // Inquire: core method
    inquire: (f: Function) => {
        const inquireResponse = f(x.subject.join());
        const syncronousResult = (response: any) =>
            response.isFail || response.isPass || response.isInquiry
                ? response.answer(x, f.name, InquiryP)
                : Pass(response).answer(x, f.name, InquiryP);

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

    inquireMap: (f: Function, i: Array<any>): InquiryMonad =>
        i.reduce(
            (inq, ii) => {
                const inquireResponse = f(ii)(inq.join().subject.join());

                const syncronousResult = (response: any) =>
                    response.isFail || response.isPass || response.isInquiry
                        ? response.answer(inq.join(), f.name, InquiryP)
                        : Pass(response).answer(x, f.name, InquiryP);

                return inquireResponse.then
                    ? InquiryP({
                          subject: inq.join().subject,
                          fail: inq.join().fail,
                          pass: inq.join().pass,
                          iou: inq.join().iou.concat(IOU([inquireResponse])),
                          informant: inq.join().informant
                      })
                    : syncronousResult(inquireResponse);
            },

            // initial Inquiry will be what is in `x` now
            InquiryP({
                subject: x.subject,
                iou: x.iou,
                fail: x.fail,
                pass: x.pass,
                informant: x.informant
            })
        ),

    // Informant: for spying/logging/observable
    informant: (f: Function) =>
        InquiryP({
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
    map: (f: Function): InquiryMonad => InquiryPSubject(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),
    join: (): InquiryValue => x,

    // execute the provided function if there are failures, else continue
    breakpoint: (f: Function) =>
        x.fail.join().length ? Inquiry(f(x)) : InquiryP(x),

    // execute the provided function if there are passes, else continue
    milestone: (f: Function) =>
        x.pass.join().length ? Inquiry(f(x)) : InquiryP(x),

    // internal method: execute informant, return new InquiryP() based on updated results
    answer: (i: InquiryValue, n: string, _: Function): InquiryMonad => {
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

    // @todo handle Promise.reject? Is it a failure or what?
    // Unwraps the Inquiry after ensuring all IOUs are completed
    conclude: async (f: Function, g: Function): Promise<InquiryValue> =>
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

    // If no fails, handoff aggregated passes to supplied function; if fails, return noop
    cleared: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? f(y.pass) : noop()))
            .catch(err => console.error('err', err)),

    // If fails, handoff aggregated fails to supplied function; if no fails, return noop
    faulted: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.isEmpty() ? noop() : f(y.fail))),

    // If any passes, handoff aggregated passes to supplied function; if no passes, return noop
    suffice: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.pass.isEmpty() ? noop() : f(y.pass)))
            .catch(err => console.error('err', err)),

    // If no passes, handoff aggregated fails to supplied function; if any passes, return noop
    scratch: async (f: Function): Promise<InquiryMonad | Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.pass.isEmpty() ? f(y.fail) : noop())),

    // Take left function and hands off fails if any, otherwise takes right function and hands off passes to that function
    fork: async (f: Function, g: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.fail.join().length ? f(y.fail) : g(y.pass))),

    // Take left function and hands off fails if any, otherwise takes right function and hands off passes to that function
    fold: async (f: Function, g: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => (y.pass.join().length ? f(y.pass) : g(y.fail))),

    // return a Promise containing a merged fail/pass resultset array
    zip: async (f: Function): Promise<Array<any>> =>
        Promise.all(x.iou.join())
            .then(buildInq(x))
            .then(i => (i.isInquiry ? i.join() : i))
            .then(y => f(y.fail.join().concat(y.pass.join()))),

    // await all IOUs to resolve, then return a new Inquiry CONVERTS TO PROMISE!
    await: async (t: number = Infinity): Promise<InquiryMonad> => {
        // try: generator function. Each IOU = array in for loop as per https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield
        const timeLimit = new Promise((resolve, reject) =>
            setTimeout(resolve, t, [Fail('Promise(s) have timed out')])
        );
        const awaitPromises = Promise.all(x.iou.join());

        return (
            Promise.race([timeLimit, awaitPromises])
                // @ts-ignore
                .then(buildInq(x))
                .then((i: any) => (i.isInquiry ? i.join() : i))
                .then((y: any) => InquiryPOf(y))
        );
    },
    isInquiry: true
});

const exportInquiryP = {
    subject: InquiryPSubject,
    of: InquiryPOf
};

export {
    exportInquiry as Inquiry,
    exportInquiryP as InquiryP,
    Fail,
    Pass,
    IOU
};
