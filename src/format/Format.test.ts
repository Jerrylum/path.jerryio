import { action } from "mobx";
import { instanceToPlain, plainToClassFromExist, plainToInstance, Expose, Exclude, Type } from "class-transformer";
import { MainApp } from "../core/MainApp";
import { Segment, EndControl, Path } from "../core/Path";
import { Format, PathFileData } from "./Format";
import DOMPurify from "dompurify";
import { PointCalculationResult } from "../core/Calculation";
import { GeneralConfig } from "./Config";
import { CustomGeneralConfig, CustomPathConfig } from "./Config.test";
import { HistoryEventMap, CancellableCommand } from "../core/Command";
import { LemLibFormatV1_0, LemLibPathConfig } from "./LemLibFormatV1_0";

export class CustomFormat implements Format {
  isInit: boolean;
  uid: string;

  private readonly events = new Map<keyof HistoryEventMap<CancellableCommand>, Set<Function>>();

  constructor() {
    this.isInit = false;
    this.uid = "custom";
  }

  createNewInstance(): Format {
    return new CustomFormat();
  }

  getName(): string {
    return "Custom";
  }
  init(): void {
    this.isInit = true;
  }
  getGeneralConfig(): GeneralConfig {
    return new CustomGeneralConfig();
  }
  createPath(...segments: Segment[]): Path {
    return new Path(new CustomPathConfig(), ...segments);
  }
  getPathPoints(path: Path): PointCalculationResult {
    throw new Error("Method not implemented.");
  }
  recoverPathFileData(fileContent: string): PathFileData {
    throw new Error("Method not implemented.");
  }
  exportPathFile(): string {
    throw new Error("Method not implemented.");
  }

  addEventListener<K extends keyof HistoryEventMap<CancellableCommand>, T extends CancellableCommand>(
    type: K,
    listener: (event: HistoryEventMap<T>[K]) => void
  ): void {
    if (!this.events.has(type)) this.events.set(type, new Set());
    this.events.get(type)!.add(listener);
  }

  removeEventListener<K extends keyof HistoryEventMap<CancellableCommand>, T extends CancellableCommand>(
    type: K,
    listener: (event: HistoryEventMap<T>[K]) => void
  ): void {
    if (!this.events.has(type)) return;
    this.events.get(type)!.delete(listener);
  }

  fireEvent(
    type: keyof HistoryEventMap<CancellableCommand>,
    event: HistoryEventMap<CancellableCommand>[keyof HistoryEventMap<CancellableCommand>]
  ) {
    if (!this.events.has(type)) return;
    for (const listener of this.events.get(type)!) {
      listener(event);
    }
  }
}

test("Sanitize", () => {
  const purify = DOMPurify();

  expect(purify.isSupported).toBeTruthy();

  expect(purify.sanitize("<script>alert('hello')</script>")).toEqual("");
});

test("Export test", () => {
  const app = new MainApp();

  const plain = JSON.stringify(app.exportPathFileData());

  app.importPathFileData(JSON.parse(plain));

  const plain2 = JSON.stringify(app.exportPathFileData());

  expect(plain).toEqual(plain2);
});

test(
  "Format serialize",
  action(() => {
    const app = new MainApp();

    app.format = new CustomFormat();

    let p = instanceToPlain(app.gc);
    let gc2 = plainToClassFromExist(app.format.getGeneralConfig(), p, {
      excludeExtraneousValues: true,
      exposeDefaultValues: true
    });
    let p2 = instanceToPlain(gc2);

    expect(p).toEqual(p2);
    expect(app.gc === gc2).toBeFalsy();
  })
);

test("Segment serialize", () => {
  let s = new Segment(new EndControl(-12, -34, 9), new EndControl(-56, 78, 0));
  let p = instanceToPlain(s);
  let s2 = plainToInstance(Segment, p);
  let p2 = instanceToPlain(s2);

  expect(p).toEqual(p2);
});

test("Path serialize", () => {
  let format = new CustomFormat();
  let r = format.createPath(new Segment(new EndControl(-60, -60, 0), new EndControl(-60, 60, 0)));
  let p = instanceToPlain(r);
  let r2 = format.createPath();
  plainToClassFromExist(r2, p, { excludeExtraneousValues: true, exposeDefaultValues: true });
  let p2 = instanceToPlain(r2);

  expect(p).toEqual(p2);
});

test("Path[] serialize", () => {
  let format = new CustomFormat();
  let r = [format.createPath(new Segment(new EndControl(-60, -60, 0), new EndControl(-60, 60, 0)))];
  let p = instanceToPlain(r);
  let r2 = format.createPath();
  plainToClassFromExist(r2, p[0], { excludeExtraneousValues: true, exposeDefaultValues: true });
  let p2 = instanceToPlain(r2);

  expect(p[0]).toEqual(p2);
});

class TestClass {
  @Expose()
  attr1 = 1;
  @Expose()
  attr2 = "2";
  @Expose()
  attr3 = true;
  // No @Expose()
  attr5 = "5";
  @Exclude()
  attr6 = "6";
  @Expose()
  attr7 = "7";
  @Expose()
  @Type(() => Number)
  attr8 = [2, 3, 4];
  @Expose()
  @Type(() => Number)
  attr9 = [5, 6, 7];
  @Expose()
  @Type(() => String)
  attr10 = "string1";
  @Expose()
  attr11 = "string2";
}

test("Class transform", () => {
  const result = plainToClassFromExist(
    new TestClass(),
    {
      attr1: 3,
      attr2: "4",
      attr3: false,
      attr4: "hey",
      attr5: "-1",
      attr6: "-2",
      attr8: "anything",
      attr9: [8, 9],
      attr10: 123,
      attr11: 456
    },
    { excludeExtraneousValues: true, exposeDefaultValues: true }
  );

  expect(result.attr1).toEqual(3);
  expect(result.attr2).toEqual("4");
  expect(result.attr3).toEqual(false);
  expect((result as any).attr4).toBeUndefined();
  expect(result.attr5).toEqual("5");
  expect(result.attr6).toEqual("6");
  expect(result.attr7).toEqual("7");
  expect(result.attr8).toEqual(NaN);
  expect(result.attr9).toEqual([8, 9]);
  expect(result.attr10).toEqual("123");
  expect(result.attr11).toEqual(456);
});

test("LemLibFormatV1_0", () => {
  const format = new LemLibFormatV1_0();

  const path = format.createPath();

  const pc = path.pc as LemLibPathConfig;

  const json = instanceToPlain(pc);

  const path2 = format.createPath();
  const pc2 = path2.pc as LemLibPathConfig;
  plainToClassFromExist(pc2, json);

  console.log("json", json);
});
