import { makeAutoObservable } from "mobx";

export enum HelpPage {
  None,
  Welcome,
  About
}

export class Help {
  private page: HelpPage = HelpPage.None;

  constructor() {
    makeAutoObservable(this);
  }

  close() {
    this.page = HelpPage.None;
  }

  open(page: HelpPage) {
    this.page = page;
  }

  get isOpen() {
    return this.page !== HelpPage.None;
  }

  get currentPage() {
    return this.page;
  }
}
