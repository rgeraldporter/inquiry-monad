import { Inquiry, InquiryP, Fail, Pass, IOU } from './index';
import * as R from 'ramda';
import { Maybe } from 'simple-maybe';
import {
    Monad,
    InquiryMonad,
    IOUMonad,
    PassFailMonad,
    PassMonad,
    FailMonad,
    InquiryValue
} from 'inquiry-monad';

const oldEnough = (a: any) =>
    a.age > 13 ? Pass(['old enough']) : Fail(['not old enough']);

const findHeight = () => Pass([{ height: 110, in: 'cm' }]);
const nameSpelledRight = (a: any) =>
    a.name === 'Ron'
        ? Pass('Spelled correctly')
        : Fail(["Name wasn't spelled correctly"]);
const hasRecords = () => Pass([{ records: [1, 2, 3] }]);
const mathGrade = () => Fail(['Failed at math']);

function resolveAfter2Seconds(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass('passed'));
        }, 2000);
    });
}

function resolveAfter1Second(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass('passed'));
        }, 1000);
    });
}

function resolveAfter10ms(x: any) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(Pass('passed 10ms'));
        }, 10);
    });
}

describe('The module', () => {
    it('should satisfy the first monad law of left identity', () => {
        // this is trickier to do with a typed monad, but not impossible
        // we cannot just do some simple math as the value much adhere to type Inquiry
        // but the law seems to be provable with objects as much as they are with numbers
        const a: InquiryValue = {
            subject: Maybe.of(1),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _
        };

        const f = (n: InquiryValue): InquiryMonad =>
            Inquiry.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => x + 1)
                })
            );

        // 1. unit(x).chain(f) ==== f(x)
        const leftIdentity1 = Inquiry.of(a).chain(f);
        const leftIdentity2 = f(a);

        expect(leftIdentity1.join()).toEqual(leftIdentity2.join());

        const g = (n: InquiryValue): InquiryMonad =>
            Inquiry.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => ({
                        value: x * 10,
                        string: `Something with the number ${x}`
                    }))
                })
            );

        // 1. Inquiry.of(x).chain(f) ==== f(x)
        const leftIdentity3 = Inquiry.of(a).chain(g);
        const leftIdentity4 = g(a);

        expect(leftIdentity3.join()).toEqual(leftIdentity4.join());
    });

    it('should satisfy the second monad law of right identity', () => {
        const a: InquiryValue = {
            subject: Maybe.of(3),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _
        };

        const rightIdentity1 = Inquiry.of(a).chain(Inquiry.of);
        const rightIdentity2 = Inquiry.of(a);

        // 2. m.chain(unit) ==== m
        expect(rightIdentity1.join()).toEqual(rightIdentity2.join());
    });

    it('should satisfy the third monad law of associativity', () => {
        const a: InquiryValue = {
            subject: Maybe.of(30),
            fail: Fail([]),
            pass: Pass([]),
            iou: IOU([]),
            informant: (_: any) => _
        };

        const g = (n: InquiryValue): InquiryMonad =>
            Inquiry.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => ({
                        value: x * 10,
                        string: `Something with the number ${x}`
                    }))
                })
            );
        const f = (n: InquiryValue): InquiryMonad =>
            Inquiry.of(
                Object.assign(n, {
                    subject: n.subject.map((x: number) => x + 1)
                })
            );

        // 3. m.chain(f).chain(g) ==== m.chain(x => f(x).chain(g))
        const associativity1 = Inquiry.of(a)
            .chain(g)
            .chain(f);
        const associativity2 = Inquiry.of(a).chain((x: InquiryValue) =>
            g(x).chain(f)
        );

        expect(associativity1.join()).toEqual(associativity2.join());
    });

    it('should be able to make many checks and run a fork', () => {
        const result = (Inquiry as any)
            .subject({ name: 'test', age: 14, description: 'blah' })
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
                    expect(y.inspect()).toBe('this should not run');
                    return y.join();
                }
            );
    });

    it('should be able to make many checks and run a fold', () => {
        const result = (Inquiry as any)
            .subject({ name: 'test', age: 14, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .fold(
                (x: PassMonad) => {
                    expect(x.inspect()).toBe(
                        "Pass(old enough,[object Object],[object Object])"
                    );
                    return x.join();
                },
                (y: FailMonad) => {
                    expect(y.inspect()).toBe('this should not run');
                    return y.join();
                }
            );
    });

    it('should be able to make many checks, including async ones, and run a conclude and return the subject unchanged', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter2Seconds)
            .inquire(resolveAfter10ms)
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
                        'Pass([object Object],[object Object],passed,passed 10ms)'
                    );
                    return y;
                }
            )
            .then((x: any) => {
                expect(x.subject.join()).toEqual({
                    name: 'test',
                    age: 10,
                    description: 'blah'
                });
                expect(R.head(x.pass.join())).toEqual({
                    // @ts-ignore
                    height: 110,
                    in: 'cm'
                });
            });
    });

    it('should be able to merge a sub-inquiry into a master inquiry', () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass('Passed something'))
                .inquire(() => Fail('Failed something'))
                .inquire(() => Fail('Failed something else'));

        const result = (Inquiry as any)
            .subject({ name: 'test', age: 14, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        'Pass(old enough,[object Object],[object Object],Passed something)'
                    );
                    return y.join();
                }
            );
    });

    it('should be able to be stopped in the middle of processing with a breakpoint if there are failures', () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass('Passed something'))
                .inquire(() => Fail('Failed something'))
                .inquire(() => Fail('Failed something else'));

        let reachedBreakpoint = 0;

        const result = (Inquiry as any)
            .subject({ name: 'test', age: 11, description: 'blah' })
            .inquire(oldEnough)
            .breakpoint((x: InquiryValue) => {
                // clearing the existing failure, it will not appear at the end
                // this is not a practical example, usually one one do some kind of exit
                reachedBreakpoint = 1;
                x.fail = Fail([]);

                return x;
            })
            .inquire(findHeight)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    expect(x.head()).toEqual("Name wasn't spelled correctly");
                    expect(x.tail()).toEqual('Failed something else');
                    expect(reachedBreakpoint).toEqual(1);
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        'Pass([object Object],[object Object],Passed something)'
                    );
                    expect(y.head()).toEqual({ height: 110, in: 'cm' });
                    expect(y.tail()).toEqual('Passed something');
                    return y.join();
                }
            );
    });

    it('should be able to be stopped in the middle of processing with a milestone if there are passes', () => {
        const evaluateHealth = (a: any) =>
            (Inquiry as any)
                .subject(a)
                .inquire(() => Pass('Passed something'))
                .inquire(() => Fail('Failed something'))
                .inquire(() => Fail('Failed something else'));

        let reachedMilestone = 0;

        const result = (Inquiry as any)
            .subject({ name: 'test', age: 11, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .milestone((x: InquiryValue) => {
                // clearing the existing pass, it will not appear at the end
                // this is not a practical example, usually one one do some kind of exit
                reachedMilestone = 1;
                x.pass = Pass([]);
                return x;
            })
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .inquire(evaluateHealth)
            .conclude(
                (x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math,Failed something,Failed something else)"
                    );
                    expect(reachedMilestone).toEqual(1);
                    return x.join();
                },
                (y: PassMonad) => {
                    expect(y.inspect()).toBe(
                        'Pass([object Object],Passed something)'
                    );
                    return y.join();
                }
            );
    });

    it('should be able to make many checks, including async ones, and run a faulted unwrap', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1Second)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .faulted((x: FailMonad) => {
                expect(x.inspect()).toBe(
                    "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                );
                return x;
            });
    });

    it('should be able to make many checks, including async ones, run await, then and run a faulted unwrap', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1Second)
            .inquire(nameSpelledRight)
            .inquire(hasRecords)
            .inquire(mathGrade)
            .await(2000)
            .then((inq: InquiryMonad) =>
                inq.faulted((x: FailMonad) => {
                    expect(x.inspect()).toBe(
                        "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                    );
                    return x;
                })
            );
    });

    it('should be able to make many checks, including async ones, and run a cleared unwrap when all passes', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 14, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1Second)
            .inquire(hasRecords)
            .faulted((x: FailMonad) => {
                expect(x.inspect()).toBe(
                    "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                );
                return x;
            });
    });

    it('should all an inquire to return a non-Fail, non-Pass, and accept it as a Pass', () => {
        return (InquiryP as any)
            .subject(1)
            .inquire((x: any) => x + 1)
            .suffice((pass: PassFailMonad) => {
                expect(pass.join()).toEqual([2]);
            });
    });

    it('should be able to map a function as an inquireMap', () => {
        const planets = [
            'Mercury',
            'Venus',
            'Earth',
            'Mars',
            'Jupiter',
            'Saturn',
            'Uranus',
            'Neptune'
        ];

        const startsWith = (word: string) => (checks: any) =>
            word.startsWith(checks.letter) ? Pass(word) : Fail(word);

        (Inquiry as any)
            .subject({ letter: 'M' })
            .inquireMap(startsWith, planets)
            .suffice((pass: PassFailMonad) => {
                expect(pass.join()).toEqual(['Mercury', 'Mars']);
            });
    });

    it('should be able to map a function as an inquireMap with InquiryP', () => {
        const planets = [
            'Mercury',
            'Venus',
            'Earth',
            'Mars',
            'Jupiter',
            'Saturn',
            'Uranus',
            'Neptune'
        ];

        const startsWith = (word: string) => (checks: any) =>
            word.startsWith(checks.letter) ? Pass(word) : Fail(word);

        return (InquiryP as any)
            .subject({ letter: 'M' })
            .inquire(resolveAfter1Second)
            .inquire(resolveAfter10ms)
            .inquireMap(startsWith, planets)
            .inquire(resolveAfter10ms)
            .suffice((pass: PassFailMonad) => {
                expect(pass.join()).toEqual(['Mercury', 'Mars', 'passed', 'passed 10ms', 'passed 10ms']);
            });
    });
});
