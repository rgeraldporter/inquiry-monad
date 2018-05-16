import { Inquiry, InquiryP, Fail, Pass } from './index';
import * as R from 'ramda';
import 'jasmine';
import { Maybe } from 'simple-maybe';
import Future from 'fluture';

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

describe('The module', () => {
    it('should be able to make many checks, including async ones, and run a conclude and return the subject unchanged', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 10, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter2Seconds)
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
                        'Pass([object Object],[object Object],passed)'
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
                (x: any) => {
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
            .breakpoint((x: any) => {
                // clearing the existing failure, it will not appear at the end
                // this is not a practice example, usually one one do some kind of exit
                x.fail = Fail([]);
                return Inquiry.subject(x);
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
                    expect(x.tail()).toEqual('Failed something else');
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

        let reachedBreakpoint = 0;

        const result = (Inquiry as any)
            .subject({ name: 'test', age: 11, description: 'blah' })
            .inquire(oldEnough)
            .milestone((x: any) => {
                // clearing the existing failure, it will not appear at the end
                // this is not a practice example, usually one one do some kind of exit
                x.pass = Pass([]);
                return Inquiry.subject(x);
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
                        'Pass([object Object],[object Object],Passed something)'
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
            .faulted((x: any) => {
                expect(x.inspect()).toBe(
                    "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                );
                return x;
            });
    });

    it('should be able to make many checks, including async ones, and run a cleared unwrap when all passes', () => {
        return (InquiryP as any)
            .subject({ name: 'test', age: 14, description: 'blah' })
            .inquire(oldEnough)
            .inquire(findHeight)
            .inquire(resolveAfter1Second)
            .inquire(hasRecords)
            .faulted((x: any) => {
                expect(x.inspect()).toBe(
                    "Fail(not old enough,Name wasn't spelled correctly,Failed at math)"
                );
                return x;
            });
    });
});
