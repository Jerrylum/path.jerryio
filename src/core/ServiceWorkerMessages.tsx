export type MessageAction = "GET_VERSION" | "SKIP_WAITING";

export type SkipWaitingResponse = undefined;
export type VersionResponse = string;

export interface Message {
  type: MessageAction;
}

export interface GetVersionMessage extends Message {
  type: "GET_VERSION";
}

export interface SkipWaitingMessage extends Message {
  type: "SKIP_WAITING";
}

export function isMessage(data: any): data is Message {
  return typeof data === "object" && data !== null && typeof data.type === "string";
}
