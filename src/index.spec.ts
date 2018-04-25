import { Inquiry, Fail, Pass } from "./index";
import * as R from "ramda";
import "jasmine";

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
    it("should be able to make many checks and run a cohort and return the subject unchanged", () => {
        return (Inquiry as any)
            .of({ name: "test", age: 10, description: "blah" })
            .informant((x: any) => console.log(x))
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
            .of({ name: "test", age: 14, description: "blah" })
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
            (Inquiry as any).of(a)
                .inquire(() => Pass('Passed something'))
                .inquire(() => Fail('Failed something'))
                .inquire(() => Fail('Failed something else'));

        const result = (Inquiry as any)
            .of({ name: "test", age: 14, description: "blah" })
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
