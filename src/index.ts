import R from "ramda";
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
    answer: (i: Inquiry, n: string) => {
        i.informant([n, Pass(x)]);
        return Inquiry({
            subject: i.subject,
            fail: i.fail,
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
            informant: i.informant
        });
    },
    isPass: false,
    isFail: true,
    isInquiry: false
});

const Inquiry = (x: Inquiry) => ({
    inquire: (f: Function) => f(x.subject.join()).answer(x, f.name),
    informant: (f: Function) => Inquiry({ // @todo accept array of functions instead, or have a plural version
        subject: x.subject,
        fail: Fail(x.pass.join()),
        pass: Pass(x.fail.join()),
        informant: f
    }),
    swap: (): InquiryMonad =>
        Inquiry({
            subject: x.subject,
            fail: Fail(x.pass.join()),
            pass: Pass(x.fail.join()),
            informant: x.informant
        }),
    unison: (
        f: Function
    ): InquiryMonad => // apply a single map to both fail & pass (e.g. sort)
        Inquiry({
            subject: x.subject,
            fail: Fail(f(x.fail.join())),
            pass: Pass(f(x.pass.join())),
            informant: x.informant
        }),
    inspect: (): string => `Inquiry(${x.fail.inspect()} ${x.pass.inspect()}`,
    map: (f: Function): Inquiry => (Inquiry as any).of(f(x)), // cast required for now
    ap: (y: Monad) => y.map(x),
    chain: (f: Function) => f(x),

    answer: (i: Inquiry, n: string) => {
        i.informant([n, Inquiry(x)]);
        return Inquiry({
            subject: i.subject,
            fail: i.fail.concat(x.fail),
            pass: i.pass.concat(x.pass),
            informant: i.informant
        });
    },

    // unwraps with complete value
    cohort: (f: Function, g: Function): Inquiry => ({
        subject: x.subject,
        fail: f(x.fail),
        pass: g(x.pass),
        informant: x.informant
    }),
    join: (): Inquiry => x,

    fork: (f: Function, g: Function): any =>
        x.fail.join().length ? f(x.fail) : g(x.pass),
    fold: (f: Function, g: Function): any =>
        x.fail.join().length ? g(x.fail) : f(x.pass),
    zip: (f: Function): Array<any> => f(x.fail.join().concat(x.pass.join())), // return a concat of pass/fails
    isInquiry: true
    //@todo determine if we could zip "in order of tests"
});

Inquiry.constructor.prototype["of"] = (x: any) =>
    R.prop("isInquiry", x)
        ? x
        : Inquiry({ subject: Maybe.of(x), fail: Fail([]), pass: Pass([]), informant: (_: any) => _ });

export { Inquiry, Fail, Pass };
