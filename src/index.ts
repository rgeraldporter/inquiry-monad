import R from "ramda";
import { Maybe } from "simple-maybe";

const IOU = (x: any): IOUMonad => ({
    map: (f: Function) => IOU(f(x)),
    chain: (f: Function) => f(x),
    ap: (y: Monad) => y.map(x),
    inspect: () => <string>`IOU(${x})`,
    join: () => x,
    concat: (o: Monad) => o.chain((r: any) => IOU(x.concat(r)))
});

const Pass = (x: any): PassMonad => ({
    map: (f: Function) => Pass(f(x)),
    chain: (f: Function) => f(x),
    fold: (f: Function, _: Function) => f(x),
    fork: (_: Function, f: Function) => f(x),
    join: () => x,
    inspect: () => <string>`Pass(${x})`,
    concat: (o: PassFailMonad) => o.fold((r: any) => Pass(x.concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? y.concat(Pass(x)) : Pass(x)),
    answer: (i: Inquiry, n: string) => {
        i.informant([n, Pass(x)]);
        return Inquiry({
            subject: i.subject,
            fail: i.fail,
            iou: i.iou,
            pass: i.pass.concat(Pass(x)),
            informant: i.informant
        });
    },
    isPass: true,
    isFail: false,
    isInquiry: false
});

const Fail = (x: any): FailMonad => ({
    map: (f: Function) => Fail(f(x)),
    chain: (f: Function) => f(x),
    fold: (_: Function, f: Function) => f(x),
    fork: (f: Function, _: Function) => f(x),
    join: () => x,
    inspect: () => <string>`Fail(${x})`,
    concat: (o: PassFailMonad) => o.fork((r: any) => Fail(x.concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? Fail(x) : y.concat(Fail(x))),
    answer: (i: Inquiry, n: string) => {
        i.informant([n, Fail(x)]);
        return Inquiry({
            subject: i.subject,
            fail: i.fail.concat(Fail(x)),
            pass: i.pass,
            iou: i.iou,
            informant: i.informant
        });
    },
    isPass: false,
    isFail: true,
    isInquiry: false
});

const Inquiry = (x: Inquiry) => ({
    // @todo handle when an f() in inquire does not return a monad correctly
    inquire: (f: Function) => f(x.subject.join()).answer(x, f.name),
    inquireP: (f: Function) =>
        Inquiry({
            subject: x.subject,
            fail: x.fail,
            pass: x.pass,
            iou: x.iou.concat(IOU([f(x.subject.join)])),
            informant: x.informant
        }),
    informant: (f: Function) =>
        Inquiry({
            // @todo accept array of functions instead, or have a plural version
            subject: x.subject,
            iou: x.iou,
            fail: x.fail,
            pass: x.pass,
            informant: f
        }),
    swap: (): InquiryMonad =>
        Inquiry({
            subject: x.subject,
            iou: x.iou,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join()),
            informant: x.informant
        }),
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
    inspect: (): string => `Inquiry(${x.fail.inspect()} ${x.pass.inspect()}`,
    map: (f: Function): Inquiry => (Inquiry as any).of(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),

    // opportunity to exit early, or adjust and continue
    breakpoint: (f: Function) => x.fail.join().length ? f(x) : Inquiry(x),
    milestone: (f: Function) => x.pass.join().length ? f(x) : Inquiry(x),

    // need something that does the same for pass branch ?
    // milestone vs breakpoint?

    answer: (i: Inquiry, n: string) => {
        i.informant([n, Inquiry(x)]);
        return Inquiry({
            subject: i.subject,
            iou: i.iou,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant
        });
    },

    // unwraps with complete value
    // @todo deal with IOUs
    cohort: (f: Function, g: Function): any => {
        // IF there was Promises. Need to deal with what if there were not
        // then deal with what if they were Futures
        // @ todo: resolve Promises, nodebacks, Futures
        // then run unwrapper
        // ideally if no "P" or "F" functions are called, this can all still be sync

        const buildInq = (vals: Array<any>) => vals.reduce((acc, cur) => cur.answer(x, "reduced"), x);

        return Promise.all(x.iou.join())
            .then(buildInq)
            .then(i => i.isInquiry ? i.join() : i)
            .then(y => ({
                subject: y.subject,
                iou: y.iou,
                fail: f(y.fail),
                pass: g(y.pass),
                informant: y.informant
            }));
    },
    join: (): Inquiry => x,

    fork: (f: Function, g: Function): any =>
        x.fail.join().length ? f(x.fail) : g(x.pass),
    fold: (f: Function, g: Function): any =>
        x.fail.join().length ? g(x.fail) : f(x.pass),
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())), // return a concat of pass/fails
    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});

// really this should be "ofSubject" and "of" would just be our pointed constructor
// ideas: Inquiry.subject()
Inquiry.constructor.prototype["of"] = (x: any) =>
    R.prop("isInquiry", x)
        ? x
        : Inquiry({
              subject: Maybe.of(x),
              fail: Fail([]),
              pass: Pass([]),
              iou: IOU([]),
              informant: (_: any) => _
          });

Inquiry.constructor.prototype["subject"] = Inquiry.of;

export { Inquiry, Fail, Pass };
