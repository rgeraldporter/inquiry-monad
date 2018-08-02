import {
    $$inquirySymbol,
    $$questionsetSymbol,
    $$questionSymbol,
    $$passSymbol,
    $$failSymbol,
    $$iouSymbol,
    $$receiptSymbol
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
    concat: Function;
    [$$questionsetSymbol]: true;
}

export interface QuestionMonad extends Monad {
    call: (i: InquiryMonad) => PassFailMonad;
    extract: () => QuestionValue[1];
    name: () => QuestionValue[0];
    [$$questionSymbol]: true;
}

export interface ReceiptValue extends Array<string | RegExp | PassFailMonad> {
    0: string | RegExp;
    1: PassFailMonad;
}

export interface ReceiptMonad extends Monad {
    [$$receiptSymbol]: true;
    [$$inquirySymbol]: false;
    concat: Function;
    head: Function;
    tail: Function;
    isEmpty: Function;
    fold: Function;
    fork: Function;
}

export interface InquiryValue {
    subject: any;
    fail: FailMonad;
    pass: PassMonad;
    informant: Function;
    iou: IOUMonad;
    questionset: QuestionsetMonad | void;
    receipt: ReceiptMonad;
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

export interface MonadConstructor {
    of: Function
}

export interface QuestionsetMonadConstructor extends MonadConstructor {
    of: (x: any) => QuestionsetMonad | void
}

export interface QuestionMonadConstructor extends MonadConstructor {
    of: (x: any) => QuestionMonad | void
}


export interface InquiryConstructor extends MonadConstructor {
    subject: (x: any) => InquiryMonad,
    of: (a: InquiryValue) => InquiryMonad
}