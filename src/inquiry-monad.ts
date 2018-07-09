import {
    $$inquirySymbol,
    $$questionsetSymbol,
    $$questionSymbol,
    $$passSymbol,
    $$failSymbol,
    $$iouSymbol
} from './symbols';

export interface Monad {
    map: Function;
    chain: Function;
    join: Function;
    inspect(): string;
    ap: Function;
}

export interface PassFailMonad extends Monad {
    fold: Function;
    fork: Function;
    concat: Function;
    answer: Function;
    head: Function;
    tail: Function;
    isEmpty: Function;
    [$$passSymbol]: Boolean;
    [$$failSymbol]: Boolean;
    [$$iouSymbol]: false;
    [$$inquirySymbol]: false;
}

export interface IOUMonad extends Monad {
    concat: Function;
    head: Function;
    tail: Function;
    isEmpty: Function;
    [$$iouSymbol]: true;
    [$$failSymbol]: false;
    [$$inquirySymbol]: false;
    [$$passSymbol]: false;
}

export interface PassMonad extends PassFailMonad {
    [$$failSymbol]: false;
    [$$passSymbol]: true;
}

export interface FailMonad extends PassFailMonad {
    [$$passSymbol]: false;
    [$$failSymbol]: true;
}

export interface QuestionsetMonad extends Monad {
    find: Function;
    [$$questionsetSymbol]: true;
}

export interface QuestionMonad extends Monad {
    call: Function;
    extract: Function;
    [$$questionSymbol]: true;
}

export interface InquiryValue {
    subject: any;
    fail: FailMonad;
    pass: PassMonad;
    informant: Function;
    iou: IOUMonad;
    questionset: QuestionsetMonad;
}

export interface InquiryMonad extends Monad {
    inquire: Function;
    inquireMap: Function;
    inquireAll: Function;
    zip: Function;
    swap: Function;
    fork: Function;
    fold: Function;
    faulted: Function;
    cleared: Function;
    suffice: Function;
    scratch: Function;
    informant: Function;
    unison: Function;
    breakpoint: Function;
    milestone: Function;
    answer: Function;
    conclude: Function;
    using: Function;
    await?: Function;
    [$$inquirySymbol]: true;
}

export interface QuestionValue extends Array<string | RegExp | Function> {
    0: string | RegExp;
    1: Function;
}