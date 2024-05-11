import { fromDegreeToRadian, fromRadiansToDegree } from "@core/Calculation";
import { Path } from "@core/Path";
import { SmartBuffer } from "smart-buffer";

export namespace LemLibV1_0 {
  export interface LemLibWaypoint {
    x: number; // mm
    y: number; // mm
    speed: number; // m/s
    heading?: number;
    lookahead?: number; // mm
  }

  export interface LemLibPathData {
    name: string;
    waypoints: LemLibWaypoint[];
  }

  export function writeWaypoint(buffer: SmartBuffer, waypoint: LemLibWaypoint) {
    let flag = 0;
    if (waypoint.heading !== undefined) flag |= 0x01;
    if (waypoint.lookahead !== undefined) flag |= 0x02;
    buffer.writeInt8(flag);
    buffer.writeInt16LE(Math.round(waypoint.x * 2));
    buffer.writeInt16LE(Math.round(waypoint.y * 2));
    buffer.writeInt16LE(Math.round(waypoint.speed * 1000));
    if (waypoint.heading !== undefined) {
      // From [0, 360) to [0~6.2832]
      const rad = fromDegreeToRadian(waypoint.heading);
      const rad2 = Math.max(0, Math.min(rad, 6.2832));
      buffer.writeUInt16LE(Math.round(rad2 * 10000));
    }
    if (waypoint.lookahead !== undefined) {
      buffer.writeInt16LE(Math.round(waypoint.lookahead * 2));
    }
  }

  export function readWaypoint(buffer: SmartBuffer): LemLibWaypoint {
    const flag = buffer.readInt8();
    const waypoint: LemLibWaypoint = {
      x: buffer.readInt16LE() / 2,
      y: buffer.readInt16LE() / 2,
      speed: buffer.readInt16LE() / 1000
    };
    if (flag & 0x01) {
      // From [0~6.2832] to [0, 360)
      const rad = buffer.readUInt16LE() / 10000;
      const deg = fromRadiansToDegree(rad);
      waypoint.heading = deg;
    }
    if (flag & 0x02) {
      waypoint.lookahead = buffer.readInt16LE() / 2;
    }
    if (flag & 0x04) buffer.readInt16LE(); // Reserved
    if (flag & 0x08) buffer.readInt16LE(); // Reserved
    if (flag & 0x10) buffer.readInt16LE(); // Reserved
    if (flag & 0x20) buffer.readInt16LE(); // Reserved
    if (flag & 0x40) buffer.readInt16LE(); // Reserved
    if (flag & 0x80) buffer.readInt16LE(); // Reserved

    return waypoint;
  }

  export function writePath(buffer: SmartBuffer, path: Path) {
    buffer.writeStringNT(path.name);
    buffer.writeInt8(0);
    // No metadata
    const result = path.pc.format.getPathPoints(path);
    const points = result.points;
    buffer.writeUInt16LE(points.length);
    points.forEach(point => {
      writeWaypoint(buffer, point);
    });
  }

  export function readPath(buffer: SmartBuffer): LemLibPathData {
    const name = buffer.readStringNT();
    const metadataSize = buffer.readInt8();
    if (metadataSize > 0) {
      buffer.readBuffer(metadataSize);
    }
    const numPoints = buffer.readUInt16LE();
    const waypoints: LemLibWaypoint[] = [];
    for (let i = 0; i < numPoints; i++) {
      waypoints.push(readWaypoint(buffer));
    }
    return { name, waypoints };
  }

  export function writePathFile(buffer: SmartBuffer, paths: Path[], pathFileData: Record<string, any>) {
    const bodyBeginIdx = buffer.writeOffset;
    buffer.writeUInt8(4); // Metadata size
    const metadataStartIdx = buffer.writeOffset;
    buffer.writeUInt32LE(0); // Placeholder

    buffer.writeUInt16LE(paths.length);
    paths.forEach(path => {
      writePath(buffer, path);
    });

    // The first 4 bytes of metadata is the pointer to the end of the body
    // The reader will use this pointer to skip the body and read the PATH.JERRYIO-DATA metadata
    const sizeOfBody = buffer.writeOffset - bodyBeginIdx;
    buffer.writeUInt32LE(sizeOfBody, metadataStartIdx);
    buffer.writeStringNT("#PATH.JERRYIO-DATA");
    buffer.writeString(JSON.stringify(pathFileData));
  }

  export function readPathFile(
    buffer: SmartBuffer
  ): { paths: LemLibPathData[]; pathFileData: Record<string, any> } | undefined {
    const bodyBeginIdx = buffer.readOffset;
    const metadataSize = buffer.readUInt8();
    const metadataStartIdx = buffer.readOffset;
    const metadataEndIdx = metadataStartIdx + metadataSize;
    const sizeOfBody = buffer.readUInt32LE();
    buffer.readOffset = metadataEndIdx;

    const paths: LemLibPathData[] = [];
    const numPaths = buffer.readUInt16LE();
    for (let i = 0; i < numPaths; i++) {
      paths.push(readPath(buffer));
    }

    buffer.readOffset = bodyBeginIdx + sizeOfBody;
    const signature = buffer.readStringNT();
    if (signature !== "#PATH.JERRYIO-DATA") return undefined;

    try {
      const pathFileData = JSON.parse(buffer.readString());
      return { paths, pathFileData };
    } catch (e) {
      return undefined;
    }
  }
}
