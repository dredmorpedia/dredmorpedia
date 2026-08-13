import { readFileSync } from "node:fs";

import { compareCodeUnits, type InputChecksum } from "@dredmorpedia/domain";

import { toPosixPath } from "./safe-path";
import { sha256 } from "./serialization";

interface InputSnapshot {
  absolutePath: string;
  checksum: InputChecksum;
  bytes: Buffer;
}

export interface RegisteredInputSnapshot {
  checksum: InputChecksum;
  bytes: Buffer;
}

export class InputSnapshots {
  private readonly snapshots = new Map<string, InputSnapshot>();

  readUtf8(absolutePath: string, displayPath: string): string {
    const file = toPosixPath(displayPath);
    const existing = this.snapshots.get(file);
    if (existing) {
      this.assertSameInput(existing, absolutePath, file);
      return existing.bytes.toString("utf8");
    }

    const bytes = readFileSync(absolutePath);
    this.snapshots.set(file, {
      absolutePath,
      checksum: { file, sha256: sha256(bytes) },
      bytes,
    });
    return bytes.toString("utf8");
  }

  register(absolutePath: string, displayPath: string): RegisteredInputSnapshot {
    const file = toPosixPath(displayPath);
    const existing = this.snapshots.get(file);
    if (existing) {
      this.assertSameInput(existing, absolutePath, file);
      return {
        checksum: { ...existing.checksum },
        bytes: Buffer.from(existing.bytes),
      };
    }

    const bytes = readFileSync(absolutePath);
    this.snapshots.set(file, {
      absolutePath,
      checksum: { file, sha256: sha256(bytes) },
      bytes,
    });
    return {
      checksum: { file, sha256: sha256(bytes) },
      bytes: Buffer.from(bytes),
    };
  }

  get(displayPath: string): RegisteredInputSnapshot | undefined {
    const snapshot = this.snapshots.get(toPosixPath(displayPath));
    return snapshot
      ? {
          checksum: { ...snapshot.checksum },
          bytes: Buffer.from(snapshot.bytes),
        }
      : undefined;
  }

  list(): InputChecksum[] {
    return [...this.snapshots.values()]
      .map(({ checksum }) => ({ ...checksum }))
      .sort((left, right) => compareCodeUnits(left.file, right.file));
  }

  private assertSameInput(
    existing: InputSnapshot,
    absolutePath: string,
    displayPath: string,
  ): void {
    if (existing.absolutePath !== absolutePath) {
      throw new Error(
        `Input display path has multiple sources: ${displayPath}`,
      );
    }
  }
}
