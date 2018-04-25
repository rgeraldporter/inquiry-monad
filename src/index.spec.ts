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

describe("The module", () => {

    // note that while these pass, to use this monad as intended
    // one should never call Inquiry() directly
    // this first set of tests take values that aren't of the type expected
    // @todo convert to type expected
    it("should satisfy the first monad law of left identity", () => {
        const g = n => Inquiry(n + 1);
        const f = n => Inquiry(n * 2);

        // 1. unit(x).chain(f) ==== f(x)
        const leftIdentity1 = Inquiry(1).chain(f);
        const leftIdentity2 = f(1);

        expect(leftIdentity1.join()).toEqual(leftIdentity2.join());
    });

    it("should satisfy the second monad law of right identity", () => {

        // 2. m.chain(unit) ==== m
        const rightIdentity1 = Inquiry(2).chain(Inquiry);
        const rightIdentity2 = Inquiry(2);

        expect(rightIdentity1.join()).toEqual(rightIdentity2.join());
    });

    it("should satisfy the third monad law of associativity", () => {
        const g = n => Inquiry(n + 1);
        const f = n => Inquiry(n * 2);

        // 3. m.chain(f).chain(g) ==== m.chain(x => f(x).chain(g))
        const associativity1 = Inquiry(3).chain(g).chain(f);
        const associativity2 = Inquiry(3).chain(x => g(x).chain(f));

        expect(associativity1.join()).toEqual(associativity2.join());
    });

    it("should be able to make many checks and run a cohort and return the subject unchanged", () => {
        return (Inquiry as any)
            .subject({ name: "test", age: 10, description: "blah" })
            .inquire(oldEnough)
            .inquireP(resolveAfter2Seconds)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .cohort(
                (x: any) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                    );
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        "Pass([object Object],[object Object],passed)"
                    );
                    return y.join();
                }
            );
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
                    expect(y.inspect()).toBe(
                        "this should not run"
                    );
                    return y.join();
                }
            );
    });

    it("should be able to merge a sub-inquiry into a master inquiry", () => {

        const evaluateHealth = (a: any) =>
            (Inquiry as any).subject(a)
                .inquire(() => Pass('Passed something'))
                .inquire(() => Fail('Failed something'))
                .inquire(() => Fail('Failed something else'));

        const result = (Inquiry as any)
            .subject({ name: "test", age: 14, description: "blah" })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .cohort(
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
});
