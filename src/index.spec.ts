import { Inquiry, Fail, Pass } from "./index";
import * as R from "ramda";
import "jasmine";
import { Maybe } from "simple-maybe";

const oldEnough = (a: any) =>
    a.age > 13 ? Pass(["old enough"]) : Fail(["not old enough"]);

const findHeight = () => Pass([{ height: 110, in: "cm" }]);
const nameSpelledRight = (a: any) =>
    a.name === "Ron"
        ? Pass("Spelled correctly")
        : Fail(["Name wasn't spelled correctly"]);
const hasRecords = () => Pass([{ records: [1, 2, 3] }]);
const mathGrade = () => Fail(["Failed at math"]);

function resolveAfter2Seconds(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass("passed"));
        }, 2000);
    });
}

function resolveAfter1Second(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass("passed"));
        }, 1000);
    });
}

describe("The module", () => {
    // note that while these pass, to use this monad as intended
    // one should never call Inquiry() directly
    // this first set of tests take values that aren't of the type expected
    // @todo convert to type expected
    it("should satisfy the first monad law of left identity", () => {

        // @ts-ignore
        const g = (n: number) => Inquiry(n + 1);
        // @ts-ignore
        const f = (n: number) => Inquiry(n * 2);

        // 1. unit(x).chain(f) ==== f(x)

        // @ts-ignore
        const leftIdentity1 = Inquiry(1).chain(f);
        const leftIdentity2 = f(1);

        expect(leftIdentity1.join()).toEqual(leftIdentity2.join());
    });

    it("should satisfy the second monad law of right identity", () => {

        // @ts-ignore
        const rightIdentity1 = Inquiry(2).chain(Inquiry);
        // @ts-ignore
        const rightIdentity2 = Inquiry(2);

        // 2. m.chain(unit) ==== m
        expect(rightIdentity1.join()).toEqual(rightIdentity2.join());
    });

    it("should satisfy the third monad law of associativity", () => {

        // @ts-ignore
        const g = n => Inquiry(n + 1);
        // @ts-ignore
        const f = n => Inquiry(n * 2);

        // 3. m.chain(f).chain(g) ==== m.chain(x => f(x).chain(g))

        // @ts-ignore
        const associativity1 = Inquiry(3)
            .chain(g)
            .chain(f);

        // @ts-ignore
        const associativity2 = Inquiry(3).chain(x => g(x).chain(f));

        expect(associativity1.join()).toEqual(associativity2.join());
    });

    it("should be able to make many checks, including async ones, and run a conclude and return the subject unchanged", () => {
        return (Inquiry as any)
            .subject({ name: "test", age: 10, description: "blah" })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquireP(resolveAfter2Seconds)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .conclude(
                (x: any) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                    );
                    return x;
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        "Pass([object Object],[object Object],passed)"
                    );
                    return y;
                }
            )
            .then((x: any) => {
                expect(x.subject.join()).toEqual({
                    name: "test",
                    age: 10,
                    description: "blah"
                });
                expect(R.head(x.pass.join())).toEqual({
                    // @ts-ignore
                    height: 110,
                    in: "cm"
                });
            });
    });

    it("should be able to make many checks and run a fork", () => {
        const result = (Inquiry as any)
            .subject({ name: "test", age: 14, description: "blah" })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .fork(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(Name wasn't spelled correctly,Failed at math)"
                    );
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe("this should not run");
                    return y.join();
                }
            );
    });

    it("should be able to merge a sub-inquiry into a master inquiry", () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass("Passed something"))
                .inquire(() => Fail("Failed something"))
                .inquire(() => Fail("Failed something else"));

        const result = (Inquiry as any)
            .subject({ name: "test", age: 14, description: "blah" })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: any) => {
                    expect(x.inspect()).toBe(
                        "Fail(Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        "Pass(old enough,[object Object],[object Object],Passed something)"
                    );
                    return y.join();
                }
            );
    });

    it("should be able to be stopped in the middle of processing with a breakpoint if there are failures", () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass("Passed something"))
                .inquire(() => Fail("Failed something"))
                .inquire(() => Fail("Failed something else"));

        let reachedBreakpoint = 0;

        const result = (Inquiry as any)
            .subject({ name: "test", age: 11, description: "blah" })
            .inquire(oldEnough)
            .breakpoint((x: any) => {
                // clearing the existing failure, it will not appear at the end
                // this is not a practice example, usually one one do some kind of exit
                x.fail = Fail([]);
                return Inquiry(x);
            })
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: any) => {
                    expect(x.inspect()).toBe(
                        "Fail(Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    expect(x.head()).toEqual("Name wasn't spelled correctly");
                    expect(x.tail()).toEqual("Failed something else");
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        "Pass([object Object],[object Object],Passed something)"
                    );
                    expect(y.head()).toEqual({ height: 110, in: "cm" });
                    expect(y.tail()).toEqual("Passed something");
                    return y.join();
                }
            );
    });

    it("should be able to be stopped in the middle of processing with a milestone if there are passes", () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass("Passed something"))
                .inquire(() => Fail("Failed something"))
                .inquire(() => Fail("Failed something else"));

        let reachedBreakpoint = 0;

        const result = (Inquiry as any)
            .subject({ name: "test", age: 11, description: "blah" })
            .inquire(oldEnough)
            .milestone((x: any) => {
                // clearing the existing failure, it will not appear at the end
                // this is not a practice example, usually one one do some kind of exit
                x.pass = Pass([]);
                return Inquiry(x);
            })
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: any) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        "Pass([object Object],[object Object],Passed something)"
                    );
                    return y.join();
                }
            );
    });

    it("should be able to make many checks, including async ones, and run a faulted unwrap", () => {
        return (Inquiry as any)
            .subject({ name: "test", age: 10, description: "blah" })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquireP(resolveAfter1Second)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .faulted(
                (x: any) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                    );
                    return x;
                }
            );
    });

    it("should be able to make many checks, including async ones, and run a cleared unwrap when all passes", () => {
        return (Inquiry as any)
            .subject({ name: "test", age: 14, description: "blah" })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquireP(resolveAfter1Second)
            .inquire(hasRecords)
            .faulted(
                (x: any) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                    );
                    return x;
                }
            );
    });
});
