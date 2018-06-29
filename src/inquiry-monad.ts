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
    isPass: boolean;
    isFail: boolean;
    isInquiry: false;
    isIOU: false;
    answer: Function;
    head: Function;
    tail: Function;
    isEmpty: Function;
}

export interface IOUMonad extends Monad {
    concat: Function;
    head: Function;
    tail: Function;
    isEmpty: Function;
    isIOU: true;
    isInquiry: false;
    isPass: false;
    isFail: false;
}

export interface PassMonad extends PassFailMonad {
    isPass: true;
    isFail: false;
}

export interface FailMonad extends PassFailMonad {
    isPass: false;
    isFail: true;
}

export interface QuestionsetMonad extends Monad {
    find: Function;
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
}

// @todo add type for questions, a function that returns Pass or Fail
