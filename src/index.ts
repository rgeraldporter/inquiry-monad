import * as R from "ramda";
import { Maybe } from "simple-maybe";

const Pass = (x: any): PassMonad => ({
    map: (f: Function) => Pass(f(x)),
    chain: (f: Function) => f(x),
    fold: (f: Function, _: Function) => f(x),
    fork: (_: Function, f: Function) => f(x),
    join: () => x,
    inspect: () => <string>`Pass(${x})`,
    concat: (o: PassFailMonad) => o.fold((r: any) => Pass(x.concat(r)), null),
    ap: (y: PassFailMonad) => (y.isPass ? y.concat(Pass(x)) : Pass(x)),
    isPass: true,
    isFail: false,
    isInquiry: true
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
    isPass: false,
    isFail: true,
    isInquiry: true
});

const _failInquire = (x: Inquiry, y: FailMonad) =>
    Inquiry({ subject: x.subject, fail: x.fail.concat(y), pass: x.pass });
const _passInquire = (x: Inquiry, y: PassMonad) =>
    Inquiry({ subject: x.subject, fail: x.fail, pass: x.pass.concat(y) });

const Inquiry = (x: Inquiry) => ({
    isInquiry: true,
    inquire: (
        f: Function // @todo memoize or something
    ) =>
        f(x.subject.join()).isPass
            ? _passInquire(x, f(x.subject.join()))
            : _failInquire(x, f(x.subject.join())),
    swap: (): InquiryMonad =>
        Inquiry({
            subject: x.subject,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join())
        }),
    unison: (
        f: Function
    ): InquiryMonad => // apply a single map to both (e.g. sort)
        Inquiry({
            subject: x.subject,
            fail: Fail(f(x.fail.join())),
            pass: Pass(f(x.pass.join()))
        }),
    inspect: (): string => `Inquiry(${x.fail.inspect()} ${x.pass.inspect()}`,
    map: (f: Function): Inquiry => (Inquiry as any).of(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),

    // unwraps with complete value
    cohort: (f: Function, g: Function): Inquiry => ({
        subject: x.subject,
        fail: f(x.fail),
        pass: g(x.pass)
    }),
    join: (): Inquiry => x,

    // unwraps with only Fail & Pass data, might deprecate?
    fold: (f: Function, g: Function): any =>
        x.fail.join().length ? g(x.fail) : f(x.pass),
    fork: (f: Function, g: Function): any =>
        x.fail.join().length ? f(x.fail) : g(x.pass),
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())) // bring together
});

Inquiry.constructor.prototype["of"] = (x: any) =>
    R.prop("isInquiry", x)
        ? x
        : Inquiry({ subject: Maybe.of(x), fail: Fail([]), pass: Pass([]) });

export { Inquiry, Fail, Pass };
