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

describe("The module", () => {
    it("should be able to make many checks and run a cohort and return the subject unchanged", () => {
        const result = (Inquiry as any)
            .of({ name: "test", age: 10, description: "blah" })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .cohort(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                    );
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        "Pass([object Object],[object Object])"
                    );
                    return y.join();
                }
            );

        expect(result.pass[0].height).toBe(110);
        expect(result.subject.join()).toEqual({ name: "test", age: 10, description: "blah" });
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
});
